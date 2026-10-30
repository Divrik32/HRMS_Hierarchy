import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

import {
  createSuperAdmin,
  loginSuperAdmin,
  logoutSuperAdmin,
  getSuperAdminProfile,
  updateSuperAdmin,
  deleteSuperAdmin,
  forgotPassword,
  verifyOtp,
  resetPassword,
  resendOtp,
} from "../controllers/superAdminController.js";

import superAdminAuth from "../middleware/superAdminAuth.js";

const router = express.Router();

// Upload directory
const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
fileFilter: (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

  const extension = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(extension)
  ) {
    return cb(null, true);
  }

  cb(new Error("Only JPG, JPEG, and PNG image files are allowed."));
},
});

// Public routes
router.post("/create", upload.single("profilePic"), createSuperAdmin);
router.post("/login", loginSuperAdmin);

// Forgot Password Routes
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOtp);

// Protected routes
router.post("/logout", superAdminAuth, logoutSuperAdmin);
router.get("/profile", superAdminAuth, getSuperAdminProfile);
router.put("/update", upload.single("profilePic"), superAdminAuth, updateSuperAdmin);
router.delete("/delete", superAdminAuth, deleteSuperAdmin);

export default router;
