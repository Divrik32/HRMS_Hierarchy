
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import SuperAdmin from "../models/SuperAdmin.js";
import Employee from "../models/Employee.js";
import sendEmail from "../utils/sendEmail.js";

// =========================================
// COMMON HELPERS
// =========================================

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

// Always check Super Admin first, then Employee
const findAccountByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) return null;

  const superAdmin = await SuperAdmin.findOne({
    email: normalizedEmail,
  });

  if (superAdmin) {
    return {
      account: superAdmin,
      type: "superadmin",
    };
  }

  const employee = await Employee.findOne({
    email: normalizedEmail,
  });

  if (employee) {
    return {
      account: employee,
      type: "employee",
    };
  }

  return null;
};

const clearResetOtp = (account, type) => {
  account.resetOtp = type === "superadmin" ? null : "";
  account.resetOtpExpire = null;
};

const sendOtpEmail = async (email, otp, isResend = false) => {
  await sendEmail(
    email,
    isResend
      ? "Password Reset - New OTP"
      : "Password Reset OTP",
    `
      <div style="font-family: Arial, sans-serif;">
        <h2>${isResend ? "Your New OTP" : "Password Reset"}</h2>
        <p>Your password reset OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `
  );
};

// =========================================
// COMMON LOGIN
// Super Admin First -> Employee Second
// =========================================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await findAccountByEmail(email);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const { account, type } = result;

    // Employee active status check
    if (type === "employee" && account.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Employee account is inactive",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      account.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate role-specific JWT
    const tokenPayload =
      type === "superadmin"
        ? {
            id: account._id,
            superAdminId: account.superAdminId,
            role: "superadmin",
          }
        : {
            id: account._id,
            role: "employee",
            companyId: account.companyId,
          };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const cookieName =
      type === "superadmin"
        ? "superAdminToken"
        : "employeeToken";

    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Super Admin response
    if (type === "superadmin") {
      return res.status(200).json({
        success: true,
        message: "Super Admin login successful",
        accountType: "superadmin",
        superAdmin: {
          _id: account._id,
          superAdminId: account.superAdminId,
          name: account.name,
          email: account.email,
        },
      });
    }

    // Employee response
    return res.status(200).json({
      success: true,
      message: "Employee login successful",
      accountType: "employee",
      employee: {
        _id: account._id,
        name: account.name,
        empId: account.empId,
        profilePic: account.profilePic,
        phone: account.phone,
        email: account.email,
        gender: account.gender,
        companyId: account.companyId,
        departmentId: account.departmentId,
        roleId: account.roleId,
        status: account.status,
      },
    });
  } catch (error) {
    console.error("Common Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
};

// =========================================
// COMMON FORGOT PASSWORD
// =========================================

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await findAccountByEmail(email);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const { account, type } = result;

    if (type === "employee" && account.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Employee account is inactive",
      });
    }

const otp = generateOtp();

const otpExpire = new Date(
  Date.now() + 10 * 60 * 1000
);

// Update only OTP fields.
// Avoid validating unrelated Employee fields.
await account.constructor.updateOne(
  { _id: account._id },
  {
    $set: {
      resetOtp: otp,
      resetOtpExpire: otpExpire,
    },
  },
);

try {
  await sendOtpEmail(account.email, otp);
} catch (emailError) {
  await account.constructor.updateOne(
    { _id: account._id },
    {
      $set: {
        resetOtp: type === "superadmin" ? null : "",
        resetOtpExpire: null,
      },
    },
  );

  throw emailError;
}

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
    });
  } catch (error) {
    console.error("Common Forgot Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

// =========================================
// COMMON VERIFY OTP
// =========================================

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const result = await findAccountByEmail(email);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or OTP",
      });
    }

    const { account } = result;

    if (
      !account.resetOtp ||
      account.resetOtp !== String(otp).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (
      !account.resetOtpExpire ||
      account.resetOtpExpire.getTime() <= Date.now()
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
    console.error("Common Verify OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

// =========================================
// COMMON RESET PASSWORD
// =========================================

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 6
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const result = await findAccountByEmail(email);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or OTP",
      });
    }

    const { account, type } = result;

    if (
      !account.resetOtp ||
      account.resetOtp !== String(otp).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (
      !account.resetOtpExpire ||
      account.resetOtpExpire.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP",
      });
    }

    account.password = await bcrypt.hash(newPassword, 10);

    clearResetOtp(account, type);

    await account.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Common Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

// =========================================
// COMMON RESEND OTP
// =========================================

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await findAccountByEmail(email);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const { account, type } = result;

    if (type === "employee" && account.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Employee account is inactive",
      });
    }

    const otp = generateOtp();

const AccountModel =
  type === "superadmin" ? SuperAdmin : Employee;

await AccountModel.updateOne(
  { _id: account._id },
  {
    $set: {
      resetOtp: otp,
      resetOtpExpire: new Date(Date.now() + 10 * 60 * 1000),
    },
  }
);

    try {
      await sendOtpEmail(account.email, otp, true);
    } catch (emailError) {
await AccountModel.updateOne(
  { _id: account._id },
  {
    $set: {
      resetOtp: type === "superadmin" ? null : "",
      resetOtpExpire: null,
    },
  }
);

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("Common Resend OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};
