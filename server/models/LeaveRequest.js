import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema(
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

    // Paid or Unpaid
    leaveCategory: {
      type: String,
      enum: ["Paid Leave", "Unpaid Leave"],
      required: true,
    },

    // Type of leave
    leaveType: {
      type: String,
      enum: ["Casual Leave", "Sick Leave", "Paid Leave"],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Withdrawn"],
      default: "Pending",
      index: true,
    },

    // Derived from leaveCategory.
    isUnpaid: {
      type: Boolean,
      default: false,
    },

    // Whether paid leave balance has been deducted.
    balanceDeducted: {
      type: Boolean,
      default: false,
    },

    // Payroll processing tracking.
    payrollProcessed: {
      type: Boolean,
      default: false,
    },

    payrollProcessedAt: {
      type: Date,
      default: null,
    },

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
        },

        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },

        performedBySuperAdmin: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "SuperAdmin",
  default: null,
},

        remarks: {
          type: String,
          default: "",
        },

        performedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

leaveRequestSchema.index({
  companyId: 1,
  employeeId: 1,
  startDate: 1,
  endDate: 1,
});

export default mongoose.model("LeaveRequest", leaveRequestSchema);