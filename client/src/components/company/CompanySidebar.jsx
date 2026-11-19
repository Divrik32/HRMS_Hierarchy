import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building,
  Shield,
  FolderKanban,
  UserRound,
  CalendarDays,
  Activity,
  CalendarCheck,
  ClipboardList,
  ChevronRight,
  LogOut,
  BriefcaseBusiness,
} from "lucide-react";
import api from "../../api/axios";

// =========================================
// COLOR TOKENS (WCAG AA contrast on navy)
// Rail bg      #0b1f3a
// Flyout bg    #10294d
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
const CompanySidebar = ({ open, onLogout }) => {
  const { companyId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const closeTimer = useRef(null);

  const [overview, setOverview] = useState({
    employees: 0,
    departments: 0,
    activeProjects: 0,
  });

  const [overviewLoading, setOverviewLoading] = useState(true);

  // Which main menu's flyout is open (null = none)
  const [openGroupId, setOpenGroupId] = useState(null);
  const [flyoutPos, setFlyoutPos] = useState({
    top: 0,
    left: 0,
    bridge: 12,
    arrowTop: 16,
  });

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenGroupId(null), 120);
  };

  // Flyout is position: fixed, so the scrolling sidebar never clips it
  const openFlyout = (groupId, itemEl, childCount) => {
    cancelClose();

    if (itemEl && sidebarRef.current) {
      const itemRect = itemEl.getBoundingClientRect();
      const asideRect = sidebarRef.current.getBoundingClientRect();
      const estimatedHeight = childCount * 44 + 16;
      const top = Math.max(
        8,
        Math.min(itemRect.top, window.innerHeight - estimatedHeight - 8)
      );

      setFlyoutPos({
        top,
        left: itemRect.right,
        bridge: asideRect.right - itemRect.right + 12,
        arrowTop: Math.max(12, itemRect.top - top + 14),
      });
    }

    setOpenGroupId(groupId);
  };

  // =========================================
  // COMPANY OVERVIEW
  // =========================================

  useEffect(() => {
    if (!companyId) return;

    const fetchOverview = async () => {
      setOverviewLoading(true);

      try {
        const [employeesRes, departmentsRes, projectsRes] =
          await Promise.all([
            api.get(`/employees/company/${companyId}`),
            api.get(`/departments/company/${companyId}`),
            api.get("/projects", { params: { companyId } }),
          ]);

        const employees = employeesRes.data.employees || [];
        const departments = departmentsRes.data.departments || [];
        const projects = projectsRes.data.projects || [];

        setOverview({
          employees: employeesRes.data.count ?? employees.length,
          departments: departmentsRes.data.count ?? departments.length,
          activeProjects: projects.filter(
            (project) =>
              String(project.status).toLowerCase() === "active"
          ).length,
        });
      } catch (error) {
        console.error(
          "Company Overview API Error:",
          error.response?.status,
          error.response?.data || error.message
        );
      } finally {
        setOverviewLoading(false);
      }
    };

    fetchOverview();
  }, [companyId]);

  // =========================================
  // FLYOUT CLOSE BEHAVIOUR
  // =========================================

  // Close on route change
  useEffect(() => {
    setOpenGroupId(null);
  }, [pathname]);

  // Clear pending timer on unmount
  useEffect(() => cancelClose, []);

  // Close on window resize (fixed position would be stale)
  useEffect(() => {
    if (!openGroupId) return undefined;
    const close = () => setOpenGroupId(null);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [openGroupId]);

  // Close on outside click and Escape
  useEffect(() => {
    if (!openGroupId) return undefined;

    const handlePointerDown = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setOpenGroupId(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpenGroupId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openGroupId]);

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

  // =========================================
  // NAVIGATION (main menu -> sub menu groups)
  // =========================================

  const base = `/company/${companyId}`;

  const navigation = [
    {
      id: "dashboard",
      label: "Dashboard",
      path: `${base}/dashboard`,
      icon: LayoutDashboard,
      end: true,
    },
    {
      id: "organization",
      label: "Organization",
      icon: Building,
      children: [
        {
          label: "Manage Employees",
          path: `${base}/employees`,
          icon: Users,
        },
        {
          label: "Departments",
          path: `${base}/departments`,
          icon: Building,
        },
        {
          label: "Roles & Permissions",
          path: `${base}/roles`,
          icon: Shield,
        },
      ],
    },
    {
      id: "work",
      label: "Work Tracking",
      icon: FolderKanban,
      children: [
        {
          label: "Projects",
          path: `${base}/projects`,
          icon: FolderKanban,
        },
        {
          label: "Timesheets",
          path: `${base}/timesheets`,
          icon: CalendarDays,
        },
        {
          label: "Daily Efficiency",
          path: `${base}/efficiency`,
          icon: Activity,
        },
      ],
    },
    {
      id: "attendance",
      label: "Attendance & Holidays",
      icon: CalendarCheck,
      children: [
        {
          label: "Attendance Checker",
          path: `${base}/attendance`,
          icon: CalendarCheck,
        },
        {
          label: "Mark Holidays",
          path: `${base}/holidays`,
          icon: CalendarDays,
        },
      ],
    },
    {
      id: "leaves",
      label: "All Employee Leaves",
      path: `${base}/all-employee-leaves`,
      icon: ClipboardList,
    },
    {
      id: "profile",
      label: "Profile",
      path: `${base}/profile`,
      icon: UserRound,
    },
  ];

  const railItemBase =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors";

  const activeStyle =
    "bg-teal-300/15 text-teal-200 ring-1 ring-inset ring-teal-300/40";
  const idleStyle =
    "text-slate-100 hover:bg-white/10 hover:text-white";

  const overviewRows = [
    { label: "Employees", value: overview.employees },
    { label: "Departments", value: overview.departments },
    { label: "Active Projects", value: overview.activeProjects },
  ];

  return (
    <aside
      ref={sidebarRef}
      onScroll={() => setOpenGroupId(null)}
      className="sticky top-16 z-40 flex h-[calc(100vh-64px)] w-64 shrink-0 flex-col self-start overflow-y-auto overflow-x-hidden bg-[#0b1f3a] p-4 [scrollbar-color:#64748b_transparent] [scrollbar-width:thin]"
    >
      {/* Workspace Header */}
      <div className="mb-5 px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-300 text-[#0b1f3a]">
            <BriefcaseBusiness size={22} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">
              Workspace
            </h2>

            <p className="text-xs text-slate-300">Company Management</p>
          </div>
        </div>
      </div>

      <div className="mb-2 border-t border-white/15 px-3 pt-4 text-xs font-semibold text-slate-300">
        Menu
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
                onClick={() => setOpenGroupId(null)}
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
                      className={
                        isActive ? "text-teal-300" : "text-slate-300"
                      }
                    />
                    <span className="flex-1">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          }

          // ---------- Group (hover / click opens small flyout) ----------
          const isOpen = openGroupId === item.id;
          const ownsRoute = item.children.some((child) =>
            isPathActive(child, pathname)
          );

          return (
            <div
              key={item.id}
              onMouseEnter={(e) =>
                openFlyout(
                  item.id,
                  e.currentTarget.firstElementChild,
                  item.children.length
                )
              }
              onMouseLeave={scheduleClose}
            >
              <button
                type="button"
                onClick={(e) =>
                  openFlyout(
                    item.id,
                    e.currentTarget,
                    item.children.length
                  )
                }
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-controls={`flyout-${item.id}`}
                className={[
                  railItemBase,
                  focusRing,
                  ownsRoute
                    ? activeStyle
                    : isOpen
                    ? "bg-white/10 text-white"
                    : idleStyle,
                ].join(" ")}
              >
                <Icon
                  size={20}
                  aria-hidden="true"
                  className={
                    ownsRoute ? "text-teal-300" : "text-slate-300"
                  }
                />
                <span className="flex-1">{item.label}</span>
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className={isOpen ? "text-white" : "text-slate-300"}
                />
              </button>

              {/* Small floating card: opens on hover (or click / keyboard) */}
              {isOpen && (
                <div
                  id={`flyout-${item.id}`}
                  style={{
                    position: "fixed",
                    top: flyoutPos.top,
                    left: flyoutPos.left,
                    paddingLeft: flyoutPos.bridge,
                  }}
                  className="z-50 w-auto"
                >
                  <div className="relative w-60 rounded-xl border border-white/15 bg-[#10294d] p-2 shadow-xl shadow-black/30">
                    {/* pointer arrow toward the hovered item */}
                    <span
                      aria-hidden="true"
                      style={{ top: flyoutPos.arrowTop }}
                      className="absolute -left-1.5 h-3 w-3 rotate-45 border-b border-l border-white/15 bg-[#10294d]"
                    />

                    <nav
                      aria-label={`${item.label} submenu`}
                      className="relative space-y-1"
                    >
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;

                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            end={child.end}
                            onClick={() => setOpenGroupId(null)}
                            className={({ isActive }) =>
                              [
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300",
                                isActive ? activeStyle : idleStyle,
                              ].join(" ")
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <ChildIcon
                                  size={18}
                                  aria-hidden="true"
                                  className={
                                    isActive
                                      ? "text-teal-300"
                                      : "text-slate-300"
                                  }
                                />
                                <span>{child.label}</span>
                              </>
                            )}
                          </NavLink>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Quick Overview + Logout (bottom) */}
      <div className="mt-auto space-y-3 pt-6">
        <div className="rounded-xl border border-white/15 bg-white/5 p-3">
          <h3 className="text-sm font-semibold text-white">
            Quick Overview
          </h3>

          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {overviewRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3"
              >
                <span>{row.label}</span>
                <span className="font-semibold text-white">
                  {overviewLoading ? "..." : row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

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

export default CompanySidebar;