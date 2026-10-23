import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

import {
  createEmployee,
  loginEmployee,
  logoutEmployee,
  getEmployeeProfile,
  getMyEmployeeProfile,
  updateMyEmployeeProfile,
  getAllEmployees,
  getCompanyEmployees,
  getDepartmentEmployees,
  getRoleEmployees,
  getEmployeeById,
  updateEmployee,
  updateEmployeePassword,
  updateEmployeeStatus,
  deleteEmployee,
  forgotPassword,
  verifyOtp,
  resetPassword,
  resendOtp,
} from "../controllers/employeeController.js";

import superAdminAuth from "../middleware/superAdminAuth.js";
import employeeAuth from "../middleware/employeeAuth.js";

const router = express.Router();

// Upload directory
const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    cb(null, `${Date.now()}-${safeName}`);
  },
});

// Multer configuration
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }

    cb(new Error("Only image files are allowed"));
  },
});

// Public Authentication Routes
router.post("/login", loginEmployee);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOtp);

// Employee Protected Routes
router.post("/logout", employeeAuth, logoutEmployee);

router.get("/profile/me", employeeAuth, getMyEmployeeProfile);

router.put(
  "/profile/me",
  employeeAuth,
  upload.single("profilePic"),
  updateMyEmployeeProfile
);

// Super Admin Protected Routes
router.post(
  "/",
  superAdminAuth,
  upload.single("profilePic"),
  createEmployee
);

router.get("/", superAdminAuth, getAllEmployees);

router.get("/company/:companyId", superAdminAuth, getCompanyEmployees);

router.get(
  "/department/:departmentId",
  superAdminAuth,
  getDepartmentEmployees
);

router.get("/role/:roleId", superAdminAuth, getRoleEmployees);

router.get("/:employeeId", superAdminAuth, getEmployeeById);

router.put(
  "/:employeeId",
  superAdminAuth,
  upload.single("profilePic"),
  updateEmployee
);

router.patch(
  "/:employeeId/status",
  superAdminAuth,
  updateEmployeeStatus
);

router.patch(
  "/:employeeId/password",
  employeeAuth,
  updateEmployeePassword
);

router.delete("/:employeeId", superAdminAuth, deleteEmployee);

export default router;
