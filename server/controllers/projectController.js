import Project from "../models/Project.js";
import Role from "../models/Role.js";
import Company from "../models/Company.js";
import Employee from "../models/Employee.js";
import DeletedProject from "../models/DeletedProject.js";


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


// =====================================================
// CREATE PROJECT — SUPER ADMIN ONLY
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
      companyId,
      assignedRootRoles = [],
      roleAccess: requestedRoleAccess,
      modules = [],
    } = req.body;

    if (
      typeof projectName !== "string" ||
      !projectName.trim() ||
      typeof clientName !== "string" ||
      !clientName.trim() ||
      !companyId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Project name, client name and company ID are required",
      });
    }

    if (!isValidId(companyId) || !isValidId(req.user?.id)) {
      return res.status(400).json({
        success: false,
        message: "Valid company ID and Super Admin ID are required",
      });
    }

    if (!Array.isArray(modules)) {
      return res.status(400).json({
        success: false,
        message: "Modules must be an array",
      });
    }

    const initialRoleIds = requestedRoleAccess ?? assignedRootRoles;

    if (!Array.isArray(initialRoleIds)) {
      return res.status(400).json({
        success: false,
        message: "Role access must be an array",
      });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
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

    const uniqueRoleIds = [...new Set(initialRoleIds.map(String))];

    if (uniqueRoleIds.some((id) => !isValidId(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const rootRoles = await Role.find({
      _id: { $in: uniqueRoleIds },
      companyId,
      parentRoleId: null,
    });

    if (rootRoles.length !== uniqueRoleIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "Initially assigned roles must be root roles in this company",
      });
    }

    const projectData = {
      projectName: projectName.trim(),
      clientName: clientName.trim(),
      projectDetails: projectDetails?.trim() || "",
      remarks: remarks?.trim() || "",
      projectDescription: projectDescription?.trim() || "",
      companyId,
      createdBy: req.user.id,
      roleAccess: uniqueRoleIds,
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
      .populate("roleAccess", "roleName parentRoleId")
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

    // Super Admin can view any company's project.
    if (req.user.role === "superadmin") {
      project = await Project.findById(projectId)
        .populate("companyId", "companyName")
        .populate("roleAccess", "roleName parentRoleId")
        .populate("createdBy", "name email");

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
    }

    // Only employees who have access to the project can view it.
    else if (req.user.role === "employee") {
      const employee = req.user;

      const result = await getProjectForEmployee(
        projectId,
        employee
      );

      if (result.error) {
        return res.status(result.status).json({
          success: false,
          message: result.error,
        });
      }

      project = await Project.findById(projectId)
        .populate("companyId", "companyName")
        .populate("roleAccess", "roleName parentRoleId");

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
// DELETE PROJECT — SUPER ADMIN ONLY
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

    // Save the complete project before removing it.
    await DeletedProject.create({
      originalProjectId: project._id,
      projectName: project.projectName,
      projectCode: project.projectCode,
      clientName: project.clientName,
      projectDetails: project.projectDetails,
      remarks: project.remarks,
      projectDescription: project.projectDescription,
      companyId: project.companyId,
      createdBy: project.createdBy,
      roleAccess: project.roleAccess,
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
      deletedBy: req.user.id,
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


/* =====================================================
   GET DELETED PROJECTS — SUPER ADMIN ONLY
===================================================== */
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
      .populate("roleAccess", "roleName parentRoleId")
      .populate("createdBy", "name email")
      .populate("deletedBy", "name email")
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


/* =====================================================
   RESTORE DELETED PROJECT — SUPER ADMIN ONLY
   Uses the original project ID.
===================================================== */
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

    // Check whether a project with the original ID already exists.
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

    // Check unique company + project name constraint.
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

    // Check globally unique project code constraint.
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
      createdBy: archivedProject.createdBy,
      roleAccess: archivedProject.roleAccess,
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

    // Remove the archive only after restoring successfully.
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
// ASSIGN ROOT ROLES — SUPER ADMIN ONLY
// Adds validated root roles to roleAccess.
// It does not erase existing delegated access.
// =====================================================
// =====================================================
// ASSIGN ROOT ROLES — SUPER ADMIN ONLY
// =====================================================
export const assignRootRoles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { roleIds } = req.body;

    if (!isValidId(projectId) || !Array.isArray(roleIds)) {
      return res.status(400).json({
        success: false,
        message: "Valid project ID and roleIds array are required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const uniqueRoleIds = [...new Set(roleIds.map(String))];

    if (uniqueRoleIds.some((id) => !isValidId(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const rootRoles = await Role.find({
      _id: { $in: uniqueRoleIds },
      companyId: project.companyId,
      parentRoleId: null,
    });

    if (rootRoles.length !== uniqueRoleIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "All assigned roles must be root roles belonging to the project's company",
      });
    }

    // Existing role access বজায় রেখে নতুন root roles যোগ করবে।
    const combinedIds = new Set([
      ...project.roleAccess.map(String),
      ...uniqueRoleIds,
    ]);

    project.roleAccess = [...combinedIds];

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Root roles added to project access successfully",
      project,
    });
  } catch (error) {
    console.error("Assign Root Roles Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to assign root roles",
      error: error.message,
    });
  }
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

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    let project;
    let employee = null;

    if (req.user?.role === "superadmin") {
      project = await Project.findById(projectId);
    } else if (req.user?.role === "employee") {
      employee = req.user;

      const result = await getProjectForEmployee(
        projectId,
        employee
      );

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

    const roles = await Role.find({
      companyId: project.companyId,
    })
      .select("roleName parentRoleId companyId")
      .sort({ roleName: 1 });

    const accessRoleIds = new Set(
      project.roleAccess.map((id) => id.toString())
    );

    const roleAccess = roles.map((role) => {
      const hasProjectAccess = accessRoleIds.has(
        role._id.toString()
      );

      // Super Admin can see actual project access.
      // Employee can manage only direct child roles.
      const isDirectChild =
        employee &&
        role.parentRoleId?.toString() ===
          employee.roleId?.toString();

      const hasAccess = employee
        ? Boolean(isDirectChild && hasProjectAccess)
        : hasProjectAccess;

      return {
        role,
        hasAccess,
        accessType: hasAccess ? "has-access" : "none",
        canManageAccess: employee
          ? Boolean(isDirectChild)
          : true,
      };
    });

    return res.status(200).json({
      success: true,
      projectId,
      roleAccess,
    });
  } catch (error) {
    console.error("Get Project Role Access Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get project role access",
      error: error.message,
    });
  }
};


// =====================================================
// GRANT PROJECT ACCESS TO A DIRECT CHILD ROLE
// =====================================================
export const grantProjectAccess = async (req, res) => {
  try {
    const employee = req.user;

    if (!employee?.roleId) {
      return res.status(403).json({
        success: false,
        message: "Employee does not have an assigned role",
      });
    }

    const { projectId } = req.params;
    const { roleId } = req.body;

    if (!isValidId(projectId) || !isValidId(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Valid project ID and role ID are required",
      });
    }

    // Verify project and employee access using the shared helper.
    const result = await getProjectForEmployee(
      projectId,
      employee
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const project = result.project;

    // Employee can grant access only to their direct child roles.
    const childRole = await Role.findOne({
      _id: roleId,
      companyId: employee.companyId,
      parentRoleId: employee.roleId,
    });

    if (!childRole) {
      return res.status(403).json({
        success: false,
        message:
          "You can grant access only to your direct child roles",
      });
    }

    const alreadyHasAccess = project.roleAccess.some(
      (id) => id.toString() === childRole._id.toString()
    );

    if (alreadyHasAccess) {
      return res.status(409).json({
        success: false,
        message: "This role already has project access",
      });
    }

    project.roleAccess.push(childRole._id);

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project access granted successfully",
      roleId: childRole._id,
      roleName: childRole.roleName,
      project,
    });
  } catch (error) {
    console.error("Grant Project Access Error:", error);

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

    if (!employee?.roleId) {
      return res.status(403).json({
        success: false,
        message: "Employee does not have an assigned role",
      });
    }

    const { projectId, roleId } = req.params;

    if (!isValidId(projectId) || !isValidId(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID or role ID",
      });
    }

    // Verify project and employee access using the shared helper.
    const result = await getProjectForEmployee(
      projectId,
      employee
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const project = result.project;

    // Employee can revoke access only from their direct child roles.
    const childRole = await Role.findOne({
      _id: roleId,
      companyId: employee.companyId,
      parentRoleId: employee.roleId,
    });

    if (!childRole) {
      return res.status(403).json({
        success: false,
        message:
          "You can revoke access only from your direct child roles",
      });
    }

    const hasChildAccess = project.roleAccess.some(
      (id) => id.toString() === childRole._id.toString()
    );

    if (!hasChildAccess) {
      return res.status(404).json({
        success: false,
        message: "This child role does not have project access",
      });
    }

    // Find the child role and all its descendant roles.
    const branchIds = await getRoleBranchIds(
      employee.companyId,
      childRole._id
    );

    // Revoke access from the entire role branch.
    const branchIdSet = new Set(branchIds);

    project.roleAccess = project.roleAccess.filter(
      (id) => !branchIdSet.has(id.toString())
    );

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project access revoked successfully",
      revokedRoleIds: branchIds,
      project,
    });
  } catch (error) {
    console.error("Revoke Project Access Error:", error);

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

    if (!employee?.roleId) {
      return res.status(403).json({
        success: false,
        message: "Employee does not have an assigned role",
      });
    }

    const { projectId } = req.params;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Verify project and employee access using the shared helper.
    const result = await getProjectForEmployee(
      projectId,
      employee
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const project = result.project;

    // Find direct child roles of the current employee's role.
    const childRoles = await Role.find({
      companyId: employee.companyId,
      parentRoleId: employee.roleId,
    }).select("roleName parentRoleId companyId");

    const accessRoleIds = new Set(
      project.roleAccess.map(String)
    );

    const grantedAccess = childRoles
      .filter((role) => accessRoleIds.has(role._id.toString()))
      .map((role) => ({
        role,
        hasAccess: true,
      }));

    return res.status(200).json({
      success: true,
      count: grantedAccess.length,
      grantedAccess,
    });
  } catch (error) {
    console.error("Get Granted Project Access Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get granted project access",
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

    if (!employee?.roleId || !employee?.companyId) {
      return res.status(403).json({
        success: false,
        message: "Employee role or company is not assigned",
      });
    }

    if (
      !isValidId(employee.roleId) ||
      !isValidId(employee.companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee role ID or company ID",
      });
    }

    // Find all active projects in the employee's company
    // where the employee's role has project access.
    const projects = await Project.find({
      companyId: employee.companyId,
      roleAccess: employee.roleId,
      status: "active",
    })
      .populate("companyId", "companyName")
      .populate("roleAccess", "roleName parentRoleId")
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


/**
 * REVOKE PROJECT ACCESS — SUPER ADMIN ONLY
 * Removes access from the selected root role and all descendant roles.
 */
export const revokeProjectAccessBySuperAdmin = async (req, res) => {
  try {
    const { projectId, roleId } = req.params;
    const user = req.user;

    // Only Super Admin can use this controller.
    if (user?.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can revoke project access",
      });
    }

    if (!isValidId(projectId) || !isValidId(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID or role ID",
      });
    }

    // Find the project created by this Super Admin.
    const project = await Project.findOne({
      _id: projectId,
      createdBy: user.id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied",
      });
    }

    // The selected role must belong to this project's company.
    const selectedRole = await Role.findOne({
      _id: roleId,
      companyId: project.companyId,
    });

    if (!selectedRole) {
      return res.status(404).json({
        success: false,
        message: "Role not found in this project's company",
      });
    }

    // Get the selected role and all roles under its hierarchy.
    const branchIds = await getRoleBranchIds(
      project.companyId,
      selectedRole._id
    );

    const branchIdSet = new Set(branchIds.map(String));

    // Remove access from the entire role branch.
    const previousAccessIds = project.roleAccess.map(String);

    project.roleAccess = project.roleAccess.filter(
      (id) => !branchIdSet.has(id.toString())
    );

    const removedRoleIds = previousAccessIds.filter(
      (id) => branchIdSet.has(id)
    );

    // If no access was removed, return a clear response.
    if (removedRoleIds.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "The selected role and its descendants do not have project access",
      });
    }

    await project.save();

    return res.status(200).json({
      success: true,
      message:
        "Project access revoked from the selected role and all descendants",
      projectId: project._id,
      revokedRoleIds: removedRoleIds,
      project,
    });
  } catch (error) {
    console.error(
      "Super Admin Revoke Project Access Error:",
      error
    );

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
      !isValidId(assigner.roleId) ||
      !isValidId(assigner.companyId) ||
      !isValidId(assigner._id || assigner.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Only authorized employees can assign modules",
      });
    }

    // 1. Verify the assigner's project access.
    const result = await getProjectForEmployee(projectId, assigner);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const project = result.project;

    // 2. Find the module.
    const module = project.modules.id(moduleId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found in this project",
      });
    }

    // 3. Only an unassigned module can be assigned.
    if (
      module.status !== "Not Assigned" ||
      module.assignedEmployee
    ) {
      return res.status(409).json({
        success: false,
        message: "This module has already been assigned",
      });
    }

