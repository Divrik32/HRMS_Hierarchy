
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
        "Comp-Off",
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
// COMP-OFF ALLOCATION
// Tracks which earning records provide the Comp-Off days.
// =====================================================

const compOffAllocationSchema = new mongoose.Schema(
  {
    compOffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompOff",
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
    // =================================================

    leaveCategory: {
      type: String,
      enum: [
        "Paid Leave",
        "Unpaid Leave",
        "Mixed Leave",
        "Comp-Off",
      ],
      required: true,
    },

    // =================================================
    // LEGACY LEAVE TYPE
    // =================================================

    leaveType: {
      type: String,
      enum: [
        "Casual Leave",
        "Sick Leave",
        "Paid Leave",
        "Unpaid Leave",
        "Comp-Off",
      ],
      default: undefined,
    },

    // =================================================
    // MULTIPLE LEAVE TYPES
    // =================================================

    leaveBreakdown: {
      type: [leaveBreakdownSchema],
      default: [],
    },

    // =================================================
    // COMP-OFF ALLOCATION
    // Each allocation references an approved earning record.
    // =================================================

    compOffAllocations: {
      type: [compOffAllocationSchema],
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
    // =================================================

    dailyBreakdown: {
      type: [dailyBreakdownSchema],
      default: [],
    },

    // =================================================
    // TOTAL LEAVE DAYS
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

    isUnpaid: {
      type: Boolean,
      default: false,
    },

    balanceDeducted: {
      type: Boolean,
      default: false,
    },

    // =================================================
    // COMP-OFF RESERVATION TRACKING
    // True when Comp-Off days have been reserved
    // for this pending Leave Request.
    // =================================================

    compOffBalanceDeducted: {
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

leaveRequestSchema.index({
  companyId: 1,
  employeeId: 1,
  status: 1,
  createdAt: -1,
});

// =====================================================
// EXPORT MODEL
// =====================================================

export default mongoose.model(
  "LeaveRequest",
  leaveRequestSchema
);
