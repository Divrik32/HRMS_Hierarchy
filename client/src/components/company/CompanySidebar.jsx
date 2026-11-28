import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Menu,
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

// Builds a full URL for a logo stored as a filename, path or absolute URL
const buildLogoUrl = (logo) => {
  if (!logo || typeof logo !== "string") return "";

  if (logo.startsWith("http") || logo.startsWith("data:")) {
    return logo;
  }

  const origin = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

  return `${origin}/uploads/companies/${logo.replace(/^\/+/, "")}`;
};

// onLogout: pass your real logout handler from the parent.
// company: the company object loaded by CompanyLayout.
const CompanySidebar = ({ open, company, setSidebarOpen, onLogout }) => {
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

  // If the logo image fails to load, fall back to the icon
  const [logoFailed, setLogoFailed] = useState(false);

  // Company logo + name
  // (change the field names here if your company model uses different ones)
  const companyName = company?.name || company?.companyName || "Company";
  const logoUrl = buildLogoUrl(company?.logo || company?.logoUrl);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

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
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors";

  // "!" forces the colour so global CSS (a, button resets) can't override it
  const activeStyle = "!bg-white !text-[#0b3a52] shadow-sm";
  const idleStyle = "!text-white hover:!bg-white/15";

  const overviewRows = [
    { label: "Employees", value: overview.employees },
    { label: "Departments", value: overview.departments },
    { label: "Active Projects", value: overview.activeProjects },
  ];

  return (
    <>
      {/* Backdrop (mobile / tablet only). Tap to close the drawer. */}
      <div
        aria-hidden="true"
        onClick={() => setSidebarOpen?.(false)}
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
              {/* Company Logo */}
              <NavLink
                to={`${base}/dashboard`}
                title="Go to Dashboard"
                className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[#0b3a52] ring-2 ring-white/60 ${focusRing}`}
              >
                {logoUrl && !logoFailed ? (
                  <img
                    src={logoUrl}
                    alt={companyName}
                    onError={() => setLogoFailed(true)}
                    className="h-full w-full rounded-full object-contain p-0.5"
                  />
                ) : (
                  <BriefcaseBusiness size={22} aria-hidden="true" />
                )}
              </NavLink>

              {/* Company Name */}
              <div className="min-w-0 flex-1">
                <NavLink
                  to={`${base}/dashboard`}
                  title={companyName}
                  className="block truncate text-base font-bold !text-white hover:underline"
                >
                  {companyName}
                </NavLink>
              </div>

              {/* Close button: X on mobile/tablet, hamburger on desktop */}
              <button
                type="button"
                onClick={() => setSidebarOpen?.(false)}
                aria-label="Close sidebar"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition hover:bg-white/15 lg:h-9 lg:w-9 ${focusRing}`}
              >
                <X size={22} className="lg:hidden" />
                <Menu size={23} className="hidden lg:block" />
              </button>
            </div>
          </div>

          <div className="mb-2 border-t border-white/25 px-3 pt-4 text-xs font-semibold tracking-wide text-white/80">
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

          {/* Quick Overview + Logout (bottom) */}
          <div className="mt-auto space-y-3 pt-6">
            <div className="rounded-xl border border-white/30 bg-white/10 p-3">
              <h3 className="text-sm font-semibold text-white">
                Quick Overview
              </h3>

              <div className="mt-3 space-y-2 text-sm text-white/90">
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

export default CompanySidebar;