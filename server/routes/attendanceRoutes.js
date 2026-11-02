import express from "express";

import {
  checkIn,
  checkOut,
  getAttendanceByDate,
  getAttendanceByDateRange,
  getAttendanceByMonth,
  getMyAttendance,
} from "../controllers/attendanceController.js";

import employeeAuth from "../middleware/employeeAuth.js";
import superAdminCompanyAuth from "../middleware/superAdminCompanyAuth.js";

const router = express.Router();

// =========================================
// EMPLOYEE ONLY ROUTES
// =========================================

router.post("/check-in", employeeAuth, checkIn);
router.patch("/check-out", employeeAuth, checkOut);

router.get("/my-attendance", employeeAuth, getMyAttendance);
router.get("/company", employeeAuth, getAttendanceByDate);
router.get(
  "/date-range",
  employeeAuth,
  getAttendanceByDateRange
);

router.get(
  "/monthly",
  employeeAuth,
  getAttendanceByMonth
);


// =========================================
// SUPER ADMIN + COMPANY ROUTES
// =========================================

router.post(
  "/super-admin/check-in",
  superAdminCompanyAuth,
  checkIn
);

router.patch(
  "/super-admin/check-out",
  superAdminCompanyAuth,
  checkOut
);

router.get(
  "/super-admin/my-attendance",
  superAdminCompanyAuth,
  getMyAttendance
);

router.get(
  "/super-admin/company",
  superAdminCompanyAuth,
  getAttendanceByDate
);

router.get(
  "/super-admin/date-range",
  superAdminCompanyAuth,
  getAttendanceByDateRange
);

router.get(
  "/super-admin/monthly",
  superAdminCompanyAuth,
  getAttendanceByMonth
);

export default router;