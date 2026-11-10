
import mongoose from "mongoose";

// =====================================================
// LEAVE TYPE BREAKDOWN
// =====================================================

const leaveBreakdownSchema = new mongoose.Schema(
  {
    leaveType: {
      type: String,
      enum: [
        "Casual Leave",
        "Sick Leave",
        "Paid Leave",
        "Unpaid Leave",
      ],
      required: true,
    },

    days: {
      type: Number,
      required: true,
      min: 0.5,
    },
  },
  { _id: false }
);

// =====================================================
// DAILY BREAKDOWN
// =====================================================

const dailyBreakdownSchema = new mongoose.Schema(
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

    days: {
      type: Number,
      enum: [0.5, 1],
      required: true,
    },
  },
  { _id: false }
);

// =====================================================
// ACTION HISTORY
// =====================================================

const actionHistorySchema = new mongoose.Schema(
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
  { _id: false }
);

// =====================================================
// MAIN LEAVE REQUEST MODEL
// =====================================================

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
    // LEAVE CATEGORY
    // Automatically derived by controller
    // =================================================

    leaveCategory: {
      type: String,
      enum: [
        "Paid Leave",
        "Unpaid Leave",
        "Mixed Leave",
      ],
      required: true,
    },

    // =================================================
    // LEGACY LEAVE TYPE
    // Kept for old records compatibility
    // =================================================

    leaveType: {
      type: String,
      enum: [
        "Casual Leave",
        "Sick Leave",
        "Paid Leave",
        "Unpaid Leave",
      ],
      default: undefined,
    },

    // =================================================
    // MULTIPLE LEAVE TYPES
    // Example:
    // Sick Leave: 0.5
    // Casual Leave: 0.5
    // Unpaid Leave: 6.5
    // =================================================

    leaveBreakdown: {
      type: [leaveBreakdownSchema],
      default: [],
    },

    // =================================================
    // DATE RANGE
    // =================================================

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // =================================================
    // DAILY BREAKDOWN
    // Employee-selected Half Day date
    // =================================================

    dailyBreakdown: {
      type: [dailyBreakdownSchema],
      default: [],
    },

    // =================================================
    // TOTAL LEAVE DAYS
    // Sum of leaveBreakdown and dailyBreakdown
    // =================================================

    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
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
    // PAYMENT INFORMATION
    // =================================================

    // True only when the entire request is unpaid.
    // Mixed Leave should have isUnpaid = false.

    isUnpaid: {
      type: Boolean,
      default: false,
    },

    // True when any paid leave allocation was deducted.

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
    // =================================================

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

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

    actionHistory: {
      type: [actionHistorySchema],
      default: [],
    },
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
  startDate: 1,
  endDate: 1,
});

leaveRequestSchema.index({
  companyId: 1,
  status: 1,
  startDate: 1,
});

// =====================================================
// EXPORT MODEL
// =====================================================

export default mongoose.model(
  "LeaveRequest",
  leaveRequestSchema
);
