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
  getEmployeesForModuleAssignment,
  assignProjectModule,
  revokeProjectAccessBySuperAdmin,
  getDeletedProjects,
  restoreDeletedProject,
  permanentlyDeleteProject,
  getMyAssignedModules,
  getAssignableEmployees,
  getActiveProjectsByCompany,
  grantProjectAccessBySuperAdmin,
  getMyCreatedProjects,
} from "../controllers/projectController.js";

import superAdminAuth from "../middleware/superAdminAuth.js";
import employeeOrSuperAdminAuth from "../middleware/employeeOrSuperAdminAuth.js";
import employeeAuth from "../middleware/employeeAuth.js";

const router = express.Router();

// =====================================================
// SUPER ADMIN — EXISTING ROUTES
// =====================================================

router.post("/", superAdminAuth, createProject);
router.get("/", superAdminAuth, getAllProjects);

router.put("/:projectId/root-roles", superAdminAuth, assignRootRoles);

// Super Admin access grant/revoke — keep before dynamic :roleId route
router.post(
  "/:projectId/access/super-admin",
  superAdminAuth,
  grantProjectAccessBySuperAdmin
);

router.delete(
  "/:projectId/access/:employeeId/super-admin",
  superAdminAuth,
  revokeProjectAccessBySuperAdmin
);

router.post("/:projectId/modules", superAdminAuth, addProjectModule);

router.put(
  "/:projectId/modules/:moduleId",
  superAdminAuth,
  updateProjectModule
);

router.delete(
  "/:projectId/modules/:moduleId",
  superAdminAuth,
  deleteProjectModule
);

router.put("/:projectId", superAdminAuth, updateProject);
router.delete("/:projectId", superAdminAuth, deleteProject);

router.get("/deleted", superAdminAuth, getDeletedProjects);

router.post(
  "/deleted/:deletedProjectId/restore",
  superAdminAuth,
  restoreDeletedProject
);

router.delete(
  "/deleted/:deletedProjectId/permanent",
  superAdminAuth,
  permanentlyDeleteProject
);

// =====================================================
// EMPLOYEE — PROJECT MANAGEMENT ROUTES
// These use the same controllers with employeeAuth.
// =====================================================

// Create project
router.post("/employee", employeeAuth, createProject);

// Update / delete project
router.put("/:projectId/employee", employeeAuth, updateProject);
router.delete("/:projectId/employee", employeeAuth, deleteProject);

// Add / update / delete project modules
router.post(
  "/:projectId/modules/employee",
  employeeAuth,
  addProjectModule
);

router.put(
  "/:projectId/modules/:moduleId/employee",
  employeeAuth,
  updateProjectModule
);

router.delete(
  "/:projectId/modules/:moduleId/employee",
  employeeAuth,
  deleteProjectModule
);

// Employee deleted-project management
router.get("/deleted/employee", employeeAuth, getDeletedProjects);

router.post(
  "/deleted/:deletedProjectId/restore/employee",
  employeeAuth,
  restoreDeletedProject
);

router.delete(
  "/deleted/:deletedProjectId/permanent/employee",
  employeeAuth,
  permanentlyDeleteProject
);

// =====================================================
// EMPLOYEE — PROJECT ACCESS
// =====================================================

router.post("/:projectId/access", employeeAuth, grantProjectAccess);

router.delete(
  "/:projectId/access/:employeeId",
  employeeAuth,
  revokeProjectAccess
);

router.get(
  "/:projectId/my-granted-access",
  employeeAuth,
  getMyGrantedProjectAccess
);

router.get(
  "/my-accessible-projects",
  employeeAuth,
  getMyAccessibleProjects
);

// Role access details — accessible to Employee and Super Admin
router.get(
  "/:projectId/role-access",
  employeeOrSuperAdminAuth,
  getProjectRoleAccess
);

// =====================================================
// EMPLOYEE — MODULE ACCESS
// =====================================================

router.get(
  "/:projectId/modules",
  employeeOrSuperAdminAuth,
  getProjectModules
);

router.get(
  "/:projectId/modules/eligible-employees",
  employeeAuth,
  getEmployeesForModuleAssignment
);

router.patch(
  "/:projectId/modules/:moduleId/assign",
  employeeAuth,
  assignProjectModule
);

router.patch(
  "/:projectId/modules/:moduleId/status",
  employeeOrSuperAdminAuth,
  updateProjectModuleStatus
);

router.get(
  "/my-assigned-modules",
  employeeAuth,
  getMyAssignedModules
);

router.get(
  "/:projectId/assignable-employees",
  employeeAuth,
  getAssignableEmployees
);

// =====================================================
// PROJECT DETAILS
// =====================================================
router.get(
  "/my-created-projects",
  employeeAuth,
  getMyCreatedProjects
);

router.get(
  "/:projectId",
  employeeOrSuperAdminAuth,
  getProjectById
);

// Active projects by company
router.get(
  "/company/:companyId/active-projects",
  employeeOrSuperAdminAuth,
  getActiveProjectsByCompany
);

export default router;