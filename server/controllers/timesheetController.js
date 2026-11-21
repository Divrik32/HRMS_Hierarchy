import mongoose from "mongoose";
import Timesheet from "../models/TimesheetModel.js";
import Project from "../models/Project.js";
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";

// =====================================================
// COMMON HELPERS
// =====================================================
// =====================================================
// DATE FILTER HELPER — DAY / WEEK / MONTH / CUSTOM
// =====================================================

const getTimesheetDateFilter = (query) => {
  const { period, date, startDate, endDate } = query;

  const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
      return false;
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  };

  // Custom date range
  if (startDate || endDate) {
    if (
      !startDate ||
      !endDate ||
      !isValidDate(startDate) ||
      !isValidDate(endDate)
    ) {
      return {
        error: "Please provide valid startDate and endDate in YYYY-MM-DD format.",
      };
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    if (start > end) {
      return {
        error: "endDate must be on or after startDate.",
      };
    }

    end.setUTCDate(end.getUTCDate() + 1);

    return {
      filter: {
        $gte: start,
        $lt: end,
      },
    };
  }

  // No period means all dates
  if (!period) {
    return { filter: null };
  }

  if (!["day", "week", "month"].includes(period)) {
    return {
      error: "Period must be day, week or month.",
    };
  }

  const anchorDate = date || new Date().toISOString().slice(0, 10);

  if (!isValidDate(anchorDate)) {
    return {
      error: "Please provide a valid date in YYYY-MM-DD format.",
    };
  }

  const start = new Date(`${anchorDate}T00:00:00.000Z`);
  const end = new Date(start);

  if (period === "day") {
    end.setUTCDate(end.getUTCDate() + 1);
  }

  if (period === "week") {
    // Monday is the first day of the week.
    const day = start.getUTCDay();
    const difference = day === 0 ? -6 : 1 - day;

    start.setUTCDate(start.getUTCDate() + difference);

    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 7);
  }

  if (period === "month") {
    start.setUTCDate(1);

    end.setTime(start.getTime());
    end.setUTCMonth(end.getUTCMonth() + 1);
  }

  return {
    filter: {
      $gte: start,
      $lt: end,
    },
  };
};
const isValidObjectId = (id) =>
  Boolean(id && mongoose.Types.ObjectId.isValid(id));

const getEmployeeId = (req) =>
  req.user?._id ||
  req.user?.employeeId ||
  req.user?.id;

const isSuperAdmin = (req) =>
  req.user?.role === "superadmin" ||
  req.user?.role === "Super Admin";

const isEmployee = (req) =>
  req.user?.role === "employee";

const getCompanyId = (req) =>
  isSuperAdmin(req)
    ? req.params.companyId || req.companyId
    : req.user?.companyId;

const getAuthenticatedEmployee = async (req, companyId) => {
  const employeeId = getEmployeeId(req);

  if (!isValidObjectId(employeeId)) {
    return null;
  }

  return Employee.findOne({
    _id: employeeId,
    companyId,
  }).select("_id name empId roleId companyId");
};

// All duration values are stored in minutes.
const getMinutes = (value) => {
  const number = Number(value);

  if (
    value === "" ||
    value === null ||
    value === undefined ||
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isInteger(number)
  ) {
    return null;
  }

  return number;
};

// Calculate fields derived from task start/end time.
const calculateTaskTime = (timesheet) => {
  if (!timesheet.startTime || !timesheet.endTime) {
    timesheet.totalCompletionTime = null;
    timesheet.estimatedError = null;
    timesheet.efficiency = null;
    return;
  }

  const durationMs =
    new Date(timesheet.endTime).getTime() -
    new Date(timesheet.startTime).getTime();

  if (durationMs <= 0) {
    throw new Error("End time must be later than start time.");
  }

  const totalMinutes = Math.round(durationMs / 60000);

  timesheet.totalCompletionTime = totalMinutes;

  timesheet.estimatedError =
    totalMinutes - Number(timesheet.estimatedTime);

  // Efficiency = Estimated Time / Actual Completion Time * 100
  timesheet.efficiency =
    totalMinutes > 0
      ? Number(
          (
            (Number(timesheet.estimatedTime) / totalMinutes) *
            100
          ).toFixed(2)
        )
      : null;
};

// =====================================================
// GET ALL EMPLOYEES OF LOGGED-IN EMPLOYEE'S COMPANY
// =====================================================

export const getCompanyEmployeesForTimesheet = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "A valid company ID is required.",
      });
    }

    const employees = await Employee.find({
      companyId,
    })
      .select("_id name empId roleId")
      .populate("roleId", "roleName")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get Company Employees Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company employees.",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL ACTIVE PROJECTS OF COMPANY
// No roleAccess / employeeAccess filtering
// =====================================================

export const getProjectsForTimesheet = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "A valid company ID is required.",
      });
    }

    const projects = await Project.find({
      companyId,
      status: "active",
    })
      .select("_id projectName projectCode")
      .sort({ projectName: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Get Timesheet Projects Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects.",
      error: error.message,
    });
  }
};

// =====================================================
// CREATE TIMESHEET — LOGGED-IN EMPLOYEE
// =====================================================

// =====================================================
// CREATE TIMESHEET — LOGGED-IN EMPLOYEE
// Project required for ALL task types
// Task is selected from ENUM
// Description is mandatory for ALL task types
// =====================================================

