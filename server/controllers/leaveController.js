
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
  res.status(status).json({
    success: false,
    message,
  });

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

const isHR = (role) => {
  const roleName =
    typeof role === "string"
      ? role
      : role?.roleName || "";

  return ["hr", "head recruiter"].includes(
    roleName.trim().toLowerCase()
  );
};

const getRoleDetails = async (employee) => {
  if (!employee?.roleId) return null;

  return Role.findOne({
    _id: getId(employee.roleId),
    companyId: employee.companyId,
  }).select("roleName parentRoleId");
};

const getBalanceField = (leaveType) =>
  ({
    "Casual Leave": "casualLeave",
    "Sick Leave": "sickLeave",
    "Paid Leave": "paidLeave",
  })[leaveType];

const roundDays = (value) =>
  Number(Number(value || 0).toFixed(2));

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
    "Comp-Off",
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
// Comp-Off is handled separately.
// =====================================================

const getPaidLeaveBreakdown = (request) =>
  getRequestLeaveBreakdown(request).filter(
    (item) =>
      !["Unpaid Leave", "Comp-Off"].includes(item.leaveType)
  );

// =====================================================
// GET COMP-OFF DAYS FROM REQUEST
// =====================================================

const getCompOffDays = (request) =>
  getRequestLeaveBreakdown(request)
    .filter((item) => item.leaveType === "Comp-Off")
    .reduce(
      (sum, item) => sum + Number(item.days || 0),
      0
    );

// =====================================================
// GET UNPAID LEAVE DAYS
// =====================================================

