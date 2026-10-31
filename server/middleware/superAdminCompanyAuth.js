
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import SuperAdmin from "../models/SuperAdmin.js";

// =========================================
// SUPER ADMIN + COMPANY AUTHENTICATION
// =========================================
const superAdminCompanyAuth = async (req, res, next) => {
  try {
    const superAdminToken = req.cookies?.superAdminToken;
    const companyToken = req.cookies?.companyToken;

    // Super Admin token required
    if (!superAdminToken) {
      return res.status(401).json({
        success: false,
        message: "Super Admin authentication required.",
      });
    }

    let decodedSuperAdmin;

    try {
      decodedSuperAdmin = jwt.verify(
        superAdminToken,
        process.env.JWT_SECRET
      );
    } catch {
      return res.status(401).json({
        success: false,
        message: "Super Admin session is invalid or expired.",
      });
    }

    if (
      decodedSuperAdmin?.role !== "superadmin" ||
      !mongoose.Types.ObjectId.isValid(decodedSuperAdmin.id)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid Super Admin authentication.",
      });
    }

    // Verify Super Admin account
    const superAdmin = await SuperAdmin.findById(
      decodedSuperAdmin.id
    ).select("_id superAdminId name email");

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: "Super Admin account not found.",
      });
    }

    // Company token required
    if (!companyToken) {
      return res.status(401).json({
        success: false,
        message: "Please login to a company first.",
      });
    }

    let decodedCompany;

    try {
      decodedCompany = jwt.verify(
        companyToken,
        process.env.JWT_SECRET
      );
    } catch {
      return res.status(401).json({
        success: false,
        message: "Company session is invalid or expired.",
      });
    }

    if (
      decodedCompany?.role !== "company" ||
      !mongoose.Types.ObjectId.isValid(decodedCompany.id)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid company authentication.",
      });
    }

    // Set authenticated Super Admin
    req.user = {
      id: superAdmin._id.toString(),
      superAdminId: superAdmin.superAdminId,
      name: superAdmin.name,
      email: superAdmin.email,
      role: "superadmin",
    };

    // Set selected company ID
    req.companyId = decodedCompany.id.toString();

    return next();
  } catch (error) {
    console.error("Super Admin + Company Auth Error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Internal server error during Super Admin and Company authentication.",
    });
  }
};

export default superAdminCompanyAuth;
