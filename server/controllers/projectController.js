import Project from "../models/Project.js";
import Role from "../models/Role.js";
import Company from "../models/Company.js";
import Employee from "../models/Employee.js";
import DeletedProject from "../models/DeletedProject.js";
import mongoose from "mongoose";

import {
  isValidId,
  getProjectForEmployee,
  getRoleBranchIds,
} from "../utils/projectAccess.js";

const MODULE_STATUSES = [
  "Not Assigned",
  "Assigned",
  "In Progress",
  "Completed",
];

const getEmployeeId = (employee) =>
  employee?._id || employee?.id;

const getProjectEmployeeIds = (project) =>
  (project.employeeAccess || []).map((id) =>
    String(id?._id || id)
  );

const validateCompanyEmployees = async (employeeIds, companyId) => {
  const uniqueIds = [...new Set(employeeIds.map(String))];

  if (uniqueIds.some((id) => !isValidId(id))) {
    return {
      error: "One or more employee IDs are invalid",
    };
  }

  const employees = await Employee.find({
    _id: { $in: uniqueIds },
    companyId,
  }).select("_id");

  if (employees.length !== uniqueIds.length) {
    return {
      error: "One or more employees do not belong to this company",
    };
  }

  return {
    employeeIds: employees.map((employee) => employee._id),
  };
};


// =====================================================
// CREATE PROJECT — SUPER ADMIN ONLY
// =====================================================
// =====================================================
// CREATE PROJECT — SUPER ADMIN OR EMPLOYEE
// =====================================================
export const createProject = async (req, res) => {
  try {
    const {
      projectName,
      projectCode,
      clientName,
      projectDetails,
      remarks,
      projectDescription,
      employeeAccess = [],
      modules = [],
    } = req.body;

    const user = req.user;
    const isSuperAdmin = user?.role === "superadmin";
    const isEmployee = user?.role === "employee";

    if (!isSuperAdmin && !isEmployee) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const companyId = isSuperAdmin
      ? req.body.companyId
      : user.companyId;

    const creatorId = isSuperAdmin
      ? user.id
      : getEmployeeId(user);

    if (
      typeof projectName !== "string" ||
      !projectName.trim() ||
      typeof clientName !== "string" ||
      !clientName.trim() ||
      !isValidId(companyId) ||
      !isValidId(creatorId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Project name, client name and valid company information are required",
      });
    }

    if (!Array.isArray(employeeAccess) || !Array.isArray(modules)) {
      return res.status(400).json({
        success: false,
        message: "Employee access and modules must be arrays",
      });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const validatedEmployees = await validateCompanyEmployees(
      employeeAccess,
      companyId
    );

    if (validatedEmployees.error) {
      return res.status(400).json({
        success: false,
        message: validatedEmployees.error,
      });
    }

    const cleanModules = modules.map((module) => ({
      moduleName:
        typeof module === "string"
          ? module.trim()
          : String(module?.moduleName || "").trim(),
      ...(module?.status &&
      MODULE_STATUSES.includes(module.status)
        ? { status: module.status }
        : {}),
    }));

    if (cleanModules.some((module) => !module.moduleName)) {
      return res.status(400).json({
        success: false,
        message: "Every module must have a module name",
      });
    }

    const moduleNames = cleanModules.map((module) =>
      module.moduleName.toLowerCase()
    );

    if (new Set(moduleNames).size !== moduleNames.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate module names are not allowed",
      });
    }

    // Employee creator must also have access to the project.
    const finalEmployeeIds = [
      ...new Set([
        ...validatedEmployees.employeeIds.map(String),
        ...(isEmployee ? [String(creatorId)] : []),
      ]),
    ];

    const projectData = {
      projectName: projectName.trim(),
      clientName: clientName.trim(),
      projectDetails: projectDetails?.trim() || "",
      remarks: remarks?.trim() || "",
      projectDescription: projectDescription?.trim() || "",
      companyId,

      createdBy: isSuperAdmin ? creatorId : null,
      createdByEmployee: isEmployee ? creatorId : null,

      employeeAccess: finalEmployeeIds,
      modules: cleanModules,
    };

    if (typeof projectCode === "string" && projectCode.trim()) {
      projectData.projectCode = projectCode.trim().toUpperCase();
    }

    const project = await Project.create(projectData);

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create Project Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: error.keyPattern?.projectCode
          ? "Project code already exists"
          : "A project with this unique field already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create project",
      error: error.message,
    });
  }
};


