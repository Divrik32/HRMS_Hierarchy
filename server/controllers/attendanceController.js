import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";


const getCompanyId = (req) => {
  const companyId =
    req.user?.role === "superadmin"
      ? req.companyId
      : req.user?.role === "employee"
        ? req.user?.companyId
        : null;

  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    return null;
  }

  return companyId;
};

// Get today's date in India timezone
const getTodayDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

// =====================================================
// GET ATTENDANCE VIEWER ACCESS
// HR / HEAD RECRUITER / SUPER ADMIN = COMPANY-WIDE
// ORDINARY EMPLOYEE = OWN ATTENDANCE ONLY
// =====================================================
const getAttendanceViewer = async (req, companyId) => {
  // Super Admin can view all employees in selected company.
  if (req.user?.role === "superadmin") {
    return {
      success: true,
      isCompanyWide: true,
      employee: null,
    };
  }

  if (req.user?.role !== "employee" || !req.user?.id) {
    return {
      success: false,
      status: 403,
      message: "You are not authorized to view attendance.",
    };
  }

  const employee = await Employee.findOne({
    _id: req.user.id,
    companyId,
    status: "active",
  })
    .select("name empId email departmentId roleId")
    .populate("departmentId", "departmentName")
    .populate("roleId", "roleName");

  if (!employee) {
    return {
      success: false,
      status: 404,
      message: "Active employee not found.",
    };
  }

  const roleName = employee.roleId?.roleName
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const isHR = ["hr", "head recruiter"].includes(roleName);

  return {
    success: true,
    isCompanyWide: isHR,
    employee,
  };
};

// =====================================================
// CHECK IN — LOGGED-IN EMPLOYEE
// =====================================================
export const checkIn = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Valid company information is required.",
      });
    }

    let employeeId;

    if (req.user?.role === "employee") {
      employeeId = req.user.id;
    } else if (req.user?.role === "superadmin") {
      employeeId = req.body.employeeId;

      if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Valid employee ID is required.",
        });
      }
    }

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
      status: "active",
    }).select("_id companyId status");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee not found in this company.",
      });
    }

    const attendanceDate = getTodayDate();

    const existingAttendance = await Attendance.findOne({
      employeeId: employee._id,
      companyId,
      attendanceDate,
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: "You have already checked in today.",
        attendance: existingAttendance,
      });
    }

    const attendance = await Attendance.create({
      employeeId: employee._id,
      companyId,
      attendanceDate,
      checkIn: new Date(),
      status: "Incomplete",
    });

    return res.status(201).json({
      success: true,
      message: "Check-in successful.",
      attendance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already checked in today.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check in.",
    });
  }
};

// =====================================================
// CHECK OUT — LOGGED-IN EMPLOYEE
// =====================================================
export const checkOut = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Valid company information is required.",
      });
    }

    let employeeId;

    if (req.user?.role === "employee") {
      employeeId = req.user.id;
    } else if (req.user?.role === "superadmin") {
      employeeId = req.body.employeeId;

      if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Valid employee ID is required.",
        });
      }
    }

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
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

    const attendanceDate = getTodayDate();

    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      companyId,
      attendanceDate,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Please check in before checking out.",
      });
    }

    if (attendance.checkOut) {
      return res.status(409).json({
        success: false,
        message: "You have already checked out today.",
        attendance,
      });
    }

    attendance.checkOut = new Date();
    attendance.status = "Present";

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Check-out successful.",
      attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check out.",
    });
  }
};

