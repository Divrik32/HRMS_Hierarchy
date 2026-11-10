import express from "express";

import {
  createTimesheet,
  updateTimesheet,
  auditTimesheet,
  getDailyEfficiencyGraph,
  getMyTimesheets,
  getCompanyTimesheets,
  getTimesheetsForApproval,
  getCompanyEmployeesForTimesheet,
  getProjectsForTimesheet,
  startTask,
  endTask,
  startBreak,
  resumeTask,
} from "../controllers/timesheetController.js";

import employeeOrSuperAdminAuth from "../middleware/employeeOrSuperAdminAuth.js";
import employeeAuth from "../middleware/employeeAuth.js";
import superAdminCompanyAuth from "../middleware/superAdminCompanyAuth.js";

const router = express.Router();

// =========================================
// EMPLOYEE DROPDOWN DATA
// =========================================

// Get company employees
router.get(
  "/company-employees",
  employeeAuth,
  getCompanyEmployeesForTimesheet
);

// Get all company projects and their modules
router.get(
  "/projects",
  employeeAuth,
  getProjectsForTimesheet
);

// =========================================
// TIMESHEET CRUD
// =========================================

// Employee: Get only own timesheets
router.get(
  "/",
  employeeAuth,
  getMyTimesheets
);

// Super Admin: Get all timesheets of a specific company
router.get(
  "/company/:companyId",
  superAdminCompanyAuth,
  getCompanyTimesheets
);

// Employee: Create timesheet
router.post(
  "/",
  employeeAuth,
  createTimesheet
);

// Update editable timesheet fields
router.patch(
  "/:id",
  employeeOrSuperAdminAuth,
  updateTimesheet
);

// =========================================
// TIMESHEET APPROVAL
// =========================================

// Employee: Get timesheets submitted by child and grandchild role employees
router.get(
  "/approval",
  employeeAuth,
  getTimesheetsForApproval
);

// Employee: Approve or reject timesheet
router.patch(
  "/:id/audit",
  employeeAuth,
  auditTimesheet
);

// =========================================
// TASK TIME TRACKING
// =========================================

// Start task
router.patch(
  "/:id/start",
  employeeAuth,
  startTask
);

// End task
router.patch(
  "/:id/end",
  employeeAuth,
  endTask
);

// Start break
router.patch(
  "/:id/break/start",
  employeeAuth,
  startBreak
);

// Resume task after break
router.patch(
  "/:id/break/resume",
  employeeAuth,
  resumeTask
);

// =========================================
// DAILY EFFICIENCY GRAPH
// =========================================

// Super Admin: Specific company
router.get(
  "/company/:companyId/daily-efficiency",
  superAdminCompanyAuth,
  getDailyEfficiencyGraph
);

// Employee: Own company
router.get(
  "/my-company/daily-efficiency",
  employeeAuth,
  getDailyEfficiencyGraph
);

export default router;