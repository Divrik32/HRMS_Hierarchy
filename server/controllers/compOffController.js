
import mongoose from "mongoose";
import CompOff from "../models/CompOff.js";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import Holiday from "../models/Holiday.js";

const MINUTES_PER_DAY = 480;

const getCompanyId = (req) => {
  const id =
    req.user?.role === "employee"
      ? req.user.companyId
      : req.user?.role === "superadmin"
        ? req.companyId
        : null;

  return id && mongoose.Types.ObjectId.isValid(id) ? id : null;
};

const getEmployeeId = (req) => {
  if (req.user?.role === "employee") {
    return req.user.id;
  }

  return null;
};

const isValidDate = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const getDayType = async (companyId, date) => {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();

  if (day === 0) {
    return "Sunday";
  }

  const holiday = await Holiday.findOne({
    companyId,
    date,
  }).select("_id");

  return holiday ? "Holiday" : "Normal";
};

const getActualMinutes = (attendance) => {
  if (!attendance?.checkIn || !attendance?.checkOut) {
    return 0;
  }

  const difference =
    new Date(attendance.checkOut).getTime() -
    new Date(attendance.checkIn).getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.floor(difference / 60000);
};

const isHR = async (employeeId, companyId) => {
  const employee = await Employee.findOne({
    _id: employeeId,
    companyId,
    status: "active",
  })
    .populate("roleId", "roleName")
    .select("_id roleId");

  const role = employee?.roleId?.roleName?.trim().toLowerCase();

  return Boolean(employee && ["hr", "head recruiter"].includes(role));
};

const getUsedMinutesByAttendance = async (
  employeeId,
  companyId
) => {
  const records = await CompOff.find({
    employeeId,
    companyId,
    recordType: "Request",
    status: { $in: ["Pending", "Approved", "Used"] },
  }).select("workEntries");

  const usedMap = new Map();

  for (const record of records) {
    for (const entry of record.workEntries || []) {
      const id = String(entry.attendanceId);

      usedMap.set(
        id,
        (usedMap.get(id) || 0) + Number(entry.claimedMinutes || 0)
      );
    }
  }

  return usedMap;
};