// =====================================================
// GET ATTENDANCE BY DATE
// HR / HEAD RECRUITER / SUPER ADMIN = COMPANY-WIDE
// ORDINARY EMPLOYEE = OWN ATTENDANCE ONLY
// =====================================================
// =====================================================
// GET ATTENDANCE BY DATE
// HR / HEAD RECRUITER / SUPER ADMIN = COMPANY-WIDE
// ORDINARY EMPLOYEE = OWN ATTENDANCE ONLY
// =====================================================
export const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.query;
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Valid company information is required.",
      });
    }

    const isValidDate = (value) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const parsedDate = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === value
      );
    };

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date in YYYY-MM-DD format.",
      });
    }

    const viewer = await getAttendanceViewer(req, companyId);

    if (!viewer.success) {
      return res.status(viewer.status).json({
        success: false,
        message: viewer.message,
      });
    }

    // STEP 1: Get employees according to viewer permission.
    let employees = [];

    if (viewer.isCompanyWide) {
      employees = await Employee.find({
        companyId,
        status: "active",
      })
        .select("name empId email departmentId roleId")
        .populate("departmentId", "departmentName")
        .populate("roleId", "roleName")
        .sort({ name: 1 });
    } else {
      employees = [viewer.employee];
    }

    // STEP 2: Get attendance records.
    const employeeIds = employees.map((employee) => employee._id);

    const attendanceRecords = await Attendance.find({
      companyId,
      attendanceDate: date,
      employeeId: {
        $in: employeeIds,
      },
    });

    // STEP 3: Create attendance map.
    const attendanceMap = new Map();

    attendanceRecords.forEach((attendance) => {
      attendanceMap.set(
        String(attendance.employeeId),
        attendance
      );
    });

    // STEP 4: Create final records.
    const records = employees.map((employee) => {
      const attendance = attendanceMap.get(
        String(employee._id)
      ) || null;

      return {
        employee,
        attendance,
        checkIn: attendance?.checkIn || null,
        checkOut: attendance?.checkOut || null,
        status: !attendance
          ? "Not Checked In"
          : attendance.checkOut
            ? "Checked Out"
            : "Checked In",
      };
    });

    return res.status(200).json({
      success: true,
      isCompanyWide: viewer.isCompanyWide,
      date,
      totalEmployees: employees.length,
      checkedIn: records.filter((item) => item.checkIn).length,
      checkedOut: records.filter((item) => item.checkOut).length,
      notCheckedIn: records.filter((item) => !item.checkIn).length,
      records,
    });
  } catch (error) {
    console.error("Get Attendance By Date Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch attendance.",
    });
  }
};

// =====================================================
// GET MY ATTENDANCE — LOGGED-IN EMPLOYEE
// =====================================================
export const getMyAttendance = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Valid company information is required.",
      });
    }

    let employeeId;

    if (req.user?.role === "employee") {
      employeeId = req.user.id;
    } else if (req.user?.role === "superadmin") {
      employeeId = req.query.employeeId;

      if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Valid employee ID is required.",
        });
      }
    }

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
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

    const attendance = await Attendance.find({
      employeeId: employee._id,
      companyId,
    }).sort({ attendanceDate: -1 });

    return res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch attendance.",
    });
  }
};


// =====================================================
// GET ATTENDANCE BY DATE RANGE
// startDate and endDate are inclusive
// HR / HEAD RECRUITER / SUPER ADMIN = COMPANY-WIDE
// ORDINARY EMPLOYEE = OWN ATTENDANCE ONLY
// =====================================================
export const getAttendanceByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Valid company information is required.",
      });
    }

    const isValidDate = (value) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const parsedDate = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === value
      );
    };

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid startDate and endDate in YYYY-MM-DD format.",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date.",
      });
    }

    const viewer = await getAttendanceViewer(req, companyId);

    if (!viewer.success) {
      return res.status(viewer.status).json({
        success: false,
        message: viewer.message,
      });
    }

    // STEP 1: Get employees according to viewer permission.
    let employees = [];

    if (viewer.isCompanyWide) {
      employees = await Employee.find({
        companyId,
        status: "active",
      })
        .select("name empId email departmentId roleId")
        .populate("departmentId", "departmentName")
        .populate("roleId", "roleName")
        .sort({ name: 1 });
    } else {
      employees = [viewer.employee];
    }

    // STEP 2: Get employee IDs.
    const employeeIds = employees.map((employee) => employee._id);

    // STEP 3: Get attendance records for selected date range.
    const attendanceRecords = await Attendance.find({
      companyId,
      employeeId: {
        $in: employeeIds,
      },
      attendanceDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({
      attendanceDate: 1,
    });

    // STEP 4: Group attendance records by employee.
    const attendanceMap = new Map();

    attendanceRecords.forEach((attendance) => {
      const employeeKey = String(attendance.employeeId);

      if (!attendanceMap.has(employeeKey)) {
        attendanceMap.set(employeeKey, []);
      }

      attendanceMap.get(employeeKey).push(attendance);
    });

    // STEP 5: Create final records.
    const records = employees.map((employee) => {
      const attendance =
        attendanceMap.get(String(employee._id)) || [];

      return {
        employee,
        attendance,
        totalAttendanceDays: attendance.length,
        checkedInDays: attendance.filter(
          (item) => item.checkIn
        ).length,
        checkedOutDays: attendance.filter(
          (item) => item.checkOut
        ).length,
      };
    });

    return res.status(200).json({
      success: true,
      isCompanyWide: viewer.isCompanyWide,
      startDate,
      endDate,
      totalEmployees: employees.length,
      totalAttendanceRecords: attendanceRecords.length,
      records,
    });
  } catch (error) {
    console.error("Get Attendance By Date Range Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to fetch attendance by date range.",
    });
  }
};


