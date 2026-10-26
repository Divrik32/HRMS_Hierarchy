import Company from "../models/Company.js";
import Role from "../models/Role.js";
import Department from "../models/Department.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { randomInt } from "crypto";

// Create Company
export const createCompany = async (req, res) => {
  try {
    const {
      companyName,
      companyType,
      gstNumber,
      panNumber,
      registeredEmail,
      password,
      phone,
      website,
      industry,
      address,
      status,
    } = req.body;

    // 1. Required field validation
    if (!companyName?.trim()) {
      return res.status(400).json({
        success: false,
        field: "companyName",
        message: "Company name is required.",
      });
    }

    if (!companyType) {
      return res.status(400).json({
        success: false,
        field: "companyType",
        message: "Please select a company type.",
      });
    }

    if (!registeredEmail?.trim()) {
      return res.status(400).json({
        success: false,
        field: "registeredEmail",
        message: "Registered email is required.",
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: "Password must be at least 8 characters long.",
      });
    }

    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message: "Phone number is required.",
      });
    }

    if (!address?.trim()) {
      return res.status(400).json({
        success: false,
        field: "address",
        message: "Company address is required.",
      });
    }

    // 2. Normalize values
    const normalizedName = companyName.trim();
    const normalizedEmail = registeredEmail.trim().toLowerCase();
    const normalizedGst = gstNumber?.trim().toUpperCase() || "";
    const normalizedPan = panNumber?.trim().toUpperCase() || "";
    const normalizedPhone = phone.trim();

    // 3. Validate PAN format
    if (
      normalizedPan &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan)
    ) {
      return res.status(400).json({
        success: false,
        field: "panNumber",
        message:
          "Invalid PAN format. Use 5 letters, 4 digits, and 1 letter, e.g. ABCDE1234F.",
      });
    }

    // 4. Validate GSTIN format
    if (
      normalizedGst &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
        normalizedGst
      )
    ) {
      return res.status(400).json({
        success: false,
        field: "gstNumber",
        message:
          "Invalid GSTIN format. Enter a valid 15-character GSTIN.",
      });
    }

    // 5. Validate Indian mobile number
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message:
          "Invalid phone number. Enter a 10-digit Indian mobile number starting with 6, 7, 8, or 9.",
      });
    }

    // 6. Check duplicate fields separately
    const duplicateChecks = [
      {
        field: "companyName",
        value: normalizedName,
        label: "Company name",
      },
    ];

    if (normalizedGst) {
      duplicateChecks.push({
        field: "gstNumber",
        value: normalizedGst,
        label: "GSTIN",
      });
    }

    if (normalizedPan) {
      duplicateChecks.push({
        field: "panNumber",
        value: normalizedPan,
        label: "PAN",
      });
    }

    for (const item of duplicateChecks) {
      const existing = await Company.findOne({
        [item.field]:
          item.field === "companyName"
            ? { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
            : item.value,
      }).select("_id");

      if (existing) {
        return res.status(409).json({
          success: false,
          field: item.field,
          message: `${item.label} already exists. Please enter a different ${item.label.toLowerCase()}.`,
        });
      }
    }

    // 7. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Create company
    const company = await Company.create({
      companyName: normalizedName,
      companyType,
      gstNumber: normalizedGst || undefined,
      panNumber: normalizedPan || undefined,
      registeredEmail: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
      website: website?.trim() || "",
      industry: industry?.trim() || "",
      address: address.trim(),
      logo: req.files?.logo?.[0]?.filename || "",
      signature: req.files?.signature?.[0]?.filename || "",
      status: status === "inactive" ? "inactive" : "active",
    });

    const safeCompany = company.toObject();

    delete safeCompany.password;
    delete safeCompany.resetOtp;
    delete safeCompany.resetOtpExpire;

    return res.status(201).json({
      success: true,
      message: "Company created successfully.",
      company: safeCompany,
    });
  } catch (error) {
    console.error("Create Company Error:", error);

    // Duplicate database index error
    if (error.code === 11000) {
      const duplicateField = Object.keys(
        error.keyPattern || error.keyValue || {}
      )[0];

      const fieldLabels = {
        companyName: "Company name",
        registeredEmail: "Registered email",
        gstNumber: "GSTIN",
        panNumber: "PAN",
      };

      const label = fieldLabels[duplicateField] || duplicateField;

      return res.status(409).json({
        success: false,
        field: duplicateField || null,
        message: duplicateField
          ? `${label} already exists. Please enter a different value.`
          : "A duplicate value already exists. Please check the company name, email, GSTIN, and PAN.",
      });
    }

    // Mongoose schema validation error
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        field: firstError?.path || null,
        message: firstError?.message || "Please check the submitted values.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create company due to a server error.",
    });
  }
};


