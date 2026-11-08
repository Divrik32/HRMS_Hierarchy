import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema(
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

    casualLeave: {
      type: Number,
      default: 0,
      min: 0,
    },

    sickLeave: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidLeave: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Approved unpaid leave days for payroll calculation.
    extraLeaveTaken: {
      type: Number,
      default: 0,
      min: 0,
    },

    accrualHistory: [
      {
        month: {
          type: String,
          required: true,
        },

        casualLeave: {
          type: Number,
          default: 0.5,
        },

        sickLeave: {
          type: Number,
          default: 0.5,
        },

        paidLeave: {
          type: Number,
          default: 0.5,
        },

        creditedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    lastAccrualMonth: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

leaveBalanceSchema.index(
  { companyId: 1, employeeId: 1 },
  { unique: true }
);

export default mongoose.model("LeaveBalance", leaveBalanceSchema);