export const createTimesheet = async (req, res) => {
  try {
    if (!isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "Only employees can create their timesheets.",
      });
    }

    const companyId = req.user?.companyId;
    const employeeId = getEmployeeId(req);

    if (
      !isValidObjectId(companyId) ||
      !isValidObjectId(employeeId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication details are missing.",
      });
    }

    const {
      taskType = "Project",
      projectId,
      task,
      description,
      estimatedTime,
    } = req.body;

    // =========================================
    // TASK TYPE VALIDATION
    // =========================================

    const allowedTaskTypes = [
      "Project",
      "Learning",
      "Training",
    ];

    if (!allowedTaskTypes.includes(taskType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task type.",
      });
    }

    // =========================================
    // TASK ENUM VALIDATION
    // =========================================

    const allowedTasks = [
      "Testing",
      "Development",
      "Learning",
      "Graphics",
      "Management",
      "Meeting",
    ];

    if (!allowedTasks.includes(task)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid task.",
      });
    }

    // =========================================
    // PROJECT VALIDATION
    // Required for ALL task types
    // =========================================

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid project.",
      });
    }

    // =========================================
    // DESCRIPTION VALIDATION
    // Required for ALL task types
    // =========================================

    if (
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Description is required.",
      });
    }

    // =========================================
    // ESTIMATED TIME VALIDATION
    // =========================================

    const estimatedMinutes = getMinutes(estimatedTime);

    if (
      estimatedMinutes === null ||
      estimatedMinutes <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Estimated time must be a positive number of minutes.",
      });
    }

    // =========================================
    // EMPLOYEE VALIDATION
    // =========================================

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
    }).select("_id");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "Logged-in employee was not found in this company.",
      });
    }

    // =========================================
    // PROJECT VALIDATION
    // All active company projects are allowed
    // No roleAccess / employeeAccess filtering
    // =========================================

    const project = await Project.findOne({
      _id: projectId,
      companyId,
      status: "active",
    }).select("_id projectName projectCode");

    if (!project) {
      return res.status(404).json({
        success: false,
        message:
          "Active project not found in this company.",
      });
    }

    // =========================================
    // CREATE TIMESHEET
    // =========================================

    const timesheet = await Timesheet.create({
      companyId,
      employeeId: employee._id,

      taskType,

      projectId: project._id,

      task,

      description: description.trim(),

      estimatedTime: estimatedMinutes,

      // Schema defaults:
      // date
      // idleTime
      // taskStatus
      // approvalStatus
    });

    return res.status(201).json({
      success: true,
      message: "Timesheet created successfully.",
      timesheet,
    });
  } catch (error) {
    console.error("Create Timesheet Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create timesheet.",
      error: error.message,
    });
  }
};

// =====================================================
// GET GLOBAL TIMESHEETS — EMPLOYEE & SUPER ADMIN
// =====================================================

export const getTimesheetsByCompany = async (req, res) => {
  try {
    if (!isSuperAdmin(req) && !isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view timesheets.",
      });
    }

    const companyId = getCompanyId(req);

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "A valid company ID is required.",
      });
    }

    const timesheets = await Timesheet.find({
      companyId,
    })
      .populate({
        path: "employeeId",
        select: "name empId roleId",
        populate: {
          path: "roleId",
          select: "roleName",
        },
      })
      .populate("projectId", "projectName projectCode")
      .populate("auditedBy", "name empId")
      .populate("rejectedBy", "name empId")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: timesheets.length,
      timesheets,
    });
  } catch (error) {
    console.error("Get Company Timesheets Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company timesheets.",
      error: error.message,
    });
  }
};

// =====================================================
// START TASK
// Backend records the timestamp.
// =====================================================

export const startTask = async (req, res) => {
  try {
    if (!isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "Only employees can start tasks.",
      });
    }

    const companyId = req.user?.companyId;
    const employeeId = getEmployeeId(req);
    const { id } = req.params;

    if (
      !isValidObjectId(companyId) ||
      !isValidObjectId(employeeId) ||
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee, company or timesheet ID.",
      });
    }

    const timesheet = await Timesheet.findOne({
      _id: id,
      companyId,
      employeeId,
    });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Your timesheet was not found.",
      });
    }

    if (timesheet.approvalStatus !== "Pending") {
      return res.status(403).json({
        success: false,
        message: "Only pending timesheets can be started.",
      });
    }

    if (
      timesheet.taskStatus !== "Not Started" ||
      timesheet.startTime ||
      timesheet.endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "This task has already been started or completed.",
      });
    }

    timesheet.startTime = new Date();
    timesheet.taskStatus = "In Progress";

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: "Task started successfully.",
      timesheet,
    });
  } catch (error) {
    console.error("Start Task Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start task.",
      error: error.message,
    });
  }
};

// =====================================================
// END TASK
// totalCompletionTime = endTime - startTime
// =====================================================