/* Company Login */
export const loginCompany = async (req, res) => {
  try {
    const { companyId, registeredEmail, password } = req.body;

    if (!registeredEmail?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Registered email and password are required.",
      });
    }

const company = await Company.findOne({
  _id: companyId,
  registeredEmail: registeredEmail.trim().toLowerCase(),
});

    if (!company) {
      return res.status(401).json({
        success: false,
        message: "Invalid registered email or password.",
      });
    }

    if (company.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This company account is inactive. Contact Super Admin.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      company.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid registered email or password.",
      });
    }

    const token = jwt.sign(
      {
        id: company._id,
        role: "company",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("companyToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Company login successful.",
      company: {
        _id: company._id,
        companyName: company.companyName,
        registeredEmail: company.registeredEmail,
        logo: company.logo,
        status: company.status,
      },
    });
  } catch (error) {
    console.error("Company Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Company login failed.",
    });
  }
};

// Company Logout
export const logoutCompany = async (req, res) => {
  try {
    res.clearCookie("companyToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Company logged out successfully.",
    });
  } catch (error) {
    console.error("Company Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Company logout failed.",
    });
  }
};

// Update Logged-in Company's Own Profile
export const updateCompanyProfile = async (req, res) => {
  try {
    const companyId = req.companyId;

    const {
      companyName,
      companyType,
      gstNumber,
      panNumber,
      registeredEmail,
      phone,
      website,
      industry,
      address,
    } = req.body;

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    const normalizedName =
      companyName !== undefined ? companyName.trim() : company.companyName;

    const normalizedEmail =
      registeredEmail !== undefined
        ? registeredEmail.trim().toLowerCase()
        : company.registeredEmail;

    const normalizedPhone =
      phone !== undefined ? phone.trim() : company.phone;

    const normalizedPan =
      panNumber !== undefined ? panNumber.trim().toUpperCase() : company.panNumber;

    const normalizedGst =
      gstNumber !== undefined ? gstNumber.trim().toUpperCase() : company.gstNumber;

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        field: "companyName",
        message: "Company name is required.",
      });
    }

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        field: "registeredEmail",
        message: "Registered email is required.",
      });
    }

    if (!/^[6-9]\d{9}$/.test(normalizedPhone || "")) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message: "Enter a valid 10-digit Indian mobile number.",
      });
    }

    if (normalizedPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan)) {
      return res.status(400).json({
        success: false,
        field: "panNumber",
        message: "Invalid PAN format.",
      });
    }

    if (
      normalizedGst &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
        normalizedGst
      )
    ) {
      return res.status(400).json({
        success: false,
        field: "gstNumber",
        message: "Invalid GSTIN format.",
      });
    }

    const duplicateName = await Company.findOne({
      _id: { $ne: companyId },
      companyName: {
        $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    }).select("_id");

    if (duplicateName) {
      return res.status(409).json({
        success: false,
        field: "companyName",
        message: "Company name already exists.",
      });
    }

    company.companyName = normalizedName;
    company.registeredEmail = normalizedEmail;
    company.phone = normalizedPhone;

    if (companyType !== undefined) company.companyType = companyType;
    if (gstNumber !== undefined) company.gstNumber = normalizedGst;
    if (panNumber !== undefined) company.panNumber = normalizedPan;
    if (website !== undefined) company.website = website.trim();
    if (industry !== undefined) company.industry = industry.trim();
    if (address !== undefined) company.address = address.trim();

    if (req.files?.logo?.[0]) {
      company.logo = req.files.logo[0].filename;
    }

    if (req.files?.signature?.[0]) {
      company.signature = req.files.signature[0].filename;
    }

    await company.save();

    const safeCompany = company.toObject();
    delete safeCompany.password;
    delete safeCompany.resetOtp;
    delete safeCompany.resetOtpExpire;

    return res.status(200).json({
      success: true,
      message: "Company profile updated successfully.",
      company: safeCompany,
    });
  } catch (error) {
    console.error("Update Company Profile Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A value already exists. Please check the company details.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update company profile.",
    });
  }
};

