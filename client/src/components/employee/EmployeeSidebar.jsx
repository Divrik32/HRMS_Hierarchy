import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";

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
  Ticket,
  ChevronDown,
  LogOut,
} from "lucide-react";

import api from "../../api/axios";

// =========================================
// COLOR TOKENS (WCAG AA contrast on navy)
// Rail bg      #0b1f3a
// Sub-menu bg  #10294d
// Main text    slate-100 / white      (~15:1)
// Muted text   slate-300              (~10:1)
// Accent       teal-300 on navy       (~10:1)
// =========================================

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1f3a]";

const isPathActive = (item, pathname) =>
  item.end
    ? pathname === item.path
    : pathname === item.path || pathname.startsWith(`${item.path}/`);

// onLogout: pass your real logout handler from the parent.
const EmployeeSidebar = ({ open, employee, onLogout }) => {
  const { employeeId: routeEmployeeId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [hasChildRoles, setHasChildRoles] = useState(null);
  const [hasTimesheetApprovalAccess, setHasTimesheetApprovalAccess] = useState(false);
  const [hasPendingLeaveApprovals, setHasPendingLeaveApprovals] = useState(false);
  // Which dropdown groups are expanded (multiple can be open together)
  const [expandedGroups, setExpandedGroups] = useState({});

  const employeeId = employee?._id || routeEmployeeId;
  const profilePic = employee?.profilePic;

const profilePicUrl = profilePic
  ? profilePic.startsWith("http")
    ? profilePic
    : `${(api.defaults.baseURL || "").replace(/\/api\/?$/, "")}${
        profilePic.startsWith("/")
          ? profilePic
          : `/uploads/${profilePic}`
      }`
  : "";

const employeeInitials = employee?.name
  ? employee.name
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  : "EM";
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

  const isITDepartment = itDepartments.includes(normalizedDepartmentName);

  const isITVicePresident =
    isITDepartment && normalizedRoleName.includes("vice president");

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
          Boolean(data?.hasApprovalAccess && data?.count > 0)
        );
      }
    } catch (error) {
      console.error("Failed to check timesheet approval access:", error);

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

  const checkLeaveApprovalAccess = async () => {
    if (!employeeId || !open) return;

    try {
      const { data } = await api.get("/leaves/pending");

      if (isMounted) {
        setHasPendingLeaveApprovals(
          Array.isArray(data?.requests) &&
          data.requests.length > 0
        );
      }
    } catch (error) {
      console.error("Failed to check leave approval access:", error);

      if (isMounted) {
        setHasPendingLeaveApprovals(false);
      }
    }
  };

  checkLeaveApprovalAccess();

  return () => {
    isMounted = false;
  };
}, [employeeId, open]);

  if (!open) return null;

  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = () => {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    // Fallback if no handler is passed: adjust keys/route to your app
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

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
  // NAVIGATION (main menu -> sub menu groups)
  // =========================================

  const rawNavigation = [
    {
      id: "dashboard",
      label: "Dashboard",
      path: `${basePath}/dashboard`,
      icon: LayoutDashboard,
      end: true,
    },
    {
      id: "profile",
      label: "My Profile",
      path: `${basePath}/profile`,
      icon: User,
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderKanban,
      children: [
        {
          label: "My Projects",
          path: `${basePath}/projects`,
          icon: FolderKanban,
        },
        // ...(isITVicePresident
        //   ? [
        //       {
        //         label: "Project Management",
        //         path: `${basePath}/project-management`,
        //         icon: FolderKanban,
        //       },
        //     ]
        //   : []),
        // {
        //   label: "Role & Project Access",
        //   path: `${basePath}/access`,
        //   icon: ShieldCheck,
        // },
        // {
        //   label: "Modules Assigned",
        //   path: `${basePath}/modules-assigned`,
        //   icon: Layers3,
        // },
      ],
    },
    {
      id: "timesheet",
      label: "Timesheet",
      icon: ClipboardList,
      children: [
        {
          label: "My Timesheet",
          path: `${basePath}/timesheet`,
          icon: ClipboardList,
        },
        // Show only when employee has approval access
        ...(hasTimesheetApprovalAccess
          ? [
              {
                label: "Timesheet to Approve",
                path: `${basePath}/timesheet-approvals`,
                icon: CheckCircle2,
              },
            ]
          : []),
      ],
    },
    {
      id: "attendance",
      label: "Attendance & Holidays",
      icon: CalendarDays,
      children: [
        {
          label: "My Attendance",
          path: `${basePath}/attendance`,
          icon: CalendarDays,
        },
        // {
        //   label: "See My Holidays",
        //   path: `${basePath}/holidays`,
        //   icon: CalendarDays,
        // },
      ],
    },
    {
      id: "leaves",
      label: "Leaves",
      icon: CalendarPlus,
      children: [
        {
          label: "My Leaves",
          path: `${basePath}/leaves`,
          icon: CalendarDays,
          end: true,
        },
        // {
        //   label: "Apply Leave",
        //   path: `${basePath}/leaves/apply`,
        //   icon: FilePlus2,
        //   end: true,
        // },
        // Leave Approvals
...(hasPendingLeaveApprovals
  ? [
      {
        label: "Leave Approvals",
        path: `${basePath}/leave-approvals`,
        icon: CheckCircle2,
      },
    ]
  : []),
      ],
    },

    // Tickets - HR Only
    ...(isHR
      ? [
          {
            id: "tickets",
            label: "Tickets",
            path: `${basePath}/tickets`,
            icon: Ticket,
          },
        ]
      : []),
  ];

  // Groups with only one visible child become a direct link,
  // groups with no visible children are hidden.
  const navigation = rawNavigation
    .filter((item) => !item.children || item.children.length > 0)
    .map((item) =>
      item.children && item.children.length === 1
        ? {
            ...item,
            path: item.children[0].path,
            end: item.children[0].end,
            children: undefined,
          }
        : item
    );

  const railItemBase =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors";

  const activeStyle =
    "bg-teal-300/15 text-teal-200 ring-1 ring-inset ring-teal-300/40";
  const idleStyle = "text-slate-100 hover:bg-white/10 hover:text-white";

  return (
    <aside className="sticky top-16 z-40 flex h-[calc(100vh-64px)] w-64 shrink-0 flex-col self-start overflow-y-auto overflow-x-hidden bg-[#0b1f3a] p-4 [scrollbar-color:#64748b_transparent] [scrollbar-width:thin]">
{/* Workspace Header */}
<div className="mb-5 px-1">
  <div className="flex items-center gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-300 text-[#0b1f3a]">
      {profilePicUrl ? (
        <img
          src={profilePicUrl}
          alt={employee?.name || "Employee"}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-sm font-bold">
          {employeeInitials}
        </span>
      )}
    </div>

    <div className="min-w-0">
      <h2 className="truncate text-base font-bold text-white">
        {employee?.name || "Employee"}
      </h2>
    </div>
  </div>
</div>

      <div className="mb-2 border-t border-white/15 px-3 pt-4 text-xs font-semibold text-slate-300">
        Employee Workspace
      </div>

      {/* Main menu */}
      <nav aria-label="Main menu" className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;

          // ---------- Direct link ----------
          if (!item.children) {
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  [
                    railItemBase,
                    focusRing,
                    isActive ? activeStyle : idleStyle,
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      aria-hidden="true"
                      className={isActive ? "text-teal-300" : "text-slate-300"}
                    />
                    <span className="flex-1">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          }

          // ---------- Group (click toggles dropdown below) ----------
          const ownsRoute = item.children.some((child) =>
            isPathActive(child, pathname)
          );

          // Open if user toggled it, or if the current route is inside it
          // (explicit toggle wins once the user has clicked)
          const isExpanded =
            expandedGroups[item.id] !== undefined
              ? expandedGroups[item.id]
              : ownsRoute;

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() =>
                  setExpandedGroups((prev) => ({
                    ...prev,
                    [item.id]: !isExpanded,
                  }))
                }
                aria-expanded={isExpanded}
                aria-controls={`submenu-${item.id}`}
                className={[
                  railItemBase,
                  focusRing,
                  ownsRoute
                    ? activeStyle
                    : isExpanded
                    ? "bg-white/10 text-white"
                    : idleStyle,
                ].join(" ")}
              >
                <Icon
                  size={20}
                  aria-hidden="true"
                  className={ownsRoute ? "text-teal-300" : "text-slate-300"}
                />
                <span className="flex-1">{item.label}</span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={[
                    "transition-transform duration-200",
                    isExpanded ? "rotate-180" : "rotate-0",
                    isExpanded ? "text-white" : "text-slate-300",
                  ].join(" ")}
                />
              </button>

              {/* Sub-menu: opens right below the main item */}
              {isExpanded && (
                <div
                  id={`submenu-${item.id}`}
                  className="ml-5 mt-1 space-y-1 border-l border-white/15 pl-3"
                >
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;

                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        end={child.end}
                        className={({ isActive }) =>
                          [
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            focusRing,
                            isActive ? activeStyle : idleStyle,
                          ].join(" ")
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <ChildIcon
                              size={16}
                              aria-hidden="true"
                              className={
                                isActive ? "text-teal-300" : "text-slate-300"
                              }
                            />
                            <span>{child.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Employee Summary + Logout (bottom) */}
      <div className="mt-auto space-y-3 pt-6">
        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className={[
            "flex w-full items-center justify-between rounded-lg border border-white/20 px-3 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-red-400/15 hover:text-red-200",
            focusRing,
          ].join(" ")}
        >
          <span>Log out</span>
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};

export default EmployeeSidebar;