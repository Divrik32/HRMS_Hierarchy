import mongoose from "mongoose";

import Holiday from "../models/Holiday.js";
import Employee from "../models/Employee.js";


// =====================================================
// COMMON HELPERS
// =====================================================

const getId = (value) => {
  if (!value) return "";

  return String(
    value._id ||
    value.id ||
    value
  );
};


const getUser = (req) => {
  return req.user || req.employee || req.superAdmin || {};
};


const getUserId = (req) => {
  const user = getUser(req);

  return getId(
    user._id ||
    user.id ||
    user.employeeId ||
    user.superAdminId
  );
};


const getUserRole = (req) => {
  const user = getUser(req);

  return String(
    user.role ||
    user.userRole ||
    user.accountType ||
    ""
  ).toLowerCase();
};


const isSuperAdmin = (req) => {
  const role = getUserRole(req);

  return [
    "superadmin",
    "super_admin",
    "super admin",
  ].includes(role);
};


// =====================================================
// CHECK HOLIDAY MANAGEMENT ACCESS
// SUPER ADMIN / HR / HEAD RECRUITER
// =====================================================

const checkHolidayAccess = async (req) => {
  const user = getUser(req);
  const userId = getUserId(req);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return {
      allowed: false,
      message: "Invalid user authentication.",
    };
  }

  // Super Admin
  if (isSuperAdmin(req)) {
    return {
      allowed: true,
      userId,
      userType: "superadmin",
    };
  }

  // Employee
  const employee = await Employee.findById(userId)
    .populate("roleId", "roleName")
    .select("_id companyId roleId status");

  if (!employee) {
    return {
      allowed: false,
      message: "Employee not found.",
    };
  }

  if (employee.status !== "active") {
    return {
      allowed: false,
      message: "Your employee account is inactive.",
    };
  }

  const roleName = employee.roleId?.roleName?.trim();

  if (!["HR", "Head Recruiter"].includes(roleName)) {
    return {
      allowed: false,
      message: "You are not authorized to manage holidays.",
    };
  }

  return {
    allowed: true,
    userId: String(employee._id),
    userType: "employee",
    companyId: String(employee.companyId),
  };
};


// =====================================================
// GET COMPANY ID
// =====================================================

const getCompanyId = (req, access) => {
  const user = getUser(req);

  if (access.userType === "employee") {
    return access.companyId;
  }

  return getId(
    req.params.companyId ||
    req.body.companyId ||
    user.companyId
  );
};


// =====================================================
// VALIDATE COMPANY ID
// =====================================================

const validateCompanyId = (companyId) => {
  return Boolean(
    companyId &&
    mongoose.Types.ObjectId.isValid(companyId)
  );
};


// =====================================================
// NORMALIZE DATE
// Date format: YYYY-MM-DD
// =====================================================

const normalizeDate = (value) => {
  if (typeof value !== "string") return null;

  const dateString = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }

  const date = new Date(`${dateString}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateString
  ) {
    return null;
  }

  return date;
};


// =====================================================
// CHECK FUTURE DATE
// Today and previous dates are not allowed.
// =====================================================

const isFutureDate = (dateString) => {
  const tomorrow = new Date();

  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  return dateString >= tomorrow.toISOString().slice(0, 10);
};


// =====================================================
// 1. CREATE MULTIPLE HOLIDAYS
// POST /api/holidays/:companyId
// =====================================================

export const createHolidays = async (req, res) => {
  try {
    const access = await checkHolidayAccess(req);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message,
      });
    }

    const companyId = getCompanyId(req, access);

    if (!validateCompanyId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
    }

    const { holidays } = req.body;

    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one holiday.",
      });
    }

    const preparedHolidays = [];
    const seenDates = new Set();

    for (const item of holidays) {
      const holidayName = String(
        item.holidayName || ""
      ).trim();

      const dateString = String(item.date || "").trim();

      if (!holidayName) {
        return res.status(400).json({
          success: false,
          message: "Holiday name is required.",
        });
      }

      const date = normalizeDate(dateString);

      if (!date) {
        return res.status(400).json({
          success: false,
          message: `Invalid date: ${dateString}`,
        });
      }

      if (!isFutureDate(dateString)) {
        return res.status(400).json({
          success: false,
          message: `Holiday cannot be created for today or a past date: ${dateString}`,
        });
      }

      if (seenDates.has(dateString)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate date selected: ${dateString}`,
        });
      }

      seenDates.add(dateString);

      preparedHolidays.push({
        companyId,
        holidayName,
        date,
        description: String(item.description || "").trim(),
        createdBy: access.userId,
        createdByRole: access.userType,
      });
    }

    // Check dates already marked as holidays
    const dates = preparedHolidays.map((item) => item.date);

    const existingHolidays = await Holiday.find({
      companyId,
      date: { $in: dates },
    }).select("date");

    if (existingHolidays.length > 0) {
      const existingDates = existingHolidays.map((item) =>
        item.date.toISOString().slice(0, 10)
      );

      return res.status(409).json({
        success: false,
        message: "Some selected dates are already marked as holidays.",
        existingDates,
      });
    }

    const createdHolidays = await Holiday.insertMany(
      preparedHolidays,
      { ordered: true }
    );

    return res.status(201).json({
      success: true,
      message: `${createdHolidays.length} holiday(s) created successfully.`,
      holidays: createdHolidays,
    });
  } catch (error) {
    console.error("Create Holidays Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "One or more selected dates are already marked as holidays.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create holidays.",
      error: error.message,
    });
  }
};


