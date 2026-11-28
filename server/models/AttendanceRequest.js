import mongoose from "mongoose";

const attendanceRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    attendanceDate: {
      type: String,
      required: true,
    },

    request: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Done"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

const AttendanceRequest = mongoose.model(
  "AttendanceRequest",
  attendanceRequestSchema
);

export default AttendanceRequest;