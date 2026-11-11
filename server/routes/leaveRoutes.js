import express from "express";

import {
  createLeaveRequest,
  createCompOffCredit,
  getMyLeaveBalance,
  getMyLeaveRequests,
  getMyCompOffCredits,
  getPendingLeaveRequests,
  getSuperAdminPendingLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  withdrawLeaveRequest,
  getCompOffEmployees,
  getCompOffCalendar,
  getPendingCompOffRequests,
  approveCompOffRequest,
  rejectCompOffRequest,

  // Super Admin Comp-Off
  getSuperAdminPendingCompOffRequests,
  approveSuperAdminCompOffRequest,
  rejectSuperAdminCompOffRequest,

  // Super Admin All Employee Leaves
  getAllEmployeeLeaves,
  getApprovedCompOffs,
} from "../controllers/leaveController.js";

import employeeAuth from "../middleware/employeeAuth.js";
import superAdminCompanyAuth from "../middleware/superAdminCompanyAuth.js";

const router = express.Router();

// =====================================================
// EMPLOYEE — LEAVE APPLICATION
// =====================================================

router.post("/", employeeAuth, createLeaveRequest);

// =====================================================
// HR — CREATE COMP-OFF
// =====================================================

router.post(
  "/comp-off/credit",
  employeeAuth,
  createCompOffCredit
);

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
  "/my-comp-offs",
  employeeAuth,
  getMyCompOffCredits
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
// HR — COMP-OFF EMPLOYEE LIST
// =====================================================

router.get(
  "/comp-off/employees",
  employeeAuth,
  getCompOffEmployees
);

// =====================================================
// EMPLOYEE — OWN APPROVED COMP-OFF RECORDS
// =====================================================

router.get(
  "/comp-off/approved",
  employeeAuth,
  getApprovedCompOffs
);

// =====================================================
// SUPER ADMIN — ALL EMPLOYEES' APPROVED COMP-OFF RECORDS
// =====================================================

router.get(
  "/comp-off/super-admin/approved",
  superAdminCompanyAuth,
  getApprovedCompOffs
);

// =====================================================
// HR — COMP-OFF APPROVALS
// HR can approve only requests created by HR for OTHER employees.
// =====================================================

router.get(
  "/comp-off/pending",
  employeeAuth,
  getPendingCompOffRequests
);

router.patch(
  "/comp-off/:id/approve",
  employeeAuth,
  approveCompOffRequest
);

router.patch(
  "/comp-off/:id/reject",
  employeeAuth,
  rejectCompOffRequest
);

// =====================================================
// SUPER ADMIN — HR PERSONAL COMP-OFF APPROVALS
// employeeId === createdBy
// =====================================================

router.get(
  "/comp-off/super-admin/pending",
  superAdminCompanyAuth,
  getSuperAdminPendingCompOffRequests
);

router.patch(
  "/comp-off/:id/super-admin/approve",
  superAdminCompanyAuth,
  approveSuperAdminCompOffRequest
);

router.patch(
  "/comp-off/:id/super-admin/reject",
  superAdminCompanyAuth,
  rejectSuperAdminCompOffRequest
);

// =====================================================
// SUPER ADMIN — ALL EMPLOYEE LEAVES (READ ONLY)
// =====================================================

router.get(
  "/super-admin/all-employee-leaves",
  superAdminCompanyAuth,
  getAllEmployeeLeaves
);

export default router;
