import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  UserRound,
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  LayoutDashboard,
  FolderKanban,
  ShieldCheck,
  Layers3,
  ClipboardList,
  CalendarDays,
  FilePlus2,
  CheckCircle2,
  Ticket,
} from "lucide-react";

import api from "../../api/axios";

// =========================================
// LIGHT THEME (WCAG AA)
// Bar / dropdown / palette   white
// Search field               #ededed
// Main text                  slate-900 / slate-800
// Muted text                 slate-600
// =========================================

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const EmployeeNavbar = ({
  sidebarOpen,
  setSidebarOpen,
  employee,
  onLogout,
}) => {
  const [dropdown, setDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Page search (command palette)
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Access flags (same endpoints the sidebar uses, loaded when search opens)
  const [hasChildRoles, setHasChildRoles] = useState(null);
  const [hasTimesheetApprovalAccess, setHasTimesheetApprovalAccess] =
    useState(false);

  const dropdownRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const accessLoadedRef = useRef(false);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { employeeId: routeEmployeeId } = useParams();

  const employeeId = employee?._id || routeEmployeeId;
  const basePath = `/employee/${employeeId}`;

  const employeeName = employee?.name || "Employee";

  const designation =
    employee?.roleId?.roleName ||
    employee?.designation ||
    "Employee";

  const profilePic = employee?.profilePic
    ? employee.profilePic.startsWith("http")
      ? employee.profilePic
      : `${api.defaults.baseURL?.replace(/\/api\/?$/, "") || ""}/uploads/${employee.profilePic.replace(/^\/+/, "")}`
    : null;

  // Same role rules as the sidebar
  const roleName = employee?.roleId?.roleName?.trim() || "";
  const normalizedRoleName = roleName.toLowerCase();
  const isHR = ["hr", "head recruiter"].includes(normalizedRoleName);

  const normalizedDepartmentName = (
    employee?.departmentId?.departmentName || ""
  )
    .trim()
    .toLowerCase();

  const itDepartments = [
    "it",
    "information technology",
    "accessibility",
    "functional testing",
  ];

  const isITVicePresident =
    itDepartments.includes(normalizedDepartmentName) &&
    normalizedRoleName.includes("vice president");

  const isMac =
    typeof navigator !== "undefined" &&
    /mac/i.test(navigator.platform || "");

  // =========================================
  // DROPDOWN: CLICK OUTSIDE
  // =========================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // =========================================
  // SEARCH: SHORTCUT (Ctrl/Cmd + K)
  // =========================================

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((previous) => !previous);
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  // Reset query each time the palette opens
  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [paletteOpen]);

  // Load access flags once, the first time search opens
  useEffect(() => {
    if (!paletteOpen || !employeeId || accessLoadedRef.current) return;
    accessLoadedRef.current = true;

    const loadAccess = async () => {
      try {
        const { data } = await api.get("/timesheets/approval");
        setHasTimesheetApprovalAccess(Boolean(data?.hasApprovalAccess));
      } catch (error) {
        setHasTimesheetApprovalAccess(false);
      }

      try {
        const { data } = await api.get("/role-hierarchy/my-child-roles");
        setHasChildRoles(Boolean(data.hasChildRoles));
      } catch (error) {
        setHasChildRoles(null);
      }
    };

    loadAccess();
  }, [paletteOpen, employeeId]);

  // =========================================
  // SEARCHABLE PAGES (mirrors the sidebar menu)
  // =========================================

  const pages = useMemo(
    () => [
      {
        label: "Dashboard",
        section: "General",
        path: `${basePath}/dashboard`,
        icon: LayoutDashboard,
        end: true,
        keywords: "home overview",
      },
      {
        label: "My Profile",
        section: "General",
        path: `${basePath}/profile`,
        icon: UserRound,
        keywords: "account details personal",
      },
      {
        label: "My Projects",
        section: "Projects",
        path: `${basePath}/projects`,
        icon: FolderKanban,
        keywords: "work assigned",
      },
      ...(isITVicePresident
        ? [
            {
              label: "Project Management",
              section: "Projects",
              path: `${basePath}/project-management`,
              icon: FolderKanban,
              keywords: "manage projects",
            },
          ]
        : []),
      {
        label: "Role & Project Access",
        section: "Projects",
        path: `${basePath}/access`,
        icon: ShieldCheck,
        keywords: "permissions role",
      },
      {
        label: "Modules Assigned",
        section: "Projects",
        path: `${basePath}/modules-assigned`,
        icon: Layers3,
        keywords: "tasks module",
      },
      {
        label: "My Timesheet",
        section: "Timesheet",
        path: `${basePath}/timesheet`,
        icon: ClipboardList,
        keywords: "hours log time",
      },
      ...(hasTimesheetApprovalAccess
        ? [
            {
              label: "Timesheet to Approve",
              section: "Timesheet",
              path: `${basePath}/timesheet-approvals`,
              icon: CheckCircle2,
              keywords: "approval review team",
            },
          ]
        : []),
      {
        label: "My Attendance",
        section: "Attendance & Holidays",
        path: `${basePath}/attendance`,
        icon: CalendarDays,
        keywords: "present absent check in",
      },
      {
        label: "See My Holidays",
        section: "Attendance & Holidays",
        path: `${basePath}/holidays`,
        icon: CalendarDays,
        keywords: "holiday calendar off days",
      },
      {
        label: "My Leaves",
        section: "Leaves",
        path: `${basePath}/leaves`,
        icon: CalendarDays,
        end: true,
        keywords: "leave balance history",
      },
      {
        label: "Apply Leave",
        section: "Leaves",
        path: `${basePath}/leaves/apply`,
        icon: FilePlus2,
        end: true,
        keywords: "request leave new",
      },
      ...(hasChildRoles === true || isHR
        ? [
            {
              label: "Leave Approvals",
              section: "Leaves",
              path: `${basePath}/leave-approvals`,
              icon: CheckCircle2,
              keywords: "approve reject team",
            },
          ]
        : []),
      ...(isHR
        ? [
            {
              label: "Tickets",
              section: "Support",
              path: `${basePath}/tickets`,
              icon: Ticket,
              keywords: "support help issue",
            },
          ]
        : []),
    ],
    [
      basePath,
      isITVicePresident,
      hasTimesheetApprovalAccess,
      hasChildRoles,
      isHR,
    ]
  );

  const trimmedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!trimmedQuery) return pages;

    const tokens = trimmedQuery.split(/\s+/);

    return pages.filter((page) => {
      const haystack =
        `${page.label} ${page.section} ${page.keywords || ""}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [pages, trimmedQuery]);

  // Keep the highlighted row in range and visible
  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery]);

  useEffect(() => {
    if (!paletteOpen) return;
    document
      .getElementById(`page-search-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, paletteOpen]);

  const closePalette = () => {
    setPaletteOpen(false);
    searchTriggerRef.current?.focus();
  };

  const goToPage = (page) => {
    if (!page) return;
    setPaletteOpen(false);
    navigate(page.path);
  };

  const handlePaletteKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((previous) =>
        results.length ? (previous + 1) % results.length : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((previous) =>
        results.length
          ? (previous - 1 + results.length) % results.length
          : 0
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      goToPage(results[activeIndex]);
    }
  };

  const isCurrentPage = (page) =>
    page.end
      ? pathname === page.path
      : pathname === page.path || pathname.startsWith(`${page.path}/`);

  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    const toastId = toast.loading("Logging out...");

    try {
      await onLogout?.();

      toast.update(toastId, {
        render: "Logged out successfully.",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });
    } catch (err) {
      toast.update(toastId, {
        render:
          err.response?.data?.message ||
          err.message ||
          "Failed to log out.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setLoggingOut(false);
      setDropdown(false);
    }
  };

  return (
    <nav
      className="sticky top-0 z-50 flex h-16 items-center border-b border-slate-200 bg-white"
    >
      {/* Left Section: lines up with the sidebar width so both look like one frame */}
      <div
        className={[
          "flex h-full shrink-0 items-center gap-3 px-4",
          sidebarOpen ? "sm:w-64" : "",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen((previous) => !previous)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          className={`rounded-lg p-2 text-slate-800 transition hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
        >
          {sidebarOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <div className="min-w-0">
          <span className="block truncate text-base font-semibold text-slate-900">
            Employee Portal
          </span>

          <p className="hidden text-xs text-slate-600 sm:block">
            Your workspace
          </p>
        </div>
      </div>

      {/* Center Section: page search */}
      <div className="flex min-w-0 flex-1 justify-center px-3 sm:px-6">
        <button
          ref={searchTriggerRef}
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-haspopup="dialog"
          aria-label="Search pages"
          className={`hidden h-11 w-full max-w-2xl items-center gap-3 rounded-xl border border-transparent bg-[#ededed] px-3.5 text-left text-sm text-slate-600 transition hover:bg-[#e3e3e3] sm:flex ${focusRing}`}
        >
          <Search size={17} aria-hidden="true" className="shrink-0" />
          <span className="flex-1 truncate">Search pages...</span>
          <kbd className="rounded-md border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-700">
            {isMac ? "⌘ K" : "Ctrl K"}
          </kbd>
        </button>

        {/* Small screens: icon only */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-haspopup="dialog"
          aria-label="Search pages"
          className={`ml-auto rounded-lg p-2 text-slate-800 transition hover:bg-slate-100 hover:text-slate-900 sm:hidden ${focusRing}`}
        >
          <Search size={21} aria-hidden="true" />
        </button>
      </div>

      {/* Right Section */}
      <div className="relative mr-4 shrink-0 sm:mr-6" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdown((previous) => !previous)}
          aria-expanded={dropdown}
          aria-label="Employee account menu"
          className={`flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 sm:gap-3 sm:px-2 ${focusRing}`}
        >
          <div className="hidden text-right sm:block">
            <h3 className="max-w-40 truncate text-sm font-semibold text-slate-900">
              {employeeName}
            </h3>

            <p className="max-w-40 truncate text-xs text-slate-600">
              {designation}
            </p>
          </div>

          {profilePic ? (
            <img
              src={profilePic}
              alt={`${employeeName}'s profile`}
              className="h-10 w-10 rounded-full border border-slate-300 bg-slate-100 object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-900">
              <UserRound size={21} />
            </div>
          )}

          <ChevronDown
            size={16}
            className={`text-slate-600 transition-transform ${
              dropdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {dropdown && (
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-black/10">
            {/* Account Details */}
            <div className="border-b border-slate-200 p-4">
              <p className="truncate text-sm font-semibold text-slate-900">
                {employeeName}
              </p>

              <p className="mt-1 truncate text-xs text-slate-600">
                {employee?.email || "Employee account"}
              </p>

              {employee?.empId && (
                <p className="mt-2 text-xs text-slate-600">
                  Employee ID:{" "}
                  <span className="font-medium text-slate-900">
                    {employee.empId}
                  </span>
                </p>
              )}
            </div>

            {/* Profile Link */}
            <Link
              to={`${basePath}/profile`}
              onClick={() => setDropdown(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900"
            >
              <UserRound size={17} className="text-slate-600" />
              My Profile
            </Link>

            <div className="border-t border-slate-200" />

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={17} />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        )}
      </div>

      {/* ===================== SEARCH PALETTE ===================== */}
      {paletteOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[10vh]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closePalette();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search pages"
              onKeyDown={handlePaletteKeyDown}
                      className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/20"
            >
              {/* Input */}
              <div className="flex items-center gap-3 border-b border-slate-200 px-5">
                <Search
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-slate-600"
                />

                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try “leave”, “timesheet” or any page name"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="page-search-list"
                  aria-activedescendant={
                    results.length
                      ? `page-search-option-${activeIndex}`
                      : undefined
                  }
                  aria-label="Search pages"
                  className="h-14 min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-500 focus:outline-none"
                />

                <kbd className="rounded-md border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <ul
                id="page-search-list"
                role="listbox"
                aria-label="Pages"
                className="max-h-[50vh] overflow-y-auto overscroll-contain p-2 [scrollbar-color:#64748b_transparent] [scrollbar-width:thin]"
              >
                {results.length === 0 && (
                  <li
                    role="presentation"
                    className="px-4 py-8 text-center text-sm text-slate-600"
                  >
                    No pages match “{query.trim()}”.
                  </li>
                )}

                {results.map((page, index) => {
                  const Icon = page.icon;
                  const isActive = index === activeIndex;
                  const showHeading =
                    !trimmedQuery &&
                    (index === 0 ||
                      results[index - 1].section !== page.section);

                  return (
                    <li key={page.path} role="presentation">
                      {showHeading && (
                        <div className="px-3 pb-1 pt-3 font-mono text-xs font-semibold uppercase tracking-wider text-slate-600">
                          {page.section}
                        </div>
                      )}

                      <div
                        id={`page-search-option-${index}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => goToPage(page)}
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-800",
                        ].join(" ")}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                          <Icon
                            size={17}
                            aria-hidden="true"
                            className={
                              isActive ? "text-slate-900" : "text-slate-600"
                            }
                          />
                        </span>

                        <span className="flex-1 truncate text-base">
                          {page.label}
                        </span>

                        {isCurrentPage(page) ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            Current
                          </span>
                        ) : (
                          trimmedQuery && (
                            <span className="font-mono text-xs text-slate-600">
                              {page.section}
                            </span>
                          )
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Footer hints */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-200 px-5 py-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-slate-300 p-1">
                    <ArrowUp size={12} aria-hidden="true" />
                  </kbd>
                  <kbd className="rounded border border-slate-300 p-1">
                    <ArrowDown size={12} aria-hidden="true" />
                  </kbd>
                  to navigate
                </span>

                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-slate-300 p-1">
                    <CornerDownLeft size={12} aria-hidden="true" />
                  </kbd>
                  to open
                </span>

                <span className="ml-auto hidden sm:inline">
                  Type a page or section name to filter
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </nav>
  );
};

export default EmployeeNavbar;