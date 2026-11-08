
import mongoose from "mongoose";

const employeeIdCounterSchema = new mongoose.Schema(
  {
    // Unique counter document for each company + year + month
    _id: {
      type: String,
      required: true,
    },

    sequence: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

const EmployeeIdCounter = mongoose.model(
  "EmployeeIdCounter",
  employeeIdCounterSchema
);

export default EmployeeIdCounter;
