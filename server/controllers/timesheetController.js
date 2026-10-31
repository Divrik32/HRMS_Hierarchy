import mongoose from "mongoose";
import Timesheet from "../models/TimesheetModel.js";
import Project from "../models/Project.js";
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";



// =====================================================
// GET ALL EMPLOYEES OF LOGGED-IN EMPLOYEE'S COMPANY
// =====================================================
export const getCompanyEmployeesForTimesheet = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "A valid company ID is required.",
      });
    }

    const employees = await Employee.find({
      companyId,
    })
      .select("_id name empId")
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
// CREATE TIMESHEET — LOGGED-IN EMPLOYEE
// =====================================================
export const createTimesheet = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const {
      employeeId,
      task,
      description,
      projectId,
      projectName,
      allocatedTime,
    } = req.body;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Company authentication details are missing.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(companyId) ||
      !employeeId ||
      !mongoose.Types.ObjectId.isValid(employeeId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid employee and company details are required.",
      });
    }

    if (typeof task !== "string" || !task.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task is required.",
      });
    }

    // =========================================
    // PROJECT IS OPTIONAL
    // =========================================
    let selectedProject = null;

    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID.",
        });
      }

      selectedProject = await Project.findOne({
        _id: projectId,
        companyId,
        status: "active",
      }).select("_id projectName");

      if (!selectedProject) {
        return res.status(404).json({
          success: false,
          message: "Active project not found for this company.",
        });
      }
    }

    // =========================================
    // TRAINING AND WORKING TIME ARE MANDATORY
    // =========================================
    if (
      !allocatedTime ||
      allocatedTime.trainingTime === undefined ||
      allocatedTime.trainingTime === null ||
      allocatedTime.workingTime === undefined ||
      allocatedTime.workingTime === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Training time and working time are required.",
      });
    }

    const trainingTime = Number(allocatedTime.trainingTime);
    const workingTime = Number(allocatedTime.workingTime);

    if (
      !Number.isFinite(trainingTime) ||
      trainingTime < 0 ||
      !Number.isFinite(workingTime) ||
      workingTime < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Training time and working time must be valid non-negative numbers.",
      });
    }

    // =========================================
    // VERIFY EMPLOYEE BELONGS TO THE COMPANY
    // =========================================
    const selectedEmployee = await Employee.findOne({
      _id: employeeId,
      companyId,
    }).select("_id");

    if (!selectedEmployee) {
      return res.status(404).json({
        success: false,
        message: "Selected employee not found in this company.",
      });
    }

    // =========================================
    // CREATE TIMESHEET
    // =========================================
    const timesheet = await Timesheet.create({
      companyId,
      employeeId: selectedEmployee._id,

      task: task.trim(),
      description:
        typeof description === "string"
          ? description.trim()
          : "",

      projectId: selectedProject?._id || null,

projectName:
  typeof projectName === "string"
    ? projectName.trim()
    : "",

      allocatedTime: {
        trainingTime,
        workingTime,
        // idleTime will use the schema default (0)
      },

      // Other fields will use their schema defaults.
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


/* =====================================================
   GET GLOBAL TIMESHEETS — EMPLOYEE & SUPER ADMIN
===================================================== */
export const getTimesheetsByCompany = async (req, res) => {
  try {
    const isSuperAdmin =
      req.user?.role === "superadmin" ||
      req.user?.role === "Super Admin";

let companyId;

if (
  req.user?.role === "superadmin" ||
  req.user?.role === "Super Admin"
) {
  companyId = req.companyId;
} else if (req.user?.role === "employee") {
  companyId = req.user.companyId;
}

// console.log("TIMESHEET COMPANY DEBUG:", {
//   role: req.user?.role,
//   userCompanyId: req.user?.companyId,
//   requestCompanyId: req.companyId,
//   params: req.params,
//   resolvedCompanyId: companyId,
// });

    if (
      !companyId ||
      !mongoose.Types.ObjectId.isValid(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid company ID is required.",
      });
    }

    const timesheets = await Timesheet.find({
      companyId,
    })
      .populate("employeeId", "name empId")
      .populate("projectId", "projectName projectCode")
      .populate("auditedBy", "name empId")
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


/* =====================================================
   UPDATE GLOBAL TIMESHEET — EMPLOYEE & SUPER ADMIN
===================================================== */
export const updateTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;

    const isSuperAdmin =
      req.user?.role === "superadmin" ||
      req.user?.role === "Super Admin";

    const isEmployee = req.user?.role === "employee";

    if (!isSuperAdmin && !isEmployee) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update timesheets.",
      });
    }

    // Super Admin: companyId from URL params.
    // Employee: companyId from authenticated user.
    const companyId = isSuperAdmin
      ? req.params.companyId
      : req.user.companyId;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(companyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid timesheet or company ID.",
      });
    }

