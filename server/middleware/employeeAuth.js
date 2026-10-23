import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Employee from "../models/Employee.js";

// Employee Authentication Middleware
const employeeAuth = async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies.employeeToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please login as Employee.",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify Employee role and ID
    if (
      decoded.role !== "employee" ||
      !decoded.id ||
      !mongoose.Types.ObjectId.isValid(decoded.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Employee only.",
      });
    }

    // Verify that Employee exists and is active
    const employee = await Employee.findOne({
      _id: decoded.id,
      status: "active",
    }).select("_id empId name email companyId departmentId roleId status");

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Employee account not found or inactive. Please login again.",
      });
    }

    // Attach authenticated Employee to request
    req.user = {
      id: employee._id.toString(),
      empId: employee.empId,
      name: employee.name,
      email: employee.email,
      companyId: employee.companyId.toString(),
      departmentId: employee.departmentId.toString(),
      roleId: employee.roleId.toString(),
      status: employee.status,
      role: "employee",
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    console.error("Employee Auth Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
};

export default employeeAuth;