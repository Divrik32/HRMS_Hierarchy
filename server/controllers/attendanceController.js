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
// GET ATTENDANCE BY DATE — COMPANY
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

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Please provide date in YYYY-MM-DD format.",
      });
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date.",
      });
    }

    const employees = await Employee.find({
      companyId,
      status: "active",
    })
      .select("name empId email departmentId roleId")
      .populate("departmentId", "departmentName")
      .populate("roleId", "roleName")
      .sort({ name: 1 });

    const attendanceRecords = await Attendance.find({
      companyId,
      attendanceDate: date,
    });

    const attendanceMap = new Map(
      attendanceRecords.map((record) => [
        String(record.employeeId),
        record,
      ])
    );

    const records = employees.map((employee) => {
      const attendance = attendanceMap.get(String(employee._id));

      return {
        employee,
        attendance: attendance || null,
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
      date,
      totalEmployees: employees.length,
      checkedIn: records.filter((item) => item.checkIn).length,
      checkedOut: records.filter((item) => item.checkOut).length,
      notCheckedIn: records.filter((item) => !item.checkIn).length,
      records,
    });
  } catch (error) {
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
// GET ATTENDANCE BY DATE RANGE — COMPANY
// startDate and endDate are inclusive
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

    const isValidDate = (date) => {
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
      }

      const parsedDate = new Date(`${date}T00:00:00.000Z`);

      return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date
      );
    };

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid startDate and endDate in YYYY-MM-DD format.",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date.",
      });
    }

    const employees = await Employee.find({
      companyId,
      status: "active",
    })
      .select("name empId email departmentId roleId")
      .populate("departmentId", "departmentName")
      .populate("roleId", "roleName")
      .sort({ name: 1 });

    const attendanceRecords = await Attendance.find({
      companyId,
      attendanceDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ attendanceDate: 1 });

    const attendanceMap = new Map();

    attendanceRecords.forEach((record) => {
      const employeeKey = String(record.employeeId);

      if (!attendanceMap.has(employeeKey)) {
        attendanceMap.set(employeeKey, []);
      }

      attendanceMap.get(employeeKey).push(record);
    });

    const records = employees.map((employee) => {
      const attendance = attendanceMap.get(String(employee._id)) || [];

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
      startDate,
      endDate,
      totalEmployees: employees.length,
      totalAttendanceRecords: attendanceRecords.length,
      records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch attendance by date range.",
    });
  }
};


// =====================================================
// GET ATTENDANCE BY MONTH — COMPANY
// month: 1-12, year: YYYY
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

    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;

    const lastDay = new Date(
      Date.UTC(selectedYear, selectedMonth, 0)
    ).getUTCDate();

    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const employees = await Employee.find({
      companyId,
      status: "active",
    })
      .select("name empId email departmentId roleId")
      .populate("departmentId", "departmentName")
      .populate("roleId", "roleName")
      .sort({ name: 1 });

    const attendanceRecords = await Attendance.find({
      companyId,
      attendanceDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ attendanceDate: 1 });

    const attendanceMap = new Map();

    attendanceRecords.forEach((record) => {
      const employeeKey = String(record.employeeId);

      if (!attendanceMap.has(employeeKey)) {
        attendanceMap.set(employeeKey, []);
      }

      attendanceMap.get(employeeKey).push(record);
    });

    const records = employees.map((employee) => {
      const attendance = attendanceMap.get(String(employee._id)) || [];

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
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch monthly attendance.",
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