export const endTask = async (req, res) => {
  try {
    if (!isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "Only employees can end tasks.",
      });
    }

    const companyId = req.user?.companyId;
    const employeeId = getEmployeeId(req);
    const { id } = req.params;

    if (
      !isValidObjectId(companyId) ||
      !isValidObjectId(employeeId) ||
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee, company or timesheet ID.",
      });
    }

    const timesheet = await Timesheet.findOne({
      _id: id,
      companyId,
      employeeId,
    });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Your timesheet was not found.",
      });
    }

    if (
      timesheet.taskStatus !== "In Progress" ||
      !timesheet.startTime ||
      timesheet.endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Task must be in progress before it can be ended.",
      });
    }

    if (
      timesheet.breakTime &&
      !timesheet.breakTime.endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Resume your break before ending the task.",
      });
    }

    timesheet.endTime = new Date();

    try {
      calculateTaskTime(timesheet);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    timesheet.taskStatus = "Completed";

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: "Task completed successfully.",
      timesheet,
    });
  } catch (error) {
    console.error("End Task Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to end task.",
      error: error.message,
    });
  }
};

// =====================================================
// START BREAK — ONLY ONE BREAK PER TASK
// =====================================================

export const startBreak = async (req, res) => {
  try {
    if (!isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "Only employees can start a break.",
      });
    }

    const companyId = req.user?.companyId;
    const employeeId = getEmployeeId(req);
    const { id } = req.params;

    if (
      !isValidObjectId(companyId) ||
      !isValidObjectId(employeeId) ||
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee, company or timesheet ID.",
      });
    }

    const timesheet = await Timesheet.findOne({
      _id: id,
      companyId,
      employeeId,
    });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Your timesheet was not found.",
      });
    }

    if (
      timesheet.taskStatus !== "In Progress" ||
      !timesheet.startTime ||
      timesheet.endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "A break can only be started while a task is in progress.",
      });
    }

    if (timesheet.breakTime) {
      return res.status(400).json({
        success: false,
        message: "Only one break is allowed for each task.",
      });
    }

    timesheet.breakTime = {
      startTime: new Date(),
      endTime: null,
      duration: null,
    };

    timesheet.taskStatus = "On Break";

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: "Break started successfully.",
      timesheet,
    });
  } catch (error) {
    console.error("Start Break Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start break.",
      error: error.message,
    });
  }
};

// =====================================================
// RESUME TASK AFTER BREAK
// =====================================================

export const resumeTask = async (req, res) => {
  try {
    if (!isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "Only employees can resume a task.",
      });
    }

    const companyId = req.user?.companyId;
    const employeeId = getEmployeeId(req);
    const { id } = req.params;

    if (
      !isValidObjectId(companyId) ||
      !isValidObjectId(employeeId) ||
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee, company or timesheet ID.",
      });
    }

    const timesheet = await Timesheet.findOne({
      _id: id,
      companyId,
      employeeId,
    });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Your timesheet was not found.",
      });
    }

    if (
      timesheet.taskStatus !== "On Break" ||
      !timesheet.breakTime ||
      timesheet.breakTime.endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "There is no active break to resume.",
      });
    }

    const breakEndTime = new Date();

    const breakDurationMs =
      breakEndTime.getTime() -
      new Date(timesheet.breakTime.startTime).getTime();

    if (breakDurationMs < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid break time.",
      });
    }

    timesheet.breakTime.endTime = breakEndTime;
    timesheet.breakTime.duration = Math.round(
      breakDurationMs / 60000
    );

    timesheet.taskStatus = "In Progress";

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: "Task resumed successfully.",
      timesheet,
    });
  } catch (error) {
    console.error("Resume Task Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resume task.",
      error: error.message,
    });
  }
};

// =====================================================
// AUDIT TIMESHEET — APPROVE OR REJECT
// Only parent / grandparent role can audit.
// =====================================================

