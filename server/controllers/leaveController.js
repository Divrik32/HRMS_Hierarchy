import mongoose from "mongoose";
import LeaveRequest from "../models/LeaveRequest.js";
import LeaveBalance from "../models/LeaveBalance.js";
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import CompOff from "../models/CompOff.js";
import Holiday from "../models/Holiday.js";
import {
  getId,
  getCurrentUserId,
  getCompanyId,
  isSuperAdmin,
  sendError,
  normalizeDate,
  isHR,
  getRoleDetails,
  getBalanceField,
  roundDays,
  normalizeLeaveBreakdown,
  getRequestLeaveBreakdown,
  getPaidLeaveBreakdown,
  getCompOffDays,
  getUnpaidLeaveDays,
  validateLeaveBreakdownTotal,
  normalizeDailyBreakdown,
  reserveCompOffBalance,
  restoreCompOffBalance,
  recordApprovedCompOffUsage,
  getApproverInfo,
  canSuperAdminApprove,
  getMyLeaveBalanceData,
} from "../services/leaveBusinessLogics.js";


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
      leaveType,
      isUnpaidLeave = false,
      leaveDates,
      reason,
    } = req.body;

    // =========================================
    // AUTHENTICATION VALIDATION
    // =========================================

    if (!employeeId || !companyId) {
      return sendError(
        res,
        401,
        "Employee authentication information missing."
      );
    }

    // =========================================
    // BASIC VALIDATION
    // =========================================

    const allowedLeaveTypes = [
      "Casual Leave",
      "Sick Leave",
      "Paid Leave",
      "Comp-Off",
    ];

    if (
      leaveType &&
      !allowedLeaveTypes.includes(leaveType)
    ) {
      return sendError(res, 400, "Invalid leave type.");
    }

    if (typeof isUnpaidLeave !== "boolean") {
      return sendError(
        res,
        400,
        "Invalid unpaid leave selection."
      );
    }

    // Both missing means leave request is not allowed
    if (!leaveType && isUnpaidLeave !== true) {
      return sendError(
        res,
        400,
        "Please select a leave type or apply for unpaid leave."
      );
    }

    if (!reason?.trim()) {
      return sendError(res, 400, "Leave reason is required.");
    }

    if (!Array.isArray(leaveDates) || leaveDates.length === 0) {
      return sendError(
        res,
        400,
        "Please select at least one leave date."
      );
    }

    // =========================================
    // NORMALIZE AND VALIDATE SELECTED DATES
    // =========================================

    const normalizedLeaveDates = [];
    const selectedDates = new Set();

    for (const item of leaveDates) {
      if (!item?.date || !item?.dayType) {
        return sendError(
          res,
          400,
          "Invalid leave date selection."
        );
      }

      if (!["Full Day", "Half Day"].includes(item.dayType)) {
        return sendError(
          res,
          400,
          "Day type must be Full Day or Half Day."
        );
      }

      const date = normalizeDate(item.date);

      if (!date) {
        return sendError(res, 400, "Invalid leave date.");
      }

      const dateKey = date.toISOString().split("T")[0];

      if (selectedDates.has(dateKey)) {
        return sendError(
          res,
          400,
          "Duplicate leave dates are not allowed."
        );
      }

      selectedDates.add(dateKey);

      normalizedLeaveDates.push({
        date,
        dayType: item.dayType,
      });
    }

    // Keep dates in ascending order
    normalizedLeaveDates.sort(
      (a, b) => a.date - b.date
    );

    // =========================================
    // CALCULATE TOTAL LEAVE DAYS
    // =========================================

    const totalDays = normalizedLeaveDates.reduce(
      (total, item) =>
        total + (item.dayType === "Full Day" ? 1 : 0.5),
      0
    );

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
    });

    if (!employee) {
      return sendError(res, 404, "Employee not found.");
    }

    // =========================================
    // GET BALANCE FIELD ONLY IF LEAVE TYPE EXISTS
    // =========================================

    let balanceField = null;

    if (leaveType) {
      balanceField = getBalanceField(leaveType);

      if (!balanceField) {
        return sendError(
          res,
          400,
          "Invalid leave balance field."
        );
      }
    }

    let createdRequest;

    await session.withTransaction(async () => {
      // =========================================
      // CHECK OVERLAPPING REQUESTS
      // =========================================

      const requestedDateValues = normalizedLeaveDates.map(
        (item) => item.date
      );

      const overlappingRequest = await LeaveRequest.findOne({
        employeeId,
        companyId,
        status: {
          $in: ["Pending", "Approved"],
        },
        "leaveDates.date": {
          $in: requestedDateValues,
        },
      }).session(session);

      if (overlappingRequest) {
        throw new Error(
          "You already have a pending or approved leave request for one or more selected dates."
        );
      }

      let leaveDays = 0;
      let unpaidDays = totalDays;

      // =========================================
      // CALCULATE PAID AND UNPAID DAYS
      // =========================================

      if (leaveType) {
        const leaveBalance = await LeaveBalance.findOne({
          employeeId,
          companyId,
        }).session(session);

        const availableBalance = leaveBalance
          ? Math.max(
              0,
              Number(leaveBalance[balanceField] || 0)
            )
          : 0;

        leaveDays = Math.min(
          totalDays,
          availableBalance
        );

        unpaidDays = Math.max(
          0,
          Number((totalDays - leaveDays).toFixed(2))
        );

        // =========================================
        // DEDUCT AVAILABLE LEAVE BALANCE
        // =========================================

        if (leaveDays > 0) {
          const balanceUpdate = await LeaveBalance.updateOne(
            {
              employeeId,
              companyId,
              [balanceField]: {
                $gte: leaveDays,
              },
            },
            {
              $inc: {
                [balanceField]: -leaveDays,
              },
            },
            { session }
          );

          if (balanceUpdate.modifiedCount === 0) {
            throw new Error(
              "Leave balance changed. Please refresh and try again."
            );
          }
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

            leaveType: leaveType || undefined,
            isUnpaidLeave,

            leaveDates: normalizedLeaveDates,

            totalDays,
            leaveDays,
            unpaidDays,

            reason: reason.trim(),

            status: "Pending",

            balanceDeducted: leaveDays > 0,

            payrollProcessed: false,
            payrollProcessedAt: null,

            approvedBy: [],
            approvedBySuperAdmin: null,
            approvedAt: null,

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

    if (!employeeId || !companyId) {
      return sendError(
        res,
        401,
        "Employee authentication information missing."
      );
    }

    const requests = await LeaveRequest.find({
      employeeId,
      companyId,
    })
      .sort({ createdAt: -1 })
      .populate("approvedBy", "name empId")
      .populate("approvedBySuperAdmin", "name email")
      .populate("rejectedBy", "name empId")
      .populate("rejectedBySuperAdmin", "name email");

    const formattedRequests = requests.map((request) => {
      const requestData = request.toObject();

      if (
        !requestData.leaveType &&
        requestData.isUnpaidLeave === true
      ) {
        requestData.leaveType = "Unpaid Leave";
      }

      return requestData;
    });

    return res.status(200).json({
      success: true,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error("Get My Leave Requests Error:", error);

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
      .populate("approvedBy", "name empId")
      .sort({ createdAt: -1 });

    const currentRoleId = getId(currentEmployee.roleId);
    const currentIsHR = isHR(currentEmployee.roleId);

    const filteredRequests = requests.filter((request) => {
      const applicant = request.employeeId;
      const applicantRole = applicant?.roleId;

      if (!applicant || !applicantRole) {
        return false;
      }

      // HR can see all pending requests
      if (currentIsHR) {
        return true;
      }

      const parentRoleId = getId(
        applicantRole.parentRoleId
      );

      // Other approvers can see direct child role requests
      return (
        Boolean(parentRoleId) &&
        currentRoleId === parentRoleId
      );
    });

    // =========================================
    // FORMAT UNPAID LEAVE TYPE
    // =========================================

    const formattedRequests = filteredRequests.map((request) => {
      const requestData = request.toObject();

      if (
        !requestData.leaveType &&
        requestData.isUnpaidLeave === true
      ) {
        requestData.leaveType = "Unpaid Leave";
      }

      return requestData;
    });

    return res.status(200).json({
      success: true,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error("Get Pending Leave Requests Error:", error);

    return sendError(res, 500, error.message);
  }
};

// =====================================================
// SUPER ADMIN — GET TOP-LEVEL EMPLOYEE PENDING REQUESTS
// =====================================================


export const getSuperAdminPendingLeaveRequests = async (
  req,
  res
) => {
  try {
    if (!isSuperAdmin(req)) {
      return sendError(
        res,
        403,
        "Super Admin access required."
      );
    }

    const companyId = getCompanyId(req);

    if (!companyId) {
      return sendError(
        res,
        400,
        "Company information missing."
      );
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
      .populate("approvedBy", "name empId")
      .sort({ createdAt: -1 });

    // Only top-level employees (without parent role)
    const filteredRequests = requests.filter((request) => {
      const applicant = request.employeeId;
      const applicantRole = applicant?.roleId;

      return (
        Boolean(applicant) &&
        Boolean(applicantRole) &&
        !applicantRole.parentRoleId
      );
    });

    // =========================================
    // FORMAT UNPAID LEAVE TYPE
    // =========================================

    const formattedRequests = filteredRequests.map((request) => {
      const requestData = request.toObject();

      if (
        !requestData.leaveType &&
        requestData.isUnpaidLeave === true
      ) {
        requestData.leaveType = "Unpaid Leave";
      }

      return requestData;
    });

    return res.status(200).json({
      success: true,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error(
      "Get Super Admin Pending Leave Requests Error:",
      error
    );

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

      // =========================================
      // CHECK APPROVAL PERMISSION
      // =========================================

      let allowed = false;

      if (isSuperAdmin(req)) {
        allowed = await canSuperAdminApprove(applicant);
      } else {
        const approval = await getApproverInfo(
          req,
          applicant
        );

        allowed = approval.allowed;
      }

      if (!allowed) {
        throw new Error(
          "You are not authorized to approve this request."
        );
      }

      // =========================================
      // ADD UNPAID DAYS TO EXTRA LEAVE
      // =========================================

      const unpaidDays = Number(request.unpaidDays || 0);

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

      if (superAdminApproval) {
        request.approvedBySuperAdmin = currentUserId;
      } else {
        // Prevent duplicate employee approvals
        const alreadyApproved = request.approvedBy.some(
          (id) => id.toString() === currentUserId.toString()
        );

        if (!alreadyApproved) {
          request.approvedBy.push(currentUserId);
        }
      }

      request.approvedAt = new Date();

      // =========================================
      // ACTION HISTORY
      // =========================================

      request.actionHistory.push({
        action: "Approved",

        performedBy: superAdminApproval
          ? null
          : currentUserId,

        performedBySuperAdmin: superAdminApproval
          ? currentUserId
          : null,

        performedAt: new Date(),
        remarks: req.body?.remarks?.trim() || "",
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

      // =========================================
      // CHECK REJECTION PERMISSION
      // =========================================

      let allowed = false;

      if (isSuperAdmin(req)) {
        allowed = await canSuperAdminApprove(applicant);
      } else {
        const approval = await getApproverInfo(
          req,
          applicant
        );

        allowed = approval.allowed;
      }

      if (!allowed) {
        throw new Error(
          "You are not authorized to reject this request."
        );
      }

      // =========================================
      // REFUND LEAVE BALANCE
      // =========================================

      if (request.balanceDeducted) {
        if (!request.leaveType) {
          if (request.isUnpaidLeave === true) {
            // Unpaid Leave has no leave balance to refund.
            request.balanceDeducted = false;
          } else {
            throw new Error(
              "Leave type is missing for the deducted balance."
            );
          }
        } else {
          const balanceField = getBalanceField(
            request.leaveType
          );

          if (!balanceField) {
            throw new Error(
              `Invalid balance field for ${request.leaveType}.`
            );
          }

          const refundDays = Number(request.leaveDays || 0);

          if (refundDays > 0) {
            const refund = await LeaveBalance.updateOne(
              {
                employeeId: request.employeeId,
                companyId,
              },
              {
                $inc: {
                  [balanceField]: refundDays,
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
      message:
        "Leave request rejected and applicable leave balance refunded.",
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
      // REFUND LEAVE BALANCE
      // =========================================

      if (request.balanceDeducted) {
        if (!request.leaveType) {
          if (request.isUnpaidLeave === true) {
            // Unpaid Leave has no leave balance to refund.
            request.balanceDeducted = false;
          } else {
            throw new Error(
              "Leave type is missing for the deducted balance."
            );
          }
        } else {
          const balanceField = getBalanceField(
            request.leaveType
          );

          if (!balanceField) {
            throw new Error(
              `Invalid balance field for ${request.leaveType}.`
            );
          }

          const refundDays = Number(request.leaveDays || 0);

          if (refundDays > 0) {
            const refund = await LeaveBalance.updateOne(
              {
                employeeId,
                companyId,
              },
              {
                $inc: {
                  [balanceField]: refundDays,
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
        "Leave request withdrawn successfully. Applicable leave balance refunded.",
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

    const role = await Role.findById(employee.roleId)
      .select("roleName");

    const roleName = role?.roleName?.trim()?.toLowerCase();

    const hasHRAccess = ["hr", "head recruiter"].includes(roleName);

    if (!hasHRAccess) {
      return res.status(403).json({
        success: false,
        message: "HR access required",
      });
    }

    const companyId = employee.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

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
      .populate("approvedBy", "name empId")
      .populate("approvedBySuperAdmin", "name email")
      .populate("rejectedBy", "name empId")
      .populate("rejectedBySuperAdmin", "name email")
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map((request) => {
      const requestData = request.toObject();

      if (
        !requestData.leaveType &&
        requestData.isUnpaidLeave === true
      ) {
        requestData.leaveType = "Unpaid Leave";
      }

      return requestData;
    });

    return res.status(200).json({
      success: true,
      count: formattedRequests.length,
      requests: formattedRequests,
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
    if (req.user?.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Super Admin access required",
      });
    }

    const companyId = req.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

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
      .populate("approvedBy", "name empId")
      .populate("approvedBySuperAdmin", "name email")
      .populate("rejectedBy", "name empId")
      .populate("rejectedBySuperAdmin", "name email")
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map((request) => {
      const requestData = request.toObject();

      if (
        !requestData.leaveType &&
        requestData.isUnpaidLeave === true
      ) {
        requestData.leaveType = "Unpaid Leave";
      }

      return requestData;
    });

    return res.status(200).json({
      success: true,
      count: formattedRequests.length,
      requests: formattedRequests,
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

export const getMyLeaveBalance = async (req, res) => {
  try {
    const employeeId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!employeeId || !companyId) {
      return res.status(401).json({
        success: false,
        message: "Employee or company information missing.",
      });
    }

    const balance = await getMyLeaveBalanceData({
      employeeId,
      companyId,
    });

    return res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    console.error("Get My Leave Balance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch leave balance.",
      error: error.message,
    });
  }
};