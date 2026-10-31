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