export const auditTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, rejectionReason } = req.body;

    const auditorId = getEmployeeId(req);
    const companyId = req.user?.companyId;

    // =========================================
    // AUTHENTICATION
    // =========================================

    if (!isEmployee(req) || !companyId) {
      return res.status(403).json({
        success: false,
        message:
          "Only employees in the parent or grandparent role can audit timesheets.",
      });
    }

    // =========================================
    // VALIDATE TIMESHEET ID
    // =========================================

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid timesheet ID.",
      });
    }

    // =========================================
    // VALIDATE APPROVAL STATUS
    // =========================================

    if (!["Approved", "Rejected"].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Approval status must be Approved or Rejected.",
      });
    }

    // =========================================
    // VALIDATE AUDITOR ID
    // =========================================

    if (!isValidObjectId(auditorId)) {
      return res.status(401).json({
        success: false,
        message:
          "Auditor authentication details are missing.",
      });
    }

    // =========================================
    // VALIDATE COMPANY ID
    // =========================================

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
    }

    // =========================================
    // REJECTION REASON VALIDATION
    // =========================================

    if (
      approvalStatus === "Rejected" &&
      (
        typeof rejectionReason !== "string" ||
        !rejectionReason.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required.",
      });
    }

    // =========================================
    // FIND TIMESHEET
    // =========================================

    const timesheet = await Timesheet.findOne({
      _id: id,
      companyId,
    });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet not found.",
      });
    }

    // =========================================
    // ONLY PENDING TIMESHEETS CAN BE AUDITED
    // =========================================

    if (timesheet.approvalStatus !== "Pending") {
      return res.status(403).json({
        success: false,
        message:
          "Only pending timesheets can be audited.",
      });
    }

    // =========================================
    // TASK COMPLETION VALIDATION
    // =========================================

    if (
      timesheet.taskStatus !== "Completed" ||
      !timesheet.startTime ||
      !timesheet.endTime ||
      timesheet.totalCompletionTime == null ||
      timesheet.totalCompletionTime <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Timesheet cannot be audited until the task is completed.",
      });
    }

    // =========================================
    // FIND AUDITOR
    // =========================================

    const auditor = await Employee.findOne({
      _id: auditorId,
      companyId,
      status: "active",
    }).select("_id roleId companyId");

    if (!auditor) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to audit this timesheet.",
      });
    }

    // =========================================
    // FIND TIMESHEET EMPLOYEE
    // =========================================

    const timesheetEmployee = await Employee.findOne({
      _id: timesheet.employeeId,
      companyId,
    }).select("_id roleId companyId");

    if (!timesheetEmployee) {
      return res.status(404).json({
        success: false,
        message: "Timesheet employee not found.",
      });
    }

    // =========================================
    // FIND EMPLOYEE ROLE
    // =========================================

    const employeeRole = await Role.findOne({
      _id: timesheetEmployee.roleId,
      companyId,
    }).select("_id parentRoleId");

    if (!employeeRole) {
      return res.status(400).json({
        success: false,
        message:
          "Timesheet employee role not found.",
      });
    }

    // =========================================
    // FIND PARENT / GRANDPARENT ROLE
    // =========================================

    const parentRoleId =
      employeeRole.parentRoleId;

    let grandparentRoleId = null;

    if (parentRoleId) {
      const parentRole = await Role.findOne({
        _id: parentRoleId,
        companyId,
      }).select("_id parentRoleId");

      grandparentRoleId =
        parentRole?.parentRoleId || null;
    }

    // =========================================
    // AUTHORIZED AUDITOR ROLES
    // =========================================

    const allowedRoleIds = [
      parentRoleId,
      grandparentRoleId,
    ]
      .filter(Boolean)
      .map((roleId) => String(roleId));

    const auditorRoleId = auditor.roleId
      ? String(auditor.roleId)
      : null;

    if (
      !auditorRoleId ||
      !allowedRoleIds.includes(auditorRoleId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only employees in the parent or grandparent role can audit this timesheet.",
      });
    }

    // =========================================
    // AUDIT TIMESHEET
    // =========================================

    timesheet.approvalStatus = approvalStatus;
    timesheet.auditedBy = auditor._id;

    // =========================================
    // REJECT TIMESHEET
    // =========================================

    if (approvalStatus === "Rejected") {
      const reason = rejectionReason.trim();

      // Current rejection reason
      timesheet.rejectionReason = reason;

      // Rejection information
      timesheet.rejectedBy = auditor._id;
      timesheet.rejectedAt = new Date();

      // =========================================
      // REJECTION HISTORY
      // =========================================

      if (!Array.isArray(timesheet.rejectionHistory)) {
        timesheet.rejectionHistory = [];
      }

      timesheet.rejectionHistory.push({
        reason,
        rejectedBy: auditor._id,
        rejectedAt: new Date(),
      });
    }

    // =========================================
    // APPROVE TIMESHEET
    // =========================================

    if (approvalStatus === "Approved") {
      timesheet.rejectionReason = "";
      timesheet.rejectedBy = null;
      timesheet.rejectedAt = null;
    }

    // =========================================
    // SAVE
    // =========================================

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: `Timesheet ${approvalStatus.toLowerCase()} successfully.`,
      timesheet,
    });
  } catch (error) {
    console.error("Audit Timesheet Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to audit timesheet.",
      error: error.message,
    });
  }
};

// =====================================================
// DAILY EFFICIENCY GRAPH — EMPLOYEE-WISE AVERAGE
// Rejected timesheets are excluded.
// =====================================================

export const getDailyEfficiencyGraph = async (req, res) => {
  try {
    if (!isSuperAdmin(req) && !isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view the efficiency graph.",
      });
    }

    const companyId = getCompanyId(req);

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "A valid company ID is required.",
      });
    }

    const { startDate, endDate } = req.query;

    if (
      !startDate ||
      !endDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide startDate and endDate in YYYY-MM-DD format.",
      });
    }

    const isValidDate = (date) => {
      const parsed = new Date(`${date}T00:00:00.000Z`);

      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date
      );
    };

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range.",
      });
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "endDate must be on or after startDate.",
      });
    }

    const endExclusive = new Date(end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    const employees = await Employee.find({
      companyId: companyObjectId,
    })
      .select("_id name empId")
      .sort({ name: 1 })
      .lean();

    const dailyData = await Timesheet.aggregate([
      {
        $match: {
          companyId: companyObjectId,

          approvalStatus: {
            $ne: "Rejected",
          },

          taskStatus: "Completed",

          startTime: {
            $gte: start,
            $lt: endExclusive,
          },

          efficiency: {
            $ne: null,
            $gte: 0,
          },

          employeeId: {
            $in: employees.map((employee) => employee._id),
          },
        },
      },
      {
        $group: {
          _id: {
            employeeId: "$employeeId",
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$startTime",
                timezone: "UTC",
              },
            },
          },

          averageEfficiency: {
            $avg: "$efficiency",
          },

          totalTimesheets: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          employeeId: "$_id.employeeId",
          date: "$_id.date",

          averageEfficiency: {
            $round: ["$averageEfficiency", 2],
          },

          totalTimesheets: 1,
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
    ]);

    // Generate every date in the selected range.
    const dates = [];

    for (
      let current = new Date(start);
      current < endExclusive;
      current.setUTCDate(current.getUTCDate() + 1)
    ) {
      dates.push(current.toISOString().slice(0, 10));
    }

    // Index daily values by employeeId + date.
    const efficiencyMap = new Map();

    for (const item of dailyData) {
      efficiencyMap.set(
        `${item.employeeId.toString()}_${item.date}`,
        item
      );
    }

    // Every employee gets one value for every date.
    const graphData = employees.map((employee) => ({
      employeeId: employee._id,
      employeeName: employee.name,
      empId: employee.empId,

      dailyEfficiency: dates.map((date) => {
        const item = efficiencyMap.get(
          `${employee._id.toString()}_${date}`
        );

        return {
          date,
          efficiency: item ? item.averageEfficiency : null,
          totalTimesheets: item ? item.totalTimesheets : 0,
        };
      }),
    }));

    return res.status(200).json({
      success: true,
      companyId,
      startDate,
      endDate,
      dates,
      count: graphData.length,
      graphData,
    });
  } catch (error) {
    console.error("Daily Efficiency Graph Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch daily efficiency graph.",
      error: error.message,
    });
  }
};
// =====================================================
// GET MY TIMESHEETS — LOGGED-IN EMPLOYEE ONLY
// =====================================================

