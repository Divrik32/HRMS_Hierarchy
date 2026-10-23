import mongoose from "mongoose";
import Role from "../models/Role.js";
import Company from "../models/Company.js";


// Create Role
export const createRole = async (req, res) => {
  try {
    const { roleName, companyId, parentRoleId } = req.body;

    if (!roleName || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Role name and company ID are required",
      });
    }

    // Check company exists
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check duplicate role name inside same company
    const existingRole = await Role.findOne({
      companyId,
      roleName: roleName.trim(),
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: "This role already exists in this company",
      });
    }

    // If parent role is selected
    if (parentRoleId) {
      if (!mongoose.Types.ObjectId.isValid(parentRoleId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent role ID",
        });
      }

      const parentRole = await Role.findOne({
        _id: parentRoleId,
        companyId,
      });

      if (!parentRole) {
        return res.status(400).json({
          success: false,
          message: "Parent role does not belong to this company",
        });
      }
    }

    const role = await Role.create({
      roleName: roleName.trim(),
      companyId,
      parentRoleId: parentRoleId || null,
    });

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      role,
    });
  } catch (error) {
    console.error("Create Role Error:", error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This role already exists in this company",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create role",
      error: error.message,
    });
  }
};


// Get All Roles Of A Company
export const getCompanyRoles = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const roles = await Role.find({ companyId })
      .populate("parentRoleId", "roleName")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: roles.length,
      roles,
    });
  } catch (error) {
    console.error("Get Company Roles Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get company roles",
      error: error.message,
    });
  }
};


// Get Single Role
export const getRoleById = async (req, res) => {
  try {
    const { roleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const role = await Role.findById(roleId)
      .populate("companyId", "companyName")
      .populate("parentRoleId", "roleName");

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    return res.status(200).json({
      success: true,
      role,
    });
  } catch (error) {
    console.error("Get Role Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get role",
      error: error.message,
    });
  }
};


// Get Child Roles Of A Role
export const getChildRoles = async (req, res) => {
  try {
    const { roleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    const childRoles = await Role.find({
      parentRoleId: roleId,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: childRoles.length,
      parentRole: role.roleName,
      childRoles,
    });
  } catch (error) {
    console.error("Get Child Roles Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get child roles",
      error: error.message,
    });
  }
};


// Get Root Roles Of A Company
export const getRootRoles = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const rootRoles = await Role.find({
      companyId,
      parentRoleId: null,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: rootRoles.length,
      roles: rootRoles,
    });
  } catch (error) {
    console.error("Get Root Roles Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get root roles",
      error: error.message,
    });
  }
};


// Update Role
export const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { roleName, parentRoleId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Update role name
    if (roleName !== undefined) {
      const trimmedRoleName = roleName.trim();

      if (!trimmedRoleName) {
        return res.status(400).json({
          success: false,
          message: "Role name cannot be empty",
        });
      }

      // Check duplicate role name inside same company
      const existingRole = await Role.findOne({
        companyId: role.companyId,
        roleName: trimmedRoleName,
        _id: { $ne: roleId },
      });

      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: "This role already exists in this company",
        });
      }

      role.roleName = trimmedRoleName;
    }


    // Update parent role
    if (parentRoleId !== undefined) {
      // Make role a root role
      if (parentRoleId === null || parentRoleId === "") {
        role.parentRoleId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(parentRoleId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid parent role ID",
          });
        }

        // Cannot be its own parent
        if (parentRoleId === roleId) {
          return res.status(400).json({
            success: false,
            message: "A role cannot be its own parent",
          });
        }

        // Parent must belong to same company
        const parentRole = await Role.findOne({
          _id: parentRoleId,
          companyId: role.companyId,
        });

        if (!parentRole) {
          return res.status(400).json({
            success: false,
            message: "Parent role does not belong to this company",
          });
        }

        // Prevent circular hierarchy
        const isCircular = await checkCircularHierarchy(
          roleId,
          parentRoleId
        );

        if (isCircular) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid parent role. This would create a circular hierarchy",
          });
        }

        role.parentRoleId = parentRoleId;
      }
    }

    await role.save();

    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      role,
    });
  } catch (error) {
    console.error("Update Role Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This role already exists in this company",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update role",
      error: error.message,
    });
  }
};


// Delete Role
export const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Check whether this role has child roles
    const childRolesCount = await Role.countDocuments({
      parentRoleId: roleId,
    });

    if (childRolesCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "This role cannot be deleted because it has child roles. Delete or move the child roles first.",
        childRolesCount,
      });
    }

    await Role.findByIdAndDelete(roleId);

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Delete Role Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete role",
      error: error.message,
    });
  }
};


// Check Circular Hierarchy
const checkCircularHierarchy = async (roleId, newParentRoleId) => {
  let currentRoleId = newParentRoleId;

  while (currentRoleId) {
    const currentRole = await Role.findById(currentRoleId).select(
      "parentRoleId"
    );

    if (!currentRole) {
      break;
    }

    // If we reach the role itself, circular hierarchy exists
    if (currentRole._id.toString() === roleId.toString()) {
      return true;
    }

    currentRoleId = currentRole.parentRoleId;
  }

  return false;
};