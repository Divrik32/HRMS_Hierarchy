
import mongoose from "mongoose";

// =====================================================
// BREAK SCHEMA
// Only one break is allowed per task
// =====================================================

const breakSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      default: null,
    },

    duration: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

// =====================================================
// TIMESHEET SCHEMA
// =====================================================

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

    // =================================================
    // TASK TYPE
    // Project / Learning / Training
    // =================================================

    taskType: {
      type: String,
      enum: ["Project", "Learning", "Training"],
      default: "Project",
      required: true,
    },

    // =================================================
    // PROJECT
    // Required only when taskType is Project
    // =================================================

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      required: function () {
        return this.taskType === "Project";
      },
      index: true,
    },

    // =================================================
    // TASK / PROJECT MODULE
    // Required only when taskType is Project
    // =================================================

    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      required: function () {
        return this.taskType === "Project";
      },
    },

    task: {
      type: String,
      required: true,
      trim: true,
    },

    // =================================================
    // DESCRIPTION
    // Mandatory for Learning and Training
    // =================================================

    description: {
      type: String,
      trim: true,
      default: "",
      required: function () {
        return (
          this.taskType === "Learning" ||
          this.taskType === "Training"
        );
      },
    },

    // =================================================
    // DATE & TIME
    // Automatically assigned when task is created
    // =================================================

    date: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },

    // =================================================
    // TIME CALCULATIONS (ALL VALUES IN MINUTES)
    // =================================================

    estimatedTime: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCompletionTime: {
      type: Number,
      default: null,
      min: 0,
    },

    idleTime: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Actual time - estimated time
    // Positive = Delay, Negative = Faster

    estimatedError: {
      type: Number,
      default: null,
    },

    // =================================================
    // TASK START & END
    // =================================================

    startTime: {
      type: Date,
      default: null,
    },

    endTime: {
      type: Date,
      default: null,
    },

    taskStatus: {
      type: String,
      enum: [
        "Not Started",
        "In Progress",
        "On Break",
        "Completed",
      ],
      default: "Not Started",
      index: true,
    },

    // =================================================
    // ONE-TIME BREAK
    // =================================================

    breakTime: {
      type: breakSchema,
      default: null,
    },

    // =================================================
    // EFFICIENCY
    // =================================================

    efficiency: {
      type: Number,
      default: null,
      min: 0,
    },

    // =================================================
    // REMARKS
    // =================================================

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

    // =================================================
    // APPROVAL
    // =================================================

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

    // =================================================
    // REJECTION DETAILS
    // =================================================

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// INDEXES
// =====================================================

timesheetSchema.index({
  companyId: 1,
  employeeId: 1,
  date: -1,
});

timesheetSchema.index({
  companyId: 1,
  approvalStatus: 1,
  date: -1,
});

timesheetSchema.index({
  companyId: 1,
  projectId: 1,
  employeeId: 1,
});

const Timesheet = mongoose.model("Timesheet", timesheetSchema);

export default Timesheet;