// Get All Companies
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: companies.length,
      companies,
    });
  } catch (error) {
    console.error("Get All Companies Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get companies",
      error: error.message,
    });
  }
};


// Get Single Company
export const getCompanyById = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      company,
    });
  } catch (error) {
    console.error("Get Company Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get company",
      error: error.message,
    });
  }
};


// Update Company
export const updateCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const {
      companyName,
      companyType,
      gstNumber,
      panNumber,
      email,
      phone,
      website,
      industry,
      address,
      logo,
      signature,
    } = req.body;

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (companyName !== undefined) {
      company.companyName = companyName;
    }

    if (companyType !== undefined) {
      company.companyType = companyType;
    }

    if (gstNumber !== undefined) {
      company.gstNumber = gstNumber;
    }

    if (panNumber !== undefined) {
      company.panNumber = panNumber;
    }

    if (email !== undefined) {
      company.email = email.toLowerCase();
    }

    if (phone !== undefined) {
      company.phone = phone;
    }

    if (website !== undefined) {
      company.website = website;
    }

    if (industry !== undefined) {
      company.industry = industry;
    }

    if (address !== undefined) {
      company.address = address;
    }

    if (logo !== undefined) {
      company.logo = logo;
    }

    if (signature !== undefined) {
      company.signature = signature;
    }

    await company.save();

    return res.status(200).json({
      success: true,
      message: "Company updated successfully",
      company,
    });
  } catch (error) {
    console.error("Update Company Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update company",
      error: error.message,
    });
  }
};


// Change Company Status
export const updateCompanyStatus = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either active or inactive",
      });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    company.status = status;

    await company.save();

    return res.status(200).json({
      success: true,
      message: `Company ${status} successfully`,
      company,
    });
  } catch (error) {
    console.error("Update Company Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update company status",
      error: error.message,
    });
  }
};


// Delete Company
export const deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Delete all roles belonging to this company
    await Role.deleteMany({ companyId });

    // Delete all departments belonging to this company
    await Department.deleteMany({ companyId });

    // Delete company
    await Company.findByIdAndDelete(companyId);

    return res.status(200).json({
      success: true,
      message: "Company, its roles and departments deleted successfully",
    });
  } catch (error) {
    console.error("Delete Company Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete company",
      error: error.message,
    });
  }
};

export const getCompanyWorkspace = async (req, res) => {
  try {
    const { companyId } = req.params;

    // URL-এর ID এবং login cookie-এর ID মিলতে হবে।
    if (req.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this company.",
      });
    }

    const company = await Company.findById(companyId).select(
      "-password -resetOtp -resetOtpExpire"
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    if (company.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This company account is inactive.",
      });
    }

    return res.status(200).json({
      success: true,
      company,
    });
  } catch (error) {
    console.error("Get Company Workspace Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load company workspace.",
    });
  }
};


const sendCompanyOtpEmail = async (company, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: company.registeredEmail,
    subject: "Company Password Reset OTP",
    text: `Hello ${company.companyName},

Your password reset OTP is ${otp}.

This OTP is valid for 10 minutes. Do not share it with anyone.

If you did not request a password reset, please ignore this email.`,
  });
};

// Get company names for Forgot Password dropdown
export const getCompanyNames = async (req, res) => {
  try {
    const companies = await Company.find({
      status: "active",
    })
      .select("_id companyName")
      .sort({ companyName: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      companies,
    });
  } catch (error) {
    console.error("Get Company Names Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load company names.",
    });
  }
};

