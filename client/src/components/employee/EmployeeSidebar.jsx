import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  Menu,
  LayoutDashboard,
  User,
  FolderKanban,
  ClipboardList,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Ticket,
  ChevronDown,
  LogOut,
  X,
} from "lucide-react";

import api from "../../api/axios";

// =========================================
// COLOR TOKENS (high contrast)
// Rail bg       #0e4a68  (deep teal-blue)
// Text / icons  #ffffff  (~9:1 on rail)
// Active pill   white bg + #0b3a52 text (~11:1)
// Hover         white/15 overlay
// =========================================

const RAIL_BG = "bg-[#0e4a68]";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e4a68]";

const isPathActive = (item, pathname) =>
  item.end
    ? pathname === item.path
    : pathname === item.path || pathname.startsWith(`${item.path}/`);

// Below this width the sidebar is a drawer (Tailwind `lg` = 1024px)
const MOBILE_QUERY = "(max-width: 1023px)";

// onLogout: pass your real logout handler from the parent.
const EmployeeSidebar = ({ open, employee, onLogout, setSidebarOpen }) => {
  const { employeeId: routeEmployeeId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [hasTimesheetApprovalAccess, setHasTimesheetApprovalAccess] =
    useState(false);
  const [hasPendingLeaveApprovals, setHasPendingLeaveApprovals] =
    useState(false);
  // Which dropdown groups are expanded (multiple can be open together)
  const [expandedGroups, setExpandedGroups] = useState({});

  const employeeId = employee?._id || routeEmployeeId;
  const profilePic = employee?.profilePic;

  const profilePicUrl = profilePic
    ? profilePic.startsWith("http")
      ? profilePic
      : `${(api.defaults.baseURL || "").replace(/\/api\/?$/, "")}${
          profilePic.startsWith("/") ? profilePic : `/uploads/${profilePic}`
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

  // =========================================
  // MOBILE DRAWER: lock page scroll + Esc to close
  // =========================================

  useEffect(() => {
    if (!open) return undefined;

    const mq = window.matchMedia(MOBILE_QUERY);
    if (!mq.matches) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setSidebarOpen]);

  // =========================================
  // CHECK TIMESHEET APPROVAL ACCESS
  // =========================================

  useEffect(() => {
    let isMounted = true;

    const checkTimesheetApprovalAccess = async () => {
      if (!employeeId) return;

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
  }, [employeeId]);

  // =========================================
  // CHECK LEAVE APPROVAL ACCESS
  // =========================================

  useEffect(() => {
    let isMounted = true;

    const checkLeaveApprovalAccess = async () => {
      if (!employeeId) return;

      try {
        const { data } = await api.get("/leaves/pending");

        if (isMounted) {
          setHasPendingLeaveApprovals(
            Array.isArray(data?.requests) && data.requests.length > 0
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
  }, [employeeId]);

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
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors";

  // "!" forces the colour so global CSS (a, button resets) can't override it
  const activeStyle = "!bg-white !text-[#0b3a52] shadow-sm";
  const idleStyle = "!text-white hover:!bg-white/15";

  return (
    <>
      {/* Backdrop (mobile / tablet only). Tap to close the drawer. */}
      <div
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
        className={[
          "fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden",
          "transition-opacity duration-300 motion-reduce:transition-none",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* Wrapper:
          - below lg : fixed off-canvas drawer, slides over the content
          - lg+      : sticky column; its width animates 0 <-> 16rem */}
      <div
        aria-hidden={!open}
        className={[
          "fixed inset-y-0 left-0 z-50 h-dvh w-[85vw] max-w-72 overflow-hidden",
          "transition-[transform,width,visibility] duration-300 ease-in-out motion-reduce:transition-none",
          "lg:sticky lg:top-0 lg:z-40 lg:h-screen lg:max-w-none lg:shrink-0 lg:self-start",
          open
            ? "visible translate-x-0 lg:w-64"
            : "invisible -translate-x-full lg:w-0 lg:translate-x-0",
        ].join(" ")}
      >
        <aside
          className={[
            `flex h-full w-full flex-col overflow-y-auto overflow-x-hidden overscroll-contain rounded-r-2xl lg:w-64 ${RAIL_BG}`,
            "p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
            "[scrollbar-color:rgba(255,255,255,0.4)_transparent] [scrollbar-width:thin]",
            "transition-transform duration-300 ease-in-out will-change-transform motion-reduce:transition-none",
            open ? "lg:translate-x-0" : "lg:-translate-x-full",
          ].join(" ")}
        >
          {/* Workspace Header */}
          <div className="mb-4 px-1 sm:mb-5">
            <div className="flex min-w-0 items-center gap-2">
              {/* Profile Picture */}
              <NavLink
                to={`${basePath}/dashboard`}
                title="Go to Dashboard"
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[#0b3a52] ring-2 ring-white/60"
              >
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt={employee?.name || "Employee"}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold">{employeeInitials}</span>
                )}
              </NavLink>

              {/* Employee Name */}
              <div className="min-w-0 flex-1">
                <NavLink
                  to={`${basePath}/dashboard`}
                  title="Go to Dashboard"
                  className="block truncate text-base font-bold !text-white hover:underline"
                >
                  {employee?.name || "Employee"}
                </NavLink>
              </div>

              {/* Close button: X on mobile/tablet, hamburger on desktop */}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition hover:bg-white/15 lg:h-9 lg:w-9 ${focusRing}`}
              >
                <X size={22} className="lg:hidden" />
                <Menu size={23} className="hidden lg:block" />
              </button>
            </div>
          </div>

          <div className="mb-2 border-t border-white/25 px-3 pt-4 text-xs font-semibold tracking-wide text-white/80">
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
                          className={`shrink-0 ${
                            isActive ? "text-[#0b5f85]" : "text-white"
                          }`}
                        />
                        <span className="min-w-0 flex-1 break-words">
                          {item.label}
                        </span>
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
                        ? "!bg-white/15 !text-white"
                        : idleStyle,
                    ].join(" ")}
                  >
                    <Icon
                      size={20}
                      aria-hidden="true"
                      className={`shrink-0 ${
                        ownsRoute ? "text-[#0b5f85]" : "text-white"
                      }`}
                    />
                    <span className="min-w-0 flex-1 break-words">
                      {item.label}
                    </span>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={[
                        "shrink-0 transition-transform duration-200",
                        isExpanded ? "rotate-180" : "rotate-0",
                        ownsRoute ? "text-[#0b3a52]" : "text-white",
                      ].join(" ")}
                    />
                  </button>

                  {/* Sub-menu: opens right below the main item */}
                  {isExpanded && (
                    <div
                      id={`submenu-${item.id}`}
                      className="ml-4 mt-1 space-y-1 border-l border-white/30 pl-3 sm:ml-5"
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
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
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
                                  className={`shrink-0 ${
                                    isActive ? "text-[#0b5f85]" : "text-white"
                                  }`}
                                />
                                <span className="min-w-0 break-words">
                                  {child.label}
                                </span>
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

          {/* Logout (bottom) */}
          <div className="mt-auto space-y-3 pt-6">
            <button
              type="button"
              onClick={handleLogout}
              className={[
                "flex w-full items-center justify-between rounded-lg border border-white/60 bg-white/10 px-3 py-2.5 text-sm font-semibold !text-white transition-colors hover:border-white hover:!bg-white hover:!text-red-700",
                focusRing,
              ].join(" ")}
            >
              <span>Log out</span>
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};

export default EmployeeSidebar;