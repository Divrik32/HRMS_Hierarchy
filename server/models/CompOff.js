
import mongoose from "mongoose";

// =====================================================
// WORK ENTRY SCHEMA
// =====================================================

const workEntrySchema = new mongoose.Schema(
  {
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
    },

    workDate: {
      type: String,
      required: true,
    },

    workType: {
      type: String,
      enum: ["Normal", "Sunday", "Holiday"],
      required: true,
    },

    actualMinutes: {
      type: Number,
      required: true,
      min: 0,
    },

    eligibleMinutes: {
      type: Number,
      required: true,
      min: 0,
    },

    claimedMinutes: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// =====================================================
// MAIN COMP-OFF SCHEMA
// =====================================================

const compOffSchema = new mongoose.Schema(
  {
    // =================================================
    // COMPANY
    // =================================================

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // =================================================
    // EMPLOYEE
    // =================================================

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    // =================================================
    // RECORD TYPE
    // Request = Comp-Off earned through extra work.
    // Usage = Comp-Off consumed through Leave Request.
    // =================================================

    recordType: {
      type: String,
      enum: ["Request", "Usage"],
      default: "Request",
      required: true,
    },

    // =================================================
    // WORK ENTRIES
    // =================================================

    workEntries: {
      type: [workEntrySchema],
      default: [],
    },

    // =================================================
    // EARNED MINUTES
    // =================================================

    totalClaimedMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =================================================
    // CREDITED DAYS
    // Total approved Comp-Off days earned.
    // =================================================

    creditedDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =================================================
    // USED DAYS
    // Total days consumed from this credit group.
    // =================================================

    usedDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =================================================
    // REMAINING DAYS
    // Available days remaining in this credit group.
    // =================================================

    remainingDays: {
      type: Number,
      default: 0,
      min: 0,
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
        "Used",
      ],
      default: "Pending",
      index: true,
    },

    // =================================================
    // CREATED BY
    // =================================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // =================================================
    // VERIFIED BY
    // =================================================

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    // =================================================
    // REJECTION
    // =================================================

    rejectionReason: {
      type: String,
      default: "",
    },

    // =================================================
    // USAGE DATE
    // =================================================

    usageDate: {
      type: String,
      default: null,
    },

    // =================================================
    // USAGE REFERENCE
    // LeaveRequest that consumed this Comp-Off.
    // =================================================

    usageReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      default: null,
    },

    // =================================================
    // SOURCE COMP-OFF REFERENCE
    // Original earning record used by a Usage record.
    // =================================================

    sourceCompOffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompOff",
      default: null,
    },

    // =================================================
    // REMARKS
    // =================================================

    remarks: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// INDEXES
// =====================================================

compOffSchema.index({
  companyId: 1,
  employeeId: 1,
  createdAt: -1,
});

compOffSchema.index({
  companyId: 1,
  status: 1,
  createdAt: -1,
});

compOffSchema.index({
  companyId: 1,
  employeeId: 1,
  recordType: 1,
  status: 1,
});

compOffSchema.index({
  usageReference: 1,
});

// =====================================================
// EXPORT MODEL
// =====================================================

export default mongoose.model("CompOff", compOffSchema);
