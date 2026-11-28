import { useEffect, useState } from "react";
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
  ChevronDown,
  LogOut,
  BriefcaseBusiness,
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

// Below this width the sidebar is a drawer (Tailwind `lg` = 1024px)
const MOBILE_QUERY = "(max-width: 1023px)";

// onLogout: pass your real logout handler from the parent.
const CompanySidebar = ({ open, setSidebarOpen, onLogout }) => {
  const { companyId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [overview, setOverview] = useState({
    employees: 0,
    departments: 0,
    activeProjects: 0,
  });

  const [overviewLoading, setOverviewLoading] = useState(true);

  // Which dropdown groups are expanded (multiple can be open together)
  const [expandedGroups, setExpandedGroups] = useState({});

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
      if (e.key === "Escape" && typeof setSidebarOpen === "function") {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setSidebarOpen]);

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
            (project) => String(project.status).toLowerCase() === "active"
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
  const idleStyle = "text-slate-100 hover:bg-white/10 hover:text-white";

  const overviewRows = [
    { label: "Employees", value: overview.employees },
    { label: "Departments", value: overview.departments },
    { label: "Active Projects", value: overview.activeProjects },
  ];

  return (
    <>
      {/* Backdrop (mobile / tablet only), starts below the 64px navbar.
          Tap to close the drawer. */}
      <div
        aria-hidden="true"
        onClick={() => setSidebarOpen?.(false)}
        className={[
          "fixed inset-x-0 bottom-0 top-16 z-30 bg-slate-900/50 lg:hidden",
          "transition-opacity duration-300 motion-reduce:transition-none",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* Wrapper:
          - below lg : fixed drawer under the navbar, slides over the content
          - lg+      : sticky column; its width animates 0 <-> 16rem */}
      <div
        aria-hidden={!open}
        className={[
          "fixed left-0 top-16 z-40 h-[calc(100dvh-4rem)] w-[85vw] max-w-72 overflow-hidden",
          "transition-[transform,width,visibility] duration-300 ease-in-out motion-reduce:transition-none",
          "lg:sticky lg:h-[calc(100vh-64px)] lg:max-w-none lg:shrink-0 lg:self-start",
          open
            ? "visible translate-x-0 lg:w-64"
            : "invisible -translate-x-full lg:w-0 lg:translate-x-0",
        ].join(" ")}
      >
        <aside
          className={[
            "flex h-full w-full flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0b1f3a] lg:w-64",
            "p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
            "[scrollbar-color:#64748b_transparent] [scrollbar-width:thin]",
            "transition-transform duration-300 ease-in-out will-change-transform motion-reduce:transition-none",
            open ? "lg:translate-x-0" : "lg:-translate-x-full",
          ].join(" ")}
        >
          {/* Workspace Header */}
          <div className="mb-4 px-1 sm:mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-300 text-[#0b1f3a]">
                <BriefcaseBusiness size={22} aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-white">
                  Workspace
                </h2>

                <p className="truncate text-xs text-slate-300">
                  Company Management
                </p>
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
                            isActive ? "text-teal-300" : "text-slate-300"
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
                      className={`shrink-0 ${
                        ownsRoute ? "text-teal-300" : "text-slate-300"
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
                        isExpanded ? "text-white" : "text-slate-300",
                      ].join(" ")}
                    />
                  </button>

                  {/* Sub-menu: opens right below the main item */}
                  {isExpanded && (
                    <div
                      id={`submenu-${item.id}`}
                      className="ml-4 mt-1 space-y-1 border-l border-white/15 pl-3 sm:ml-5"
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
                                    isActive
                                      ? "text-teal-300"
                                      : "text-slate-300"
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
                    <span className="min-w-0 truncate">{row.label}</span>
                    <span className="shrink-0 font-semibold text-white">
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
      </div>
    </>
  );
};

export default CompanySidebar;