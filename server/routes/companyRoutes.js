
import express from "express";
import {
  createCompany,
  loginCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  updateCompanyStatus,
  deleteCompany,
  getCompanyWorkspace,
  logoutCompany,
  forgotCompanyPassword,
  verifyCompanyOtp,
  resendCompanyOtp,
  resetCompanyPassword,
  getCompanyNames,
  updateCompanyProfile,
} from "../controllers/companyController.js";

import superAdminAuth from "../middleware/superAdminAuth.js";
import { companyUpload } from "../middleware/companyUpload.js";
import { companyAuth } from "../middleware/companyAuth.js";

const router = express.Router();

// Create Company
router.post(
  "/",
  superAdminAuth,
  companyUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  createCompany
);

// Company Login — no Super Admin authentication
router.post("/login", loginCompany);
router.get("/names", getCompanyNames);
router.post("/forgot-password", forgotCompanyPassword);
router.post("/verify-otp", verifyCompanyOtp);
router.post("/resend-otp", resendCompanyOtp);
router.post("/reset-password", resetCompanyPassword);

// Company Logout
router.post("/logout", companyAuth, logoutCompany);

// Company Profile Update — logged-in company only
router.put(
  "/profile",
  companyAuth,
  companyUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  updateCompanyProfile
);

// Get All Companies
router.get("/", superAdminAuth, getAllCompanies);

// Get Single Company
router.get("/:companyId", superAdminAuth, getCompanyById);

// Update Company
router.put("/:companyId", superAdminAuth, updateCompany);

// Update Company Status
router.patch("/:companyId/status", superAdminAuth, updateCompanyStatus);

// Delete Company
router.delete("/:companyId", superAdminAuth, deleteCompany);

router.get("/workspace/:companyId", companyAuth, getCompanyWorkspace);

export default router;