// =====================================================
// GET ATTENDANCE BY MONTH
// month: 1-12, year: YYYY
// HR / HEAD RECRUITER / SUPER ADMIN = COMPANY-WIDE
// ORDINARY EMPLOYEE = OWN ATTENDANCE ONLY
// =====================================================
export const getAttendanceByMonth = async (req, res) => {
  try {
    const { month, year } = req.query;
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Valid company information is required.",
      });
    }

    const selectedMonth = Number(month);
    const selectedYear = Number(year);

    if (
      !month ||
      !year ||
      !Number.isInteger(selectedMonth) ||
      selectedMonth < 1 ||
      selectedMonth > 12 ||
      !Number.isInteger(selectedYear) ||
      selectedYear < 1000 ||
      selectedYear > 9999
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid month (1-12) and year.",
      });
    }

    // STEP 1: Calculate month date range.
    const monthString = String(selectedMonth).padStart(2, "0");

    const startDate = `${selectedYear}-${monthString}-01`;

    const lastDay = new Date(
      Date.UTC(selectedYear, selectedMonth, 0)
    ).getUTCDate();

    const endDate =
      `${selectedYear}-${monthString}-${String(lastDay).padStart(2, "0")}`;

    // STEP 2: Check viewer permission.
    const viewer = await getAttendanceViewer(req, companyId);

    if (!viewer.success) {
      return res.status(viewer.status).json({
        success: false,
        message: viewer.message,
      });
    }

    // STEP 3: Get employees according to viewer permission.
    let employees = [];

    if (viewer.isCompanyWide) {
      employees = await Employee.find({
        companyId,
        status: "active",
      })
        .select("name empId email departmentId roleId")
        .populate("departmentId", "departmentName")
        .populate("roleId", "roleName")
        .sort({ name: 1 });
    } else {
      employees = [viewer.employee];
    }

    // STEP 4: Get employee IDs.
    const employeeIds = employees.map((employee) => employee._id);

    // STEP 5: Get monthly attendance records.
    const attendanceRecords = await Attendance.find({
      companyId,
      employeeId: {
        $in: employeeIds,
      },
      attendanceDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({
      attendanceDate: 1,
    });

    // STEP 6: Group attendance records by employee.
    const attendanceMap = new Map();

    attendanceRecords.forEach((attendance) => {
      const employeeKey = String(attendance.employeeId);

      if (!attendanceMap.has(employeeKey)) {
        attendanceMap.set(employeeKey, []);
      }

      attendanceMap.get(employeeKey).push(attendance);
    });

    // STEP 7: Create final records.
    const records = employees.map((employee) => {
      const attendance =
        attendanceMap.get(String(employee._id)) || [];

      return {
        employee,
        attendance,
        totalAttendanceDays: attendance.length,
        checkedInDays: attendance.filter(
          (item) => item.checkIn
        ).length,
        checkedOutDays: attendance.filter(
          (item) => item.checkOut
        ).length,
      };
    });

    return res.status(200).json({
      success: true,
      isCompanyWide: viewer.isCompanyWide,
      month: selectedMonth,
      year: selectedYear,
      startDate,
      endDate,
      totalDays: lastDay,
      totalEmployees: employees.length,
      totalAttendanceRecords: attendanceRecords.length,
      records,
    });
  } catch (error) {
    console.error("Get Attendance By Month Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Failed to fetch monthly attendance.",
    });
  }
};

