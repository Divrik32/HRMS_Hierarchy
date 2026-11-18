
import express from "express";

import {
  createCompOffRequest,
  getMyCompOffRequests,
  getMyCompOffBalance,
  getPendingCompOffRequests,
  approveCompOffRequest,
  rejectCompOffRequest,
  useCompOffBalance,
} from "../controllers/compOffController.js";

import employeeAuth from "../middleware/employeeAuth.js";

const router = express.Router();

// EMPLOYEE — COMP-OFF REQUESTS
router.post("/request", employeeAuth, createCompOffRequest);
router.get("/my-requests", employeeAuth, getMyCompOffRequests);
router.get("/my-balance", employeeAuth, getMyCompOffBalance);

// HR / HEAD RECRUITER — COMP-OFF APPROVALS
router.get("/pending", employeeAuth, getPendingCompOffRequests);
router.patch("/:id/approve", employeeAuth, approveCompOffRequest);
router.patch("/:id/reject", employeeAuth, rejectCompOffRequest);

// HR — USE COMP-OFF BALANCE
router.post("/use", employeeAuth, useCompOffBalance);

export default router;