// =====================================================
// GET ALL PROJECTS
// =====================================================
export const getAllProjects = async (req, res) => {
  try {
    const filter = {};

    if (req.query.companyId) {
      if (!isValidId(req.query.companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID",
        });
      }

      filter.companyId = req.query.companyId;
    }

    const projects = await Project.find(filter)
      .populate("companyId", "companyName")
      .populate({
        path: "employeeAccess",
        select: "name empId email roleId departmentId",
        populate: [
          { path: "roleId", select: "roleName parentRoleId" },
          { path: "departmentId", select: "departmentName" },
        ],
      })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Get All Projects Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get projects",
      error: error.message,
    });
  }
};

// =====================================================
// GET SINGLE PROJECT
// =====================================================
export const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    let project;

    if (req.user.role === "superadmin") {
      project = await Project.findById(projectId)
        .populate("companyId", "companyName")
        .populate({
          path: "employeeAccess",
          select: "name empId email roleId departmentId",
          populate: [
            { path: "roleId", select: "roleName parentRoleId" },
            { path: "departmentId", select: "departmentName" },
          ],
        })
        .populate("createdBy", "name email");

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
    } else if (req.user.role === "employee") {
      const result = await getProjectForEmployee(projectId, req.user);

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error,
        });
      }

      project = await Project.findById(projectId)
        .populate("companyId", "companyName");

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Get Project Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get project",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE PROJECT — SUPER ADMIN ONLY
// =====================================================
// =====================================================
// UPDATE PROJECT — SUPER ADMIN ONLY
// =====================================================
export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const {
      projectName,
      clientName,
      projectDetails,
      remarks,
      projectDescription,
      status,
    } = req.body;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (projectName !== undefined) {
      if (
        typeof projectName !== "string" ||
        !projectName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Project name cannot be empty",
        });
      }

      project.projectName = projectName.trim();
    }

    if (clientName !== undefined) {
      if (
        typeof clientName !== "string" ||
        !clientName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Client name cannot be empty",
        });
      }

      project.clientName = clientName.trim();
    }

    if (projectDetails !== undefined) {
      if (typeof projectDetails !== "string") {
        return res.status(400).json({
          success: false,
          message: "Project details must be a string",
        });
      }

      project.projectDetails = projectDetails.trim();
    }

    if (remarks !== undefined) {
      if (typeof remarks !== "string") {
        return res.status(400).json({
          success: false,
          message: "Remarks must be a string",
        });
      }

      project.remarks = remarks.trim();
    }

    if (projectDescription !== undefined) {
      if (typeof projectDescription !== "string") {
        return res.status(400).json({
          success: false,
          message: "Project description must be a string",
        });
      }

      project.projectDescription = projectDescription.trim();
    }

    // Project code cannot be changed after creation.

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be active or inactive",
        });
      }

      project.status = status;
    }

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("Update Project Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A project with this unique field already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update project",
      error: error.message,
    });
  }
};


// =====================================================
// DELETE PROJECT
// =====================================================
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const isEmployee = req.user?.role === "employee";
    const isSuperAdmin = req.user?.role === "superadmin";

    await DeletedProject.create({
      originalProjectId: project._id,
      projectName: project.projectName,
      projectCode: project.projectCode,
      clientName: project.clientName,
      projectDetails: project.projectDetails,
      remarks: project.remarks,
      projectDescription: project.projectDescription,
      companyId: project.companyId,

      createdBy: project.createdBy || null,
      createdByEmployee: project.createdByEmployee || null,

      employeeAccess: project.employeeAccess || [],

      modules: project.modules.map((module) => ({
        _id: module._id,
        moduleName: module.moduleName,
        status: module.status,
        createdAt: module.createdAt,
        updatedAt: module.updatedAt,
      })),

      status: project.status,
      originalCreatedAt: project.createdAt,
      originalUpdatedAt: project.updatedAt,

      deletedBy: isSuperAdmin ? req.user.id : null,
      deletedByEmployee: isEmployee
        ? getEmployeeId(req.user)
        : null,

      deletedAt: new Date(),
    });

    await Project.findByIdAndDelete(projectId);

    return res.status(200).json({
      success: true,
      message: "Project moved to Deleted Projects successfully",
    });
  } catch (error) {
    console.error("Delete Project Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to move project to Deleted Projects",
      error: error.message,
    });
  }
};

