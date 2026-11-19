import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
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
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// =========================================
// LIGHT THEME (WCAG AA)
// Bar / dropdown / popup     white
// Search field               #ededed
// Main text                  slate-900 / slate-800
// Muted text                 slate-600
// =========================================

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const CompanyNavbar = ({
  sidebarOpen,
  setSidebarOpen,
  company,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [dropdown, setDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Search popup state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const dropdownRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const { companyId: routeCompanyId } = useParams();

  const companyId = routeCompanyId || company?._id;
  const base = `/company/${companyId}`;

  const apiBaseUrl =
    import.meta.env.MODE === "production"
      ? "https://api.hrms.wsdstech.com"
      : "http://localhost:5003";

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
  // SEARCHABLE PAGES (mirrors the sidebar menu)
  // =========================================

  const pages = useMemo(
    () => [
      {
        label: "Dashboard",
        section: "General",
        path: `${base}/dashboard`,
        icon: LayoutDashboard,
        end: true,
        keywords: "home overview",
      },
      {
        label: "Profile",
        section: "General",
        path: `${base}/profile`,
        icon: UserRound,
        keywords: "company account details",
      },
      {
        label: "Manage Employees",
        section: "Organization",
        path: `${base}/employees`,
        icon: Users,
        keywords: "staff people add edit",
      },
      {
        label: "Departments",
        section: "Organization",
        path: `${base}/departments`,
        icon: Building,
        keywords: "team department",
      },
      {
        label: "Roles & Permissions",
        section: "Organization",
        path: `${base}/roles`,
        icon: Shield,
        keywords: "access role permission",
      },
      {
        label: "Projects",
        section: "Work Tracking",
        path: `${base}/projects`,
        icon: FolderKanban,
        keywords: "work project",
      },
      {
        label: "Timesheets",
        section: "Work Tracking",
        path: `${base}/timesheets`,
        icon: CalendarDays,
        keywords: "hours log time",
      },
      {
        label: "Daily Efficiency",
        section: "Work Tracking",
        path: `${base}/efficiency`,
        icon: Activity,
        keywords: "productivity performance report",
      },
      {
        label: "Attendance Checker",
        section: "Attendance & Holidays",
        path: `${base}/attendance`,
        icon: CalendarCheck,
        keywords: "present absent check in",
      },
      {
        label: "Mark Holidays",
        section: "Attendance & Holidays",
        path: `${base}/holidays`,
        icon: CalendarDays,
        keywords: "holiday calendar off days",
      },
      {
        label: "All Employee Leaves",
        section: "Leaves",
        path: `${base}/all-employee-leaves`,
        icon: ClipboardList,
        keywords: "leave requests balance history",
      },
    ],
    [base]
  );

  // =========================================
  // PAGE SEARCH (Ctrl/Cmd + K popup)
  // =========================================

  // Ctrl/Cmd + K
  useEffect(() => {
    const handleShortcut = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setPaletteOpen((previous) => !previous);
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  // Reset query each time the popup opens
  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [paletteOpen]);

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
    page.onSelect?.();
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
    setDropdown(false);

    const toastId = toast.loading("Logging out...");

    try {
      await onLogout();

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
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 flex h-16 items-center border-b border-slate-200 bg-white">
        {/* Left Section: lines up with the sidebar width */}
        <div
          className={[
            "flex h-full shrink-0 items-center gap-3 px-4",
            sidebarOpen ? "sm:w-64" : "",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            className={`rounded-lg p-2 text-slate-800 transition hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
          >
            {sidebarOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <div className="min-w-0">
            <span className="block truncate text-base font-semibold text-slate-900">
              Company Workspace
            </span>

            <p className="hidden text-xs text-slate-600 sm:block">
              Company management
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
            onClick={() => setDropdown(!dropdown)}
            aria-expanded={dropdown}
            aria-label="Company account menu"
            className={`flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 sm:gap-3 sm:px-2 ${focusRing}`}
          >
            <img
              src={
                company?.logo
                  ? `${apiBaseUrl}/uploads/companies/${company.logo}`
                  : "/default-company-logo.png"
              }
              alt={company?.companyName || "Company logo"}
              className="h-10 w-10 rounded-full border border-slate-300 bg-slate-100 object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/default-company-logo.png";
              }}
            />

            <div className="hidden max-w-48 text-left sm:block">
              <h3 className="truncate text-sm font-semibold text-slate-900">
                {company?.companyName || "Company Workspace"}
              </h3>

              <p className="truncate text-xs text-slate-600">
                Company Workspace
              </p>
            </div>

            <ChevronDown
              size={16}
              className={`text-slate-600 transition-transform ${
                dropdown ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdown && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-black/10">
              {/* Company name (useful on small screens where it is hidden) */}
              <div className="border-b border-slate-200 p-4">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {company?.companyName || "Company Workspace"}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  Company Workspace
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={17} />

                <span>{loggingOut ? "Logging out..." : "Logout"}</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ===================== SEARCH POPUP ===================== */}
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
                  placeholder="Try a page name"
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
    </>
  );
};

export default CompanyNavbar;