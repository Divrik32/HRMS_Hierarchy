import jwt from "jsonwebtoken";
import SuperAdmin from "../models/SuperAdmin.js";

// Super Admin Authentication Middleware
const superAdminAuth = async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies.superAdminToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please login as Super Admin.",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify Super Admin role
    if (decoded.role !== "superadmin" || !decoded.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Super Admin only.",
      });
    }

    // Verify that Super Admin still exists in database
    const superAdmin = await SuperAdmin.findById(decoded.id).select(
      "_id superAdminId name email"
    );

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: "Super Admin account not found. Please login again.",
      });
    }

    // Attach authenticated Super Admin to request
    req.user = {
      id: superAdmin._id.toString(),
      superAdminId: superAdmin.superAdminId,
      name: superAdmin.name,
      email: superAdmin.email,
      role: "superadmin",
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    console.error("Super Admin Auth Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
};

export default superAdminAuth;