const getUnpaidLeaveDays = (request) => {
  const breakdown = getRequestLeaveBreakdown(request);

  if (
    request.isUnpaid &&
    !breakdown.some((item) => item.leaveType === "Unpaid Leave")
  ) {
    return Number(request.totalDays) || 0;
  }

  return breakdown
    .filter((item) => item.leaveType === "Unpaid Leave")
    .reduce(
      (sum, item) => sum + Number(item.days || 0),
      0
    );
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
      (endDate.getTime() - startDate.getTime()) / 86400000
    ) + 1;

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

    if (!["Full Day", "Half Day"].includes(dayType)) {
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

  if (
    normalized[0].date.getTime() !== startDate.getTime()
  ) {
    return null;
  }

  if (
    normalized[normalized.length - 1].date.getTime() !==
    endDate.getTime()
  ) {
    return null;
  }

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

// =====================================================
// RESERVE COMP-OFF BALANCE
// FIFO allocation from approved Comp-Off earning records.
// =====================================================

const reserveCompOffBalance = async ({
  employeeId,
  companyId,
  days,
  session,
}) => {
  let daysToReserve = roundDays(days);
  const allocations = [];

  const earningRecords = await CompOff.find({
    companyId,
    employeeId,
    recordType: "Request",
    status: { $in: ["Approved", "Used"] },
    remainingDays: { $gt: 0 },
  })
    .sort({ createdAt: 1, _id: 1 })
    .session(session);

  const availableBalance = earningRecords.reduce(
    (sum, record) =>
      sum + Number(record.remainingDays || 0),
    0
  );

  if (availableBalance < daysToReserve) {
    throw new Error(
      `Insufficient Comp-Off balance. Required: ${daysToReserve} days. Available: ${roundDays(availableBalance)} days.`
    );
  }

  for (const earning of earningRecords) {
    if (daysToReserve <= 0) break;

    const availableDays = Number(earning.remainingDays || 0);

    if (availableDays <= 0) continue;

    const allocatedDays = roundDays(
      Math.min(availableDays, daysToReserve)
    );

    const updatedEarning = await CompOff.findOneAndUpdate(
      {
        _id: earning._id,
        companyId,
        employeeId,
        recordType: "Request",
        status: { $in: ["Approved", "Used"] },
        remainingDays: { $gte: allocatedDays },
      },
      {
        $inc: {
          remainingDays: -allocatedDays,
        },
      },
      {
        new: true,
        session,
        runValidators: true,
      }
    );

    if (!updatedEarning) {
      throw new Error(
        "Comp-Off balance changed while applying. Please try again."
      );
    }

    allocations.push({
      compOffId: earning._id,
      days: allocatedDays,
    });

    daysToReserve = roundDays(
      daysToReserve - allocatedDays
    );
  }

  if (daysToReserve > 0) {
    throw new Error(
      "Unable to reserve the requested Comp-Off balance."
    );
  }

  return allocations;
};

// =====================================================
// RESTORE RESERVED COMP-OFF BALANCE
// Used on Reject / Withdraw.
// =====================================================

const restoreCompOffBalance = async ({
  request,
  session,
}) => {
  if (!request.compOffBalanceDeducted) {
    return;
  }

  const allocations = request.compOffAllocations || [];

  for (const allocation of allocations) {
    const compOffId = getId(allocation.compOffId);
    const days = Number(allocation.days || 0);

    if (!compOffId || days <= 0) continue;

    const restored = await CompOff.updateOne(
      {
        _id: compOffId,
        companyId: request.companyId,
        employeeId: request.employeeId,
        recordType: "Request",
      },
      {
        $inc: {
          remainingDays: days,
        },
      },
      { session }
    );

    if (restored.matchedCount === 0) {
      throw new Error(
        "Original Comp-Off earning record not found during balance restoration."
      );
    }
  }

  request.compOffBalanceDeducted = false;
};

// =====================================================
// MARK COMP-OFF AS USED AFTER LEAVE APPROVAL
// Creates Usage records linked to source earning records.
// =====================================================

const recordApprovedCompOffUsage = async ({
  request,
  session,
}) => {
  if (!request.compOffBalanceDeducted) {
    return;
  }

  const allocations = request.compOffAllocations || [];

  if (!allocations.length) {
    throw new Error(
      "Comp-Off allocation information is missing from this leave request."
    );
  }

  const usageRecords = [];

  for (const allocation of allocations) {
    const compOffId = getId(allocation.compOffId);
    const days = Number(allocation.days || 0);

    if (!compOffId || days <= 0) continue;

    const source = await CompOff.findOneAndUpdate(
      {
        _id: compOffId,
        companyId: request.companyId,
        employeeId: request.employeeId,
        recordType: "Request",
        status: { $in: ["Approved", "Used"] },
      },
      {
        $inc: {
          usedDays: days,
        },
      },
      {
        new: true,
        session,
        runValidators: true,
      }
    );

    if (!source) {
      throw new Error(
        "Original Comp-Off earning record not found during approval."
      );
    }

    usageRecords.push({
      companyId: request.companyId,
      employeeId: request.employeeId,
      recordType: "Usage",
      sourceCompOffId: compOffId,
      usageReference: request._id,
      usedDays: days,
      usageDate: request.startDate
        ? new Date(request.startDate).toISOString().slice(0, 10)
        : "",
      remarks: `Used for approved Leave Request ${request._id}`,
      createdBy: request.employeeId,
      status: "Used",
    });
  }

  if (usageRecords.length) {
    await CompOff.create(usageRecords, { session });
  }
};

// =====================================================
// APPROVER PERMISSION
// =====================================================

const getApproverInfo = async (req, applicant) => {
  if (isSuperAdmin(req)) {
    return {
      allowed: false,
      reason: "not-authorized",
    };
  }

  const applicantRole = await getRoleDetails(applicant);

  if (!applicantRole) {
    return {
      allowed: false,
      reason: "role-not-found",
    };
  }

  const currentEmployee = await Employee.findOne({
    _id: getCurrentUserId(req),
    companyId: getCompanyId(req),
  }).populate("roleId");

  if (!currentEmployee) {
    return {
      allowed: false,
      reason: "not-authorized",
    };
  }

  if (isHR(currentEmployee.roleId)) {
    return { allowed: true };
  }

  if (!applicantRole.parentRoleId) {
    return {
      allowed: false,
      reason: "super-admin-only",
    };
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

  return Boolean(
    applicantRole && !applicantRole.parentRoleId
  );
};

// =====================================================
// COMP-OFF CALENDAR
// =====================================================

export const getCompOffCalendar = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const year = Number(req.query.year);

    if (
      !companyId ||
      !mongoose.Types.ObjectId.isValid(companyId)
    ) {
      return sendError(res, 401, "Company information missing.");
    }

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 9999
    ) {
      return sendError(res, 400, "Invalid calendar year.");
    }

    const startDate = new Date(
      `${year}-01-01T00:00:00.000Z`
    );

    const endDate = new Date(
      `${year + 1}-01-01T00:00:00.000Z`
    );

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
// Includes available Comp-Off balance.
// =====================================================

export const getMyLeaveBalance = async (req, res) => {
  try {
    const employeeId = getCurrentUserId(req);
    const companyId = getCompanyId(req);

    if (!employeeId || !companyId) {
      return sendError(
        res,
        401,
        "Authentication information missing."
      );
    }

    const [leaveBalance, compOffRecords] = await Promise.all([
      LeaveBalance.findOne({
        employeeId,
        companyId,
      }),

      CompOff.find({
        employeeId,
        companyId,
        recordType: "Request",
        status: { $in: ["Approved", "Used"] },
      }).select("creditedDays remainingDays"),
    ]);

    const compOffBalance = roundDays(
      compOffRecords.reduce(
        (sum, record) =>
          sum + Number(record.remainingDays || 0),
        0
      )
    );

    const balance = leaveBalance
      ? {
          ...leaveBalance.toObject(),
          compOffBalance,
        }
      : {
          casualLeave: 0,
          sickLeave: 0,
          paidLeave: 0,
          extraLeaveTaken: 0,
          compOffBalance,
        };

    return res.status(200).json({
      success: true,
      balance,
    });
  } catch (error) {
    console.error("Get My Leave Balance Error:", error);
    return sendError(res, 500, error.message);
  }
};

// =====================================================
// CREATE LEAVE REQUEST
// All employees including HR.
// Comp-Off is applied through the same Leave Application.
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

    const hasCompOff = breakdown.some(
      (item) => item.leaveType === "Comp-Off"
    );

    const hasUnpaidLeave = breakdown.some(
      (item) => item.leaveType === "Unpaid Leave"
    );

    const hasRegularPaidLeave = breakdown.some(
      (item) =>
        !["Unpaid Leave", "Comp-Off"].includes(item.leaveType)
    );

    const hasAnyPaidLeave =
      hasCompOff || hasRegularPaidLeave;

    let leaveCategory = "Paid Leave";

    if (hasCompOff && !hasUnpaidLeave && !hasRegularPaidLeave) {
      leaveCategory = "Comp-Off";
    } else if (hasAnyPaidLeave && hasUnpaidLeave) {
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
      (item) =>
        !["Unpaid Leave", "Comp-Off"].includes(item.leaveType)
    );

    const hasPaidBalanceDeduction =
      paidBreakdown.length > 0;

    const compOffDays = getCompOffDays({
      leaveBreakdown: breakdown,
    });

    const isUnpaid =
      !hasAnyPaidLeave && hasUnpaidLeave;

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
      // DEDUCT REGULAR PAID LEAVE BALANCES
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
            throw new Error(
              "Employee leave balance not found."
            );
          }

          throw new Error(
            `Insufficient ${item.leaveType} balance. Required: ${item.days} days.`
          );
        }
      }

      // =========================================
      // RESERVE COMP-OFF BALANCE
      // =========================================

      let compOffAllocations = [];

      if (compOffDays > 0) {
        compOffAllocations = await reserveCompOffBalance({
          employeeId,
          companyId,
          days: compOffDays,
          session,
        });
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

            compOffAllocations,
            compOffBalanceDeducted: compOffDays > 0,

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
// GET PENDING LEAVE REQUESTS FOR CURRENT APPROVER
// =====================================================

export const getPendingLeaveRequests = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUserId = getCurrentUserId(req);

    if (!companyId || !currentUserId) {
      return sendError(
        res,
        401,
        "Authentication information missing."
      );
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

      if (currentIsHR) return true;

      const parentRoleId = getId(applicantRole.parentRoleId);

      return (
        Boolean(parentRoleId) &&
        currentRoleId === parentRoleId
      );
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
// This behavior is intentionally retained.
// =====================================================

export const getSuperAdminPendingLeaveRequests = async (
  req,
  res
) => {
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
// Handles regular leave + Comp-Off leave.
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
      return sendError(
        res,
        400,
        "Invalid request information."
      );
    }

    let result;

    await session.withTransaction(async () => {
      const request = await LeaveRequest.findOne({
        _id: leaveRequestId,
        companyId,
        status: "Pending",
      }).session(session);

      if (!request) {
        throw new Error(
          "Pending leave request not found or already processed."
        );
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
      // RECORD COMP-OFF USAGE
      // Balance was already reserved during application.
      // =========================================

      if (request.compOffBalanceDeducted) {
        await recordApprovedCompOffUsage({
          request,
          session,
        });
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
// REJECT LEAVE REQUEST
// Refunds regular paid balance + reserved Comp-Off balance.
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
      return sendError(
        res,
        400,
        "Invalid leave request information."
      );
    }

    if (!rejectionReason?.trim()) {
      return sendError(
        res,
        400,
        "Rejection reason is required."
      );
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
      // REFUND REGULAR PAID LEAVE BALANCES
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
      // RESTORE RESERVED COMP-OFF BALANCE
      // =========================================

      await restoreCompOffBalance({
        request,
        session,
      });

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
      message:
        "Leave request rejected and applicable balances refunded.",
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
// Refunds regular paid balance + reserved Comp-Off balance.
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
      return sendError(
        res,
        400,
        "Invalid leave request information."
      );
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
      // REFUND REGULAR PAID LEAVE BALANCES
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
      // RESTORE RESERVED COMP-OFF BALANCE
      // =========================================

      await restoreCompOffBalance({
        request,
        session,
      });

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
        "Leave request withdrawn successfully. Applicable balances refunded.",
      request: result,
    });
  } catch (error) {
    console.error("Withdraw Leave Request Error:", error);

    return sendError(res, 400, error.message);
  } finally {
    await session.endSession();
  }
};

// =====================================================
// HR — APPROVE COMP-OFF EARNING REQUEST
// =====================================================

export const approveCompOffRequest = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid Comp-Off request ID"
      );
    }

    if (!userId || !companyId) {
      return sendError(
        res,
        400,
        "Invalid employee or company information"
      );
    }

    const currentEmployee = await Employee.findOne({
      _id: userId,
      companyId,
    }).populate("roleId", "roleName");

    if (!currentEmployee) {
      return sendError(res, 404, "Employee not found");
    }

    if (!isHR(currentEmployee.roleId)) {
      return sendError(
        res,
        403,
        "Only HR can approve Comp-Off requests"
      );
    }

    const compOff = await CompOff.findOneAndUpdate(
      {
        _id: id,
        companyId,
        recordType: "Request",
        createdBy: userId,
        employeeId: { $ne: userId },
        status: "Pending",
      },
      {
        $set: {
          status: "Approved",
          creditedDays: 1,
          remainingDays: 1,
          usedDays: 0,
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

    return sendError(
      res,
      500,
      error.message || "Failed to approve Comp-Off request"
    );
  }
};

// =====================================================
// HR — REJECT COMP-OFF EARNING REQUEST
// =====================================================

export const rejectCompOffRequest = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return sendError(
        res,
        400,
        "Invalid Comp-Off request ID"
      );
    }

    if (!userId || !companyId) {
      return sendError(
        res,
        400,
        "Invalid employee or company information"
      );
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return sendError(
        res,
        400,
        "Rejection reason is required"
      );
    }

    const currentEmployee = await Employee.findOne({
      _id: userId,
      companyId,
    }).populate("roleId", "roleName");

    if (!currentEmployee) {
      return sendError(res, 404, "Employee not found");
    }

    if (!isHR(currentEmployee.roleId)) {
      return sendError(
        res,
        403,
        "Only HR can reject Comp-Off requests"
      );
    }

    const compOff = await CompOff.findOneAndUpdate(
      {
        _id: id,
        companyId,
        recordType: "Request",
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

    return sendError(
      res,
      500,
      error.message || "Failed to reject Comp-Off request"
    );
  }
};

