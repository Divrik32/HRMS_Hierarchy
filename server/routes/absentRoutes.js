
import express from "express";
import {
  getAbsentDates,
  getAllEmployeesAbsentDates,
} from "../controllers/AbsentController.js";

import superAdminCompanyAuth from "../middleware/superAdminCompanyAuth.js";

const router = express.Router();

// One employee
router.post("/dates", superAdminCompanyAuth, getAbsentDates);

// All employees of authenticated company
router.get(
  "/all-employees-dates",
  superAdminCompanyAuth,
  getAllEmployeesAbsentDates
);

export default router;
