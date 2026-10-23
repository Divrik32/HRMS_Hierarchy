import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import SuperAdmin from "../models/SuperAdmin.js";
import sendEmail from "../utils/sendEmail.js";

// Create Super Admin
export const createSuperAdmin = async (req, res) => {
  try {
    const { superAdminId, name, email, password } = req.body;

    if (!superAdminId || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Super Admin ID, name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingSuperAdmin = await SuperAdmin.findOne({
      $or: [
        { superAdminId: superAdminId.trim() },
        { email: normalizedEmail },
      ],
    });

    if (existingSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: "Super Admin ID or email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const superAdmin = await SuperAdmin.create({
      superAdminId: superAdminId.trim(),
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      profilePic: req.file ? req.file.filename : "",
    });

    return res.status(201).json({
      success: true,
      message: "Super Admin created successfully",
      superAdmin: {
        _id: superAdmin._id,
        superAdminId: superAdmin.superAdminId,
        name: superAdmin.name,
        email: superAdmin.email,
        profilePic: superAdmin.profilePic,
      },
    });
  } catch (error) {
    console.error("Create Super Admin Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create Super Admin",
      error: error.message,
    });
  }
};


// Super Admin Login
export const loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const superAdmin = await SuperAdmin.findOne({
      email: email.toLowerCase(),
    });

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      superAdmin.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: superAdmin._id,
        superAdminId: superAdmin.superAdminId,
        role: "superadmin",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

  res.cookie("superAdminToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    message: "Super Admin login successful",
    superAdmin: {
      _id: superAdmin._id,
      superAdminId: superAdmin.superAdminId,
      name: superAdmin.name,
      email: superAdmin.email,
    },
  });
  } catch (error) {
    console.error("Super Admin Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
};

// Super Admin Logout
export const logoutSuperAdmin = async (req, res) => {
  try {
    res.clearCookie("superAdminToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Super Admin logout successful",
    });
  } catch (error) {
    console.error("Super Admin Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to logout",
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

    const superAdmin = await SuperAdmin.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "Super Admin not found",
      });
    }

    const otp = generateOtp();

    superAdmin.resetOtp = otp;
    superAdmin.resetOtpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await superAdmin.save();

    try {
      await sendEmail(
        superAdmin.email,
        "Super Admin Password Reset OTP",
        `
          <div style="font-family: Arial, sans-serif;">
            <h2>Password Reset</h2>
            <p>Your password reset OTP is:</p>
            <h1>${otp}</h1>
            <p>This OTP is valid for 10 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `
      );
    } catch (emailError) {
      superAdmin.resetOtp = null;
      superAdmin.resetOtpExpire = null;
      await superAdmin.save();
      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
    });
  } catch (error) {
    console.error("Super Admin Forgot Password Error:", error);

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

    const superAdmin = await SuperAdmin.findOne({
      email: email.trim().toLowerCase(),
    });

    if (
      !superAdmin ||
      !superAdmin.resetOtp ||
      superAdmin.resetOtp !== String(otp).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (
      !superAdmin.resetOtpExpire ||
      superAdmin.resetOtpExpire.getTime() <= Date.now()
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
    console.error("Super Admin Verify OTP Error:", error);

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

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 6
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const superAdmin = await SuperAdmin.findOne({
      email: email.trim().toLowerCase(),
    });

    if (
      !superAdmin ||
      !superAdmin.resetOtp ||
      superAdmin.resetOtp !== String(otp).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (
      !superAdmin.resetOtpExpire ||
      superAdmin.resetOtpExpire.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP",
      });
    }

    superAdmin.password = await bcrypt.hash(newPassword, 10);
    superAdmin.resetOtp = null;
    superAdmin.resetOtpExpire = null;

    await superAdmin.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Super Admin Reset Password Error:", error);

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

    const superAdmin = await SuperAdmin.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "Super Admin not found",
      });
    }

    const otp = generateOtp();

    superAdmin.resetOtp = otp;
    superAdmin.resetOtpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await superAdmin.save();

    try {
      await sendEmail(
        superAdmin.email,
        "Super Admin Password Reset - New OTP",
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
      superAdmin.resetOtp = null;
      superAdmin.resetOtpExpire = null;
      await superAdmin.save();
      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("Super Admin Resend OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

// Get Super Admin Profile
export const getSuperAdminProfile = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.user.id).select(
      "-password"
    );

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "Super Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      superAdmin,
    });
  } catch (error) {
    console.error("Get Super Admin Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get Super Admin profile",
      error: error.message,
    });
  }
};


// Update Super Admin
export const updateSuperAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const superAdmin = await SuperAdmin.findById(req.user.id);

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "Super Admin not found",
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

      superAdmin.name = name.trim();
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

      const existingEmail = await SuperAdmin.findOne({
        email: normalizedEmail,
        _id: { $ne: superAdmin._id },
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "This email is already in use",
        });
      }

      superAdmin.email = normalizedEmail;
    }

    // Update profile picture only when a new file is uploaded
    if (req.file) {
      superAdmin.profilePic = req.file.filename;
    }

    // Update password if provided
    if (password !== undefined && password !== "") {
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      superAdmin.password = await bcrypt.hash(password, 10);
    }

    await superAdmin.save();

    return res.status(200).json({
      success: true,
      message: "Super Admin updated successfully",
      superAdmin: {
        _id: superAdmin._id,
        superAdminId: superAdmin.superAdminId,
        name: superAdmin.name,
        email: superAdmin.email,
        profilePic: superAdmin.profilePic,
      },
    });
  } catch (error) {
    console.error("Update Super Admin Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update Super Admin",
      error: error.message,
    });
  }
};


// Delete Super Admin
export const deleteSuperAdmin = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.user.id);

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "Super Admin not found",
      });
    }

    await SuperAdmin.findByIdAndDelete(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Super Admin deleted successfully",
    });
  } catch (error) {
    console.error("Delete Super Admin Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete Super Admin",
      error: error.message,
    });
  }
};