// 4. Get all roles in the assigner's hierarchy.
const assignerBranchRoleIds = await getRoleBranchIds(
  assigner.companyId,
  assigner.roleId
);

const assignerBranchRoleIdSet = new Set(
  assignerBranchRoleIds.map(String)
);

// 5. Get ONLY roles explicitly granted access to this project.
const projectAccessRoleIds = (project.roleAccess || []).map(
  (role) => String(role?._id || role)
);

// 6. Employee role must:
// - Be explicitly present in project.roleAccess.
// - Belong to the assigner's own role hierarchy.
const eligibleRoleIds = projectAccessRoleIds.filter((roleId) =>
  assignerBranchRoleIdSet.has(roleId)
);

if (eligibleRoleIds.length === 0) {
  return res.status(403).json({
    success: false,
    message:
      "No eligible employees with direct project access were found",
  });
}

    // 6. Verify target employee is active, belongs to this company,
    // and has a role in the eligible role list.
    const targetEmployee = await Employee.findOne({
      _id: employeeId,
      companyId: assigner.companyId,
      roleId: { $in: eligibleRoleIds },
      status: "active",
    }).select("_id name empId companyId roleId departmentId");

    if (!targetEmployee) {
      return res.status(403).json({
        success: false,
        message:
          "The selected employee must be active, within your role hierarchy, and have project access",
      });
    }

    // 7. Assign the module.
    module.assignedEmployee = targetEmployee._id;
    module.assignedBy = assigner._id || assigner.id;
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
      !isValidId(assigner.roleId) ||
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

    // Current role + all descendant roles.
    const branchRoleIds = await getRoleBranchIds(
      assigner.companyId,
      assigner.roleId
    );

    // Only roles explicitly granted access to this project.
    const projectAccessRoleIds = (project.roleAccess || []).map(
      (roleId) => roleId.toString()
    );

    const eligibleRoleIds = branchRoleIds.filter((roleId) =>
      projectAccessRoleIds.includes(roleId)
    );

    if (eligibleRoleIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        employees: [],
      });
    }

    const employees = await Employee.find({
      companyId: assigner.companyId,
      roleId: { $in: eligibleRoleIds },
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
    const assignerId = assigner?._id || assigner?.id;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (
      assigner?.role !== "employee" ||
      !isValidId(assignerId) ||
      !isValidId(assigner.roleId) ||
      !isValidId(assigner.companyId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Only authorized employees can view assignable employees",
      });
    }

    // Verify that the logged-in employee can access this project.
    const result = await getProjectForEmployee(projectId, assigner);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const project = result.project;

// Only roles explicitly granted access to this project.
const projectAccessRoleIds = (project.roleAccess || []).map(
  (role) => String(role?._id || role)
);

// Only employees whose roles:
// 1. Have direct project access.
// 2. Are within the assigner's own role hierarchy.
const assignerBranchRoleIds = await getRoleBranchIds(
  assigner.companyId,
  assigner.roleId
);

const assignerBranchRoleIdSet = new Set(
  assignerBranchRoleIds.map(String)
);

const eligibleRoleIds = projectAccessRoleIds.filter(
  (roleId) => assignerBranchRoleIdSet.has(roleId)
);

    if (eligibleRoleIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        employees: [],
      });
    }

    const employees = await Employee.find({
      companyId: assigner.companyId,
      roleId: { $in: eligibleRoleIds },
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