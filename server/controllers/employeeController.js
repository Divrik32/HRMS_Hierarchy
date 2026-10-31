import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Employee from "../models/Employee.js";
import Company from "../models/Company.js";
import Department from "../models/Department.js";
import Role from "../models/Role.js";
import sendEmail from "../utils/sendEmail.js";

// Create Employee
export const createEmployee = async (req, res) => {
  try {
    const {
      name,
      empId,
      phone,
      presentAddress,
      gender,
      email,
      password,
      companyId,
      departmentId,
      roleId,
    } = req.body;

    if (
      !name ||
      !empId ||
      !phone ||
      !presentAddress ||
      !gender ||
      !email ||
      !password ||
      !companyId ||
      !departmentId ||
      !roleId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, employee ID, phone, address, gender, email, password, company, department and role are required",
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    // Check company
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check department belongs to company
    const department = await Department.findOne({
      _id: departmentId,
      companyId,
    });

    if (!department) {
      return res.status(400).json({
        success: false,
        message: "Department does not belong to this company",
      });
    }

    // Check role belongs to company
    const role = await Role.findOne({
      _id: roleId,
      companyId,
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role does not belong to this company",
      });
    }

    // Normalize employee ID and email
    const normalizedEmpId = empId.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate employee ID
    const existingEmpId = await Employee.findOne({
      empId: normalizedEmpId,
    });

    if (existingEmpId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID already exists",
      });
    }

    // Check duplicate email
const existingEmail = await Employee.findOne({
  email: normalizedEmail,
  companyId,
});

if (existingEmail) {
  return res.status(400).json({
    success: false,
    message: "This email already exists in this company",
  });
}

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create employee
    const employee = await Employee.create({
      name: name.trim(),
      empId: normalizedEmpId,
      profilePic: req.file ? req.file.filename : "",
      phone: phone.trim(),
      presentAddress: presentAddress.trim(),
      gender,
      email: normalizedEmail,
      password: hashedPassword,
      companyId,
      departmentId,
      roleId,
    });

    // Remove sensitive fields from response
    const employeeResponse = employee.toObject();

    delete employeeResponse.password;
    delete employeeResponse.resetOtp;
    delete employeeResponse.resetOtpExpire;

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee: employeeResponse,
    });
  } catch (error) {
    console.error("Create Employee Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Employee ID or email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create employee",
      error: error.message,
    });
  }
};

// Employee Login
export const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const employee = await Employee.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (employee.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Employee account is inactive",
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      employee.password
    );

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: employee._id,
        role: "employee",
        companyId: employee.companyId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("employeeToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Employee login successful",
      employee: {
        _id: employee._id,
        name: employee.name,
        empId: employee.empId,
        profilePic: employee.profilePic,
        phone: employee.phone,
        email: employee.email,
        gender: employee.gender,
        companyId: employee.companyId,
        departmentId: employee.departmentId,
        roleId: employee.roleId,
        status: employee.status,
      },
    });
  } catch (error) {
    console.error("Employee Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to login employee",
      error: error.message,
    });
  }
};

// Employee Logout
export const logoutEmployee = async (req, res) => {
  try {
    res.clearCookie("employeeToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Employee logout successful",
    });
  } catch (error) {
    console.error("Employee Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to logout employee",
      error: error.message,
    });
  }
};

// Get Employee Profile
export const getEmployeeProfile = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id)
      .select("-password -resetOtp -resetOtpExpire")
      .populate("companyId", "companyName companyType")
      .populate("departmentId", "departmentName")
      .populate("roleId", "roleName");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error("Get Employee Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get employee profile",
      error: error.message,
    });
  }
};

// Get All Employees
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .select("-password -resetOtp -resetOtpExpire")
      .populate("companyId", "companyName")
      .populate("departmentId", "departmentName")
      .populate("roleId", "roleName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get All Employees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get employees",
      error: error.message,
    });
  }
};

// Get Employees Of A Company
export const getCompanyEmployees = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const employees = await Employee.find({
      companyId,
    })
      .select("-password -resetOtp -resetOtpExpire")
      .populate("departmentId", "departmentName")
      .populate("roleId", "roleName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get Company Employees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get company employees",
      error: error.message,
    });
  }
};

