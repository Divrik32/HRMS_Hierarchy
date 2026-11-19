import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserRound,
  LayoutDashboard,
  Building2,
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import api from "../../api/axios";

// =========================================
// LIGHT THEME (WCAG AA)
// Bar / dropdown / popup     white
// Search field               #ededed
// Main text                  slate-900 / slate-800
// Muted text                 slate-600
// =========================================

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

// setSelectedCompany is optional: pass the same function you give the
// Sidebar so choosing a company from search behaves like the sidebar list.
const Navbar = ({
  sidebarOpen,
  setSidebarOpen,
  superAdmin,
  onLogout,
  setSelectedCompany,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [companies, setCompanies] = useState([]);

  // Search popup state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const profileRef = useRef(null);
  const companiesLoadedRef = useRef(false);
  const searchTriggerRef = useRef(null);

  const displayName = superAdmin?.name || "Super Administrator";

  const profilePicture =
    superAdmin?.profilePic && !imageError
      ? `${
          import.meta.env.MODE === "production"
            ? "https://api.hrms.wsdstech.com"
            : "http://localhost:5003"
        }/uploads/${superAdmin.profilePic}`
      : "";

  const isMac =
    typeof navigator !== "undefined" &&
    /mac/i.test(navigator.platform || "");

  // =========================================
  // PROFILE DROPDOWN: CLICK OUTSIDE
  // =========================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // =========================================
  // COMPANIES FOR SEARCH (loaded when search opens)
  // =========================================

  const loadCompanies = useCallback(async () => {
    try {
      const response = await api.get("/companies");
      const result = response.data;

      if (result.success) {
        setCompanies(result.companies || []);
        companiesLoadedRef.current = true;
      }
    } catch (error) {
      console.error("Failed to load companies for search:", error);
    }
  }, []);

  // Refresh on next open after a company is added/updated
  useEffect(() => {
    const markStale = () => {
      companiesLoadedRef.current = false;
    };

    window.addEventListener("companies-updated", markStale);
    return () =>
      window.removeEventListener("companies-updated", markStale);
  }, []);

  // =========================================
  // SEARCHABLE PAGES (mirrors the sidebar menu)
  // =========================================

  const pages = useMemo(
    () => [
      {
        label: "Dashboard",
        section: "General",
        path: "/super-admin/dashboard",
        icon: LayoutDashboard,
        keywords: "home overview",
      },
      {
        label: "My Profile",
        section: "General",
        path: "/super-admin/profile",
        icon: UserRound,
        keywords: "account details personal",
      },
      {
        label: "Register Company",
        section: "Companies",
        path: "/super-admin/create-company",
        icon: Building2,
        keywords: "add new create company",
      },
      ...companies.map((company) => ({
        label:
          company.status === "inactive"
            ? `${company.companyName} (Inactive)`
            : company.companyName,
        section: "Company Directory",
        path: `/super-admin/company/${company._id}`,
        icon: Building2,
        keywords: `company directory ${
          company.status === "inactive" ? "inactive" : ""
        }`,
        onSelect: () => setSelectedCompany?.(company),
      })),
    ],
    [companies, setSelectedCompany]
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

  // Reset query each time the popup opens + lazy-load companies
  useEffect(() => {
    if (!paletteOpen) return;

    setQuery("");
    setActiveIndex(0);

    if (!companiesLoadedRef.current) loadCompanies();
  }, [paletteOpen, loadCompanies]);

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
    if (!onLogout || loggingOut) return;

    setLoggingOut(true);

    const toastId = toast.loading("Signing out...");

    try {
      await onLogout();

      toast.update(toastId, {
        render: "Signed out successfully.",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });
    } catch (err) {
      toast.update(toastId, {
        render:
          err.response?.data?.message ||
          err.message ||
          "Unable to sign out. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setLoggingOut(false);
      setProfileOpen(false);
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
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            className={`rounded-lg p-2 text-slate-800 transition hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
          >
            {sidebarOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <div className="min-w-0">
            <h1 className="block truncate text-base font-semibold text-slate-900">
              Company Administration
            </h1>

            <p className="hidden text-xs text-slate-600 sm:block">
              Super admin panel
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
        <div className="relative mr-4 shrink-0 sm:mr-6" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-expanded={profileOpen}
            aria-label="Open administrator profile menu"
            className={`flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 sm:gap-3 sm:px-2 ${focusRing}`}
          >
            <div className="hidden max-w-48 text-right sm:block">
              <h3 className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </h3>

              <p className="truncate text-xs text-slate-600">
                ID: {superAdmin?.superAdminId || "—"}
              </p>
            </div>

            {profilePicture ? (
              <img
                src={profilePicture}
                alt={`${displayName}'s profile`}
                onError={() => setImageError(true)}
                className="h-10 w-10 rounded-full border border-slate-300 bg-slate-100 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                <UserRound size={21} />
              </div>
            )}

            <ChevronDown
              size={16}
              className={`text-slate-600 transition-transform ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-black/10">
              {/* Profile Information */}
              <div className="flex items-center gap-3 border-b border-slate-200 p-4">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={`${displayName}'s profile`}
                    onError={() => setImageError(true)}
                    className="h-11 w-11 shrink-0 rounded-full border border-slate-300 bg-slate-100 object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                    <UserRound size={22} />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {displayName}
                  </p>

                  <p className="truncate text-xs text-slate-600">
                    {superAdmin?.email || ""}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Super Administrator
                  </p>
                </div>
              </div>

              {/* My Profile */}
              <Link
                to="/super-admin/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900"
              >
                <UserRound size={17} className="text-slate-600" />
                My Profile
              </Link>

              <div className="border-t border-slate-200" />

              {/* Sign Out */}
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={17} />
                <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>
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
                  placeholder="Try a page or company name"
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

export default Navbar;