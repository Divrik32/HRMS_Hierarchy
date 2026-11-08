import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import Holiday from "../models/Holiday.js";

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
// GET EMPLOYEE ABSENT DATES
// =====================================================

export const getAbsentDates = async (req, res) => {
  try {
    const { empId } = req.body;

    if (!empId || !empId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required.",
      });
    }

    // Find employee
    const employee = await Employee.findOne({
      empId: empId.trim().toUpperCase(),
    }).select("_id empId companyId createdAt");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Employee joining/creation date to today's date
    const startDate = getIndiaDate(employee.createdAt);
    const today = getIndiaDate(new Date());

    // Fetch attendance records
    const attendanceRecords = await Attendance.find({
      employeeId: employee._id,
      attendanceDate: {
        $gte: startDate,
        $lte: today,
      },
    }).select("attendanceDate");

    // Store attendance dates in Set
    const attendanceDates = new Set(
      attendanceRecords.map((record) => record.attendanceDate)
    );

    // Fetch company holidays within the date range
    const holidays = await Holiday.find({
      companyId: employee.companyId,
      date: {
        $gte: new Date(`${startDate}T00:00:00.000Z`),
        $lte: new Date(`${today}T23:59:59.999Z`),
      },
    }).select("date");

    // Store holiday dates in Set
    const holidayDates = new Set(
      holidays.map((holiday) => getIndiaDate(holiday.date))
    );

    const absentDates = [];

    // Check every date from employee creation to today
    const currentDate = new Date(`${startDate}T00:00:00.000Z`);
    const endDate = new Date(`${today}T00:00:00.000Z`);

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().slice(0, 10);

      // Sunday check
      const isSunday = currentDate.getUTCDay() === 0;

      // Attendance check
      const hasAttendance = attendanceDates.has(dateString);

      // Holiday check
      const isHoliday = holidayDates.has(dateString);

      // If Sunday, holiday or attendance exists, skip
      if (!isSunday && !isHoliday && !hasAttendance) {
        absentDates.push(dateString);
      }

      // Next day
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


export const getAllEmployeesAbsentDates = async (req, res) => {
  try {
    const companyId = req.companyId;

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

    // Earliest employee creation date
    const earliestDate = employees.reduce((earliest, employee) => {
      const employeeDate = getIndiaDate(employee.createdAt);

      return employeeDate < earliest ? employeeDate : earliest;
    }, today);

    // Fetch all attendance records of this company
    const attendanceRecords = await Attendance.find({
      companyId,
      attendanceDate: {
        $gte: earliestDate,
        $lte: today,
      },
    })
      .select("employeeId attendanceDate")
      .lean();

    // Employee-wise attendance lookup
    const attendanceSet = new Set(
      attendanceRecords.map(
        (record) =>
          `${record.employeeId.toString()}_${record.attendanceDate}`
      )
    );

    // Fetch company holidays
    const holidays = await Holiday.find({
      companyId,
      date: {
        $gte: new Date(`${earliestDate}T00:00:00.000Z`),
        $lte: new Date(`${today}T23:59:59.999Z`),
      },
    })
      .select("date")
      .lean();

    const holidayDates = new Set(
      holidays.map((holiday) => getIndiaDate(holiday.date))
    );

    // Generate absent dates for every employee
    const employeeResults = employees.map((employee) => {
      const startDate = getIndiaDate(employee.createdAt);

      const currentDate = new Date(`${startDate}T00:00:00.000Z`);
      const endDate = new Date(`${today}T00:00:00.000Z`);

      const absentDates = [];

      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().slice(0, 10);

        const isSunday = currentDate.getUTCDay() === 0;

        const isHoliday = holidayDates.has(dateString);

        const hasAttendance = attendanceSet.has(
          `${employee._id.toString()}_${dateString}`
        );

        if (!isSunday && !isHoliday && !hasAttendance) {
          absentDates.push(dateString);
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      return {
        employeeId: employee._id,
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
