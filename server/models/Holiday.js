import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    holidayName: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    createdByRole: {
      type: String,
      enum: ["superadmin", "employee"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// একই কোম্পানিতে একই তারিখে একাধিক Holiday হবে না।
holidaySchema.index(
  { companyId: 1, date: 1 },
  { unique: true }
);

const Holiday = mongoose.model("Holiday", holidaySchema);

export default Holiday;