import mongoose from "mongoose";

const deletedModuleSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,

    moduleName: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "Not Assigned",
        "Assigned",
        "In Progress",
        "Completed",
      ],
      default: "Not Assigned",
    },

    createdAt: Date,
    updatedAt: Date,
  },
  { _id: false }
);

const deletedProjectSchema = new mongoose.Schema(
  {
    originalProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    projectName: {
      type: String,
      required: true,
      trim: true,
    },

    projectCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    projectDetails: {
      type: String,
      default: "",
    },

    remarks: {
      type: String,
      default: "",
    },

    projectDescription: {
      type: String,
      default: "",
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Super Admin-created project
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      default: null,
    },

    // Employee-created project
    createdByEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    roleAccess: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],

    // Employees who have project access
    employeeAccess: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
      ],
      default: [],
    },

    modules: {
      type: [deletedModuleSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    originalCreatedAt: Date,
    originalUpdatedAt: Date,

    // Super Admin who deleted the project
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      default: null,
    },

    // Employee who deleted the project
    deletedByEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

deletedProjectSchema.index({
  companyId: 1,
  deletedAt: -1,
});

const DeletedProject = mongoose.model(
  "DeletedProject",
  deletedProjectSchema
);

export default DeletedProject;