export const getMyTimesheets = async (req, res) => {
  try {
    if (!isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "Only employees can access their own timesheets.",
      });
    }

    const employeeId = getEmployeeId(req);
    const companyId = req.user?.companyId;

    if (
      !isValidObjectId(employeeId) ||
      !isValidObjectId(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee or company ID.",
      });
    }

    const dateResult = getTimesheetDateFilter(req.query);

    if (dateResult.error) {
      return res.status(400).json({
        success: false,
        message: dateResult.error,
      });
    }

    const matchQuery = {
      employeeId,
      companyId,
    };

    if (dateResult.filter) {
      matchQuery.date = dateResult.filter;
    }

    const timesheets = await Timesheet.find(matchQuery)
      .populate({
        path: "employeeId",
        select: "name empId roleId",
        populate: {
          path: "roleId",
          select: "roleName",
        },
      })
      .populate("projectId", "projectName projectCode")
      .populate("auditedBy", "name empId")
      .populate("rejectedBy", "name empId")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: timesheets.length,
      timesheets,
    });
  } catch (error) {
    console.error("Get My Timesheets Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your timesheets.",
      error: error.message,
    });
  }
};
// =====================================================
// GET COMPANY TIMESHEETS — SUPER ADMIN ONLY
// Supports day / week / month / custom date range
// =====================================================

export const getCompanyTimesheets = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can access company timesheets.",
      });
    }

    const companyId =
      req.params.companyId ||
      req.companyId;

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "A valid company ID is required.",
      });
    }

    const dateResult = getTimesheetDateFilter(req.query);

    if (dateResult.error) {
      return res.status(400).json({
        success: false,
        message: dateResult.error,
      });
    }

    const matchQuery = {
      companyId,
    };

    if (dateResult.filter) {
      matchQuery.date = dateResult.filter;
    }

    const timesheets = await Timesheet.find(matchQuery)
      .populate({
        path: "employeeId",
        select: "name empId roleId",
        populate: {
          path: "roleId",
          select: "roleName",
        },
      })
      .populate("projectId", "projectName projectCode")
      .populate("auditedBy", "name empId")
      .populate("rejectedBy", "name empId")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      companyId,
      period: req.query.period || "all",
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      count: timesheets.length,
      timesheets,
    });
  } catch (error) {
    console.error("Get Company Timesheets Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company timesheets.",
      error: error.message,
    });
  }
};
// =====================================================
// GET CHILD & GRANDCHILD TIMESHEETS FOR APPROVAL
// Only completed + pending timesheets
// =====================================================

