import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import SuperAdmin from "../models/SuperAdmin.js";

// Super Admin + Company OR Employee Authentication
const employeeOrSuperAdminAuth = async (req, res, next) => {
  try {
    const superAdminToken = req.cookies?.superAdminToken;
    const companyToken = req.cookies?.companyToken;
    const employeeToken = req.cookies?.employeeToken;

    // =========================================
    // 1. SUPER ADMIN + COMPANY AUTHENTICATION
    // Super Admin and Company tokens are required
    // =========================================
    if (superAdminToken) {
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

      const superAdmin = await SuperAdmin.findById(
        decodedSuperAdmin.id
      ).select("_id superAdminId name email");

      if (!superAdmin) {
        return res.status(401).json({
          success: false,
          message: "Super Admin account not found.",
        });
      }

      // Super Admin must also log in to/select a company.
      if (!companyToken) {
        return res.status(401).json({
          success: false,
          message:
            "Please login to a company to access its workspace.",
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

      req.user = {
        id: superAdmin._id.toString(),
        superAdminId: superAdmin.superAdminId,
        name: superAdmin.name,
        email: superAdmin.email,
        role: "superadmin",
      };

      // Selected company belongs to the Super Admin's current session.
      req.companyId = decodedCompany.id.toString();

      return next();
    }

    // =========================================
    // 2. EMPLOYEE AUTHENTICATION
    // Employee token alone is sufficient.
    // Company token is NOT required.
    // =========================================
    if (employeeToken) {
      let decodedEmployee;

      try {
        decodedEmployee = jwt.verify(
          employeeToken,
          process.env.JWT_SECRET
        );
      } catch {
        return res.status(401).json({
          success: false,
          message: "Employee session is invalid or expired.",
        });
      }

      if (
        decodedEmployee?.role !== "employee" ||
        !mongoose.Types.ObjectId.isValid(decodedEmployee.id)
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid employee authentication.",
        });
      }

      const employee = await Employee.findOne({
        _id: decodedEmployee.id,
        status: "active",
      }).select(
        "_id empId name email companyId departmentId roleId status"
      );

      if (!employee) {
        return res.status(401).json({
          success: false,
          message: "Active employee account not found.",
        });
      }

      if (
        !employee.companyId ||
        !employee.departmentId ||
        !employee.roleId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Employee company, department, or role information is missing.",
        });
      }

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

      // Employee authentication ends here.
      // No companyToken is needed.
      return next();
    }

    // =========================================
    // 3. NO VALID AUTHENTICATION TOKEN
    // =========================================
    return res.status(401).json({
      success: false,
      message:
        "Authentication required. Login as Super Admin and select a company, or login as an Employee.",
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