// Get Employees Of A Department
export const getDepartmentEmployees = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    const department = await Department.findById(departmentId);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const employees = await Employee.find({
      departmentId,
    })
      .select("-password -resetOtp -resetOtpExpire")
      .populate("companyId", "companyName")
      .populate("roleId", "roleName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get Department Employees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get department employees",
      error: error.message,
    });
  }
};

// Get Employees Of A Role
export const getRoleEmployees = async (req, res) => {
  try {
    const { roleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    const employees = await Employee.find({
      roleId,
    })
      .select("-password -resetOtp -resetOtpExpire")
      .populate("companyId", "companyName")
      .populate("departmentId", "departmentName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get Role Employees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get role employees",
      error: error.message,
    });
  }
};

// Get Single Employee
export const getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const employee = await Employee.findById(employeeId)
      .select("-password -resetOtp -resetOtpExpire")
      .populate("companyId", "companyName companyType")
      .populate("departmentId", "departmentName")
      .populate("roleId", "roleName");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error("Get Employee Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get employee",
      error: error.message,
    });
  }
};

// Update Employee
export const updateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const {
      name,
      phone,
      presentAddress,
      gender,
      email,
      companyId,
      departmentId,
      roleId,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const finalCompanyId = companyId || employee.companyId;
    const finalDepartmentId = departmentId || employee.departmentId;
    const finalRoleId = roleId || employee.roleId;

    if (
      !mongoose.Types.ObjectId.isValid(finalCompanyId) ||
      !mongoose.Types.ObjectId.isValid(finalDepartmentId) ||
      !mongoose.Types.ObjectId.isValid(finalRoleId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company, department or role ID",
      });
    }

    // Check company
    const company = await Company.findById(finalCompanyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check department belongs to company
    const department = await Department.findOne({
      _id: finalDepartmentId,
      companyId: finalCompanyId,
    });

    if (!department) {
      return res.status(400).json({
        success: false,
        message: "Department does not belong to this company",
      });
    }

    // Check role belongs to company
    const role = await Role.findOne({
      _id: finalRoleId,
      companyId: finalCompanyId,
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role does not belong to this company",
      });
    }

    // Update name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      employee.name = name.trim();
    }

    // Update profile picture only when a new file is uploaded
    if (req.file) {
      employee.profilePic = req.file.filename;
    }

    // Update phone
    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phone cannot be empty",
        });
      }

      employee.phone = phone.trim();
    }

    // Update address
    if (presentAddress !== undefined) {
      if (
        typeof presentAddress !== "string" ||
        !presentAddress.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Present address cannot be empty",
        });
      }

      employee.presentAddress = presentAddress.trim();
    }

    // Update gender
    if (gender !== undefined) {
      if (!["Male", "Female", "Other"].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Invalid gender",
        });
      }

      employee.gender = gender;
    }

    // Update email
    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingEmail = await Employee.findOne({
        email: normalizedEmail,
        _id: { $ne: employee._id },
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Employee email already exists",
        });
      }

      employee.email = normalizedEmail;
    }

    employee.companyId = finalCompanyId;
    employee.departmentId = finalDepartmentId;
    employee.roleId = finalRoleId;

    await employee.save();

    const employeeResponse = await Employee.findById(employee._id)
      .select("-password -resetOtp -resetOtpExpire")
      .populate("companyId", "companyName")
      .populate("departmentId", "departmentName")
      .populate("roleId", "roleName");

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee: employeeResponse,
    });
  } catch (error) {
    console.error("Update Employee Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Employee email or employee ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update employee",
      error: error.message,
    });
  }
};

// Update Employee Password
export const updateEmployeePassword = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      currentPassword,
      employee.password
    );

    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    employee.password = await bcrypt.hash(newPassword, 10);

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Employee password updated successfully",
    });
  } catch (error) {
    console.error("Update Employee Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update employee password",
      error: error.message,
    });
  }
};

