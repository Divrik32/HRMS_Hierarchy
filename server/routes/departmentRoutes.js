import express from "express";
import {
  createDepartment,
  getCompanyDepartments,
  getDepartmentById,
  updateDepartment,
  updateDepartmentStatus,
  deleteDepartment,
} from "../controllers/departmentController.js";
import superAdminAuth from "../middleware/superAdminAuth.js";

const router = express.Router();


// Create Department
router.post("/", superAdminAuth, createDepartment);

// Get All Departments Of A Company
router.get("/company/:companyId", superAdminAuth, getCompanyDepartments);

// Get Single Department
router.get("/:departmentId", superAdminAuth, getDepartmentById);

// Update Department
router.put("/:departmentId", superAdminAuth, updateDepartment);

// Update Department Status
router.patch(
  "/:departmentId/status",
  superAdminAuth,
  updateDepartmentStatus
);

// Delete Department
router.delete("/:departmentId", superAdminAuth, deleteDepartment);


export default router;