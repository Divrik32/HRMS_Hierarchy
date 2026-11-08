import express from "express";
import { checkMyRoleHasChildren } from "../controllers/roleHierarchyController.js";
import employeeAuth from "../middleware/employeeAuth.js";

const router = express.Router();

router.get("/my-child-roles", employeeAuth, checkMyRoleHasChildren);

export default router;