export const getTimesheetsForApproval = async (req, res) => {
  try {
    if (!isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "Only employees can access approval timesheets.",
      });
    }

    const employeeId = getEmployeeId(req);
    const companyId = req.user?.companyId;

    if (
      !isValidObjectId(employeeId) ||
      !isValidObjectId(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee or company ID.",
      });
    }

    // =========================================
    // GET LOGGED-IN EMPLOYEE
    // =========================================

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
      status: "active",
    }).select("_id name empId roleId");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Logged-in employee was not found.",
      });
    }

    if (!employee.roleId) {
      return res.status(403).json({
        success: false,
        hasApprovalAccess: false,
        message: "You do not have an assigned role.",
      });
    }

    // =========================================
    // GET DIRECT CHILD ROLES
    // =========================================

    const childRoles = await Role.find({
      companyId,
      parentRoleId: employee.roleId,
    })
      .select("_id roleName parentRoleId")
      .lean();

    // No child roles means no approval access.
    if (childRoles.length === 0) {
      return res.status(200).json({
        success: true,
        hasApprovalAccess: false,
        count: 0,
        childRoles: [],
        grandchildRoles: [],
        timesheets: [],
        message: "You do not have any child roles to approve.",
      });
    }

    const childRoleIds = childRoles.map((role) => role._id);

    // =========================================
    // GET GRANDCHILD ROLES
    // =========================================

    const grandchildRoles = await Role.find({
      companyId,
      parentRoleId: {
        $in: childRoleIds,
      },
    })
      .select("_id roleName parentRoleId")
      .lean();

    const grandchildRoleIds = grandchildRoles.map(
      (role) => role._id
    );

    // =========================================
    // COMBINE CHILD + GRANDCHILD ROLE IDS
    // =========================================

    const allowedRoleIds = [
      ...childRoleIds,
      ...grandchildRoleIds,
    ];

    // =========================================
    // GET EMPLOYEES UNDER THESE ROLES
    // =========================================

    const subordinateEmployees = await Employee.find({
      companyId,
      roleId: {
        $in: allowedRoleIds,
      },
      status: "active",
    })
      .select("_id name empId roleId")
      .lean();

    const subordinateEmployeeIds = subordinateEmployees.map(
      (item) => item._id
    );

    if (subordinateEmployeeIds.length === 0) {
      return res.status(200).json({
        success: true,
        hasApprovalAccess: true,
        count: 0,
        childRoles,
        grandchildRoles,
        timesheets: [],
        message: "No employees found under your child roles.",
      });
    }

    // =========================================
    // GET PENDING + COMPLETED TIMESHEETS
    // =========================================

    const timesheets = await Timesheet.find({
      companyId,
      employeeId: {
        $in: subordinateEmployeeIds,
      },
      taskStatus: "Completed",
      approvalStatus: "Pending",
    })
      .populate({
        path: "employeeId",
        select: "name empId roleId",
        populate: {
          path: "roleId",
          select: "roleName parentRoleId",
        },
      })
      .populate("projectId", "projectName projectCode")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      hasApprovalAccess: true,
      count: timesheets.length,
      childRoles,
      grandchildRoles,
      timesheets,
    });
  } catch (error) {
    console.error("Get Approval Timesheets Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch approval timesheets.",
      error: error.message,
    });
  }
};


// =====================================================
// EDIT TIMESHEET — EMPLOYEE
// Supports estimatedTime editing in all task statuses
// =====================================================

// =====================================================
// EDIT TIMESHEET — EMPLOYEE
// Consolidated Update + Edit Functionality
// Supports:
// - Estimated Time
// - Idle Time
// - Task Type
// - Project
// - Task
// - Description
// - Delay/Fast Remarks
// - Remarks Reason
// - Rejected Timesheet Resubmission
// - Efficiency Recalculation
// =====================================================

