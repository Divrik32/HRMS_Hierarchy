import Employee from "../models/Employee.js";
import Role from "../models/Role.js";

export const checkMyRoleHasChildren = async (req, res) => {
  try {
    const employeeId =
      req.user?._id ||
      req.user?.id ||
      req.employee?._id ||
      req.employee?.id;

    const companyId =
      req.companyId ||
      req.user?.companyId ||
      req.employee?.companyId;

    if (!employeeId || !companyId) {
      return res.status(401).json({
        success: false,
        message: "Authentication information missing.",
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId,
    }).select("roleId");

    if (!employee || !employee.roleId) {
      return res.status(404).json({
        success: false,
        message: "Employee or role not found.",
      });
    }

    const hasChildRoles = await Role.exists({
      companyId,
      parentRoleId: employee.roleId,
    });

    return res.status(200).json({
      success: true,
      hasChildRoles: Boolean(hasChildRoles),
    });
  } catch (error) {
    console.error("Check Child Roles Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};