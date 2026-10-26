import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import SuperAdmin from "../models/SuperAdmin.js";

// Super Admin OR Employee Authentication Middleware
const employeeOrSuperAdminAuth = async (req, res, next) => {
  try {
    // =========================================
    // 1. Try Super Admin Authentication First
    // =========================================
    const superAdminToken = req.cookies?.superAdminToken;

    if (superAdminToken) {
      try {
        const decoded = jwt.verify(
          superAdminToken,
          process.env.JWT_SECRET
        );

        if (
          decoded.role === "superadmin" &&
          decoded.id &&
          mongoose.Types.ObjectId.isValid(decoded.id)
        ) {
          const superAdmin = await SuperAdmin.findById(
            decoded.id
          ).select("_id superAdminId name email");

          if (superAdmin) {
            req.user = {
              id: superAdmin._id.toString(),
              superAdminId: superAdmin.superAdminId,
              name: superAdmin.name,
              email: superAdmin.email,
              role: "superadmin",
            };

            return next();
          }
        }
      } catch (error) {
        // Super Admin token invalid/expired.
        // Try Employee authentication next.
      }
    }

    // =========================================
    // 2. Try Employee Authentication
    // =========================================
    const employeeToken = req.cookies?.employeeToken;

    if (employeeToken) {
      try {
        const decoded = jwt.verify(
          employeeToken,
          process.env.JWT_SECRET
        );

        if (
          decoded.role === "employee" &&
          decoded.id &&
          mongoose.Types.ObjectId.isValid(decoded.id)
        ) {
          const employee = await Employee.findOne({
            _id: decoded.id,
            status: "active",
          }).select(
            "_id empId name email companyId departmentId roleId status"
          );

          if (
            employee &&
            employee.companyId &&
            employee.departmentId &&
            employee.roleId
          ) {
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

            return next();
          }
        }
      } catch (error) {
        // Employee token invalid/expired.
      }
    }

    // =========================================
    // 3. Both Authentication Attempts Failed
    // =========================================
    return res.status(401).json({
      success: false,
      message:
        "Authentication required. Please login as Employee or Super Admin.",
    });
  } catch (error) {
    console.error("Employee or Super Admin Auth Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
};

export default employeeOrSuperAdminAuth;