export const editTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;

    // =========================================
    // AUTHENTICATION
    // =========================================

    if (!isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "Only employees can edit their timesheets.",
      });
    }

    const employeeId = getEmployeeId(req);
    const companyId = req.user?.companyId;

    if (
      !isValidObjectId(id) ||
      !isValidObjectId(employeeId) ||
      !isValidObjectId(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee, company or timesheet ID.",
      });
    }

    // =========================================
    // ALLOWED FIELDS
    // =========================================

    const allowedFields = [
      "estimatedTime",
      "idleTime",
      "taskType",
      "projectId",
      "task",
      "description",
      "remarks.delayFast",
      "remarks.reason",
    ];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: "This field cannot be edited.",
      });
    }

    // =========================================
    // FIND OWN TIMESHEET
    // =========================================

    const timesheet = await Timesheet.findOne({
      _id: id,
      employeeId,
      companyId,
    });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet not found.",
      });
    }

    // =========================================
    // APPROVAL VALIDATION
    // Approved timesheets cannot be edited.
    // =========================================

    if (timesheet.approvalStatus === "Approved") {
      return res.status(403).json({
        success: false,
        message: "Approved timesheets cannot be modified.",
      });
    }

    // =========================================
    // REJECTED / RESUBMITTED TIMESHEET CHECK
    // =========================================

    const isRejectedTimesheet =
      timesheet.approvalStatus === "Rejected";

    const isResubmittedTimesheet =
      timesheet.approvalStatus === "Pending" &&
      (timesheet.resubmissionCount || 0) > 0;

    // =========================================
    // COMPLETED TASK VALIDATION
    // =========================================

    /*
      Completed timesheets normally cannot be modified.

      Allowed exceptions:

      1. Rejected timesheet
      2. Previously resubmitted timesheet

      This preserves the existing updateTimesheet
      controller's behavior.
    */

    if (
      timesheet.taskStatus === "Completed" &&
      !isRejectedTimesheet &&
      !isResubmittedTimesheet
    ) {
      return res.status(403).json({
        success: false,
        message: "Completed tasks cannot be modified.",
      });
    }

    // =========================================
    // TASK TYPE
    // =========================================

    if (field === "taskType") {
      const allowedTaskTypes = [
        "Project",
        "Learning",
        "Training",
      ];

      if (!allowedTaskTypes.includes(value)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task type.",
        });
      }

      timesheet.taskType = value;
    }

    // =========================================
    // PROJECT
    // =========================================

    if (field === "projectId") {
      if (!isValidObjectId(value)) {
        return res.status(400).json({
          success: false,
          message: "Please select a valid project.",
        });
      }

      const project = await Project.findOne({
        _id: value,
        companyId,
        status: "active",
      }).select("_id projectName projectCode");

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Active project not found in this company.",
        });
      }

      timesheet.projectId = project._id;
    }

    // =========================================
    // TASK
    // =========================================

    if (field === "task") {
      const allowedTasks = [
        "Testing",
        "Development",
        "Learning",
        "Graphics",
        "Management",
        "Meeting",
      ];

      if (!allowedTasks.includes(value)) {
        return res.status(400).json({
          success: false,
          message: "Please select a valid task.",
        });
      }

      timesheet.task = value;
    }

    // =========================================
    // DESCRIPTION
    // =========================================

    if (field === "description") {
      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Description is required.",
        });
      }

      timesheet.description = value.trim();
    }

    // =========================================
    // ESTIMATED TIME
    // =========================================

    if (field === "estimatedTime") {
      const minutes = getMinutes(value);

      if (minutes === null || minutes <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Estimated time must be a positive number of minutes.",
        });
      }

      timesheet.estimatedTime = minutes;
    }

    // =========================================
    // IDLE TIME
    // =========================================

    if (field === "idleTime") {
      const minutes = getMinutes(value);

      if (minutes === null || minutes < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Idle time must be a non-negative number of minutes.",
        });
      }

      timesheet.idleTime = minutes;
    }

    // =========================================
    // DELAY / FAST REMARK
    // =========================================

    if (field === "remarks.delayFast") {
      if (
        !["", "Delay", "Fast"].includes(value)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid delay/fast remark.",
        });
      }

      timesheet.remarks.delayFast = value;
    }

    // =========================================
    // REMARKS REASON
    // =========================================

    if (field === "remarks.reason") {
      if (typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: "Reason must be text.",
        });
      }

      timesheet.remarks.reason = value.trim();
    }

    // =========================================
    // FINAL VALIDATION
    // =========================================

    if (!timesheet.projectId) {
      return res.status(400).json({
        success: false,
        message: "Project is required.",
      });
    }

    // =========================================
    // FINAL TASK VALIDATION
    // =========================================

    const allowedTasks = [
      "Testing",
      "Development",
      "Learning",
      "Graphics",
      "Management",
      "Meeting",
    ];

    if (!allowedTasks.includes(timesheet.task)) {
      return res.status(400).json({
        success: false,
        message: "A valid task must be selected.",
      });
    }

    // =========================================
    // FINAL TASK TYPE VALIDATION
    // =========================================

    if (
      !["Project", "Learning", "Training"].includes(
        timesheet.taskType
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task type.",
      });
    }

    // =========================================
    // FINAL DESCRIPTION VALIDATION
    // =========================================

    if (
      typeof timesheet.description !== "string" ||
      !timesheet.description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Description is required.",
      });
    }

    // =========================================
    // RECALCULATE EFFICIENCY
    // When Estimated Time is changed
    // on a completed task.
    // =========================================

    if (
      field === "estimatedTime" &&
      timesheet.startTime &&
      timesheet.endTime
    ) {
      try {
        calculateTaskTime(timesheet);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    // =========================================
    // REJECTED TIMESHEET RESUBMISSION
    // =========================================

    if (isRejectedTimesheet) {
      // Return to approval pending
      timesheet.approvalStatus = "Pending";

      // Clear current rejection information
      timesheet.rejectionReason = "";
      timesheet.rejectedBy = null;
      timesheet.rejectedAt = null;

      // Reset auditor
      timesheet.auditedBy = null;

      // Increment resubmission count
      timesheet.resubmissionCount =
        (timesheet.resubmissionCount || 0) + 1;

      /*
        rejectionHistory is intentionally preserved.
        Previous rejection records remain available.
      */
    }

    // =========================================
    // SAVE
    // =========================================

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: isRejectedTimesheet
        ? "Rejected timesheet updated and resubmitted for approval successfully."
        : "Timesheet updated successfully.",
      timesheet,
    });
  } catch (error) {
    console.error("Edit Timesheet Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to edit timesheet.",
      error: error.message,
    });
  }
};


// =====================================================
// GET MY TIMESHEET WEEKLY STATUS — LAST 8 WEEKS
// Draft / Submitted / Rejected / Approved
// =====================================================


// =====================================================
// GET MY TIMESHEET WEEKLY STATUS — LAST 8 WEEKS
// Approved / Rejected / Pending / Updated Pending
// Incomplete tasks are excluded.
// =====================================================