// 1. Forgot Company Password
// 1. Forgot Company Password
export const forgotCompanyPassword = async (req, res) => {
  try {
    const { companyName, registeredEmail } = req.body;

    if (!companyName?.trim() || !registeredEmail?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Company name and registered email are required.",
      });
    }

    // Company name এবং email একই document-এ match করতে হবে
    const company = await Company.findOne({
      companyName: companyName.trim(),
      registeredEmail: registeredEmail.trim().toLowerCase(),
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company name and registered email do not match.",
      });
    }

    if (company.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This company account is inactive.",
      });
    }

    const otp = String(randomInt(100000, 1000000));

    company.resetOtp = otp;
    company.resetOtpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await company.save();

    try {
      await sendCompanyOtpEmail(company, otp);
    } catch (emailError) {
      company.resetOtp = undefined;
      company.resetOtpExpire = undefined;
      await company.save();

      console.error("Company OTP Email Error:", emailError);

      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your registered email.",
    });
  } catch (error) {
    console.error("Forgot Company Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process password reset request.",
    });
  }
};

// 2. Verify Company OTP
export const verifyCompanyOtp = async (req, res) => {
  try {
    const { companyName, registeredEmail, otp } = req.body;

    if (
      !companyName?.trim() ||
      !registeredEmail?.trim() ||
      !otp?.toString().trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Company name, registered email and OTP are required.",
      });
    }

    const company = await Company.findOne({
      companyName: companyName.trim(),
      registeredEmail: registeredEmail.trim().toLowerCase(),
    });

    if (
      !company ||
      !company.resetOtp ||
      !company.resetOtpExpire
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please request a new OTP.",
      });
    }

    if (company.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This company account is inactive.",
      });
    }

    if (company.resetOtpExpire.getTime() <= Date.now()) {
      company.resetOtp = undefined;
      company.resetOtpExpire = undefined;
      await company.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (String(company.resetOtp) !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error("Verify Company OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP.",
    });
  }
};

// 3. Resend Company OTP
export const resendCompanyOtp = async (req, res) => {
  try {
    const { companyName, registeredEmail } = req.body;

    if (!companyName?.trim() || !registeredEmail?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Company name and registered email are required.",
      });
    }

    const company = await Company.findOne({
      companyName: companyName.trim(),
      registeredEmail: registeredEmail.trim().toLowerCase(),
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company name and registered email do not match.",
      });
    }

    if (company.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This company account is inactive.",
      });
    }

    const otp = String(randomInt(100000, 1000000));

    company.resetOtp = otp;
    company.resetOtpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await company.save();

    try {
      await sendCompanyOtpEmail(company, otp);
    } catch (emailError) {
      company.resetOtp = undefined;
      company.resetOtpExpire = undefined;
      await company.save();

      console.error("Resend Company OTP Email Error:", emailError);

      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your registered email.",
    });
  } catch (error) {
    console.error("Resend Company OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP.",
    });
  }
};

// 4. Reset Company Password
export const resetCompanyPassword = async (req, res) => {
  try {
    const {
      companyName,
      registeredEmail,
      otp,
      newPassword,
    } = req.body;

    if (
      !companyName?.trim() ||
      !registeredEmail?.trim() ||
      !otp?.toString().trim() ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Company name, registered email, OTP and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // একই কোম্পানির নাম এবং registered email match করতে হবে
    const company = await Company.findOne({
      companyName: companyName.trim(),
      registeredEmail: registeredEmail.trim().toLowerCase(),
    });

    if (
      !company ||
      !company.resetOtp ||
      !company.resetOtpExpire
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please request a new OTP.",
      });
    }

    if (company.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This company account is inactive.",
      });
    }

    if (company.resetOtpExpire.getTime() <= Date.now()) {
      company.resetOtp = undefined;
      company.resetOtpExpire = undefined;
      await company.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // OTP অবশ্যই ওই নির্দিষ্ট কোম্পানির হতে হবে
    if (String(company.resetOtp) !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    company.password = await bcrypt.hash(newPassword, 10);

    // সফল reset-এর পর OTP আর ব্যবহার করা যাবে না
    company.resetOtp = undefined;
    company.resetOtpExpire = undefined;

    await company.save();

    return res.status(200).json({
      success: true,
      message: "Company password reset successfully. Please log in.",
    });
  } catch (error) {
    console.error("Reset Company Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset company password.",
    });
  }
};