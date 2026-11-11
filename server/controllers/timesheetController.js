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
      .select("_id projectName projectCode modules")
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
      moduleId,
      task,
      description,
      estimatedTime,
    } = req.body;

    if (!["Project", "Learning", "Training"].includes(taskType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task type.",
      });
    }

    const estimatedMinutes = getMinutes(estimatedTime);

    if (estimatedMinutes === null || estimatedMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: "Estimated time must be a positive number of minutes.",
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
    }).select("_id");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Logged-in employee was not found in this company.",
      });
    }

    let selectedProjectId = null;
    let selectedModuleId = null;
    let selectedTask = "";

    // =========================================
    // PROJECT TASK
    // =========================================

    if (taskType === "Project") {
      if (
        !isValidObjectId(projectId) ||
        !isValidObjectId(moduleId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Please select a valid project and task.",
        });
      }

      // All active company projects are allowed here.
      // No roleAccess / employeeAccess filtering.
      const project = await Project.findOne({
        _id: projectId,
        companyId,
        status: "active",
      }).select("_id modules");

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Active project not found in this company.",
        });
      }

      // modules is an embedded array in Project.
      const selectedModule = project.modules.id(moduleId);

      if (!selectedModule) {
        return res.status(404).json({
          success: false,
          message: "Selected task/module does not belong to this project.",
        });
      }

      selectedProjectId = project._id;
      selectedModuleId = selectedModule._id;
      selectedTask = selectedModule.moduleName;
    }

    // =========================================
    // LEARNING / TRAINING TASK
    // =========================================

    if (taskType === "Learning" || taskType === "Training") {
      if (typeof description !== "string" || !description.trim()) {
        return res.status(400).json({
          success: false,
          message: `Description is required for ${taskType.toLowerCase()}.`,
        });
      }

      // Task name is fixed by taskType.
      selectedTask = taskType;
    }

    const timesheet = await Timesheet.create({
      companyId,
      employeeId: employee._id,

      taskType,

      projectId: selectedProjectId,
      moduleId: selectedModuleId,

      task: selectedTask,

      description:
        typeof description === "string"
          ? description.trim()
          : "",

      estimatedTime: estimatedMinutes,

      // date, idleTime, taskStatus and approvalStatus
      // will use their schema defaults.
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
// UPDATE GLOBAL TIMESHEET — EMPLOYEE & SUPER ADMIN
// Manual time editing is not allowed.
// Start/End/Break have separate endpoints.
// =====================================================

export const updateTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;

    if (!isSuperAdmin(req) && !isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update timesheets.",
      });
    }

    const companyId = getCompanyId(req);

    if (
      !isValidObjectId(id) ||
      !isValidObjectId(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid timesheet or company ID.",
      });
    }

    const allowedFields = [
      "taskType",
      "projectId",
      "moduleId",
      "task",
      "description",
      "estimatedTime",
      "idleTime",
      "remarks.delayFast",
      "remarks.reason",
    ];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: "This field cannot be updated.",
      });
    }

    const timesheet = await Timesheet.findOne({
      _id: id,
      companyId,
    });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet not found in this company.",
      });
    }

    if (timesheet.approvalStatus === "Approved") {
      return res.status(403).json({
        success: false,
        message: "Approved timesheets cannot be modified.",
      });
    }

    // Employees can update only their own timesheets.
    if (
      isEmployee(req) &&
      String(timesheet.employeeId) !== String(getEmployeeId(req))
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own timesheets.",
      });
    }

    // Completed tasks cannot be edited.
    if (timesheet.taskStatus === "Completed") {
      return res.status(403).json({
        success: false,
        message: "Completed tasks cannot be modified.",
      });
    }

    switch (field) {
      // =========================================
      // TASK TYPE
      // =========================================

      case "taskType": {
        if (!["Project", "Learning", "Training"].includes(value)) {
          return res.status(400).json({
            success: false,
            message: "Invalid task type.",
          });
        }

        timesheet.taskType = value;

        // Reset project/module/task when type changes.
        timesheet.projectId = null;
        timesheet.moduleId = null;
        timesheet.task = value;

        if (value === "Project") {
          timesheet.task = "";
        }

        break;
      }

      // =========================================
      // PROJECT
      // =========================================

      case "projectId": {
        if (timesheet.taskType !== "Project") {
          return res.status(400).json({
            success: false,
            message: "Project can only be selected for Project task type.",
          });
        }

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
        }).select("_id");

        if (!project) {
          return res.status(404).json({
            success: false,
            message: "Active project not found.",
          });
        }

        timesheet.projectId = project._id;
        timesheet.moduleId = null;
        timesheet.task = "";

        break;
      }

      // =========================================
      // PROJECT MODULE
      // =========================================

      case "moduleId": {
        if (
          timesheet.taskType !== "Project" ||
          !timesheet.projectId
        ) {
          return res.status(400).json({
            success: false,
            message: "Select a project first.",
          });
        }

        if (!isValidObjectId(value)) {
          return res.status(400).json({
            success: false,
            message: "Please select a valid task/module.",
          });
        }

        const project = await Project.findOne({
          _id: timesheet.projectId,
          companyId,
          status: "active",
        }).select("modules");

        const selectedModule = project?.modules.id(value);

        if (!selectedModule) {
          return res.status(404).json({
            success: false,
            message: "Selected task/module was not found in this project.",
          });
        }

        timesheet.moduleId = selectedModule._id;
        timesheet.task = selectedModule.moduleName;

        break;
      }

      // =========================================
      // TASK
      // =========================================

      case "task": {
        if (
          timesheet.taskType !== "Project" ||
          !timesheet.projectId ||
          !timesheet.moduleId
        ) {
          return res.status(400).json({
            success: false,
            message: "Select a project and module first.",
          });
        }

        const project = await Project.findOne({
          _id: timesheet.projectId,
          companyId,
        }).select("modules");

        const selectedModule = project?.modules.id(
          timesheet.moduleId
        );

        if (!selectedModule) {
          return res.status(404).json({
            success: false,
            message: "Selected module was not found.",
          });
        }

        // Task name must match the selected embedded module.
        if (
          typeof value !== "string" ||
          value.trim() !== selectedModule.moduleName
        ) {
          return res.status(400).json({
            success: false,
            message: "Task name must match the selected project module.",
          });
        }

        timesheet.task = selectedModule.moduleName;
        break;
      }

      // =========================================
      // DESCRIPTION
      // =========================================

      case "description": {
        if (typeof value !== "string") {
          return res.status(400).json({
            success: false,
            message: "Description must be text.",
          });
        }

        if (
          ["Learning", "Training"].includes(timesheet.taskType) &&
          !value.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: "Description is required for Learning and Training.",
          });
        }

        timesheet.description = value.trim();
        break;
      }

      // =========================================
      // ESTIMATED TIME
      // =========================================

      case "estimatedTime": {
        const minutes = getMinutes(value);

        if (minutes === null || minutes <= 0) {
          return res.status(400).json({
            success: false,
            message: "Estimated time must be a positive number of minutes.",
          });
        }

        timesheet.estimatedTime = minutes;

        if (timesheet.endTime) {
          calculateTaskTime(timesheet);
        }

        break;
      }

      // =========================================
      // IDLE TIME
      // =========================================

      case "idleTime": {
        const minutes = getMinutes(value);

        if (minutes === null) {
          return res.status(400).json({
            success: false,
            message: "Idle time must be a valid non-negative number of minutes.",
          });
        }

        timesheet.idleTime = minutes;
        break;
      }

      // =========================================
      // DELAY / FAST
      // =========================================

      case "remarks.delayFast": {
        if (!["", "Delay", "Fast"].includes(value)) {
          return res.status(400).json({
            success: false,
            message: "Invalid delay/fast remark.",
          });
        }

        timesheet.remarks.delayFast = value;
        break;
      }

      // =========================================
      // REMARKS REASON
      // =========================================

      case "remarks.reason": {
        if (typeof value !== "string") {
          return res.status(400).json({
            success: false,
            message: "Reason must be text.",
          });
        }

        timesheet.remarks.reason = value.trim();
        break;
      }
    }

    // Final validation for Learning / Training.
    if (
      ["Learning", "Training"].includes(timesheet.taskType) &&
      !timesheet.description?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Description is required for Learning and Training.",
      });
    }

    // Final validation for Project task.
    if (
      timesheet.taskType === "Project" &&
      (!timesheet.projectId ||
        !timesheet.moduleId ||
        !timesheet.task?.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Project and task/module are required.",
      });
    }

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: "Timesheet updated successfully.",
      timesheet,
    });
  } catch (error) {
    console.error("Update Company Timesheet Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update timesheet.",
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

    if (!isEmployee(req) || !companyId) {
      return res.status(403).json({
        success: false,
        message:
          "Only employees in the parent or grandparent role can audit timesheets.",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid timesheet ID.",
      });
    }

    if (!["Approved", "Rejected"].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Approval status must be Approved or Rejected.",
      });
    }

    if (!isValidObjectId(auditorId)) {
      return res.status(401).json({
        success: false,
        message: "Auditor authentication details are missing.",
      });
    }

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
    }

    if (
      approvalStatus === "Rejected" &&
      (typeof rejectionReason !== "string" ||
        !rejectionReason.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required.",
      });
    }

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

    if (timesheet.approvalStatus !== "Pending") {
      return res.status(403).json({
        success: false,
        message: "Only pending timesheets can be audited.",
      });
    }

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

    const auditor = await Employee.findOne({
      _id: auditorId,
      companyId,
      status: "active",
    }).select("_id roleId companyId");

    if (!auditor) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to audit this timesheet.",
      });
    }

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

    const employeeRole = await Role.findOne({
      _id: timesheetEmployee.roleId,
      companyId,
    }).select("_id parentRoleId");

    if (!employeeRole) {
      return res.status(400).json({
        success: false,
        message: "Timesheet employee role not found.",
      });
    }

    const parentRoleId = employeeRole.parentRoleId;
    let grandparentRoleId = null;

    if (parentRoleId) {
      const parentRole = await Role.findOne({
        _id: parentRoleId,
        companyId,
      }).select("_id parentRoleId");

      grandparentRoleId = parentRole?.parentRoleId || null;
    }

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

    timesheet.approvalStatus = approvalStatus;
    timesheet.auditedBy = auditor._id;

    if (approvalStatus === "Rejected") {
      timesheet.rejectionReason = rejectionReason.trim();
      timesheet.rejectedBy = auditor._id;
      timesheet.rejectedAt = new Date();
    } else {
      timesheet.rejectionReason = "";
      timesheet.rejectedBy = null;
      timesheet.rejectedAt = null;
    }

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

export const editTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;

    // Only employees can edit their own timesheets.
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

    // Only explicitly allowed fields can be edited.
    const allowedFields = ["estimatedTime"];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: "This field cannot be edited.",
      });
    }

    // Find only the logged-in employee's own timesheet.
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
    // ESTIMATED TIME
    // =========================================

    switch (field) {
      case "estimatedTime": {
        const minutes = getMinutes(value);

        if (minutes === null || minutes <= 0) {
          return res.status(400).json({
            success: false,
            message: "Estimated time must be a positive number of minutes.",
          });
        }

        timesheet.estimatedTime = minutes;

        break;
      }

      default:
        return res.status(400).json({
          success: false,
          message: "Unsupported field.",
        });
    }

    // Save updated timesheet.
    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: "Estimated time updated successfully.",
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
