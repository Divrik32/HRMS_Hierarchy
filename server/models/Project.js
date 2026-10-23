
import mongoose from "mongoose";
import crypto from "crypto";

const generateProjectCode = (projectName, clientName) => {
  const getInitials = (value) =>
    value
      .trim()
      .split(/[\s\-_]+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 4);

  const projectInitials = getInitials(projectName) || "PROJ";
  const clientInitials = getInitials(clientName) || "CLNT";
  const uniqueNumber = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `${clientInitials}-${projectInitials}-${uniqueNumber}`;
};

// One project can contain many modules
const moduleSchema = new mongoose.Schema(
  {
    moduleName: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Not Assigned", "Assigned", "In Progress", "Completed"],
      default: "Not Assigned",
    },
  },
  {
    timestamps: true,
  }
);

const projectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
    },

    projectCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      immutable: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    projectDetails: {
      type: String,
      trim: true,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    projectDescription: {
      type: String,
      trim: true,
      default: "",
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },

    roleAccess: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],

    // One project can contain many modules.
    modules: {
      type: [moduleSchema],
      default: [],
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

// Generate projectCode automatically when not provided
projectSchema.pre("validate", function () {
  if (!this.projectCode && this.projectName && this.clientName) {
    this.projectCode = generateProjectCode(
      this.projectName,
      this.clientName
    );
  }
});

// A project name must be unique within a company
projectSchema.index(
  { companyId: 1, projectName: 1 },
  { unique: true }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;