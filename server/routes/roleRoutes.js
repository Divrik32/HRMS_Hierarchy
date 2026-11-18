
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

import {
  getPendingCompOffRequests,
  approveCompOffRequest,
  rejectCompOffRequest,
} from "../controllers/compOffController.js";

import { getAllEmployeeLeaves } from "../controllers/leaveController.js";

import superAdminAuth from "../middleware/superAdminAuth.js";
import superAdminCompanyAuth from "../middleware/superAdminCompanyAuth.js";
import employeeAuth from "../middleware/employeeAuth.js";

const router = express.Router();

// Create Role
router.post("/", superAdminAuth, createRole);

// Get All Roles Of A Company
router.get("/company/:companyId", superAdminAuth, getCompanyRoles);

// Get All Roles Of Own Company - Employee
router.get(
  "/company/:companyId/employee",
  employeeAuth,
  getCompanyRoles
);

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


// =====================================================
// SUPER ADMIN - HR PERSONAL COMP-OFF APPROVALS
// =====================================================

router.get(
  "/comp-off/super-admin/pending",
  superAdminCompanyAuth,
  getPendingCompOffRequests
);

router.patch(
  "/comp-off/:id/super-admin/approve",
  superAdminCompanyAuth,
  approveCompOffRequest
);

router.patch(
  "/comp-off/:id/super-admin/reject",
  superAdminCompanyAuth,
  rejectCompOffRequest
);


// =====================================================
// SUPER ADMIN - ALL EMPLOYEE LEAVES
// =====================================================

router.get(
  "/super-admin/all-employee-leaves",
  superAdminCompanyAuth,
  getAllEmployeeLeaves
);

export default router;