const allowedFields = [
  "employeeId",
  "task",
  "description",
  "projectId",
  "projectName",
  "allocatedTime.trainingTime",
  "allocatedTime.workingTime",
  "allocatedTime.idleTime",
  "startTime",
  "endTime",
  "remarks.delayFast",
  "remarks.reason",
];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: "This field cannot be updated.",
      });
    }

    // Find timesheet using its ID and company ID.
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

    // Approved timesheets cannot be modified.
    if (timesheet.approvalStatus === "Approved") {
      return res.status(403).json({
        success: false,
        message: "Approved timesheets cannot be modified.",
      });
    }

    switch (field) {
      // =========================================
// EMPLOYEE
// =========================================
case "employeeId": {
  if (
    !value ||
    !mongoose.Types.ObjectId.isValid(value)
  ) {
    return res.status(400).json({
      success: false,
      message: "Please select a valid employee.",
    });
  }

  const selectedEmployee = await Employee.findOne({
    _id: value,
    companyId,
  }).select("_id");

  if (!selectedEmployee) {
    return res.status(404).json({
      success: false,
      message: "Selected employee not found in this company.",
    });
  }

  timesheet.employeeId = selectedEmployee._id;
  break;
}
      // =========================================
      // TASK
      // =========================================
      case "task": {
        if (typeof value !== "string" || !value.trim()) {
          return res.status(400).json({
            success: false,
            message: "Task is required.",
          });
        }

        timesheet.task = value.trim();
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

        timesheet.description = value.trim();
        break;
      }

      // =========================================
      // PROJECT (OPTIONAL)
      // =========================================
case "projectId": {
  // Empty or null value removes only the project reference.
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    timesheet.projectId = null;
    break;
  }

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID.",
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
      message: "Active project not found for this company.",
    });
  }

  timesheet.projectId = project._id;
  break;
}

      // =========================================
      // PROJECT / ACTIVITY NAME
      // =========================================
      case "projectName": {
        if (typeof value !== "string") {
          return res.status(400).json({
            success: false,
            message: "Project or activity name must be text.",
          });
        }

        timesheet.projectName = value.trim();
        break;
      }

      // =========================================
      // TRAINING / WORKING / IDLE TIME
      // =========================================
      case "allocatedTime.trainingTime":
      case "allocatedTime.workingTime":
      case "allocatedTime.idleTime": {
        if (
          value === "" ||
          value === null ||
          value === undefined ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Time must be a valid non-negative number.",
          });
        }

        const timeField = field.split(".")[1];

        timesheet.allocatedTime[timeField] = Number(value);
        break;
      }

      // =========================================
      // START TIME / END TIME
      // =========================================
      case "startTime":
      case "endTime": {
        if (value === null || value === "") {
          timesheet[field] = null;
          break;
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field}.`,
          });
        }

        timesheet[field] = date;
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
      // REASON
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

    // =========================================
    // RECALCULATE COMPLETION TIME & EFFICIENCY
    // =========================================
    if (timesheet.startTime && timesheet.endTime) {
      const durationMs =
        new Date(timesheet.endTime).getTime() -
        new Date(timesheet.startTime).getTime();

      if (durationMs <= 0) {
        return res.status(400).json({
          success: false,
          message: "End time must be later than start time.",
        });
      }

      const totalMinutes = Math.round(durationMs / 60000);

      timesheet.totalCompletionTime = totalMinutes;

      const workingTime = Number(
        timesheet.allocatedTime?.workingTime || 0
      );

      timesheet.efficiency =
        workingTime > 0 && totalMinutes > 0
          ? Number(
              ((workingTime / totalMinutes) * 100).toFixed(2)
            )
          : null;
    } else {
      timesheet.totalCompletionTime = null;
      timesheet.efficiency = null;
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

/* =====================================================
   Audit timesheet — approve or reject
===================================================== */
export const auditTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    const auditorId =
      req.user?._id ||
      req.user?.employeeId ||
      req.user?.id;

    const companyId = req.user?.companyId;

    // Only employees can audit. Super Admin is not allowed.
    if (req.user?.role !== "employee" || !companyId) {
      return res.status(403).json({
        success: false,
        message:
          "Only employees in the parent or grandparent role can audit timesheets.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
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

    if (
      !auditorId ||
      !mongoose.Types.ObjectId.isValid(auditorId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Auditor authentication details are missing.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
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

    if (
      !timesheet.startTime ||
      !timesheet.endTime ||
      timesheet.totalCompletionTime == null ||
      timesheet.totalCompletionTime <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Timesheet cannot be audited until start time, end time, and total completion time are recorded.",
      });
    }

    // Employee status enum uses lowercase "active".
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
// =====================================================
export const getDailyEfficiencyGraph = async (req, res) => {
  try {
    const isSuperAdmin =
      req.user?.role === "superadmin" ||
      req.user?.role === "Super Admin";

    const isEmployee = req.user?.role === "employee";

    if (!isSuperAdmin && !isEmployee) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view the efficiency graph.",
      });
    }

    // Super Admin: companyId from URL params
    // Employee: companyId from authenticated user
    const companyId = isSuperAdmin
      ? req.params.companyId
      : req.user?.companyId;

    if (
      !companyId ||
      !mongoose.Types.ObjectId.isValid(companyId)
    ) {
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

// End date-এর পরের দিনের রাত ১২টা
const endExclusive = new Date(end);
endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    // Fetch every employee belonging to this company.
    const employees = await Employee.find({
      companyId: companyObjectId,
    })
      .select("_id name empId")
      .sort({ name: 1 })
      .lean();

    // Fetch daily efficiency for the selected date range.
    const dailyData = await Timesheet.aggregate([
      {
$match: {
  companyId: companyObjectId,

  approvalStatus: {
    $ne: "Rejected",
  },

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