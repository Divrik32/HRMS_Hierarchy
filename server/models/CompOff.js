
import mongoose from "mongoose";

const compOffSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Employee for whom HR is applying Comp-Off.
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    // HR who submitted the Comp-Off request.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // Actual date on which the employee worked.
    workDate: {
      type: Date,
      required: true,
    },

    // Date on which the employee will use the Comp-Off.
    leaveDate: {
      type: Date,
      required: true,
    },

    // Only Sunday or declared company holiday is eligible.
    dayType: {
      type: String,
      enum: ["Sunday", "Holiday"],
      required: true,
    },

    // Required when dayType is Holiday.
    holidayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Holiday",
      default: null,
    },

    workDescription: {
      type: String,
      required: true,
      trim: true,
    },

    creditedDays: {
      type: Number,
      default: 1,
      min: 0.5,
    },

    // Every new request must wait for approval.
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Used"],
      default: "Pending",
      index: true,
    },

    // Employee approver, when approval is done by HR.
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    verifiedBySuperAdmin: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "SuperAdmin",
  default: null,
},

    verifiedAt: {
      type: Date,
      default: null,
    },

    leaveRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate Comp-Off requests for the same employee and work date.
compOffSchema.index(
  {
    companyId: 1,
    employeeId: 1,
    workDate: 1,
  },
  { unique: true }
);

export default mongoose.model("CompOff", compOffSchema);