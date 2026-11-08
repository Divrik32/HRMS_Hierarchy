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


const router = express.Router();

// সব Holiday দেখতে পারবে authenticated Employee এবং Super Admin
router.get("/:companyId", employeeOrSuperAdminAuth, getHolidays);

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