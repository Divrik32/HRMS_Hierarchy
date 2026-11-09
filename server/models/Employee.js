
import mongoose from "mongoose";
import Company from "./Company.js";
import EmployeeIdCounter from "./EmployeeIdCounter.js";

// =====================================================
// COMPANY PREFIX GENERATOR
// Older companies get priority.
// Example:
// Work Science -> WS
// Work Soy     -> WSO
// Work Soey    -> WSE
// =====================================================

const getCompanyInitials = (companyName) => {
  return companyName
    .trim()
    .split(/\s+/)
    .map((word) => word.match(/[A-Za-z0-9]/)?.[0] || "")
    .filter(Boolean)
    .join("")
    .toUpperCase();
};

const getUniqueCompanyPrefix = (companyName, usedPrefixes) => {
  const words = companyName.trim().split(/\s+/);

  const basePrefix = getCompanyInitials(companyName);

  if (!basePrefix) {
    throw new Error("Unable to generate company prefix.");
  }

  // First company with these initials gets the original prefix.
  if (!usedPrefixes.has(basePrefix)) {
    return basePrefix;
  }

  // Check additional letters in subsequent words.
  // Example:
  // Work Soy -> WS + O = WSO
  // Work Soey -> WS + O already exists, then E = WSE
  for (let wordIndex = 1; wordIndex < words.length; wordIndex++) {
    const characters =
      words[wordIndex].match(/[A-Za-z0-9]/g) || [];

    for (let charIndex = 1; charIndex < characters.length; charIndex++) {
      const candidate =
        basePrefix + characters[charIndex].toUpperCase();

      if (!usedPrefixes.has(candidate)) {
        return candidate;
      }
    }
  }

  // If no single character gives a unique prefix,
  // try progressively longer character combinations.
  for (let wordIndex = 1; wordIndex < words.length; wordIndex++) {
    const characters =
      words[wordIndex].match(/[A-Za-z0-9]/g) || [];

    for (let length = 2; length < characters.length; length++) {
      const extraCharacters = characters
        .slice(1, length + 1)
        .join("")
        .toUpperCase();

      const candidate = basePrefix + extraCharacters;

      if (!usedPrefixes.has(candidate)) {
        return candidate;
      }
    }
  }

  // Final fallback: numeric suffix.
  let suffix = 2;

  while (usedPrefixes.has(`${basePrefix}${suffix}`)) {
    suffix++;
  }

  return `${basePrefix}${suffix}`;
};

// =====================================================
// GET COMPANY PREFIX BASED ON CREATED AT
// =====================================================

const getCompanyEmployeePrefix = async (companyId) => {
  const companies = await Company.find({})
    .select("companyName createdAt")
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const usedPrefixes = new Set();

  for (const company of companies) {
    const prefix = getUniqueCompanyPrefix(
      company.companyName,
      usedPrefixes
    );

    usedPrefixes.add(prefix);

    if (String(company._id) === String(companyId)) {
      return prefix;
    }
  }

  throw new Error("Company not found while generating Employee ID.");
};

// =====================================================
// EMPLOYEE SCHEMA
// =====================================================

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    empId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    profilePic: {
      type: String,
      default: "",
    },

phone: {
  type: String,
  required: true,
  trim: true,
  validate: {
    validator: function (value) {
      return /^\+[1-9]\d{0,2}\d{10}$/.test(value);
    },
    message:
      "Phone number must contain a country code and exactly 10 digits.",
  },
},

    presentAddress: {
      type: String,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    resetOtp: {
      type: String,
      default: "",
    },

    resetOtpExpire: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// GENERATE EMPLOYEE ID
// Format: COMPANY_PREFIX + YYYY + MM + SEQUENCE
// Example: WS202611001
// =====================================================

employeeSchema.pre("validate", async function () {
  if (!this.isNew) return;

  // Keep manually entered Employee ID.
  if (this.empId && this.empId.trim()) {
    this.empId = this.empId.trim().toUpperCase();
    return;
  }

  if (!this.companyId) {
    throw new Error("Company ID is required to generate Employee ID.");
  }

  // Generate unique company prefix based on creation order.
  const companyPrefix = await getCompanyEmployeePrefix(
    this.companyId
  );

  // Current year and month in Indian timezone.
  const dateParts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = dateParts.find(
    (part) => part.type === "year"
  ).value;

  const month = dateParts.find(
    (part) => part.type === "month"
  ).value;

  // Separate counter for each company + year + month.
  const counterId = `${this.companyId}_${year}${month}`;

  let counter;

  try {
    counter = await EmployeeIdCounter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { sequence: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    // Retry if simultaneous first-time counter creation occurs.
    counter = await EmployeeIdCounter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { sequence: 1 } },
      { new: true }
    );

    if (!counter) {
      throw new Error(
        "Unable to generate Employee ID. Please try again."
      );
    }
  }

  const sequence = String(counter.sequence).padStart(3, "0");

  this.empId = `${companyPrefix}${year}${month}${sequence}`;
});

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;