// =====================================================
// SUPER ADMIN — PENDING HR PERSONAL COMP-OFF REQUESTS
// =====================================================

export const getSuperAdminPendingCompOffRequests = async (
  req,
  res
) => {
  try {
    if (!isSuperAdmin(req)) {
      return sendError(
        res,
        403,
        "Super Admin access required"
      );
    }

    const companyId = getCompanyId(req);

    if (!companyId) {
      return sendError(res, 400, "Company ID is required");
    }

    const requests = await CompOff.find({
      companyId,
      recordType: "Request",
      status: "Pending",
      $expr: {
        $eq: ["$employeeId", "$createdBy"],
      },
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
      .sort({ createdAt: -1 });

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
    console.error(
      "Get Super Admin Pending Comp-Off Error:",
      error
    );

    return sendError(
      res,
      500,
      "Failed to fetch pending Comp-Off requests"
    );
  }
};

export const getAllEmployeeLeaves = async (req, res) => {
  try {
    // Get logged-in employee
    const employee = await Employee.findOne({
      _id: req.user.id,
      status: "active",
    }).select("companyId roleId");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Verify HR permission
    const role = await Role.findById(employee.roleId).select("roleName");

    const roleName = role?.roleName?.trim()?.toLowerCase();

    const isHR = ["hr", "head recruiter"].includes(roleName);

    if (!isHR) {
      return res.status(403).json({
        success: false,
        message: "HR access required",
      });
    }

    // Get employee's own company
    const companyId = employee.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    // Fetch all company leave requests except Withdrawn
    const requests = await LeaveRequest.find({
      companyId,
      status: { $ne: "Withdrawn" },
    })
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

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee leave records",
      error: error.message,
    });
  }
};


export const getAllCompanyEmployeeLeavesForSuperAdmin = async (
  req,
  res
) => {
  try {
    // Verify Super Admin authentication
    if (req.user?.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Super Admin access required",
      });
    }

    // Get selected company ID from middleware
    const companyId = req.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    // Fetch all employee leave requests of selected company
    const requests = await LeaveRequest.find({
      companyId,
    })
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
    console.error(
      "Get All Company Employee Leaves For Super Admin Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company employee leave records",
      error: error.message,
    });
  }
};
