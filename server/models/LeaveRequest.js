
import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema(
  {
    // =================================================
    // COMPANY & EMPLOYEE
    // =================================================

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
    // LEAVE TYPE
    // =================================================

    leaveType: {
      type: String,
      enum: [
        "Casual Leave",
        "Sick Leave",
        "Paid Leave",
        "Comp-Off",
      ],
      required: true,
    },

    // =================================================
    // SELECTED DATES
    // Each date can be Full Day or Half Day
    // =================================================

    leaveDates: [
      {
        date: {
          type: Date,
          required: true,
        },

        dayType: {
          type: String,
          enum: ["Full Day", "Half Day"],
          required: true,
        },
      },
    ],

    // =================================================
    // LEAVE DAYS
    // =================================================

    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },

    // Days deducted from selected leave balance
    leaveDays: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Remaining days treated as Unpaid Leave
    unpaidDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =================================================
    // REASON
    // =================================================

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    // =================================================
    // STATUS
    // =================================================

    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Rejected",
        "Withdrawn",
      ],
      default: "Pending",
      index: true,
    },

    // =================================================
    // BALANCE TRACKING
    // =================================================

    balanceDeducted: {
      type: Boolean,
      default: false,
    },

    // =================================================
    // PAYROLL TRACKING
    // =================================================

    payrollProcessed: {
      type: Boolean,
      default: false,
    },

    payrollProcessedAt: {
      type: Date,
      default: null,
    },

    // =================================================
    // APPROVAL INFORMATION
    // Multiple employees can approve
    // =================================================

    approvedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],

    approvedBySuperAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // =================================================
    // REJECTION INFORMATION
    // =================================================

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    rejectedBySuperAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    // =================================================
    // ACTION HISTORY
    // =================================================

    actionHistory: [
      {
        action: {
          type: String,
          enum: [
            "Submitted",
            "Approved",
            "Rejected",
            "Withdrawn",
          ],
          required: true,
        },

        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
          default: null,
        },

        performedBySuperAdmin: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SuperAdmin",
          default: null,
        },

        remarks: {
          type: String,
          default: "",
          trim: true,
        },

        performedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// =====================================================
// INDEXES
// =====================================================

leaveRequestSchema.index({
  companyId: 1,
  employeeId: 1,
  status: 1,
  createdAt: -1,
});

leaveRequestSchema.index({
  companyId: 1,
  status: 1,
  "leaveDates.date": 1,
});

leaveRequestSchema.index({
  companyId: 1,
  employeeId: 1,
  "leaveDates.date": 1,
});

// =====================================================
// EXPORT MODEL
// =====================================================

export default mongoose.model(
  "LeaveRequest",
  leaveRequestSchema
);