// =====================================================
// HR UPDATE / ADD EMPLOYEE ATTENDANCE TIME
// =====================================================
export const updateEmployeeAttendanceTime = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Valid company information is required.",
      });
    }

    // Only HR / Head Recruiter employee can update attendance.
    if (req.user?.role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "Only HR can modify employee attendance.",
      });
    }

    const hr = await Employee.findOne({
      _id: req.user.id,
      companyId,
      status: "active",
    })
      .populate("roleId", "roleName")
      .select("_id roleId");

    const roleName = hr?.roleId?.roleName?.trim().toLowerCase();

    if (!hr || !["hr", "head recruiter"].includes(roleName)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify attendance.",
      });
    }

    const { employeeId, date, checkInTime, checkOutTime } = req.body;

    if (
      !employeeId ||
      !mongoose.Types.ObjectId.isValid(employeeId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid employee ID is required.",
      });
    }

    // Validate date
    const isValidDate = (value) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const parsed = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
      );
    };

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Valid date in YYYY-MM-DD format is required.",
      });
    }

    // At least one time must be provided.
    if (checkInTime === undefined && checkOutTime === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide check-in or check-out time.",
      });
    }

    // Validate time format
    const isValidTime = (value) =>
      typeof value === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

    if (
      checkInTime !== undefined &&
      !isValidTime(checkInTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid check-in time. Use HH:mm format.",
      });
    }

    if (
      checkOutTime !== undefined &&
      !isValidTime(checkOutTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid check-out time. Use HH:mm format.",
      });
    }

    // Verify employee belongs to the same company.
    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
      status: "active",
    }).select("_id name empId");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee not found in this company.",
      });
    }

    // Convert India local date and time into Date objects.
    const createIndiaDateTime = (time) => {
      if (time === null) return null;

      return new Date(`${date}T${time}:00+05:30`);
    };

    // Find existing attendance or create a new one.
    let attendance = await Attendance.findOne({
      employeeId: employee._id,
      companyId,
      attendanceDate: date,
    });

    if (!attendance) {
      attendance = new Attendance({
        employeeId: employee._id,
        companyId,
        attendanceDate: date,
      });
    }

    // Update only the fields provided by HR.
    if (checkInTime !== undefined) {
      attendance.checkIn = createIndiaDateTime(checkInTime);
    }

    if (checkOutTime !== undefined) {
      attendance.checkOut = createIndiaDateTime(checkOutTime);
    }

    // Checkout cannot be earlier than or equal to check-in.
    if (
      attendance.checkIn &&
      attendance.checkOut &&
      attendance.checkOut <= attendance.checkIn
    ) {
      return res.status(400).json({
        success: false,
        message: "Check-out time must be later than check-in time.",
      });
    }

    attendance.status = attendance.checkOut
      ? "Present"
      : "Incomplete";

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Employee attendance updated successfully.",
      employee: {
        employeeId: employee._id,
        name: employee.name,
        empId: employee.empId,
      },
      attendance,
    });
  } catch (error) {
    console.error("Update Employee Attendance Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update employee attendance.",
    });
  }
};

