import express from "express";
import {
  createRole,
  getCompanyRoles,
  getRoleById,
  getChildRoles,
  getRootRoles,
  updateRole,
  deleteRole,
} from "../controllers/roleController.js";
import superAdminAuth from "../middleware/superAdminAuth.js";

const router = express.Router();


// Create Role
router.post("/", superAdminAuth, createRole);

// Get All Roles Of A Company
router.get("/company/:companyId", superAdminAuth, getCompanyRoles);

// Get Root Roles Of A Company
router.get("/company/:companyId/root", superAdminAuth, getRootRoles);

// Get Single Role
router.get("/:roleId", superAdminAuth, getRoleById);

// Get Child Roles Of A Role
router.get("/:roleId/children", superAdminAuth, getChildRoles);

// Update Role
router.put("/:roleId", superAdminAuth, updateRole);

// Delete Role
router.delete("/:roleId", superAdminAuth, deleteRole);


export default router;