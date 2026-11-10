import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";

import {
  LayoutDashboard,
  User,
  FolderKanban,
  ShieldCheck,
  Building2,
  BriefcaseBusiness,
  Layers3,
  ClipboardList,
  CalendarDays,
  CalendarPlus,
  FilePlus2,
  CheckCircle2,
  UserX,
  Clock,
} from "lucide-react";

import api from "../../api/axios";

const EmployeeSidebar = ({ open, employee }) => {
  const { employeeId: routeEmployeeId } = useParams();

  const [hasChildRoles, setHasChildRoles] = useState(null);
  const [hasTimesheetApprovalAccess, setHasTimesheetApprovalAccess] =
    useState(false);

  const employeeId = employee?._id || routeEmployeeId;
  const basePath = `/employee/${employeeId}`;

  // Employee role
  const roleName = employee?.roleId?.roleName?.trim() || "";
  const isHR = ["hr", "head recruiter"].includes(roleName.toLowerCase());

  const normalizedDepartmentName = (
    employee?.departmentId?.departmentName || ""
  )
    .trim()
    .toLowerCase();

  const normalizedRoleName = roleName.toLowerCase();

  const itDepartments = [
    "it",
    "information technology",
    "accessibility",
    "functional testing",
  ];

  const isITDepartment = itDepartments.includes(
    normalizedDepartmentName
  );

  const isITVicePresident =
    isITDepartment &&
    normalizedRoleName.includes("vice president");

  // =========================================
  // CHECK TIMESHEET APPROVAL ACCESS
  // =========================================

  useEffect(() => {
    let isMounted = true;

    const checkTimesheetApprovalAccess = async () => {
      if (!employeeId || !open) return;

      try {
        const { data } = await api.get("/timesheets/approval");

        if (isMounted) {
          setHasTimesheetApprovalAccess(
            Boolean(data?.hasApprovalAccess)
          );
        }
      } catch (error) {
        console.error(
          "Failed to check timesheet approval access:",
          error
        );

        if (isMounted) {
          setHasTimesheetApprovalAccess(false);
        }
      }
    };

    checkTimesheetApprovalAccess();

    return () => {
      isMounted = false;
    };
  }, [employeeId, open]);

  // =========================================
  // CHECK LEAVE APPROVAL ACCESS
  // =========================================

  useEffect(() => {
    let isMounted = true;

    const checkChildRoles = async () => {
      if (!employeeId || !open) return;

      try {
        const { data } = await api.get(
          "/role-hierarchy/my-child-roles"
        );

        if (isMounted) {
          setHasChildRoles(Boolean(data.hasChildRoles));
        }
      } catch (error) {
        console.error("Failed to check child roles:", error);

        if (isMounted) {
          setHasChildRoles(null);
        }
      }
    };

    checkChildRoles();

    return () => {
      isMounted = false;
    };
  }, [employeeId, open]);

  if (!open) return null;

  // Employee information
  const departmentName =
    employee?.departmentId?.departmentName ||
    (typeof employee?.departmentId === "string"
      ? "Department data unavailable"
      : "Not assigned");

  const companyName =
    employee?.companyId?.companyName ||
    (typeof employee?.companyId === "string"
      ? "Company data unavailable"
      : "Not assigned");

  // =========================================
  // NAVIGATION ITEMS
  // =========================================

  const navigationItems = [
    {
      label: "Dashboard",
      path: `${basePath}/dashboard`,
      icon: LayoutDashboard,
      end: true,
    },
    {
      label: "My Profile",
      path: `${basePath}/profile`,
      icon: User,
    },
    {
      label: "My Projects",
      path: `${basePath}/projects`,
      icon: FolderKanban,
    },

    ...(isITVicePresident
      ? [
          {
            label: "Project Management",
            path: `${basePath}/project-management`,
            icon: FolderKanban,
          },
        ]
      : []),

    {
      label: "Role & Project Access",
      path: `${basePath}/access`,
      icon: ShieldCheck,
    },
    {
      label: "Modules Assigned",
      path: `${basePath}/modules-assigned`,
      icon: Layers3,
    },
    {
      label: "My Timesheet",
      path: `${basePath}/timesheet`,
      icon: ClipboardList,
    },

    // Show only when employee has child/grandchild roles
    ...(hasTimesheetApprovalAccess
      ? [
          {
            label: "Timesheet to Approve",
            path: `${basePath}/timesheet-approvals`,
            icon: CheckCircle2,
          },
        ]
      : []),

    {
      label: "My Attendance",
      path: `${basePath}/attendance`,
      icon: CalendarDays,
    },
    {
      label: "See My Holidays",
      path: `${basePath}/holidays`,
      icon: CalendarDays,
    },

    // Leave Management
{
  label: "My Leave",
  path: `${basePath}/leaves`,
  icon: CalendarDays,
  end: true,
},
{
  label: "Apply Leave",
  path: `${basePath}/leaves/apply`,
  icon: FilePlus2,
  end: true,
},

    // Leave Approvals
    ...(hasChildRoles === true || isHR
      ? [
          {
            label: "Leave Approvals",
            path: `${basePath}/leave-approvals`,
            icon: CheckCircle2,
          },
        ]
      : []),

    ...(isHR
      ? [
          {
            label: "Absent Management",
            path: `${basePath}/absent`,
            icon: UserX,
          },
        ]
      : []),

    ...(isHR
      ? [
          {
            label: "Attendance Management",
            path: `${basePath}/attendance-management`,
            icon: Clock,
          },
        ]
      : []),

    // Comp-Off
    {
      label: "My Comp-Off",
      path: `${basePath}/comp-off`,
      icon: CalendarPlus,
    },
  ];

  // Only HR can apply Comp-Off for selected employees
  if (isHR) {
    navigationItems.push(
      {
        label: "Apply Comp-Off",
        path: `${basePath}/comp-off-apply`,
        icon: FilePlus2,
      },
      {
        label: "Comp-Off Approvals",
        path: `${basePath}/comp-off-approvals`,
        icon: CheckCircle2,
      }
    );
  }

  return (
    <aside className="flex min-h-[calc(100vh-64px)] w-72 shrink-0 flex-col border-r border-slate-200 bg-white p-4">

      {/* Workspace Header */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <BriefcaseBusiness size={22} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-800">
              Employee Workspace
            </h2>

            <p className="text-xs text-slate-500">
              Personal Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Workspace
      </div>

      <nav className="space-y-1.5">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    className={
                      isActive
                        ? "text-blue-600"
                        : "text-slate-400"
                    }
                  />

                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Employee Summary */}
      <div className="mt-auto pt-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
              <User size={17} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Employee Summary
              </h3>

              <p className="text-xs text-slate-500">
                Your work information
              </p>
            </div>
          </div>

          <div className="space-y-4">

            {/* Department */}
            <div className="flex items-start gap-2.5">
              <Building2
                size={16}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  Department
                </p>

                <p className="break-words text-sm font-medium text-slate-700">
                  {departmentName}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start gap-2.5">
              <BriefcaseBusiness
                size={16}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  Role
                </p>

                <p className="break-words text-sm font-medium text-slate-700">
                  {roleName || "Not assigned"}
                </p>
              </div>
            </div>

            {/* Company */}
            <div className="border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-500">
                Company
              </p>

              <p className="mt-1 break-words text-sm font-medium text-slate-700">
                {companyName}
              </p>
            </div>

          </div>
        </div>
      </div>
    </aside>
  );
};

export default EmployeeSidebar;