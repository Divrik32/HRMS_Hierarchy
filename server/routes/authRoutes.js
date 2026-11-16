
import express from "express";

import {
  login,
  forgotPassword,
  verifyOtp,
  resendOtp,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

// =========================================
// COMMON AUTHENTICATION ROUTES
// Super Admin + Employee
// =========================================

// Common Login
router.post("/login", login);

// Common Forgot Password
router.post("/forgot-password", forgotPassword);

// Common Verify OTP
router.post("/verify-otp", verifyOtp);

// Common Resend OTP
router.post("/resend-otp", resendOtp);

// Common Reset Password
router.post("/reset-password", resetPassword);

export default router;
