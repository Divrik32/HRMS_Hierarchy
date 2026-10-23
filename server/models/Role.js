import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: true,
      trim: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    parentRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

roleSchema.index(
  { companyId: 1, roleName: 1 },
  { unique: true }
);

const Role = mongoose.model("Role", roleSchema);

export default Role;