// =====================================================
// GET LAST 18 CHECK-IN DAYS WORKING HOURS REPORT
// EMPLOYEE = OWN REPORT
// SUPER ADMIN = SELECTED EMPLOYEE REPORT
// =====================================================
export const getLast18DaysWorkingReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Valid company information is required.",
      });
    }

    let employeeId;

    // Logged-in employee
    if (req.user?.role === "employee") {
      employeeId = req.user.id;
    }

    // Super Admin
    else if (req.user?.role === "superadmin") {
      employeeId = req.query.employeeId || req.body.employeeId;

      if (
        !employeeId ||
        !mongoose.Types.ObjectId.isValid(employeeId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid employee ID is required.",
        });
      }
    }

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: "Employee authentication required.",
      });
    }

    // Verify employee belongs to this company
    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
      status: "active",
    }).select("_id name empId");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee not found in this company.",
      });
    }

    // Get attendance records where check-in exists.
    // Null check-in records will NOT be included.
    const attendanceRecords = await Attendance.find({
      employeeId: employee._id,
      companyId,
      checkIn: {
        $ne: null,
        $exists: true,
      },
    })
      .sort({
        attendanceDate: -1,
        checkIn: -1,
      })
      .limit(18)
      .lean();

    const now = new Date();

    // India current date
    const today = getTodayDate();

    const records = attendanceRecords.map((attendance) => {
      const checkIn = attendance.checkIn
        ? new Date(attendance.checkIn)
        : null;

      const checkOut = attendance.checkOut
        ? new Date(attendance.checkOut)
        : null;

      let workingMinutes = null;
      let isRunning = false;

const TIFFIN_BREAK_MINUTES = 45;

if (checkIn && checkOut) {
  const totalMinutes = Math.floor(
    (checkOut.getTime() - checkIn.getTime()) / 60000
  );

  workingMinutes = Math.max(
    0,
    totalMinutes - TIFFIN_BREAK_MINUTES
  );
}

// Today's attendance is still running
else if (
  checkIn &&
  !checkOut &&
  attendance.attendanceDate === today
) {
  const totalMinutes = Math.floor(
    (now.getTime() - checkIn.getTime()) / 60000
  );

  workingMinutes = Math.max(
    0,
    totalMinutes - TIFFIN_BREAK_MINUTES
  );

  isRunning = true;
}

      const hours = workingMinutes !== null
        ? Math.floor(workingMinutes / 60)
        : null;

      const minutes = workingMinutes !== null
        ? workingMinutes % 60
        : null;

      return {
        attendanceId: attendance._id,
        attendanceDate: attendance.attendanceDate,
        checkIn,
        checkOut,
        workingMinutes,
        workingHours: workingMinutes !== null
          ? `${hours}h ${String(minutes).padStart(2, "0")}m`
          : null,
        decimalHours: workingMinutes !== null
          ? Number((workingMinutes / 60).toFixed(2))
          : null,
        isRunning,
        status: isRunning
          ? "Running"
          : checkOut
            ? "Completed"
            : "Incomplete",
      };
    });

    // Reverse so the graph shows oldest → newest
    records.reverse();

    // Summary calculations
    const completedRecords = records.filter(
      (record) => record.workingMinutes !== null
    );

    const totalWorkingMinutes = completedRecords.reduce(
      (total, record) => total + record.workingMinutes,
      0
    );

    const averageWorkingMinutes =
      completedRecords.length > 0
        ? Math.round(
            totalWorkingMinutes / completedRecords.length
          )
        : 0;

    const daysAtLeast8Hours = completedRecords.filter(
      (record) => record.workingMinutes >= 480
    ).length;

    const daysUnder8Hours = completedRecords.filter(
      (record) => record.workingMinutes < 480
    ).length;

    const formatMinutes = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
    };

    return res.status(200).json({
      success: true,
      employee: {
        _id: employee._id,
        name: employee.name,
        empId: employee.empId,
      },

      totalDays: records.length,

      totalWorkingMinutes,
      totalWorkingHours: formatMinutes(totalWorkingMinutes),

      averageWorkingMinutes,
      averageWorkingHours: formatMinutes(
        averageWorkingMinutes
      ),

      daysAtLeast8Hours,
      daysUnder8Hours,

      targetHours: 8,

      records,
    });
  } catch (error) {
    console.error(
      "Get Last 18 Days Working Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch last 18 days working report.",
    });
  }
};