// =====================================================
// GET DELETED PROJECTS
// =====================================================
export const getDeletedProjects = async (req, res) => {
  try {
    const filter = {};

    if (req.query.companyId) {
      if (!isValidId(req.query.companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID",
        });
      }

      filter.companyId = req.query.companyId;
    }

    const deletedProjects = await DeletedProject.find(filter)
      .populate("companyId", "companyName")
      .populate({
        path: "employeeAccess",
        select: "name empId email roleId departmentId",
        populate: [
          { path: "roleId", select: "roleName parentRoleId" },
          { path: "departmentId", select: "departmentName" },
        ],
      })
      .populate("createdBy", "name email")
      .populate("createdByEmployee", "name empId email")
      .populate("deletedBy", "name email")
      .populate("deletedByEmployee", "name empId email")
      .sort({ deletedAt: -1 });

    return res.status(200).json({
      success: true,
      count: deletedProjects.length,
      projects: deletedProjects,
    });
  } catch (error) {
    console.error("Get Deleted Projects Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get deleted projects",
      error: error.message,
    });
  }
};

// =====================================================
// RESTORE DELETED PROJECT
// =====================================================
export const restoreDeletedProject = async (req, res) => {
  try {
    const { deletedProjectId } = req.params;

    if (!isValidId(deletedProjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deleted project ID",
      });
    }

    const archivedProject =
      await DeletedProject.findById(deletedProjectId);

    if (!archivedProject) {
      return res.status(404).json({
        success: false,
        message: "Deleted project not found",
      });
    }

    const existingId = await Project.findById(
      archivedProject.originalProjectId
    );

    if (existingId) {
      return res.status(409).json({
        success: false,
        message:
          "A project with this original ID already exists. Resolve the conflict before restoring.",
      });
    }

    const existingName = await Project.findOne({
      companyId: archivedProject.companyId,
      projectName: archivedProject.projectName,
    });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message:
          "A project with this name already exists in this company. Rename the existing project before restoring.",
      });
    }

    const existingCode = await Project.findOne({
      projectCode: archivedProject.projectCode,
    });

    if (existingCode) {
      return res.status(409).json({
        success: false,
        message:
          "This project code is already in use. Resolve the conflict before restoring.",
      });
    }

    const restoredProject = await Project.create({
      _id: archivedProject.originalProjectId,

      projectName: archivedProject.projectName,
      projectCode: archivedProject.projectCode,
      clientName: archivedProject.clientName,
      projectDetails: archivedProject.projectDetails,
      remarks: archivedProject.remarks,
      projectDescription: archivedProject.projectDescription,

      companyId: archivedProject.companyId,

      createdBy: archivedProject.createdBy || null,
      createdByEmployee: archivedProject.createdByEmployee || null,

      employeeAccess: archivedProject.employeeAccess || [],

      modules: archivedProject.modules.map((module) => ({
        _id: module._id,
        moduleName: module.moduleName,
        status: module.status,
        createdAt: module.createdAt,
        updatedAt: module.updatedAt,
      })),

      status: archivedProject.status,

      createdAt: archivedProject.originalCreatedAt,
      updatedAt: archivedProject.originalUpdatedAt,
    });

    await DeletedProject.findByIdAndDelete(archivedProject._id);

    return res.status(200).json({
      success: true,
      message: "Project restored successfully",
      project: restoredProject,
    });
  } catch (error) {
    console.error("Restore Deleted Project Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A project with the same unique field already exists. Resolve the conflict before restoring.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to restore project",
      error: error.message,
    });
  }
};



/* =====================================================
   PERMANENTLY DELETE ARCHIVED PROJECT — SUPER ADMIN ONLY
===================================================== */
export const permanentlyDeleteProject = async (req, res) => {
  try {
    const { deletedProjectId } = req.params;

    if (!isValidId(deletedProjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deleted project ID",
      });
    }

    const deletedProject =
      await DeletedProject.findByIdAndDelete(deletedProjectId);

    if (!deletedProject) {
      return res.status(404).json({
        success: false,
        message: "Deleted project not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project permanently deleted",
    });
  } catch (error) {
    console.error("Permanently Delete Project Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to permanently delete project",
      error: error.message,
    });
  }
};


