import express from "express";

import {
  createHolidays,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
  deleteMultipleHolidays,
} from "../controllers/holidayController.js";
import employeeOrSuperAdminAuth from "../middleware/employeeOrSuperAdminAuth.js";
import superAdminCompanyAuth from "../middleware/superAdminCompanyAuth.js";
import employeeAuth from "../middleware/employeeAuth.js";


const router = express.Router();

// Employee: employee token দিয়ে নিজের company's holidays
router.get("/employee", employeeAuth, getHolidays);

// Super Admin: selected company token দিয়ে company's holidays
router.get("/company/:companyId", superAdminCompanyAuth, getHolidays);

router.get(
  "/:companyId/holiday/:holidayId",
  employeeOrSuperAdminAuth,
  getHolidayById
);

// Create Holiday
router.post("/:companyId", employeeOrSuperAdminAuth, createHolidays);

// Update Holiday
router.patch(
  "/:companyId/holiday/:holidayId",
  employeeOrSuperAdminAuth,
  updateHoliday
);

// Delete Multiple Holidays
router.delete("/:companyId", employeeOrSuperAdminAuth, deleteMultipleHolidays);

// Delete Single Holiday
router.delete(
  "/:companyId/holiday/:holidayId",
  employeeOrSuperAdminAuth,
  deleteHoliday
);

export default router;