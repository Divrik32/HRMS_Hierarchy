
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import Holiday from "../models/Holiday.js";
import CompOff from "../models/CompOff.js";

// =====================================================
// DATE HELPER - ASIA/KOLKATA
// =====================================================

const getIndiaDate = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;

  return `${year}-${month}-${day}`;
};

// =====================================================
// UTC DATE RANGE HELPERS
// CompOff leaveDate is stored as UTC midnight
// =====================================================

const getUTCStart = (dateString) => {
  return new Date(`${dateString}T00:00:00.000Z`);
};

const getUTCEndExclusive = (dateString) => {
  const date = getUTCStart(dateString);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
};

// =====================================================
// GET EMPLOYEE ABSENT DATES
// =====================================================

export const getAbsentDates = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { empId } = req.body;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Company authentication information missing.",
      });
    }

    if (!empId || !empId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required.",
      });
    }

    // Find employee inside authenticated company
    const employee = await Employee.findOne({
      empId: empId.trim().toUpperCase(),
      companyId,
    }).select("_id empId companyId createdAt");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const startDate = getIndiaDate(employee.createdAt);
    const today = getIndiaDate(new Date());

    const startUTC = getUTCStart(startDate);
    const endUTC = getUTCEndExclusive(today);

    // -------------------------------------------------
    // FETCH ATTENDANCE
    // -------------------------------------------------

    const attendanceRecords = await Attendance.find({
      employeeId: employee._id,
      companyId,
      attendanceDate: {
        $gte: startDate,
        $lte: today,
      },
    }).select("attendanceDate");

    const attendanceDates = new Set(
      attendanceRecords.map((record) => record.attendanceDate)
    );

    // -------------------------------------------------
    // FETCH COMPANY HOLIDAYS
    // -------------------------------------------------

    const holidays = await Holiday.find({
      companyId,
      date: {
        $gte: startUTC,
        $lt: endUTC,
      },
    }).select("date");

    const holidayDates = new Set(
      holidays.map((holiday) => getIndiaDate(holiday.date))
    );

    // -------------------------------------------------
    // FETCH THIS EMPLOYEE'S APPROVED COMP-OFFS
    // -------------------------------------------------

    const approvedCompOffs = await CompOff.find({
      companyId,
      employeeId: employee._id,
      status: "Approved",
      leaveDate: {
        $gte: startUTC,
        $lt: endUTC,
      },
    }).select("leaveDate");

    const approvedCompOffDates = new Set(
      approvedCompOffs.map((compOff) =>
        getIndiaDate(compOff.leaveDate)
      )
    );

    // -------------------------------------------------
    // CALCULATE ABSENT DATES
    // -------------------------------------------------

    const absentDates = [];

    const currentDate = getUTCStart(startDate);
    const endDate = getUTCStart(today);

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().slice(0, 10);

      const isSunday = currentDate.getUTCDay() === 0;
      const hasAttendance = attendanceDates.has(dateString);
      const isHoliday = holidayDates.has(dateString);
      const hasApprovedCompOff =
        approvedCompOffDates.has(dateString);

      if (
        !isSunday &&
        !isHoliday &&
        !hasAttendance &&
        !hasApprovedCompOff
      ) {
        absentDates.push(dateString);
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return res.status(200).json({
      success: true,
      message: "Absent dates fetched successfully.",
      employee: {
        empId: employee.empId,
        employeeId: employee._id,
      },
      totalAbsentDays: absentDates.length,
      absentDates,
    });
  } catch (error) {
    console.error("Get Absent Dates Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch absent dates.",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL EMPLOYEES ABSENT DATES
// =====================================================

export const getAllEmployeesAbsentDates = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Company authentication information missing.",
      });
    }

    // Fetch all employees of authenticated company
    const employees = await Employee.find({ companyId })
      .select("_id name empId createdAt")
      .lean();

    if (!employees.length) {
      return res.status(200).json({
        success: true,
        message: "No employees found.",
        totalEmployees: 0,
        totalAbsentDays: 0,
        employees: [],
      });
    }

    const today = getIndiaDate(new Date());

    // Find earliest employee creation date
    const earliestDate = employees.reduce((earliest, employee) => {
      const employeeDate = getIndiaDate(employee.createdAt);

      return employeeDate < earliest ? employeeDate : earliest;
    }, today);

    const startUTC = getUTCStart(earliestDate);
    const endUTC = getUTCEndExclusive(today);

    // -------------------------------------------------
    // FETCH COMPANY ATTENDANCE
    // -------------------------------------------------

    const attendanceRecords = await Attendance.find({
      companyId,
      attendanceDate: {
        $gte: earliestDate,
        $lte: today,
      },
    })
      .select("employeeId attendanceDate")
      .lean();

    const attendanceSet = new Set(
      attendanceRecords.map(
        (record) =>
          `${record.employeeId.toString()}_${record.attendanceDate}`
      )
    );

    // -------------------------------------------------
    // FETCH COMPANY HOLIDAYS
    // -------------------------------------------------

    const holidays = await Holiday.find({
      companyId,
      date: {
        $gte: startUTC,
        $lt: endUTC,
      },
    })
      .select("date")
      .lean();

    const holidayDates = new Set(
      holidays.map((holiday) => getIndiaDate(holiday.date))
    );

    // -------------------------------------------------
    // FETCH ALL APPROVED COMPANY COMP-OFFS
    // -------------------------------------------------

    const approvedCompOffs = await CompOff.find({
      companyId,
      status: "Approved",
      leaveDate: {
        $gte: startUTC,
        $lt: endUTC,
      },
    })
      .select("employeeId leaveDate")
      .lean();

    // Employee-wise approved Comp-Off lookup
    const approvedCompOffSet = new Set(
      approvedCompOffs.map(
        (compOff) =>
          `${compOff.employeeId.toString()}_${getIndiaDate(
            compOff.leaveDate
          )}`
      )
    );

    // -------------------------------------------------
    // CALCULATE ABSENT DATES FOR EVERY EMPLOYEE
    // -------------------------------------------------

    const employeeResults = employees.map((employee) => {
      const startDate = getIndiaDate(employee.createdAt);

      const currentDate = getUTCStart(startDate);
      const endDate = getUTCStart(today);

      const absentDates = [];

      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().slice(0, 10);

        const employeeDateKey =
          `${employee._id.toString()}_${dateString}`;

        const isSunday = currentDate.getUTCDay() === 0;
        const isHoliday = holidayDates.has(dateString);
        const hasAttendance = attendanceSet.has(employeeDateKey);

        const hasApprovedCompOff =
          approvedCompOffSet.has(employeeDateKey);

        if (
          !isSunday &&
          !isHoliday &&
          !hasAttendance &&
          !hasApprovedCompOff
        ) {
          absentDates.push(dateString);
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      return {
        employeeId: employee._id,
        name: employee.name,
        empId: employee.empId,
        totalAbsentDays: absentDates.length,
        absentDates,
      };
    });

    return res.status(200).json({
      success: true,
      message: "All employees absent dates fetched successfully.",
      totalEmployees: employeeResults.length,
      totalAbsentDays: employeeResults.reduce(
        (total, employee) => total + employee.totalAbsentDays,
        0
      ),
      employees: employeeResults,
    });
  } catch (error) {
    console.error("Get All Employees Absent Dates Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch all employees absent dates.",
      error: error.message,
    });
  }
};