// Change Employee Status
export const updateEmployeeStatus = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either active or inactive",
      });
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    employee.status = status;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Employee ${status} successfully`,
      employee: {
        _id: employee._id,
        name: employee.name,
        empId: employee.empId,
        status: employee.status,
      },
    });
  } catch (error) {
    console.error("Update Employee Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update employee status",
      error: error.message,
    });
  }
};

// Delete Employee
export const deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    await Employee.findByIdAndDelete(employeeId);

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Delete Employee Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete employee",
      error: error.message,
    });
  }
};

// Get My Own Employee Profile
export const getMyEmployeeProfile = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      _id: req.user.id,
      status: "active",
    })
      .select("-password -resetOtp -resetOtpExpire")
      .populate("companyId", "companyName companyType")
      .populate("departmentId", "departmentName")
      .populate("roleId", "roleName");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Your profile fetched successfully",
      employee,
    });
  } catch (error) {
    console.error("Get My Employee Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get your profile",
      error: error.message,
    });
  }
};

// Update My Employee Profile
export const updateMyEmployeeProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      presentAddress,
      gender,
      email,
    } = req.body;

    const employee = await Employee.findOne({
      _id: req.user.id,
      status: "active",
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    // Update name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      employee.name = name.trim();
    }

    // Update profile picture from Multer
    if (req.file) {
      employee.profilePic = req.file.filename;
    }

    // Update phone
    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phone cannot be empty",
        });
      }

      employee.phone = phone.trim();
    }

    // Update present address
    if (presentAddress !== undefined) {
      if (
        typeof presentAddress !== "string" ||
        !presentAddress.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Present address cannot be empty",
        });
      }

      employee.presentAddress = presentAddress.trim();
    }

    // Update gender
    if (gender !== undefined) {
      if (!["Male", "Female", "Other"].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be Male, Female or Other",
        });
      }

      employee.gender = gender;
    }

    // Update email
    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingEmail = await Employee.findOne({
        email: normalizedEmail,
        _id: { $ne: employee._id },
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "This email is already used by another employee",
        });
      }

      employee.email = normalizedEmail;
    }

    await employee.save();

    const updatedEmployee = await Employee.findById(employee._id)
      .select("-password -resetOtp -resetOtpExpire")
      .populate("companyId", "companyName companyType")
      .populate("departmentId", "departmentName")
      .populate("roleId", "roleName");

    return res.status(200).json({
      success: true,
      message: "Your profile updated successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Update My Employee Profile Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already used by another employee",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update your profile",
      error: error.message,
    });
  }
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const employee = await Employee.findOne({
      email: normalizedEmail,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (employee.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Employee account is inactive",
      });
    }

    const otp = generateOtp();

    employee.resetOtp = otp;
    employee.resetOtpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await employee.save();

    try {
      await sendEmail(
        employee.email,
        "Employee Password Reset OTP",
        `
          <div style="font-family: Arial, sans-serif;">
            <h2>Password Reset</h2>
            <p>Your password reset OTP is:</p>
            <h1>${otp}</h1>
            <p>This OTP is valid for 10 minutes.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
          </div>
        `
      );
    } catch (emailError) {
      employee.resetOtp = "";
      employee.resetOtpExpire = null;
      await employee.save();

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
    });
  } catch (error) {
    console.error("Employee Forgot Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const employee = await Employee.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or OTP",
      });
    }

    if (
      !employee.resetOtp ||
      employee.resetOtp !== String(otp).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (
      !employee.resetOtpExpire ||
      employee.resetOtpExpire.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Employee Verify OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const employee = await Employee.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or OTP",
      });
    }

    if (
      !employee.resetOtp ||
      employee.resetOtp !== String(otp).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (
      !employee.resetOtpExpire ||
      employee.resetOtpExpire.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP",
      });
    }

    employee.password = await bcrypt.hash(newPassword, 10);
    employee.resetOtp = "";
    employee.resetOtpExpire = null;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Employee Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

// Resend OTP
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const employee = await Employee.findOne({
      email: normalizedEmail,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (employee.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Employee account is inactive",
      });
    }

    const otp = generateOtp();

    employee.resetOtp = otp;
    employee.resetOtpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await employee.save();

    try {
      await sendEmail(
        employee.email,
        "Employee Password Reset - New OTP",
        `
          <div style="font-family: Arial, sans-serif;">
            <h2>Your New OTP</h2>
            <p>Your password reset OTP is:</p>
            <h1>${otp}</h1>
            <p>This OTP is valid for 10 minutes.</p>
          </div>
        `
      );
    } catch (emailError) {
      employee.resetOtp = "";
      employee.resetOtpExpire = null;
      await employee.save();

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("Employee Resend OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};