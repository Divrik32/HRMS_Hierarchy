
import mongoose from "mongoose";

import LeaveRequest from "../models/LeaveRequest.js";
import LeaveBalance from "../models/LeaveBalance.js";
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import CompOff from "../models/CompOff.js";

// =====================================================
// COMMON HELPERS
// =====================================================

export const getId = (value) => {
  if (!value) return "";
  return String(value._id || value.id || value);
};

export const getCurrentUserId = (req) =>
  getId(
    req.user?._id ||
      req.user?.id ||
      req.employee?._id ||
      req.employee?.id ||
      req.superAdmin?._id ||
      req.superAdmin?.id
  );

export const getCompanyId = (req) =>
  getId(
    req.companyId ||
      req.user?.companyId ||
      req.employee?.companyId ||
      req.superAdmin?.companyId
  );

export const isSuperAdmin = (req) =>
  Boolean(req.superAdmin) ||
  ["superadmin", "superAdmin", "super_admin"].includes(
    req.user?.role
  );

export const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

export const normalizeDate = (value) => {
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

export const isHR = (role) => {
  const roleName =
    typeof role === "string"
      ? role
      : role?.roleName || "";

  return ["hr", "head recruiter"].includes(
    roleName.trim().toLowerCase()
  );
};

export const getRoleDetails = async (employee) => {
  if (!employee?.roleId) return null;

  return Role.findOne({
    _id: getId(employee.roleId),
    companyId: employee.companyId,
  }).select("roleName parentRoleId");
};


export const getBalanceField = (leaveType) => {
  const balanceFields = {
    "Casual Leave": "casualLeave",
    "Sick Leave": "sickLeave",
    "Paid Leave": "paidLeave",
    "Comp-Off": "compOff",
  };

  return balanceFields[leaveType] || null;
};


export const roundDays = (value) =>
  Number(Number(value || 0).toFixed(2));

// =====================================================
// NORMALIZE LEAVE BREAKDOWN
// =====================================================

export const normalizeLeaveBreakdown = (leaveBreakdown) => {
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

export const getRequestLeaveBreakdown = (request) => {
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
// =====================================================

export const getPaidLeaveBreakdown = (request) =>
  getRequestLeaveBreakdown(request).filter(
    (item) =>
      !["Unpaid Leave", "Comp-Off"].includes(item.leaveType)
  );

// =====================================================
// GET COMP-OFF DAYS
// =====================================================

export const getCompOffDays = (request) =>
  getRequestLeaveBreakdown(request)
    .filter((item) => item.leaveType === "Comp-Off")
    .reduce(
      (sum, item) => sum + Number(item.days || 0),
      0
    );

// =====================================================
// GET UNPAID LEAVE DAYS
// =====================================================

export const getUnpaidLeaveDays = (request) => {
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

export const validateLeaveBreakdownTotal = (
  breakdown,
  totalDays
) => {
  const breakdownTotal = breakdown.reduce(
    (sum, item) => sum + item.days,
    0
  );

  return Math.abs(breakdownTotal - totalDays) < 0.000001;
};

// =====================================================
// NORMALIZE DAILY BREAKDOWN
// =====================================================

export const normalizeDailyBreakdown = (
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
// FIFO allocation from approved earning records.
// =====================================================

export const reserveCompOffBalance = async ({
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
// =====================================================

export const restoreCompOffBalance = async ({
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
// =====================================================

export const recordApprovedCompOffUsage = async ({
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

export const getApproverInfo = async (req, applicant) => {
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

export const canSuperAdminApprove = async (applicant) => {
  const applicantRole = await getRoleDetails(applicant);

  return Boolean(
    applicantRole && !applicantRole.parentRoleId
  );
};

// =====================================================
// GET MY LEAVE BALANCE DATA
// =====================================================

export const getMyLeaveBalanceData = async ({
  employeeId,
  companyId,
}) => {
  // Validate IDs
  if (
    !employeeId ||
    !mongoose.Types.ObjectId.isValid(employeeId)
  ) {
    throw new Error("Invalid or missing employeeId");
  }

  if (
    !companyId ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    throw new Error("Invalid or missing companyId");
  }

  const employeeObjectId = new mongoose.Types.ObjectId(
    employeeId
  );

  const companyObjectId = new mongoose.Types.ObjectId(
    companyId
  );

  const [leaveBalance, compOffRecords] = await Promise.all([
    LeaveBalance.findOne({
      employeeId: employeeObjectId,
      companyId: companyObjectId,
    }).lean(),

    CompOff.find({
      employeeId: employeeObjectId,
      companyId: companyObjectId,
      recordType: "Request",
      status: { $in: ["Approved", "Used"] },
    })
      .select("creditedDays remainingDays")
      .lean(),
  ]);

  const compOffBalance = roundDays(
    compOffRecords.reduce(
      (sum, record) =>
        sum + Number(record.remainingDays || 0),
      0
    )
  );

  return {
    ...(leaveBalance || {
      casualLeave: 0,
      sickLeave: 0,
      paidLeave: 0,
      extraLeaveTaken: 0,
    }),
    compOffBalance,
  };
};

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