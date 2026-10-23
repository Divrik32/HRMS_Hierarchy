import mongoose from "mongoose";
import Department from "../models/Department.js";
import Company from "../models/Company.js";

// Create Department
export const createDepartment = async (req, res) => {
  try {
    const {
      departmentName,
      companyId,
      description,
      status,
    } = req.body;

    if (!departmentName || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Department name and company ID are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // Check company exists
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check duplicate department inside same company
    const existingDepartment = await Department.findOne({
      companyId,
      departmentName: departmentName.trim(),
    });

    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: "This department already exists in this company",
      });
    }

    const department = await Department.create({
      departmentName: departmentName.trim(),
      companyId,
      description,
      status: status || "active",
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error("Create Department Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This department already exists in this company",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create department",
      error: error.message,
    });
  }
};

// Get All Departments Of A Company
export const getCompanyDepartments = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // Check company exists
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const departments = await Department.find({
      companyId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (error) {
    console.error("Get Company Departments Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get company departments",
      error: error.message,
    });
  }
};

// Get Single Department
export const getDepartmentById = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    const department = await Department.findById(departmentId).populate(
      "companyId",
      "companyName"
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      department,
    });
  } catch (error) {
    console.error("Get Department Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get department",
      error: error.message,
    });
  }
};

// Update Department
export const updateDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const {
      departmentName,
      description,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    const department = await Department.findById(departmentId);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Update department name
    if (departmentName !== undefined) {
      const trimmedDepartmentName = departmentName.trim();

      if (!trimmedDepartmentName) {
        return res.status(400).json({
          success: false,
          message: "Department name cannot be empty",
        });
      }

      // Check duplicate department name inside same company
      const existingDepartment = await Department.findOne({
        companyId: department.companyId,
        departmentName: trimmedDepartmentName,
        _id: { $ne: departmentId },
      });

      if (existingDepartment) {
        return res.status(400).json({
          success: false,
          message: "This department already exists in this company",
        });
      }

      department.departmentName = trimmedDepartmentName;
    }

    // Update description
    if (description !== undefined) {
      department.description = description;
    }

    await department.save();

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      department,
    });
  } catch (error) {
    console.error("Update Department Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This department already exists in this company",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update department",
      error: error.message,
    });
  }
};

// Change Department Status
export const updateDepartmentStatus = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either active or inactive",
      });
    }

    const department = await Department.findById(departmentId);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    department.status = status;

    await department.save();

    return res.status(200).json({
      success: true,
      message: `Department ${status} successfully`,
      department,
    });
  } catch (error) {
    console.error("Update Department Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update department status",
      error: error.message,
    });
  }
};

// Delete Department
export const deleteDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    const department = await Department.findById(departmentId);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    await Department.findByIdAndDelete(departmentId);

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Delete Department Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete department",
      error: error.message,
    });
  }
};