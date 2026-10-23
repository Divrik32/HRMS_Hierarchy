import express from "express";

import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  assignRootRoles,
  addProjectModule,
  deleteProjectModule,
  updateProjectModuleStatus,
  getProjectRoleAccess,
  grantProjectAccess,
  revokeProjectAccess,
  getMyGrantedProjectAccess,
  getMyAccessibleProjects,
  getProjectModules,
  updateProjectModule,
} from "../controllers/projectController.js";
import superAdminAuth from "../middleware/superAdminAuth.js";
import employeeOrSuperAdminAuth from "../middleware/employeeOrSuperAdminAuth.js";
import employeeAuth from "../middleware/employeeAuth.js";

const router = express.Router();

// Create and list projects
router.post("/", superAdminAuth, createProject);
router.get("/", superAdminAuth, getAllProjects);

// Root-role assignment — Super Admin only
router.put("/:projectId/root-roles", superAdminAuth, assignRootRoles);

// Get modules — Super Admin or authorized Employee
router.get("/:projectId/modules", employeeOrSuperAdminAuth, getProjectModules);

// Add module — Super Admin only
router.post("/:projectId/modules", superAdminAuth, addProjectModule);

// Update module name and/or status — Super Admin only
router.put("/:projectId/modules/:moduleId", superAdminAuth, updateProjectModule);

router.delete(
  "/:projectId/modules/:moduleId",
  superAdminAuth,
  deleteProjectModule
);

// Update module status — Super Admin or Employee
// Ei route-er jonno duita middleware-er moddhe ekta choose korte hobe,
// ba dedicated combined-auth middleware lagbe.
router.patch(
  "/:projectId/modules/:moduleId/status",
  employeeOrSuperAdminAuth,
  updateProjectModuleStatus
);

// Role-based project access delegation — Employee only
router.post("/:projectId/access", employeeAuth, grantProjectAccess);

router.delete(
  "/:projectId/access/:roleId",
  employeeAuth,
  revokeProjectAccess
);

router.get(
  "/:projectId/my-granted-access",
  employeeAuth,
  getMyGrantedProjectAccess
);
// Get all projects accessible to the logged-in employee.
router.get("/my-accessible-projects", employeeAuth, getMyAccessibleProjects);

// Role access details
router.get("/:projectId/role-access", employeeOrSuperAdminAuth, getProjectRoleAccess);

// Project details
router.get("/:projectId", employeeOrSuperAdminAuth, getProjectById);

// Update and delete — Super Admin only
router.put("/:projectId", superAdminAuth, updateProject);
router.delete("/:projectId", superAdminAuth, deleteProject);

export default router;