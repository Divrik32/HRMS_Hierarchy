
import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required."],
      trim: true,
      unique: true,
    },

    companyType: {
      type: String,
      required: [true, "Company type is required"],
      enum: [
        "Private Limited",
        "Public Limited",
        "LLP",
        "Partnership",
        "Proprietorship",
      ],
    },

gstNumber: {
  type: String,
  trim: true,
  uppercase: true,
  sparse: true,
  unique: true,
  validate: {
    validator: (value) =>
      !value ||
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value),
    message:
      "Invalid GSTIN format. Enter a valid 15-character GSTIN, e.g. 22ABCDE1234F1Z5.",
  },
},

panNumber: {
  type: String,
  trim: true,
  uppercase: true,
  sparse: true,
  unique: true,
  validate: {
    validator: (value) =>
      !value || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value),
    message:
      "Invalid PAN format. Use 5 letters, 4 digits, and 1 letter, e.g. ABCDE1234F.",
  },
},

registeredEmail: {
  type: String,
  required: [true, "Registered email is required."],
  trim: true,
  lowercase: true,
  match: [
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    "Please enter a valid registered email address.",
  ],
},

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    resetOtp: {
      type: String,
      default: null,
    },

    resetOtpExpire: {
      type: Date,
      default: null,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."],
    },

    website: {
      type: String,
      trim: true,
    },

    industry: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },

    logo: {
      type: String,
      default: "",
    },

    signature: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const Company = mongoose.model("Company", companySchema);

export default Company;