// =====================================================
// ASSIGN PROJECT ACCESS TO SELECTED ROLES
// SUPER ADMIN ONLY
// Accepts ANY role belonging to the project's company.
// =====================================================
export const assignRootRoles = async (req, res) => {
  return res.status(400).json({
    success: false,
    message:
      "Role-based project access is no longer supported. Use employee-based project access.",
  });
};

// =====================================================
// GET PROJECT MODULES
// SUPER ADMIN OR AUTHORIZED EMPLOYEE
// =====================================================
export const getProjectModules = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    let project;

    // Super Admin can view modules of any project.
    if (req.user?.role === "superadmin") {
      project = await Project.findById(projectId).select(
        "projectName projectCode companyId modules"
      );
    }

    // Employee must have access to the requested project.
    else if (req.user?.role === "employee") {
      const result = await getProjectForEmployee(
        projectId,
        req.user
      );

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error,
        });
      }

      project = await Project.findById(projectId).select(
        "projectName projectCode companyId modules"
      );
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      projectId: project._id,
      projectName: project.projectName,
      count: project.modules.length,
      modules: project.modules,
    });
  } catch (error) {
    console.error("Get Project Modules Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get project modules",
      error: error.message,
    });
  }
};

// =====================================================
// ADD PROJECT MODULE — SUPER ADMIN ONLY
// =====================================================
export const addProjectModule = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { moduleName } = req.body;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (typeof moduleName !== "string" || !moduleName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Module name is required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const normalizedName = moduleName.trim();

    const exists = project.modules.some(
      (module) =>
        module.moduleName.trim().toLowerCase() ===
        normalizedName.toLowerCase()
    );

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "This module already exists in the project",
      });
    }

    project.modules.push({
      moduleName: normalizedName,
    });

    await project.save();

    return res.status(201).json({
      success: true,
      message: "Project module added successfully",
      project,
    });
  } catch (error) {
    console.error("Add Project Module Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add project module",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE PROJECT MODULE NAME AND/OR STATUS
// SUPER ADMIN ONLY
// =====================================================
export const updateProjectModule = async (req, res) => {
  try {
    const { projectId, moduleId } = req.params;
    const { moduleName, status } = req.body;

    if (!isValidId(projectId) || !isValidId(moduleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID or module ID",
      });
    }

    // At least one field must be provided.
    if (moduleName === undefined && status === undefined) {
      return res.status(400).json({
        success: false,
        message: "Module name or status is required to update",
      });
    }

    let normalizedName;

    if (moduleName !== undefined) {
      if (
        typeof moduleName !== "string" ||
        !moduleName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Module name cannot be empty",
        });
      }

      normalizedName = moduleName.trim();
    }

    if (
      status !== undefined &&
      !MODULE_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${MODULE_STATUSES.join(", ")}`,
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const module = project.modules.id(moduleId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found in this project",
      });
    }

    // Prevent duplicate module names in the same project.
    if (normalizedName !== undefined) {
      const duplicate = project.modules.some(
        (item) =>
          item._id.toString() !== moduleId &&
          item.moduleName.trim().toLowerCase() ===
            normalizedName.toLowerCase()
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "This module name already exists in the project",
        });
      }

      module.moduleName = normalizedName;
    }

if (status !== undefined) {
  module.status = status;

  // Reset assignment details when Super Admin sets status to Not Assigned.
  if (status === "Not Assigned") {
    module.assignedEmployee = null;
    module.assignedBy = null;
    module.assignedAt = null;
  }
}

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project module updated successfully",
      module,
    });
  } catch (error) {
    console.error("Update Project Module Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update project module",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE PROJECT MODULE — SUPER ADMIN ONLY
// =====================================================
export const deleteProjectModule = async (req, res) => {
  try {
    const { projectId, moduleId } = req.params;

    if (!isValidId(projectId) || !isValidId(moduleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID or module ID",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const moduleIndex = project.modules.findIndex(
      (module) => module._id.toString() === moduleId
    );

    if (moduleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Module not found in this project",
      });
    }

    project.modules.splice(moduleIndex, 1);

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project module deleted successfully",
      project,
    });
  } catch (error) {
    console.error("Delete Project Module Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete project module",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE PROJECT MODULE STATUS
// SUPER ADMIN OR AUTHORIZED EMPLOYEE
// =====================================================
export const updateProjectModuleStatus = async (req, res) => {
  try {
    const { projectId, moduleId } = req.params;
    const { status } = req.body;
    const user = req.user;

    if (!isValidId(projectId) || !isValidId(moduleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID or module ID",
      });
    }

    // Employees cannot set a module back to Not Assigned
    // or assign it through the status endpoint.
    const employeeStatuses = ["In Progress", "Completed"];

    if (
      user?.role === "employee"
        ? !employeeStatuses.includes(status)
        : !MODULE_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          user?.role === "employee"
            ? "You can only set your assigned module to In Progress or Completed"
            : `Status must be one of: ${MODULE_STATUSES.join(", ")}`,
      });
    }

    let project;

    if (user?.role === "superadmin") {
      project = await Project.findById(projectId);
    } else if (user?.role === "employee") {
      const result = await getProjectForEmployee(projectId, user);

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error,
        });
      }

      project = result.project;
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const module = project.modules.id(moduleId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found in this project",
      });
    }

    // Employees can update only modules assigned to themselves.
    if (
      user.role === "employee" &&
      module.assignedEmployee?.toString() !== user.id?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can update only modules assigned to you",
      });
    }

    module.status = status;

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Module status updated successfully",
      module,
    });
  } catch (error) {
    console.error("Update Project Module Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update module status",
      error: error.message,
    });
  }
};

// =====================================================
// GET PROJECT ROLE ACCESS
// SUPER ADMIN OR AUTHORIZED EMPLOYEE
// =====================================================
export const getProjectRoleAccess = async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = req.user;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    let project;

    if (user?.role === "superadmin") {
      project = await Project.findById(projectId);
    } else if (user?.role === "employee") {
      const result = await getProjectForEmployee(projectId, user);

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error,
        });
      }

      project = result.project;
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const employees = await Employee.find({
      companyId: project.companyId,
    })
      .select("_id name empId email roleId departmentId status")
      .populate("roleId", "roleName parentRoleId")
      .populate("departmentId", "departmentName")
      .sort({ name: 1 });

    const accessEmployeeIds = new Set(
      getProjectEmployeeIds(project)
    );

    const groupedRoles = await Role.find({
      companyId: project.companyId,
    })
      .select("roleName parentRoleId companyId")
      .sort({ roleName: 1 })
      .lean();

    const roleAccess = groupedRoles.map((role) => {
      const roleEmployees = employees
        .filter(
          (employee) =>
            String(employee.roleId?._id || employee.roleId) ===
            String(role._id)
        )
        .map((employee) => ({
          employee,
          hasAccess: accessEmployeeIds.has(
            String(employee._id)
          ),
        }));

      return {
        role,
        employees: roleEmployees,
        hasAccess: roleEmployees.some((item) => item.hasAccess),
        employeeCount: roleEmployees.length,
        accessibleEmployeeCount: roleEmployees.filter(
          (item) => item.hasAccess
        ).length,
      };
    });

    return res.status(200).json({
      success: true,
      projectId,
      roleAccess,
    });
  } catch (error) {
    console.error("Get Project Employee Access Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get project employee access",
      error: error.message,
    });
  }
};


// =====================================================
// GRANT PROJECT ACCESS TO A DIRECT CHILD ROLE
// =====================================================
export const grantProjectAccess = async (req, res) => {
  try {
    const assigner = req.user;
    const { projectId } = req.params;
    const { employeeId } = req.body;

    if (
      !isValidId(projectId) ||
      !isValidId(employeeId) ||
      !isValidId(assigner?.roleId) ||
      !isValidId(assigner?.companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid project ID and employee ID are required",
      });
    }

    const result = await getProjectForEmployee(projectId, assigner);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const project = result.project;

    const targetEmployee = await Employee.findOne({
      _id: employeeId,
      companyId: assigner.companyId,
    }).select("_id roleId name");

    if (!targetEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in your company",
      });
    }

    const branchIds = await getRoleBranchIds(
      assigner.companyId,
      assigner.roleId
    );

    if (
      !branchIds.includes(
        String(targetEmployee.roleId)
      ) ||
      String(targetEmployee._id) ===
        String(getEmployeeId(assigner))
    ) {
      return res.status(403).json({
        success: false,
        message: "You can grant access only to employees under your hierarchy",
      });
    }

    const alreadyHasAccess = getProjectEmployeeIds(project).includes(
      String(employeeId)
    );

    if (alreadyHasAccess) {
      return res.status(409).json({
        success: false,
        message: "This employee already has project access",
      });
    }

    project.employeeAccess.push(targetEmployee._id);

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project access granted successfully",
      employee: targetEmployee,
      project,
    });
  } catch (error) {
    console.error("Employee Grant Project Access Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to grant project access",
      error: error.message,
    });
  }
};


// =====================================================
// REVOKE PROJECT ACCESS FROM A DIRECT CHILD ROLE
// Also removes access from descendants in that branch.
// =====================================================
export const revokeProjectAccess = async (req, res) => {
  try {
    const employee = req.user;
    const { projectId, employeeId } = req.params;

    if (
      !isValidId(projectId) ||
      !isValidId(employeeId) ||
      !isValidId(employee?.roleId) ||
      !isValidId(employee?.companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID or employee ID",
      });
    }

    const result = await getProjectForEmployee(projectId, employee);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const project = result.project;

    const targetEmployee = await Employee.findOne({
      _id: employeeId,
      companyId: employee.companyId,
    }).select("_id roleId");

    if (!targetEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const branchIds = await getRoleBranchIds(
      employee.companyId,
      employee.roleId
    );

    if (
      !branchIds.includes(String(targetEmployee.roleId)) ||
      String(targetEmployee._id) ===
        String(getEmployeeId(employee))
    ) {
      return res.status(403).json({
        success: false,
        message: "You can revoke access only from employees under your hierarchy",
      });
    }

    const hasAccess = getProjectEmployeeIds(project).includes(
      String(employeeId)
    );

    if (!hasAccess) {
      return res.status(404).json({
        success: false,
        message: "This employee does not have project access",
      });
    }

    project.employeeAccess = project.employeeAccess.filter(
      (id) => String(id) !== String(employeeId)
    );

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project access revoked successfully",
      revokedEmployeeId: employeeId,
      project,
    });
  } catch (error) {
    console.error("Employee Revoke Project Access Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to revoke project access",
      error: error.message,
    });
  }
};

// =====================================================
// GET MY GRANTED PROJECT ACCESS — EMPLOYEE
// =====================================================
export const getMyGrantedProjectAccess = async (req, res) => {
  try {
    const employee = req.user;
    const { projectId } = req.params;

    // employeeAuth middleware provides id, companyId and roleId
    const employeeId = employee.id;

    if (
      !isValidId(projectId) ||
      !isValidId(employeeId) ||
      !isValidId(employee.companyId) ||
      !isValidId(employee.roleId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project or employee information",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      companyId: employee.companyId,
    }).select("employeeAccess");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Get the logged-in employee's role hierarchy
    const branchRoleIds = await getRoleBranchIds(
      employee.companyId,
      employee.roleId
    );

    // Find employees belonging to that hierarchy
    const employees = await Employee.find({
      companyId: employee.companyId,
      roleId: { $in: branchRoleIds },
      _id: { $ne: employeeId },
    })
      .select("_id name empId email roleId departmentId")
      .populate("roleId", "roleName")
      .populate("departmentId", "departmentName");

    // Get individually granted employee IDs
    const projectEmployeeIds = getProjectEmployeeIds(project);

    const grantedEmployees = employees.filter((emp) =>
      projectEmployeeIds.includes(String(emp._id))
    );

    return res.status(200).json({
      success: true,
      count: grantedEmployees.length,
      employees: grantedEmployees,
    });
  } catch (error) {
    console.error("Get My Granted Project Access Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch granted project access",
      error: error.message,
    });
  }
};

// =====================================================
// GET MY ACCESSIBLE PROJECTS — EMPLOYEE
// Returns active projects assigned to the employee's role.
// =====================================================
export const getMyAccessibleProjects = async (req, res) => {
  try {
    const employee = req.user;
    const employeeId = getEmployeeId(employee);

    if (!isValidId(employeeId) || !isValidId(employee.companyId)) {
      return res.status(403).json({
        success: false,
        message: "Valid employee and company information is required",
      });
    }

    const projects = await Project.find({
      companyId: employee.companyId,
      employeeAccess: employeeId,
      status: "active",
    })
      .populate("companyId", "companyName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Get My Accessible Projects Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get accessible projects",
      error: error.message,
    });
  }
};


// =====================================================
// REVOKE PROJECT ACCESS — SUPER ADMIN
// =====================================================
export const revokeProjectAccessBySuperAdmin = async (req, res) => {
  try {
    const { projectId, employeeId } = req.params;
    const user = req.user;

    if (user?.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can revoke project access",
      });
    }

    if (!isValidId(projectId) || !isValidId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID or employee ID",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const targetEmployee = await Employee.findOne({
      _id: employeeId,
      companyId: project.companyId,
    }).select("_id name");

    if (!targetEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in this company",
      });
    }

    const hasAccess = getProjectEmployeeIds(project).includes(
      String(employeeId)
    );

    if (!hasAccess) {
      return res.status(404).json({
        success: false,
        message: "This employee does not have project access",
      });
    }

    project.employeeAccess = project.employeeAccess.filter(
      (id) => String(id) !== String(employeeId)
    );

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project access revoked successfully",
      revokedEmployeeId: employeeId,
      project,
    });
  } catch (error) {
    console.error("Super Admin Revoke Project Access Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to revoke project access",
      error: error.message,
    });
  }
};


// =====================================================
// ASSIGN PROJECT MODULE TO AN EMPLOYEE
// ASSIGNER + TARGET MUST HAVE PROJECT ACCESS
// TARGET CAN BE ASSIGNER OR A DESCENDANT EMPLOYEE
// =====================================================
export const assignProjectModule = async (req, res) => {
  try {
    const { projectId, moduleId } = req.params;
    const { employeeId } = req.body;
    const assigner = req.user;
    const assignerId = getEmployeeId(assigner);

    if (
      !isValidId(projectId) ||
      !isValidId(moduleId) ||
      !isValidId(employeeId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid project, module and employee IDs are required",
      });
    }

    if (
      assigner?.role !== "employee" ||
      !isValidId(assignerId) ||
      !isValidId(assigner.companyId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Only authorized employees can assign modules",
      });
    }

    const result = await getProjectForEmployee(projectId, assigner);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const project = result.project;

    const module = project.modules.id(moduleId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found in this project",
      });
    }

    if (
      module.status !== "Not Assigned" ||
      module.assignedEmployee
    ) {
      return res.status(409).json({
        success: false,
        message: "This module has already been assigned",
      });
    }

    const projectEmployeeIds = getProjectEmployeeIds(project);

    if (!projectEmployeeIds.includes(String(employeeId))) {
      return res.status(403).json({
        success: false,
        message: "The selected employee does not have access to this project",
      });
    }

    const targetEmployee = await Employee.findOne({
      _id: employeeId,
      companyId: project.companyId,
      status: "active",
    }).select("_id name empId companyId roleId departmentId");

    if (!targetEmployee) {
      return res.status(404).json({
        success: false,
        message: "Active employee not found in this company",
      });
    }

    module.assignedEmployee = targetEmployee._id;
    module.assignedBy = assignerId;
    module.assignedAt = new Date();
    module.status = "Assigned";

    await project.save();

    await targetEmployee.populate([
      { path: "roleId", select: "roleName" },
      { path: "departmentId", select: "departmentName" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Module assigned successfully",
      module,
      assignedEmployee: targetEmployee,
    });
  } catch (error) {
    console.error("Assign Project Module Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to assign project module",
      error: error.message,
    });
  }
};

// =====================================================
// GET EMPLOYEES ELIGIBLE FOR MODULE ASSIGNMENT
// OWN ROLE + DESCENDANT ROLES WITH PROJECT ACCESS
// =====================================================
export const getEmployeesForModuleAssignment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const assigner = req.user;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (
      assigner?.role !== "employee" ||
      !isValidId(getEmployeeId(assigner)) ||
      !isValidId(assigner.companyId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Only authorized employees can assign modules",
      });
    }

    const result = await getProjectForEmployee(projectId, assigner);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const project = result.project;

    const employees = await Employee.find({
      _id: { $in: project.employeeAccess || [] },
      companyId: project.companyId,
      status: "active",
    })
      .select("_id name empId roleId departmentId")
      .populate("roleId", "roleName")
      .populate("departmentId", "departmentName")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error(
      "Get Employees For Module Assignment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get employees for module assignment",
      error: error.message,
    });
  }
};


 // =====================================================
// GET MODULES ASSIGNED TO LOGGED-IN EMPLOYEE
// EMPLOYEE ONLY
// =====================================================
export const getMyAssignedModules = async (req, res) => {
  try {
    const employee = req.user;
    const employeeId = employee?._id || employee?.id;

    if (
      employee?.role !== "employee" ||
      !isValidId(employeeId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Valid employee authentication is required",
      });
    }

    const projects = await Project.find({
      "modules.assignedEmployee": employeeId,
    })
      .select("projectName projectCode modules")
      .sort({ createdAt: -1 })
      .lean();

    const modules = projects.flatMap((project) =>
      (project.modules || [])
        .filter(
          (module) =>
            String(module.assignedEmployee) === String(employeeId)
        )
        .map((module) => ({
          _id: module._id,
          moduleName: module.moduleName,
          status: module.status || "Assigned",
          assignedAt: module.assignedAt || null,
          projectId: project._id,
          projectName: project.projectName,
          projectCode: project.projectCode || "",
        }))
    );

    return res.status(200).json({
      success: true,
      count: modules.length,
      modules,
    });
  } catch (error) {
    console.error("Get My Assigned Modules Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get assigned modules",
      error: error.message,
    });
  }
};

// =====================================================
// GET EMPLOYEES ELIGIBLE FOR PROJECT MODULE ASSIGNMENT
// =====================================================
export const getAssignableEmployees = async (req, res) => {
  try {
    const { projectId } = req.params;
    const assigner = req.user;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (
      assigner?.role !== "employee" ||
      !isValidId(getEmployeeId(assigner)) ||
      !isValidId(assigner.companyId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Only authorized employees can view assignable employees",
      });
    }

    const result = await getProjectForEmployee(projectId, assigner);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const project = result.project;

    const employees = await Employee.find({
      _id: { $in: project.employeeAccess || [] },
      companyId: project.companyId,
      status: "active",
    })
      .select("_id name empId roleId departmentId")
      .populate("roleId", "roleName")
      .populate("departmentId", "departmentName")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get Assignable Employees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load assignable employees",
      error: error.message,
    });
  }
};

// =====================================================
// GET ACTIVE PROJECTS BY COMPANY
// =====================================================
export const getActiveProjectsByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
    }

    const projects = await Project.find({
      companyId,
      status: "active",
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Get active projects by company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch active projects.",
    });
  }
};

// =====================================================
// GRANT PROJECT ACCESS — SUPER ADMIN
// =====================================================
export const grantProjectAccessBySuperAdmin = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { employeeIds } = req.body;
    const user = req.user;

    if (user?.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can grant project access",
      });
    }

    if (!isValidId(projectId) || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        message: "Valid project ID and employeeIds array are required",
      });
    }

    // Super Admin can grant access to ANY project.
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const validatedEmployees = await validateCompanyEmployees(
      employeeIds,
      project.companyId
    );

    if (validatedEmployees.error) {
      return res.status(400).json({
        success: false,
        message: validatedEmployees.error,
      });
    }

    const existingIds = new Set(getProjectEmployeeIds(project));

    const newEmployees = validatedEmployees.employeeIds.filter(
      (employee) => !existingIds.has(String(employee._id))
    );

    if (newEmployees.length === 0) {
      return res.status(409).json({
        success: false,
        message: "All selected employees already have project access",
      });
    }

    project.employeeAccess.push(...newEmployees);

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project access granted successfully",
      grantedEmployeeIds: newEmployees.map((employee) =>
        String(employee._id)
      ),
      project,
    });
  } catch (error) {
    console.error("Super Admin Grant Project Access Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to grant project access",
      error: error.message,
    });
  }
};

// =====================================================
// GET PROJECTS CREATED BY LOGGED-IN EMPLOYEE
// =====================================================

export const getMyCreatedProjects = async (req, res) => {
  try {
    const employeeId = req.user?._id || req.user?.id;

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
      });
    }

    const projects = await Project.find({
      createdByEmployee: employeeId,
      status: { $in: ["active", "inactive"] },
    })
      .populate("companyId", "companyName")
      .populate("employeeAccess", "employeeName employeeId email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Get My Created Projects Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your created projects.",
      error: error.message,
    });
  }
};