// =====================================================
// 2. GET HOLIDAYS BY YEAR
// GET /api/holidays/:companyId?year=2026
// =====================================================

export const getHolidays = async (req, res) => {
  try {
    const user = getUser(req);

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    let companyId;

    // Employee: company comes from authenticated employee record
    if (!isSuperAdmin(req)) {
      const employee = await Employee.findById(userId)
        .select("companyId status");

      if (!employee || employee.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "Employee account is not active.",
        });
      }

      companyId = String(employee.companyId);
    } else {
      companyId = getId(
        req.params.companyId ||
        req.query.companyId ||
        user.companyId
      );
    }

    if (!validateCompanyId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
    }

    const currentYear = new Date().getUTCFullYear();

    const year = Number(req.query.year || currentYear);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 9999
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid calendar year.",
      });
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
      .sort({ date: 1 })
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      year,
      total: holidays.length,
      holidays,
    });
  } catch (error) {
    console.error("Get Holidays Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch holidays.",
      error: error.message,
    });
  }
};


// =====================================================
// 3. GET SINGLE HOLIDAY
// GET /api/holidays/:companyId/holiday/:holidayId
// =====================================================

export const getHolidayById = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const companyId = getId(
      isSuperAdmin(req)
        ? req.params.companyId || getUser(req).companyId
        : (await Employee.findById(userId).select("companyId"))?.companyId
    );

    const { holidayId } = req.params;

    if (
      !validateCompanyId(companyId) ||
      !mongoose.Types.ObjectId.isValid(holidayId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company or holiday ID.",
      });
    }

    const holiday = await Holiday.findOne({
      _id: holidayId,
      companyId,
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found.",
      });
    }

    return res.status(200).json({
      success: true,
      holiday,
    });
  } catch (error) {
    console.error("Get Holiday Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch holiday.",
      error: error.message,
    });
  }
};


// =====================================================
// 4. UPDATE HOLIDAY
// PATCH /api/holidays/:companyId/holiday/:holidayId
// =====================================================

export const updateHoliday = async (req, res) => {
  try {
    const access = await checkHolidayAccess(req);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message,
      });
    }

    const companyId = getCompanyId(req, access);
    const { holidayId } = req.params;

    if (
      !validateCompanyId(companyId) ||
      !mongoose.Types.ObjectId.isValid(holidayId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company or holiday ID.",
      });
    }

    const holiday = await Holiday.findOne({
      _id: holidayId,
      companyId,
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found.",
      });
    }

    const { holidayName, date, description } = req.body;

    if (holidayName !== undefined) {
      const name = String(holidayName).trim();

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Holiday name is required.",
        });
      }

      holiday.holidayName = name;
    }

    if (date !== undefined) {
      const dateString = String(date).trim();
      const normalizedDate = normalizeDate(dateString);

      if (!normalizedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid holiday date.",
        });
      }

      if (!isFutureDate(dateString)) {
        return res.status(400).json({
          success: false,
          message: "Holiday cannot be moved to today or a past date.",
        });
      }

      const existingHoliday = await Holiday.findOne({
        _id: { $ne: holidayId },
        companyId,
        date: normalizedDate,
      });

      if (existingHoliday) {
        return res.status(409).json({
          success: false,
          message: "Another holiday already exists on this date.",
        });
      }

      holiday.date = normalizedDate;
    }

    if (description !== undefined) {
      holiday.description = String(description).trim();
    }

    await holiday.save();

    return res.status(200).json({
      success: true,
      message: "Holiday updated successfully.",
      holiday,
    });
  } catch (error) {
    console.error("Update Holiday Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A holiday already exists on this date.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update holiday.",
      error: error.message,
    });
  }
};


// =====================================================
// 5. DELETE SINGLE HOLIDAY
// DELETE /api/holidays/:companyId/holiday/:holidayId
// =====================================================

export const deleteHoliday = async (req, res) => {
  try {
    const access = await checkHolidayAccess(req);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message,
      });
    }

    const companyId = getCompanyId(req, access);
    const { holidayId } = req.params;

    if (
      !validateCompanyId(companyId) ||
      !mongoose.Types.ObjectId.isValid(holidayId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company or holiday ID.",
      });
    }

    const holiday = await Holiday.findOneAndDelete({
      _id: holidayId,
      companyId,
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Holiday deleted successfully.",
      holiday,
    });
  } catch (error) {
    console.error("Delete Holiday Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete holiday.",
      error: error.message,
    });
  }
};


// =====================================================
// 6. DELETE MULTIPLE HOLIDAYS
// DELETE /api/holidays/:companyId
// =====================================================

export const deleteMultipleHolidays = async (req, res) => {
  try {
    const access = await checkHolidayAccess(req);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message,
      });
    }

    const companyId = getCompanyId(req, access);
    const { holidayIds } = req.body;

    if (!validateCompanyId(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
    }

    if (!Array.isArray(holidayIds) || holidayIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide holiday IDs.",
      });
    }

    const validIds = holidayIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validIds.length !== holidayIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more holiday IDs are invalid.",
      });
    }

    const result = await Holiday.deleteMany({
      _id: { $in: validIds },
      companyId,
    });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} holiday(s) deleted successfully.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete Multiple Holidays Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete holidays.",
      error: error.message,
    });
  }
};