// =====================================================
// EMPLOYEE: CREATE COMP-OFF REQUEST
// POST /comp-off/request
// body: { workDates: ["2026-11-10", "2026-11-11"] }
// =====================================================
export const createCompOffRequest = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const employeeId = getEmployeeId(req);

    if (!companyId || !employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
      });
    }

    const { workDates } = req.body;

    if (!Array.isArray(workDates) || workDates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select attendance dates.",
      });
    }

    if (workDates.some((date) => !isValidDate(date))) {
      return res.status(400).json({
        success: false,
        message: "All dates must be valid YYYY-MM-DD dates.",
      });
    }

    const uniqueDates = [...new Set(workDates)].sort();

    if (uniqueDates.length !== workDates.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate work dates are not allowed.",
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
      status: "active",
    }).select("_id");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee not found.",
      });
    }

    const usedMap = await getUsedMinutesByAttendance(
      employeeId,
      companyId
    );

    const entries = [];
    let remainingMinutes = MINUTES_PER_DAY;

    for (const date of uniqueDates) {
      if (remainingMinutes <= 0) break;

      const attendance = await Attendance.findOne({
        employeeId,
        companyId,
        attendanceDate: date,
      });

      if (!attendance || !attendance.checkIn || !attendance.checkOut) {
        return res.status(400).json({
          success: false,
          message: `Complete attendance not found for ${date}.`,
        });
      }

      const actualMinutes = getActualMinutes(attendance);

      if (actualMinutes <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid attendance duration for ${date}.`,
        });
      }

      const workType = await getDayType(companyId, date);

      const eligibleMinutes =
        workType === "Normal"
          ? Math.max(0, actualMinutes - MINUTES_PER_DAY)
          : actualMinutes;

      const alreadyClaimed =
        usedMap.get(String(attendance._id)) || 0;

      const availableMinutes = Math.max(
        0,
        eligibleMinutes - alreadyClaimed
      );

      if (availableMinutes <= 0) {
        continue;
      }

      const claimedMinutes = Math.min(
        availableMinutes,
        remainingMinutes
      );

      entries.push({
        attendanceId: attendance._id,
        workDate: date,
        workType,
        actualMinutes,
        eligibleMinutes,
        claimedMinutes,
      });

      remainingMinutes -= claimedMinutes;
    }

    if (remainingMinutes > 0) {
      const available = MINUTES_PER_DAY - remainingMinutes;

      return res.status(400).json({
        success: false,
        message: "You need 8 eligible extra working hours to request 1 Comp-Off.",
        requiredMinutes: MINUTES_PER_DAY,
        availableMinutes: available,
        remainingMinutes,
      });
    }

    const request = await CompOff.create({
      companyId,
      employeeId,
      recordType: "Request",
      workEntries: entries,
      totalClaimedMinutes: MINUTES_PER_DAY,
      creditedDays: 0,
      status: "Pending",
      createdBy: employeeId,
    });

    return res.status(201).json({
      success: true,
      message: "Comp-Off request submitted successfully.",
      request,
    });
  } catch (error) {
    console.error("Create Comp-Off Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create Comp-Off request.",
    });
  }
};

// =====================================================
// EMPLOYEE: MY COMP-OFF REQUESTS
// GET /comp-off/my-requests
// =====================================================
export const getMyCompOffRequests = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const employeeId = getEmployeeId(req);

    if (!companyId || !employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
      });
    }

    const requests = await CompOff.find({
      companyId,
      employeeId,
      recordType: "Request",
    })
      .populate("verifiedBy", "name empId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Comp-Off requests.",
    });
  }
};


export const getMyCompOffBalance = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const employeeId = getEmployeeId(req);

    if (!companyId || !employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
      });
    }

    const records = await CompOff.find({
      companyId,
      employeeId,
    }).select(
      "recordType status creditedDays usedDays remainingDays"
    );

    const requestRecords = records.filter(
      (item) =>
        item.recordType === "Request" &&
        ["Approved", "Used"].includes(item.status)
    );

    const usageRecords = records.filter(
      (item) => item.recordType === "Usage"
    );

    const totalCredited = requestRecords.reduce(
      (sum, item) => sum + Number(item.creditedDays || 0),
      0
    );

    const totalUsed = usageRecords.reduce(
      (sum, item) => sum + Number(item.usedDays || 0),
      0
    );

    const balance = requestRecords.reduce(
      (sum, item) => sum + Number(item.remainingDays || 0),
      0
    );

    return res.status(200).json({
      success: true,
      totalCredited,
      totalUsed,
      balance: Math.max(0, balance),
    });
  } catch (error) {
    console.error("Get Comp-Off Balance Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Comp-Off balance.",
    });
  }
};


// =====================================================
// HR: GET PENDING REQUESTS
// GET /comp-off/pending
// =====================================================
export const getPendingCompOffRequests = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const employeeId = getEmployeeId(req);

    if (!companyId || !employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
      });
    }

    if (!(await isHR(employeeId, companyId))) {
      return res.status(403).json({
        success: false,
        message: "Only HR / Head Recruiter can view pending requests.",
      });
    }

    const requests = await CompOff.find({
      companyId,
      recordType: "Request",
      status: "Pending",
      employeeId: { $ne: employeeId },
    })
      .populate("employeeId", "name empId email departmentId roleId")
      .populate("workEntries.attendanceId")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pending requests.",
    });
  }
};


export const approveCompOffRequest = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const hrId = getEmployeeId(req);
    const { id } = req.params;

    if (!companyId || !hrId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
      });
    }

    if (!(await isHR(hrId, companyId))) {
      return res.status(403).json({
        success: false,
        message: "Only HR / Head Recruiter can approve Comp-Off.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Comp-Off request ID.",
      });
    }

    const request = await CompOff.findOne({
      _id: id,
      companyId,
      recordType: "Request",
      status: "Pending",
      employeeId: { $ne: hrId },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Pending Comp-Off request not found.",
      });
    }

    // Recheck attendance before approval.
    for (const entry of request.workEntries) {
      const attendance = await Attendance.findOne({
        _id: entry.attendanceId,
        employeeId: request.employeeId,
        companyId,
        attendanceDate: entry.workDate,
      });

      if (!attendance || !attendance.checkIn || !attendance.checkOut) {
        return res.status(400).json({
          success: false,
          message: `Attendance is missing for ${entry.workDate}.`,
        });
      }

      const actualMinutes = getActualMinutes(attendance);
      const workType = await getDayType(companyId, entry.workDate);

      const eligibleMinutes =
        workType === "Normal"
          ? Math.max(0, actualMinutes - MINUTES_PER_DAY)
          : actualMinutes;

      if (eligibleMinutes < entry.claimedMinutes) {
        return res.status(400).json({
          success: false,
          message: `Attendance duration changed for ${entry.workDate}. Please review the request again.`,
        });
      }
    }

    // Conditional update prevents approving the same request twice.
    const approvedRequest = await CompOff.findOneAndUpdate(
      {
        _id: id,
        companyId,
        recordType: "Request",
        status: "Pending",
      },
      {
        $set: {
          status: "Approved",
          creditedDays: 1,
          remainingDays: 1,
          usedDays: 0,
          verifiedBy: hrId,
          verifiedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!approvedRequest) {
      return res.status(409).json({
        success: false,
        message: "This Comp-Off request has already been processed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comp-Off approved. One day has been credited.",
      request: approvedRequest,
    });
  } catch (error) {
    console.error("Approve Comp-Off Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to approve Comp-Off.",
    });
  }
};


// =====================================================
// HR: REJECT REQUEST
// PATCH /comp-off/:id/reject
// body: { rejectionReason: "..." }
// =====================================================
export const rejectCompOffRequest = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const hrId = getEmployeeId(req);
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!companyId || !hrId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
      });
    }

    if (!(await isHR(hrId, companyId))) {
      return res.status(403).json({
        success: false,
        message: "Only HR / Head Recruiter can reject Comp-Off.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Comp-Off request ID.",
      });
    }

    const request = await CompOff.findOne({
      _id: id,
      companyId,
      recordType: "Request",
      status: "Pending",
      employeeId: { $ne: hrId },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Pending Comp-Off request not found.",
      });
    }

    request.status = "Rejected";
    request.rejectionReason = String(rejectionReason || "").trim();
    request.verifiedBy = hrId;
    request.verifiedAt = new Date();

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Comp-Off request rejected.",
      request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reject Comp-Off.",
    });
  }
};


export const useCompOffBalance = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const companyId = getCompanyId(req);
    const hrId = getEmployeeId(req);

    if (!companyId || !hrId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
      });
    }

    if (!(await isHR(hrId, companyId))) {
      return res.status(403).json({
        success: false,
        message: "Only HR / Head Recruiter can record Comp-Off usage.",
      });
    }

    const { employeeId, days, usageDate, remarks } = req.body;

    const requestedDays = Number(days);

    if (
      !employeeId ||
      !mongoose.Types.ObjectId.isValid(employeeId) ||
      ![0.5, 1].includes(requestedDays) ||
      !isValidDate(usageDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid employeeId, days (0.5 or 1), and usageDate are required.",
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
      status: "active",
    }).select("_id");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee not found in this company.",
      });
    }

    let usageRecords = [];
    let remainingBalance = 0;

    await session.withTransaction(async () => {
      // Get available approved earning records in FIFO order.
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

      if (availableBalance < requestedDays) {
        const error = new Error("Insufficient Comp-Off balance.");
        error.statusCode = 400;
        error.balance = availableBalance;
        throw error;
      }

      let daysToAllocate = requestedDays;
      const allocations = [];

      for (const earning of earningRecords) {
        if (daysToAllocate <= 0) break;

        const availableDays = Number(earning.remainingDays || 0);
        const allocatedDays = Math.min(
          availableDays,
          daysToAllocate
        );

        if (allocatedDays <= 0) continue;

        // Atomically reserve the days from this earning record.
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
              usedDays: allocatedDays,
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
            "Comp-Off balance changed during processing. Please try again."
          );
        }

        allocations.push({
          companyId,
          employeeId,
          recordType: "Usage",
          sourceCompOffId: earning._id,
          usedDays: allocatedDays,
          usageDate,
          remarks: String(remarks || "").trim(),
          createdBy: hrId,
          status: "Used",
        });

        daysToAllocate = Number(
          (daysToAllocate - allocatedDays).toFixed(2)
        );
      }

      if (daysToAllocate > 0) {
        throw new Error(
          "Unable to allocate the requested Comp-Off balance."
        );
      }

      usageRecords = await CompOff.create(allocations, {
        session,
      });

      remainingBalance = Number(
        (availableBalance - requestedDays).toFixed(2)
      );
    });

    return res.status(201).json({
      success: true,
      message: "Comp-Off usage recorded successfully.",
      usage:
        usageRecords.length === 1
          ? usageRecords[0]
          : usageRecords,
      balance: remainingBalance,
    });
  } catch (error) {
    console.error("Use Comp-Off Balance Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Failed to record Comp-Off usage.",
      ...(error.statusCode === 400
        ? { balance: error.balance }
        : {}),
    });
  } finally {
    await session.endSession();
  }
};

