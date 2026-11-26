import express from "express";

import {
  createLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  getSuperAdminPendingLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  withdrawLeaveRequest,
  // Super Admin All Employee Leaves
  getAllEmployeeLeaves,
  getAllCompanyEmployeeLeavesForSuperAdmin,
  getMyLeaveBalance,
} from "../controllers/leaveController.js";

import employeeAuth from "../middleware/employeeAuth.js";
import superAdminCompanyAuth from "../middleware/superAdminCompanyAuth.js";
import { getCompOffCalendar } from "../services/leaveBusinessLogics.js";

const router = express.Router();

// =====================================================
// EMPLOYEE — LEAVE APPLICATION
// =====================================================

router.post("/", employeeAuth, createLeaveRequest);


// =====================================================
// EMPLOYEE — OWN LEAVE INFORMATION
// =====================================================

router.get(
  "/my-balance",
  employeeAuth,
  getMyLeaveBalance
);

router.get(
  "/my-requests",
  employeeAuth,
  getMyLeaveRequests
);

router.get(
  "/comp-off/calendar",
  employeeAuth,
  getCompOffCalendar
);

// =====================================================
// EMPLOYEE — WITHDRAW OWN PENDING LEAVE
// =====================================================

router.patch(
  "/:leaveRequestId/withdraw",
  employeeAuth,
  withdrawLeaveRequest
);

// =====================================================
// EMPLOYEE / HR — LEAVE APPROVALS
// =====================================================

router.get(
  "/pending",
  employeeAuth,
  getPendingLeaveRequests
);

router.patch(
  "/:leaveRequestId/approve",
  employeeAuth,
  approveLeaveRequest
);

router.patch(
  "/:leaveRequestId/reject",
  employeeAuth,
  rejectLeaveRequest
);

// =====================================================
// SUPER ADMIN — TOP-LEVEL EMPLOYEE LEAVE APPROVALS
// =====================================================

router.get(
  "/super-admin/pending",
  superAdminCompanyAuth,
  getSuperAdminPendingLeaveRequests
);

router.patch(
  "/:leaveRequestId/super-admin/approve",
  superAdminCompanyAuth,
  approveLeaveRequest
);

router.patch(
  "/:leaveRequestId/super-admin/reject",
  superAdminCompanyAuth,
  rejectLeaveRequest
);

// =====================================================
// SUPER ADMIN AND HR — ALL EMPLOYEE LEAVES (READ ONLY)
// =====================================================

router.get(
  "/super-admin/all-employee-leaves",
  superAdminCompanyAuth,
  getAllCompanyEmployeeLeavesForSuperAdmin
);

router.get(
  "/all-employee-leaves",
  employeeAuth,
  getAllEmployeeLeaves
);

export default router;