import express from "express";

import {
  checkIn,
  checkOut,
  getAttendanceByDate,
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

export default router;