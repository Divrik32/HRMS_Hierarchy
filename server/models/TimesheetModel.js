
import mongoose from "mongoose";

const timesheetSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    task: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Project is mandatory
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },

    // Optional project/activity name
    projectName: {
      type: String,
      trim: true,
      default: "",
    },

    // Time values in minutes
    allocatedTime: {
      trainingTime: {
        type: Number,
        required: true,
        min: 0,
      },

      workingTime: {
        type: Number,
        required: true,
        min: 0,
      },

      // Optional; can be updated later
      idleTime: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Optional; can be updated later
    startTime: {
      type: Date,
      default: null,
    },

    endTime: {
      type: Date,
      default: null,
    },

    totalCompletionTime: {
      type: Number,
      default: null,
      min: 0,
    },

    efficiency: {
      type: Number,
      default: null,
      min: 0,
    },

    remarks: {
      delayFast: {
        type: String,
        enum: ["Delay", "Fast", ""],
        default: "",
      },

      reason: {
        type: String,
        trim: true,
        default: "",
      },
    },

    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },

    auditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

timesheetSchema.index({
  companyId: 1,
  employeeId: 1,
  createdAt: -1,
});

timesheetSchema.index({
  companyId: 1,
  approvalStatus: 1,
  startTime: 1,
});

const Timesheet = mongoose.model("Timesheet", timesheetSchema);

export default Timesheet;