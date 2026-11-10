import mongoose from "mongoose";
import LeaveRequest from "../models/LeaveRequest.js";
import LeaveBalance from "../models/LeaveBalance.js";
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import CompOff from "../models/CompOff.js";
import Holiday from "../models/Holiday.js";

// =====================================================
// HELPERS
// =====================================================

const getId = (value) => {
  if (!value) return "";
  return String(value._id || value.id || value);
};

const getCurrentUserId = (req) =>
  getId(
    req.user?._id ||
    req.user?.id ||
    req.employee?._id ||
    req.employee?.id ||
    req.superAdmin?._id ||
    req.superAdmin?.id
  );

const getCompanyId = (req) =>
  getId(
    req.companyId ||
    req.user?.companyId ||
    req.employee?.companyId ||
    req.superAdmin?.companyId
  );

const isSuperAdmin = (req) =>
  Boolean(req.superAdmin) ||
  ["superadmin", "superAdmin", "super_admin"].includes(
    req.user?.role
  );

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const normalizeDate = (value) => {
  if (!value) return null;

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const dateString =
    typeof value === "string"
      ? value.slice(0, 10)
      : parsedDate.toISOString().slice(0, 10);

  const date = new Date(`${dateString}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getRoleDetails = async (employee) => {
  if (!employee?.roleId) return null;

  return Role.findOne({
    _id: getId(employee.roleId),
    companyId: employee.companyId,
  }).select("roleName parentRoleId");
};
const isHR = (role) => {
  const roleName =
    typeof role === "string"
      ? role
      : role?.roleName || "";

  return ["hr", "head recruiter"].includes(
    roleName.trim().toLowerCase()
  );
};


const getBalanceField = (leaveType) => ({
  "Casual Leave": "casualLeave",
  "Sick Leave": "sickLeave",
  "Paid Leave": "paidLeave",
})[leaveType];

// =====================================================
// NORMALIZE LEAVE BREAKDOWN
// =====================================================

const normalizeLeaveBreakdown = (leaveBreakdown) => {
  if (!Array.isArray(leaveBreakdown) || !leaveBreakdown.length) {
    return null;
  }

  const allowedTypes = [
    "Casual Leave",
    "Sick Leave",
    "Paid Leave",
    "Unpaid Leave",
  ];

  const seenTypes = new Set();

  const normalized = [];

  for (const item of leaveBreakdown) {
    const leaveType = String(item?.leaveType || "").trim();
    const days = Number(item?.days);

    if (!allowedTypes.includes(leaveType)) return null;
    if (seenTypes.has(leaveType)) return null;

    if (
      !Number.isFinite(days) ||
      days < 0.5 ||
      Math.abs(days * 2 - Math.round(days * 2)) > 0.000001
    ) {
      return null;
    }

    seenTypes.add(leaveType);

    normalized.push({
      leaveType,
      days,
    });
  }

  return normalized;
};

// =====================================================
// GET REQUEST LEAVE BREAKDOWN
// Supports legacy records.
// =====================================================

const getRequestLeaveBreakdown = (request) => {
  if (
    Array.isArray(request.leaveBreakdown) &&
    request.leaveBreakdown.length > 0
  ) {
    return request.leaveBreakdown;
  }

  // Old records compatibility.
  if (request.leaveType && Number(request.totalDays) > 0) {
    return [
      {
        leaveType: request.isUnpaid
          ? "Unpaid Leave"
          : request.leaveType,
        days: Number(request.totalDays),
      },
    ];
  }

  // Old unpaid records may not have a leaveType.
  if (
    request.isUnpaid &&
    Number(request.totalDays) > 0
  ) {
    return [
      {
        leaveType: "Unpaid Leave",
        days: Number(request.totalDays),
      },
    ];
  }

  return [];
};

// =====================================================
// GET PAID LEAVE BREAKDOWN
// =====================================================

const getPaidLeaveBreakdown = (request) => {
  return getRequestLeaveBreakdown(request).filter(
    (item) => item.leaveType !== "Unpaid Leave"
  );
};

// =====================================================
// GET UNPAID LEAVE DAYS
// =====================================================

const getUnpaidLeaveDays = (request) => {
  const breakdown = getRequestLeaveBreakdown(request);

  // Legacy unpaid request.
  if (
    request.isUnpaid &&
    !breakdown.some((item) => item.leaveType === "Unpaid Leave")
  ) {
    return Number(request.totalDays) || 0;
  }

  return breakdown
    .filter((item) => item.leaveType === "Unpaid Leave")
    .reduce((sum, item) => sum + Number(item.days || 0), 0);
};

// =====================================================
// VALIDATE LEAVE BREAKDOWN TOTAL
// =====================================================

const validateLeaveBreakdownTotal = (breakdown, totalDays) => {
  const breakdownTotal = breakdown.reduce(
    (sum, item) => sum + item.days,
    0
  );

  return Math.abs(breakdownTotal - totalDays) < 0.000001;
};

// =====================================================
// NORMALIZE DAILY BREAKDOWN
// Employee selects Full Day / Half Day dates.
// =====================================================

const normalizeDailyBreakdown = (
  dailyBreakdown,
  startDate,
  endDate,
  totalDays
) => {
  if (!Array.isArray(dailyBreakdown) || !dailyBreakdown.length) {
    return null;
  }

  const expectedDateCount =
    Math.round(
      (endDate.getTime() - startDate.getTime()) /
        86400000
    ) + 1;

  // 7.5 days requires 8 calendar dates.
  if (
    expectedDateCount !== Math.ceil(totalDays) ||
    dailyBreakdown.length !== expectedDateCount
  ) {
    return null;
  }

  const normalized = [];
  const seenDates = new Set();

  for (const item of dailyBreakdown) {
    const date = normalizeDate(item?.date);
    const dayType = item?.dayType;
    const days = Number(item?.days);

    if (!date) return null;

    if (
      !["Full Day", "Half Day"].includes(dayType)
    ) {
      return null;
    }

    if (
      (dayType === "Full Day" && days !== 1) ||
      (dayType === "Half Day" && days !== 0.5)
    ) {
      return null;
    }

    const dateKey = date.toISOString().slice(0, 10);

    if (seenDates.has(dateKey)) return null;
    seenDates.add(dateKey);

    normalized.push({
      date,
      dayType,
      days,
    });
  }

  normalized.sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // First date must equal startDate.
  if (
    normalized[0].date.getTime() !== startDate.getTime()
  ) {
    return null;
  }

  // Last date must equal endDate.
  if (
    normalized[normalized.length - 1].date.getTime() !==
    endDate.getTime()
  ) {
    return null;
  }

  // Dates must be consecutive.
  for (let i = 0; i < normalized.length; i++) {
    const expectedDate = new Date(
      startDate.getTime() + i * 86400000
    );

    if (
      normalized[i].date.getTime() !== expectedDate.getTime()
    ) {
      return null;
    }
  }

  const dailyTotal = normalized.reduce(
    (sum, item) => sum + item.days,
    0
  );

  if (Math.abs(dailyTotal - totalDays) >= 0.000001) {
    return null;
  }

// Validate Half Day count.
// Example:
// 1.5 days = 2 calendar dates = 1 Half Day
// 7.5 days = 8 calendar dates = 1 Half Day
// 7 days   = 7 calendar dates = 0 Half Day
// 0.5 days = 1 calendar date  = 1 Half Day

const halfDayCount = normalized.filter(
  (item) => item.dayType === "Half Day"
).length;

const expectedHalfDayCount = Math.round(
  (expectedDateCount - totalDays) * 2
);

if (halfDayCount !== expectedHalfDayCount) {
  return null;
}

  return normalized;
};


const getApproverInfo = async (req, applicant) => {
  if (isSuperAdmin(req)) {
    return { allowed: false, reason: "not-authorized" };
  }

  const applicantRole = await getRoleDetails(applicant);

  if (!applicantRole) {
    return { allowed: false, reason: "role-not-found" };
  }

  const currentEmployee = await Employee.findOne({
    _id: getCurrentUserId(req),
    companyId: getCompanyId(req),
  }).populate("roleId");

  if (!currentEmployee) {
    return { allowed: false, reason: "not-authorized" };
  }

  // HR / Head Recruiter can approve every employee's leave.
  if (isHR(currentEmployee.roleId)) {
    return { allowed: true };
  }

  // Top-level employee: Super Admin only.
  if (!applicantRole.parentRoleId) {
    return { allowed: false, reason: "super-admin-only" };
  }

  const currentRoleId = getId(currentEmployee.roleId);
  const parentRoleId = getId(applicantRole.parentRoleId);

  return {
    allowed: currentRoleId === parentRoleId,
    reason: "not-authorized",
  };
};

const canSuperAdminApprove = async (applicant) => {
  const applicantRole = await getRoleDetails(applicant);
  return Boolean(applicantRole && !applicantRole.parentRoleId);
};

export const getCompOffCalendar = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const year = Number(req.query.year);

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return sendError(res, 401, "Company information missing.");
    }

    if (!Number.isInteger(year) || year < 2000 || year > 9999) {
      return sendError(res, 400, "Invalid calendar year.");
    }

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const holidays = await Holiday.find({
      companyId,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .select("holidayName date")
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      holidays,
    });
  } catch (error) {
    console.error("Get Comp-Off Calendar Error:", error);
    return sendError(res, 500, error.message);
  }
};

// =====================================================
// GET MY LEAVE BALANCE
// =====================================================

export const getMyLeaveBalance = async (req, res) => {
  try {
    const employeeId = getCurrentUserId(req);
    const companyId = getCompanyId(req);

    if (!employeeId || !companyId) {
      return sendError(res, 401, "Authentication information missing.");
    }

    const balance = await LeaveBalance.findOne({
      employeeId,
      companyId,
    });

    return res.status(200).json({
      success: true,
      balance: balance || {
        casualLeave: 0,
        sickLeave: 0,
        paidLeave: 0,
        extraLeaveTaken: 0,
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};


// =====================================================
// NORMAL APPLY LEAVE REQUEST — ALL EMPLOYEES INCLUDING HR
// =====================================================

export const createLeaveRequest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const employeeId = getCurrentUserId(req);
    const companyId = getCompanyId(req);

    const {
      leaveBreakdown,
      dailyBreakdown,
      startDate,
      endDate,
      totalDays,
      reason,
    } = req.body;

    if (!employeeId || !companyId) {
      return sendError(
        res,
        401,
        "Employee authentication information missing."
      );
    }

    if (!reason?.trim()) {
      return sendError(res, 400, "Leave reason is required.");
    }

    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);
    const days = Number(totalDays);

    if (!start || !end || start > end) {
      return sendError(res, 400, "Invalid leave dates.");
    }

    if (
      !Number.isFinite(days) ||
      days <= 0 ||
      Math.abs(days * 2 - Math.round(days * 2)) > 0.000001
    ) {
      return sendError(
        res,
        400,
        "Leave duration must be in multiples of 0.5 days."
      );
    }

    // =========================================
    // VALIDATE LEAVE TYPE BREAKDOWN
    // =========================================

    const breakdown = normalizeLeaveBreakdown(leaveBreakdown);

    if (!breakdown) {
      return sendError(
        res,
        400,
        "Invalid leave breakdown. Duplicate leave types are not allowed."
      );
    }

    if (!validateLeaveBreakdownTotal(breakdown, days)) {
      return sendError(
        res,
        400,
        "Total leave days must match the sum of leave types."
      );
    }

    // =========================================
    // VALIDATE DAILY BREAKDOWN
    // =========================================

    const normalizedDailyBreakdown = normalizeDailyBreakdown(
      dailyBreakdown,
      start,
      end,
      days
    );

    if (!normalizedDailyBreakdown) {
      return sendError(
        res,
        400,
        "Invalid daily breakdown. Check your date range and Full Day / Half Day selections."
      );
    }

    // =========================================
    // DERIVE LEAVE CATEGORY
    // =========================================

    const hasPaidLeave = breakdown.some(
      (item) => item.leaveType !== "Unpaid Leave"
    );

    const hasUnpaidLeave = breakdown.some(
      (item) => item.leaveType === "Unpaid Leave"
    );

    let leaveCategory = "Paid Leave";

    if (hasPaidLeave && hasUnpaidLeave) {
      leaveCategory = "Mixed Leave";
    } else if (hasUnpaidLeave) {
      leaveCategory = "Unpaid Leave";
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
    });

    if (!employee) {
      return sendError(res, 404, "Employee not found.");
    }

    const paidBreakdown = breakdown.filter(
      (item) => item.leaveType !== "Unpaid Leave"
    );

    const hasPaidBalanceDeduction = paidBreakdown.length > 0;

    // isUnpaid means the complete request is unpaid.
    const isUnpaid = !hasPaidLeave && hasUnpaidLeave;

    let createdRequest;

    await session.withTransaction(async () => {
      // =========================================
      // CHECK OVERLAPPING REQUESTS
      // =========================================

      const overlappingRequest = await LeaveRequest.findOne({
        employeeId,
        companyId,
        status: { $in: ["Pending", "Approved"] },
        startDate: { $lte: end },
        endDate: { $gte: start },
      }).session(session);

      if (overlappingRequest) {
        throw new Error(
          "You already have a pending or approved leave request for these dates."
        );
      }

      // =========================================
      // DEDUCT EACH PAID LEAVE TYPE
      // =========================================

      for (const item of paidBreakdown) {
        const balanceField = getBalanceField(item.leaveType);

        if (!balanceField) {
          throw new Error(
            `Invalid balance field for ${item.leaveType}.`
          );
        }

        const balanceUpdate = await LeaveBalance.updateOne(
          {
            employeeId,
            companyId,
            [balanceField]: { $gte: item.days },
          },
          {
            $inc: {
              [balanceField]: -item.days,
            },
          },
          { session }
        );

        if (balanceUpdate.modifiedCount === 0) {
          const balanceExists = await LeaveBalance.exists({
            employeeId,
            companyId,
          }).session(session);

          if (!balanceExists) {
            throw new Error("Employee leave balance not found.");
          }

          throw new Error(
            `Insufficient ${item.leaveType} balance. Required: ${item.days} days.`
          );
        }
      }

      // =========================================
      // CREATE LEAVE REQUEST
      // =========================================

      const [request] = await LeaveRequest.create(
        [
          {
            companyId,
            employeeId,

            leaveCategory,
            leaveBreakdown: breakdown,

            startDate: start,
            endDate: end,

            dailyBreakdown: normalizedDailyBreakdown,

            totalDays: days,
            reason: reason.trim(),

            status: "Pending",

            isUnpaid,

            balanceDeducted: hasPaidBalanceDeduction,

            payrollProcessed: false,

            actionHistory: [
              {
                action: "Submitted",
                performedBy: employeeId,
                performedAt: new Date(),
                remarks: "Leave request submitted.",
              },
            ],
          },
        ],
        { session }
      );

      createdRequest = request;
    });

    return res.status(201).json({
      success: true,
      message: "Leave request submitted successfully.",
      request: createdRequest,
    });
  } catch (error) {
    console.error("Create Leave Request Error:", error);

    return sendError(res, 400, error.message);
  } finally {
    await session.endSession();
  }
};

// =====================================================
// HR — CREATE COMP-OFF CREDIT FOR AN EMPLOYEE
// =====================================================

export const createCompOffCredit = async (req, res) => {
  try {
    const hrId = getCurrentUserId(req);
    const companyId = getCompanyId(req);

    const {
      employeeId,
      workDate,
      leaveDate,
      workDescription,
      creditedDays = 1,
    } = req.body;

    if (!hrId || !companyId) {
      return sendError(res, 401, "Authentication information missing.");
    }

    const hrEmployee = await Employee.findOne({
      _id: hrId,
      companyId,
    }).populate("roleId");

    if (!hrEmployee || !isHR(hrEmployee.roleId)) {
      return sendError(res, 403, "Only HR can create Comp-Off request.");
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return sendError(res, 400, "Valid employee ID is required.");
    }

    if (!workDescription?.trim()) {
      return sendError(res, 400, "Work description is required.");
    }

    const days = Number(creditedDays);

    if (
      !Number.isFinite(days) ||
      days <= 0 ||
      !Number.isInteger(days * 2)
    ) {
      return sendError(
        res,
        400,
        "Comp-Off days must be in multiples of 0.5."
      );
    }

    const work = normalizeDate(workDate);
    const leave = normalizeDate(leaveDate);

    if (!work || !leave) {
      return sendError(res, 400, "Both Work Date and Leave Date are required.");
    }

    if (work.getTime() === leave.getTime()) {
      return sendError(res, 400, "Work Date and Leave Date cannot be the same.");
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
      status: "active",
    });

    if (!employee) {
      return sendError(res, 404, "Active employee not found in this company.");
    }

    // WORK DATE: Sunday or declared company holiday only.
    const workDay = work.getUTCDay();

    let dayType;
    let holidayId = null;

    if (workDay === 0) {
      dayType = "Sunday";
    } else {
      const workHoliday = await Holiday.findOne({
        companyId,
        date: work,
      });

      if (!workHoliday) {
        return sendError(
          res,
          400,
          "Work Date must be a Sunday or declared company holiday."
        );
      }

      dayType = "Holiday";
      holidayId = workHoliday._id;
    }

    // LEAVE DATE: Must be a normal working day.
    if (leave.getUTCDay() === 0) {
      return sendError(
        res,
        400,
        "Leave Date cannot be a Sunday."
      );
    }

    const leaveHoliday = await Holiday.findOne({
      companyId,
      date: leave,
    });

    if (leaveHoliday) {
      return sendError(
        res,
        400,
        "Leave Date cannot be a declared company holiday."
      );
    }

    const compOff = await CompOff.create({
      companyId,
      employeeId,
      createdBy: hrId,
      workDate: work,
      leaveDate: leave,
      dayType,
      holidayId,
      workDescription: workDescription.trim(),
      creditedDays: days,
      status: "Pending",
      verifiedBy: null,
      verifiedAt: null,
    });

    return res.status(201).json({
      success: true,
      message: "Comp-Off request submitted successfully.",
      compOff,
    });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(
        res,
        409,
        "Comp-Off has already been requested for this employee and work date."
      );
    }

    console.error("Create Comp-Off Request Error:", error);
    return sendError(res, 500, error.message);
  }
};

// =====================================================
// GET MY LEAVE REQUESTS
// =====================================================

export const getMyLeaveRequests = async (req, res) => {
  try {
    const employeeId = getCurrentUserId(req);
    const companyId = getCompanyId(req);

    const requests = await LeaveRequest.find({
      employeeId,
      companyId,
    })
      .sort({ createdAt: -1 })
      .populate("approvedBy", "name empId")
      .populate("rejectedBy", "name empId");

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// =====================================================
// GET MY COMP-OFF CREDITS
// =====================================================

export const getMyCompOffCredits = async (req, res) => {
  try {
    const employeeId = getCurrentUserId(req);
    const companyId = getCompanyId(req);

    const compOffs = await CompOff.find({
      employeeId,
      companyId,
    }).sort({ workDate: -1 });

    return res.status(200).json({
      success: true,
      compOffs,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// =====================================================
// GET PENDING LEAVE REQUESTS FOR CURRENT APPROVER
// =====================================================

export const getPendingLeaveRequests = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUserId = getCurrentUserId(req);

    if (!companyId || !currentUserId) {
      return sendError(res, 401, "Authentication information missing.");
    }

    const currentEmployee = await Employee.findOne({
      _id: currentUserId,
      companyId,
    }).populate("roleId");

    if (!currentEmployee) {
      return sendError(res, 404, "Employee not found.");
    }

const requests = await LeaveRequest.find({
  companyId,
  status: "Pending",
})
  .populate({
    path: "employeeId",
    select: "name empId companyId roleId departmentId",
    populate: [
      {
        path: "roleId",
        select: "roleName parentRoleId",
      },
      {
        path: "departmentId",
        select: "departmentName",
      },
    ],
  })
  .sort({ createdAt: -1 });

    const currentRoleId = getId(currentEmployee.roleId);
    const currentIsHR = isHR(currentEmployee.roleId);

const filteredRequests = requests.filter((request) => {
  const applicant = request.employeeId;
  const applicantRole = applicant?.roleId;

  if (!applicant || !applicantRole) return false;

  // HR / Head Recruiter sees all employees' requests.
  if (currentIsHR) return true;

  // Other employees see only direct child roles.
  const parentRoleId = getId(applicantRole.parentRoleId);

  return Boolean(parentRoleId) && currentRoleId === parentRoleId;
});

    return res.status(200).json({
      success: true,
      requests: filteredRequests,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// =====================================================
// SUPER ADMIN — GET TOP-LEVEL EMPLOYEE PENDING REQUESTS
// =====================================================

export const getSuperAdminPendingLeaveRequests = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return sendError(res, 403, "Super Admin access required.");
    }

    const companyId = getCompanyId(req);

    if (!companyId) {
      return sendError(res, 400, "Company information missing.");
    }

    const requests = await LeaveRequest.find({
      companyId,
      status: "Pending",
    })
      .populate({
        path: "employeeId",
        select: "name empId companyId roleId departmentId",
        populate: {
          path: "roleId",
          select: "roleName parentRoleId",
        },
      })
      .sort({ createdAt: -1 });

    const filteredRequests = requests.filter(
      (request) =>
        request.employeeId &&
        request.employeeId.roleId &&
        !request.employeeId.roleId.parentRoleId
    );

    return res.status(200).json({
      success: true,
      requests: filteredRequests,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// =====================================================
// APPROVE LEAVE REQUEST
// =====================================================


export const approveLeaveRequest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { leaveRequestId } = req.params;
    const currentUserId = getCurrentUserId(req);
    const companyId = getCompanyId(req);

    if (
      !mongoose.Types.ObjectId.isValid(leaveRequestId) ||
      !currentUserId ||
      !companyId
    ) {
      return sendError(res, 400, "Invalid request information.");
    }

    let result;

    await session.withTransaction(async () => {
      const request = await LeaveRequest.findOne({
        _id: leaveRequestId,
        companyId,
      }).session(session);

      if (!request) {
        throw new Error("Leave request not found.");
      }

      if (request.status !== "Pending") {
        throw new Error("This leave request has already been processed.");
      }

      const applicant = await Employee.findOne({
        _id: request.employeeId,
        companyId,
      }).session(session);

      if (!applicant) {
        throw new Error("Applicant employee not found.");
      }

      let allowed = false;

      if (isSuperAdmin(req)) {
        allowed = await canSuperAdminApprove(applicant);
      } else {
        const approval = await getApproverInfo(req, applicant);
        allowed = approval.allowed;
      }

      if (!allowed) {
        throw new Error(
          "You are not authorized to approve this request."
        );
      }

      // =========================================
      // ADD ONLY UNPAID DAYS TO EXTRA LEAVE
      // =========================================

      const unpaidDays = getUnpaidLeaveDays(request);

      if (unpaidDays > 0) {
        await LeaveBalance.findOneAndUpdate(
          {
            employeeId: request.employeeId,
            companyId,
          },
          {
            $inc: {
              extraLeaveTaken: unpaidDays,
            },
          },
          {
            session,
            upsert: true,
          }
        );
      }

      // =========================================
      // UPDATE APPROVAL INFORMATION
      // =========================================

      const superAdminApproval = isSuperAdmin(req);

      request.status = "Approved";

      request.approvedBy = superAdminApproval
        ? null
        : currentUserId;

      request.approvedBySuperAdmin = superAdminApproval
        ? currentUserId
        : null;

      request.approvedAt = new Date();

      request.actionHistory.push({
        action: "Approved",

        performedBy: superAdminApproval
          ? null
          : currentUserId,

        performedBySuperAdmin: superAdminApproval
          ? currentUserId
          : null,

        performedAt: new Date(),
        remarks: req.body?.remarks || "",
      });

      await request.save({ session });

      result = request;
    });

    return res.status(200).json({
      success: true,
      message: "Leave request approved successfully.",
      request: result,
    });
  } catch (error) {
    console.error("Approve Leave Request Error:", error);

    return sendError(
      res,
      error.message.includes("not authorized") ? 403 : 400,
      error.message
    );
  } finally {
    await session.endSession();
  }
};

// =====================================================
// REJECT LEAVE REQUEST — REFUND PAID BALANCE
// =====================================================


export const rejectLeaveRequest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { leaveRequestId } = req.params;

    const currentUserId = getCurrentUserId(req);
    const companyId = getCompanyId(req);

    const rejectionReason = req.body?.rejectionReason;

    if (
      !mongoose.Types.ObjectId.isValid(leaveRequestId) ||
      !currentUserId ||
      !companyId
    ) {
      return sendError(res, 400, "Invalid leave request information.");
    }

    if (!rejectionReason?.trim()) {
      return sendError(res, 400, "Rejection reason is required.");
    }

    let result;

    await session.withTransaction(async () => {
      const request = await LeaveRequest.findOne({
        _id: leaveRequestId,
        companyId,
        status: "Pending",
      }).session(session);

      if (!request) {
        throw new Error("Pending leave request not found.");
      }

      const applicant = await Employee.findOne({
        _id: request.employeeId,
        companyId,
      }).session(session);

      if (!applicant) {
        throw new Error("Applicant employee not found.");
      }

      let allowed = false;

      if (isSuperAdmin(req)) {
        allowed = await canSuperAdminApprove(applicant);
      } else {
        const approval = await getApproverInfo(req, applicant);
        allowed = approval.allowed;
      }

      if (!allowed) {
        throw new Error(
          "You are not authorized to reject this request."
        );
      }

      // =========================================
      // REFUND ONLY PAID LEAVE TYPES
      // =========================================

      if (request.balanceDeducted) {
        const paidBreakdown = getPaidLeaveBreakdown(request);

        for (const item of paidBreakdown) {
          const balanceField = getBalanceField(item.leaveType);

          if (!balanceField) {
            throw new Error(
              `Invalid balance field for ${item.leaveType}.`
            );
          }

          const refund = await LeaveBalance.updateOne(
            {
              employeeId: request.employeeId,
              companyId,
            },
            {
              $inc: {
                [balanceField]: item.days,
              },
            },
            { session }
          );

          if (refund.matchedCount === 0) {
            throw new Error(
              "Employee leave balance not found during refund."
            );
          }
        }

        request.balanceDeducted = false;
      }

      // =========================================
      // UPDATE REJECTION INFORMATION
      // =========================================

      const superAdminRejection = isSuperAdmin(req);

      request.status = "Rejected";

      request.rejectedBy = superAdminRejection
        ? null
        : currentUserId;

      request.rejectedBySuperAdmin = superAdminRejection
        ? currentUserId
        : null;

      request.rejectedAt = new Date();
      request.rejectionReason = rejectionReason.trim();

      request.actionHistory.push({
        action: "Rejected",

        performedBy: superAdminRejection
          ? null
          : currentUserId,

        performedBySuperAdmin: superAdminRejection
          ? currentUserId
          : null,

        performedAt: new Date(),
        remarks: rejectionReason.trim(),
      });

      await request.save({ session });

      result = request;
    });

    return res.status(200).json({
      success: true,
      message: "Leave request rejected and applicable paid balance refunded.",
      request: result,
    });
  } catch (error) {
    console.error("Reject Leave Request Error:", error);

    return sendError(
      res,
      error.message.includes("not authorized") ? 403 : 400,
      error.message
    );
  } finally {
    await session.endSession();
  }
};

// =====================================================
// EMPLOYEE — WITHDRAW OWN PENDING LEAVE REQUEST
// =====================================================


export const withdrawLeaveRequest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { leaveRequestId } = req.params;

    const employeeId = getCurrentUserId(req);
    const companyId = getCompanyId(req);

    if (
      !mongoose.Types.ObjectId.isValid(leaveRequestId) ||
      !employeeId ||
      !companyId
    ) {
      return sendError(res, 400, "Invalid leave request information.");
    }

    let result;

    await session.withTransaction(async () => {
      const request = await LeaveRequest.findOne({
        _id: leaveRequestId,
        employeeId,
        companyId,
        status: "Pending",
      }).session(session);

      if (!request) {
        throw new Error(
          "Pending leave request not found. You can withdraw only your own pending request."
        );
      }

      // =========================================
      // REFUND ONLY PAID LEAVE TYPES
      // =========================================

      if (request.balanceDeducted) {
        const paidBreakdown = getPaidLeaveBreakdown(request);

        for (const item of paidBreakdown) {
          const balanceField = getBalanceField(item.leaveType);

          if (!balanceField) {
            throw new Error(
              `Invalid balance field for ${item.leaveType}.`
            );
          }

          const refund = await LeaveBalance.updateOne(
            {
              employeeId,
              companyId,
            },
            {
              $inc: {
                [balanceField]: item.days,
              },
            },
            { session }
          );

          if (refund.matchedCount === 0) {
            throw new Error(
              "Employee leave balance not found during refund."
            );
          }
        }

        request.balanceDeducted = false;
      }

      // =========================================
      // UPDATE REQUEST STATUS
      // =========================================

      request.status = "Withdrawn";

      request.actionHistory.push({
        action: "Withdrawn",
        performedBy: employeeId,
        performedAt: new Date(),
        remarks: "Leave request withdrawn by employee.",
      });

      await request.save({ session });

      result = request;
    });

    return res.status(200).json({
      success: true,
      message:
        "Leave request withdrawn successfully. Applicable paid balance refunded.",
      request: result,
    });
  } catch (error) {
    console.error("Withdraw Leave Request Error:", error);

    return sendError(res, 400, error.message);
  } finally {
    await session.endSession();
  }
};


export const getCompOffEmployees = async (req, res) => {
  try {
    // Get companyId from authenticated employeeAuth middleware
    const companyId = req.user?.companyId;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return sendError(res, 401, "Valid company information not found.");
    }

    const employees = await Employee.find({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: "active",
    })
      .select("_id name empId roleId departmentId companyId status")
      .populate("roleId", "roleName")
      .populate("departmentId", "departmentName")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("Get Comp-Off Employees Error:", error);
    return sendError(res, 500, error.message);
  }
};

// =====================================================
// HR — GET PENDING COMP-OFF REQUESTS
// =====================================================

export const getPendingCompOffRequests = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const companyId = getCompanyId(req);

    if (!userId || !companyId) {
      return sendError(res, 400, "Invalid employee or company information");
    }

    // Verify that the logged-in employee is HR
    const currentEmployee = await Employee.findById(userId)
      .populate("roleId", "roleName");

    if (!currentEmployee) {
      return sendError(res, 404, "Employee not found");
    }

    const roleName = currentEmployee.roleId?.roleName || "";

    if (!isHR(roleName)) {
      return sendError(res, 403, "Only HR can access Comp-Off approvals");
    }

    // Only requests created by this HR for OTHER employees
    const compOffs = await CompOff.find({
      companyId,
      createdBy: userId,
      employeeId: { $ne: userId },
      status: "Pending",
    })
      .populate("employeeId", "name empId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: compOffs.length,
      compOffs,
    });
  } catch (error) {
    console.error("Get Pending Comp-Off Requests Error:", error);
    return sendError(res, 500, "Failed to fetch Comp-Off requests");
  }
};


// =====================================================
// HR — APPROVE COMP-OFF REQUEST
// =====================================================

export const approveCompOffRequest = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendError(res, 400, "Invalid Comp-Off request ID");
    }

    if (!userId || !companyId) {
      return sendError(res, 400, "Invalid employee or company information");
    }

    // Verify HR
    const currentEmployee = await Employee.findById(userId)
      .populate("roleId", "roleName");

    if (!currentEmployee) {
      return sendError(res, 404, "Employee not found");
    }

    const roleName = currentEmployee.roleId?.roleName || "";

    if (!isHR(roleName)) {
      return sendError(res, 403, "Only HR can approve Comp-Off requests");
    }

    // HR can approve only their own created requests for OTHER employees.
    // HR's personal Comp-Off is excluded.
    const compOff = await CompOff.findOneAndUpdate(
      {
        _id: id,
        companyId,
        createdBy: userId,
        employeeId: { $ne: userId },
        status: "Pending",
      },
      {
        $set: {
          status: "Approved",
          verifiedBy: userId,
          verifiedAt: new Date(),
          rejectionReason: "",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("employeeId", "name empId");

    if (!compOff) {
      return sendError(
        res,
        404,
        "Pending Comp-Off request not found or you are not authorized to approve it"
      );
    }

    return res.status(200).json({
      success: true,
      message: "Comp-Off request approved successfully",
      compOff,
    });
  } catch (error) {
    console.error("Approve Comp-Off Request Error:", error);
    return sendError(res, 500, "Failed to approve Comp-Off request");
  }
};


// =====================================================
// HR — REJECT COMP-OFF REQUEST
// =====================================================

export const rejectCompOffRequest = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return sendError(res, 400, "Invalid Comp-Off request ID");
    }

    if (!userId || !companyId) {
      return sendError(res, 400, "Invalid employee or company information");
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return sendError(res, 400, "Rejection reason is required");
    }

    // Verify HR
    const currentEmployee = await Employee.findById(userId)
      .populate("roleId", "roleName");

    if (!currentEmployee) {
      return sendError(res, 404, "Employee not found");
    }

    const roleName = currentEmployee.roleId?.roleName || "";

    if (!isHR(roleName)) {
      return sendError(res, 403, "Only HR can reject Comp-Off requests");
    }

    // HR can reject only their own created requests for OTHER employees.
    // HR's personal Comp-Off is excluded.
    const compOff = await CompOff.findOneAndUpdate(
      {
        _id: id,
        companyId,
        createdBy: userId,
        employeeId: { $ne: userId },
        status: "Pending",
      },
      {
        $set: {
          status: "Rejected",
          verifiedBy: userId,
          verifiedAt: new Date(),
          rejectionReason: rejectionReason.trim(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("employeeId", "name empId");

    if (!compOff) {
      return sendError(
        res,
        404,
        "Pending Comp-Off request not found or you are not authorized to reject it"
      );
    }

    return res.status(200).json({
      success: true,
      message: "Comp-Off request rejected successfully",
      compOff,
    });
  } catch (error) {
    console.error("Reject Comp-Off Request Error:", error);
    return sendError(res, 500, "Failed to reject Comp-Off request");
  }
};


// =====================================================
// SUPER ADMIN - PENDING HR PERSONAL COMP-OFF REQUESTS
// =====================================================

export const getSuperAdminPendingCompOffRequests = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return sendError(res, 403, "Super Admin access required");
    }

    const companyId = getCompanyId(req);

    if (!companyId) {
      return sendError(res, 400, "Company ID is required");
    }

    // HR-এর নিজের Comp-Off request:
    // employeeId === createdBy
    const requests = await CompOff.find({
      companyId,
      status: "Pending",
      $expr: { $eq: ["$employeeId", "$createdBy"] },
    })
      .populate({
        path: "employeeId",
        select: "name empId email roleId departmentId",
        populate: {
          path: "roleId",
          select: "roleName parentRoleId",
        },
      })
      .populate({
        path: "createdBy",
        select: "name empId email roleId",
        populate: {
          path: "roleId",
          select: "roleName parentRoleId",
        },
      })
      .populate("holidayId", "name date")
      .sort({ createdAt: -1 });

    // Only HR's personal requests should appear here.
    const hrRequests = requests.filter((request) => {
      const employee = request.employeeId;
      const role = employee?.roleId;

      return employee && isHR(role);
    });

    return res.status(200).json({
      success: true,
      count: hrRequests.length,
      requests: hrRequests,
    });
  } catch (error) {
    console.error("Get Super Admin Pending Comp-Off Error:", error);
    return sendError(res, 500, "Failed to fetch pending Comp-Off requests");
  }
};


// =====================================================
// SUPER ADMIN - APPROVE HR PERSONAL COMP-OFF
// =====================================================

export const approveSuperAdminCompOffRequest = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return sendError(res, 403, "Super Admin access required");
    }

    const companyId = getCompanyId(req);
    const superAdminId = getCurrentUserId(req);
    const { id } = req.params;

    const request = await CompOff.findOne({
      _id: id,
      companyId,
      status: "Pending",
      $expr: { $eq: ["$employeeId", "$createdBy"] },
    });

    if (!request) {
      return sendError(res, 404, "Pending HR personal Comp-Off request not found");
    }

    const hrEmployee = await Employee.findOne({
      _id: request.createdBy,
      companyId,
    });

    if (!hrEmployee) {
      return sendError(res, 404, "HR employee not found");
    }

    const hrRole = await getRoleDetails(hrEmployee);

    if (!isHR(hrRole)) {
      return sendError(res, 403, "This request is not an HR personal Comp-Off request");
    }

    const updatedRequest = await CompOff.findOneAndUpdate(
      {
        _id: id,
        companyId,
        status: "Pending",
        $expr: { $eq: ["$employeeId", "$createdBy"] },
      },
      {
        $set: {
          status: "Approved",
          verifiedBy: null,
          verifiedBySuperAdmin: superAdminId,
          verifiedAt: new Date(),
          rejectionReason: "",
        },
      },
      { new: true }
    )
      .populate("employeeId", "name empId email")
      .populate("createdBy", "name empId email");

    if (!updatedRequest) {
      return sendError(res, 409, "This Comp-Off request has already been processed");
    }

    return res.status(200).json({
      success: true,
      message: "HR personal Comp-Off request approved successfully",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Approve Super Admin Comp-Off Error:", error);
    return sendError(res, 500, "Failed to approve Comp-Off request");
  }
};


// =====================================================
// SUPER ADMIN - REJECT HR PERSONAL COMP-OFF
// =====================================================

export const rejectSuperAdminCompOffRequest = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return sendError(res, 403, "Super Admin access required");
    }

    const companyId = getCompanyId(req);
    const superAdminId = getCurrentUserId(req);
    const { id } = req.params;

    const rejectionReason = String(
      req.body?.rejectionReason || ""
    ).trim();

    if (!rejectionReason) {
      return sendError(res, 400, "Rejection reason is required");
    }

    const request = await CompOff.findOne({
      _id: id,
      companyId,
      status: "Pending",
      $expr: { $eq: ["$employeeId", "$createdBy"] },
    });

    if (!request) {
      return sendError(res, 404, "Pending HR personal Comp-Off request not found");
    }

    const hrEmployee = await Employee.findOne({
      _id: request.createdBy,
      companyId,
    });

    if (!hrEmployee) {
      return sendError(res, 404, "HR employee not found");
    }

    const hrRole = await getRoleDetails(hrEmployee);

    if (!isHR(hrRole)) {
      return sendError(res, 403, "This request is not an HR personal Comp-Off request");
    }

    const updatedRequest = await CompOff.findOneAndUpdate(
      {
        _id: id,
        companyId,
        status: "Pending",
        $expr: { $eq: ["$employeeId", "$createdBy"] },
      },
      {
        $set: {
          status: "Rejected",
          verifiedBy: null,
          verifiedBySuperAdmin: superAdminId,
          verifiedAt: new Date(),
          rejectionReason,
        },
      },
      { new: true }
    )
      .populate("employeeId", "name empId email")
      .populate("createdBy", "name empId email");

    if (!updatedRequest) {
      return sendError(res, 409, "This Comp-Off request has already been processed");
    }

    return res.status(200).json({
      success: true,
      message: "HR personal Comp-Off request rejected successfully",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Reject Super Admin Comp-Off Error:", error);
    return sendError(res, 500, "Failed to reject Comp-Off request");
  }
};


// =====================================================
// SUPER ADMIN - ALL EMPLOYEE LEAVE RECORDS (READ ONLY)
// =====================================================

export const getAllEmployeeLeaves = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return sendError(res, 403, "Super Admin access required");
    }

    const companyId = getCompanyId(req);

    if (!companyId) {
      return sendError(res, 400, "Company ID is required");
    }

    const requests = await LeaveRequest.find({ companyId })
      .populate({
        path: "employeeId",
        select: "name empId email roleId departmentId",
        populate: [
          {
            path: "roleId",
            select: "roleName parentRoleId",
          },
          {
            path: "departmentId",
            select: "departmentName",
          },
        ],
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get All Employee Leaves Error:", error);
    return sendError(res, 500, "Failed to fetch employee leave records");
  }
};