export const getMyTimesheetWeeklyStatus = async (req, res) => {
  try {
    // =========================================
    // AUTHENTICATION
    // =========================================

    if (!isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only employees can access their weekly timesheet status.",
      });
    }

    const employeeId = getEmployeeId(req);
    const companyId = req.user?.companyId;

    if (
      !isValidObjectId(employeeId) ||
      !isValidObjectId(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee or company ID.",
      });
    }

    // =========================================
    // CURRENT DATE — ASIA/KOLKATA
    // =========================================

    const todayString = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const today = new Date(
      `${todayString}T00:00:00.000Z`
    );

    // =========================================
    // CURRENT WEEK START — MONDAY
    // =========================================

    const currentWeekStart = new Date(today);

    const day = currentWeekStart.getUTCDay();

    const difference = day === 0 ? -6 : 1 - day;

    currentWeekStart.setUTCDate(
      currentWeekStart.getUTCDate() + difference
    );

    // =========================================
    // LAST 8 WEEKS INCLUDING CURRENT WEEK
    // =========================================

    const startDate = new Date(currentWeekStart);

    startDate.setUTCDate(
      startDate.getUTCDate() - 7 * 7
    );

    const endDate = new Date(currentWeekStart);

    endDate.setUTCDate(
      endDate.getUTCDate() + 7
    );

    // =========================================
    // FETCH EMPLOYEE TIMESHEETS
    // =========================================

    const timesheets = await Timesheet.find({
      employeeId,
      companyId,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .select(
        "_id date taskStatus approvalStatus rejectionHistory taskType projectId createdAt"
      )
      .populate(
        "projectId",
        "projectName projectCode"
      )
      .sort({
        date: -1,
        createdAt: -1,
      })
      .lean();

    // =========================================
    // CLASSIFY TIMESHEET STATUS
    // =========================================

    const getTimesheetStatus = (timesheet) => {
      // Approved
      if (timesheet.approvalStatus === "Approved") {
        return "Approved";
      }

      // Rejected
      if (timesheet.approvalStatus === "Rejected") {
        return "Rejected";
      }

      // Updated Pending
      // Pending + at least one previous rejection
      if (
        timesheet.approvalStatus === "Pending" &&
        Array.isArray(timesheet.rejectionHistory) &&
        timesheet.rejectionHistory.length > 0
      ) {
        return "Updated Pending";
      }

      // Normal Pending
      if (timesheet.approvalStatus === "Pending") {
        return "Pending";
      }

      return null;
    };

    // =========================================
    // INITIALIZE LAST 8 WEEKS
    // =========================================

    const weeks = [];

    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(startDate);

      weekStart.setUTCDate(
        weekStart.getUTCDate() + i * 7
      );

      const weekEnd = new Date(weekStart);

      weekEnd.setUTCDate(
        weekEnd.getUTCDate() + 7
      );

      weeks.push({
        weekStart,
        weekEnd,

        weekLabel: `Week of ${weekStart.toLocaleDateString(
          "en-GB",
          {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }
        )}`,

        status: "No timesheets",

        counts: {
          approved: 0,
          rejected: 0,
          pending: 0,
          updatedPending: 0,
        },

        totalTimesheets: 0,

        timesheets: [],
      });
    }

    // =========================================
    // GROUP TIMESHEETS BY WEEK
    // =========================================

    for (const timesheet of timesheets) {
      if (!timesheet.date) continue;

      // Incomplete tasks are excluded completely.
      if (timesheet.taskStatus !== "Completed") {
        continue;
      }

      const status = getTimesheetStatus(timesheet);

      if (!status) continue;

      const timesheetDate = new Date(timesheet.date);

      const weekIndex = Math.floor(
        (
          timesheetDate.getTime() -
          startDate.getTime()
        ) /
          (7 * 24 * 60 * 60 * 1000)
      );

      if (weekIndex < 0 || weekIndex >= 8) {
        continue;
      }

      const week = weeks[weekIndex];

      week.timesheets.push({
        ...timesheet,
        weeklyStatus: status,
      });

      // Update counts
      const countKey = {
        Approved: "approved",
        Rejected: "rejected",
        Pending: "pending",
        "Updated Pending": "updatedPending",
      }[status];

      week.counts[countKey]++;

      week.totalTimesheets++;
    }

    // =========================================
    // DETERMINE WEEKLY STATUS
    // =========================================

    for (const week of weeks) {
      const counts = week.counts;

      if (week.totalTimesheets === 0) {
        week.status = "No timesheets";
      } else if (counts.rejected > 0) {
        week.status = "Rejected";
      } else if (counts.updatedPending > 0) {
        week.status = "Updated Pending";
      } else if (counts.pending > 0) {
        week.status = "Pending";
      } else {
        week.status = "Approved";
      }
    }

    // =========================================
    // OVERALL SUMMARY — LAST 8 WEEKS
    // =========================================

    const summary = {
      totalTimesheets: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      updatedPending: 0,
    };

    for (const week of weeks) {
      summary.approved += week.counts.approved;
      summary.rejected += week.counts.rejected;
      summary.pending += week.counts.pending;
      summary.updatedPending +=
        week.counts.updatedPending;
    }

    summary.totalTimesheets =
      summary.approved +
      summary.rejected +
      summary.pending +
      summary.updatedPending;

    // =========================================
    // RESPONSE
    // =========================================

    return res.status(200).json({
      success: true,

      period: "Last 8 weeks",

      startDate: startDate.toISOString().slice(0, 10),

      endDate: new Date(
        endDate.getTime() - 1
      )
        .toISOString()
        .slice(0, 10),

      summary,

      weeks: weeks.map((week) => ({
        weekStart: week.weekStart
          .toISOString()
          .slice(0, 10),

        weekEnd: new Date(
          week.weekEnd.getTime() - 1
        )
          .toISOString()
          .slice(0, 10),

        weekLabel: week.weekLabel,

        status: week.status,

        counts: week.counts,

        totalTimesheets: week.totalTimesheets,

        timesheets: week.timesheets,
      })),
    });
  } catch (error) {
    console.error(
      "Weekly Timesheet Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch weekly timesheet status.",
      error: error.message,
    });
  }
};