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
  getAllCompanyEmployees,
  deleteMyEmployeeDocument,
} from "../controllers/employeeController.js";

import superAdminAuth from "../middleware/superAdminAuth.js";
import employeeAuth from "../middleware/employeeAuth.js";
import superAdminCompanyAuth from "../middleware/superAdminCompanyAuth.js";

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
    files: 21,
  },

  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/tiff",
    ];

    const allowedImageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".bmp",
      ".tif",
      ".tiff",
    ];

    const isImage =
      allowedImageTypes.includes(file.mimetype) &&
      allowedImageExtensions.includes(extension);

    const isPdf =
      file.mimetype === "application/pdf" &&
      extension === ".pdf";

    // Profile picture only accepts images
    if (file.fieldname === "profilePic") {
      if (isImage) {
        return cb(null, true);
      }

      return cb(
        new Error("Profile picture must be a valid image.")
      );
    }

    // Documents accept PDF and images
    if (file.fieldname === "documents") {
      if (isImage || isPdf) {
        return cb(null, true);
      }

      return cb(
        new Error("Only PDF and image documents are allowed.")
      );
    }

    cb(new Error("Invalid file field."));
  },
});
const uploadEmployeeFiles = upload.fields([
  { name: "profilePic", maxCount: 1 },
  { name: "documents", maxCount: 20 },
]);

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
  uploadEmployeeFiles,
  updateMyEmployeeProfile
);
router.delete(
  "/profile/me/documents/:documentId",
  employeeAuth,
  deleteMyEmployeeDocument
);

// Super Admin Protected Routes
router.post(
  "/",
  superAdminAuth,
  uploadEmployeeFiles,
  createEmployee
);

router.get("/", superAdminAuth, getAllEmployees);

// Super Admin: Fetch employees of selected company
router.get(
  "/company/:companyId",
  superAdminAuth,
  getCompanyEmployees
);

// Employee: Fetch employees of own company
router.get(
  "/company/:companyId/employee",
  employeeAuth,
  getCompanyEmployees
);

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
  uploadEmployeeFiles,
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
// =========================================
// COMPANY EMPLOYEES
// =========================================

// Super Admin: Fetch employees of selected company
router.get(
  "/company/employees",
  superAdminCompanyAuth,
  getAllCompanyEmployees
);

// Employee / HR: Fetch employees of own company
router.get(
  "/my-company/employees",
  employeeAuth,
  getAllCompanyEmployees
);

export default router;