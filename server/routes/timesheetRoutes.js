
import express from "express";
import {
  createTimesheet,
  updateTimesheet,
  auditTimesheet,
  getDailyEfficiencyGraph,
  getTimesheetsByCompany,
  getCompanyEmployeesForTimesheet,
} from "../controllers/timesheetController.js";

import superAdminAuth from "../middleware/superAdminAuth.js";
import employeeOrSuperAdminAuth from "../middleware/employeeOrSuperAdminAuth.js";
import { companyAuth } from "../middleware/companyAuth.js";
import employeeAuth from "../middleware/employeeAuth.js";

const router = express.Router();

router.get(
  "/company-employees",
  employeeAuth,
  getCompanyEmployeesForTimesheet
);

// Employee: create a timesheet
router.post("/", employeeAuth, createTimesheet);

// Get all timesheets
router.get("/", employeeOrSuperAdminAuth, getTimesheetsByCompany);

// Update a single editable timesheet field
router.patch("/:id", employeeAuth, updateTimesheet);

// Audit timesheet — approve or reject
router.patch("/:id/audit", employeeOrSuperAdminAuth, auditTimesheet);

// Super Admin: daily efficiency graph for a specific company
router.get(
  "/company/:companyId/daily-efficiency",
  superAdminAuth,
  getDailyEfficiencyGraph
);

// Employee: daily efficiency graph for their own company
router.get(
  "/my-company/daily-efficiency",
  employeeAuth,
  getDailyEfficiencyGraph
);

export default router;
