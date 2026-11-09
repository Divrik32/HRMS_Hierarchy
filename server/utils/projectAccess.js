import mongoose from "mongoose";
import Project from "../models/Project.js";
import Role from "../models/Role.js";

export const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

// Find project and verify employee access.
export const getProjectForEmployee = async (projectId, employee) => {
  if (!isValidId(projectId)) {
    return { error: "Invalid project ID", status: 400 };
  }

  const project = await Project.findOne({
    _id: projectId,
    companyId: employee.companyId,
  });

  if (!project) {
    return { error: "Project not found", status: 404 };
  }

  if (project.status !== "active") {
    return { error: "Project is inactive", status: 403 };
  }

  const employeeId = employee?._id || employee?.id;

const hasAccess = project.employeeAccess?.some(
  (id) => String(id?._id || id) === String(employeeId)
);

  if (!hasAccess) {
    return {
      error: "You do not have access to this project",
      status: 403,
    };
  }

  return { project };
};

// Find a role and all its descendant roles.
export const getRoleBranchIds = async (companyId, rootRoleId) => {
  const branchIds = [rootRoleId.toString()];
  let i = 0;

  while (i < branchIds.length) {
    const children = await Role.find({
      companyId,
      parentRoleId: branchIds[i],
    }).select("_id");

    for (const child of children) {
      const childId = child._id.toString();

      if (!branchIds.includes(childId)) {
        branchIds.push(childId);
      }
    }

    i++;
  }

  return branchIds;
};