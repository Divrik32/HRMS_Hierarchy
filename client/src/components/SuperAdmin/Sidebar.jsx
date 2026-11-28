import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  LayoutDashboard,
  Building2,
  UserCircle,
  ChevronDown,
  LogOut,
  ShieldCheck,
  X,
} from "lucide-react";
import api from "../../api/axios";

// =========================================
// COLOR TOKENS (high contrast)
// Rail bg       #0e4a68  (deep teal-blue)
// Text / icons  #ffffff  (~9:1 on rail)
// Active pill   white bg + #0b3a52 text (~11:1)
// Hover         white/15 overlay
// Error text    red-200
// =========================================

const RAIL_BG = "bg-[#0e4a68]";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e4a68]";

// Below this width the sidebar is a drawer (Tailwind `lg` = 1024px)
const MOBILE_QUERY = "(max-width: 1023px)";

// Builds a full URL for a picture stored as a filename, path or absolute URL
const buildImageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  if (value.startsWith("http") || value.startsWith("data:")) return value;

  const origin = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${origin}${value.startsWith("/") ? value : `/uploads/${value}`}`;
};

// onLogout: pass your real logout handler from the parent.
// superAdmin: the profile object loaded by SuperAdminLayout.
const Sidebar = ({
  open,
  superAdmin,
  setSidebarOpen,
  setSelectedCompany,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyError, setCompanyError] = useState("");

  // Company Directory dropdown: null = follow route, true/false = user toggled
  const [directoryToggled, setDirectoryToggled] = useState(null);

  // If the picture fails to load, fall back to initials / icon
  const [picFailed, setPicFailed] = useState(false);

  // Super admin picture + name
  // (change the field names here if your model uses different ones)
  const adminName = superAdmin?.name || superAdmin?.fullName || "Super Admin";
  const picUrl = buildImageUrl(
    superAdmin?.profilePic || superAdmin?.avatar || superAdmin?.photo
  );

  const adminInitials = adminName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    setPicFailed(false);
  }, [picUrl]);

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
  // COMPANIES
  // =========================================

  const fetchCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    setCompanyError("");

    try {
      const response = await api.get("/companies");
      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || "Failed to load companies.");
      }

      setCompanies(result.companies || []);
    } catch (error) {
      setCompanyError(error.message || "Unable to load companies.");
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();

    const handleCompaniesUpdated = () => {
      fetchCompanies();
    };

    window.addEventListener("companies-updated", handleCompaniesUpdated);

    return () => {
      window.removeEventListener("companies-updated", handleCompaniesUpdated);
    };
  }, [fetchCompanies]);

  const handleCompanyClick = (company) => {
    setSelectedCompany?.(company);
    navigate(`/super-admin/company/${company._id}`);
  };

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

  const railItemBase =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors";

  // "!" forces the colour so global CSS (a, button resets) can't override it
  const activeStyle = "!bg-white !text-[#0b3a52] shadow-sm";
  const idleStyle = "!text-white hover:!bg-white/15";

  const directLinks = {
    dashboard: {
      label: "Dashboard",
      path: "/super-admin/dashboard",
      icon: LayoutDashboard,
    },
    register: {
      label: "Register Company",
      path: "/super-admin/create-company",
      icon: Building2,
    },
    profile: {
      label: "My Profile",
      path: "/super-admin/profile",
      icon: UserCircle,
    },
  };

  const renderDirectLink = (link) => {
    const Icon = link.icon;

    return (
      <NavLink
        to={link.path}
        className={({ isActive }) =>
          [railItemBase, focusRing, isActive ? activeStyle : idleStyle].join(
            " "
          )
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
            <span className="min-w-0 flex-1 break-words">{link.label}</span>
          </>
        )}
      </NavLink>
    );
  };

  // ---------- Company Directory (dropdown group) ----------
  const directoryOwnsRoute = pathname.startsWith("/super-admin/company/");

  // Open if user toggled it, or if the current route is inside it
  const isDirectoryOpen =
    directoryToggled !== null ? directoryToggled : directoryOwnsRoute;

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
          {/* Header */}
          <div className="mb-4 px-1 sm:mb-5">
            <div className="flex min-w-0 items-center gap-2">
              {/* Profile Picture */}
              <NavLink
                to="/super-admin/dashboard"
                title="Go to Dashboard"
                className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[#0b3a52] ring-2 ring-white/60 ${focusRing}`}
              >
                {picUrl && !picFailed ? (
                  <img
                    src={picUrl}
                    alt={adminName}
                    onError={() => setPicFailed(true)}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : adminInitials ? (
                  <span className="text-sm font-bold">{adminInitials}</span>
                ) : (
                  <ShieldCheck size={22} aria-hidden="true" />
                )}
              </NavLink>

              {/* Name */}
              <div className="min-w-0 flex-1">
                <NavLink
                  to="/super-admin/dashboard"
                  title="Go to Dashboard"
                  className="block truncate text-base font-bold !text-white hover:underline"
                >
                  {adminName}
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
            Super Admin Workspace
          </div>

          {/* Main menu */}
          <nav aria-label="Main menu" className="space-y-1">
            {renderDirectLink(directLinks.dashboard)}
            {renderDirectLink(directLinks.register)}

            {/* Company Directory */}
            <div>
              <button
                type="button"
                onClick={() => setDirectoryToggled(!isDirectoryOpen)}
                aria-expanded={isDirectoryOpen}
                aria-controls="submenu-company-directory"
                className={[
                  railItemBase,
                  focusRing,
                  directoryOwnsRoute
                    ? activeStyle
                    : isDirectoryOpen
                    ? "!bg-white/15 !text-white"
                    : idleStyle,
                ].join(" ")}
              >
                <Building2
                  size={20}
                  aria-hidden="true"
                  className={`shrink-0 ${
                    directoryOwnsRoute ? "text-[#0b5f85]" : "text-white"
                  }`}
                />
                <span className="min-w-0 flex-1 break-words">
                  Company Directory
                </span>
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    directoryOwnsRoute
                      ? "bg-[#0e4a68]/10 text-[#0b3a52]"
                      : "bg-white/20 text-white",
                  ].join(" ")}
                >
                  {companies.length}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={[
                    "shrink-0 transition-transform duration-200",
                    isDirectoryOpen ? "rotate-180" : "rotate-0",
                    directoryOwnsRoute ? "text-[#0b3a52]" : "text-white",
                  ].join(" ")}
                />
              </button>

              {/* Dropdown: opens right below the Company Directory item */}
              {isDirectoryOpen && (
                <div
                  id="submenu-company-directory"
                  className="ml-4 mt-1 border-l border-white/30 pl-3 sm:ml-5"
                >
                  <h3 className="px-3 pb-1 pt-1 text-xs font-semibold text-white/80">
                    Registered companies
                  </h3>

                  {loadingCompanies && companies.length === 0 && (
                    <p className="px-3 py-2 text-sm text-white/90">
                      Loading companies...
                    </p>
                  )}

                  {!loadingCompanies && companyError && (
                    <div className="px-3 py-2">
                      <p className="break-words text-sm text-red-200">
                        {companyError}
                      </p>

                      <button
                        type="button"
                        onClick={fetchCompanies}
                        className={`mt-2 rounded py-1 text-sm font-semibold !text-white underline hover:no-underline ${focusRing}`}
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {!loadingCompanies &&
                    !companyError &&
                    companies.length === 0 && (
                      <p className="px-3 py-2 text-sm text-white/90">
                        No companies registered yet.
                      </p>
                    )}

                  {/* Long lists scroll inside the dropdown instead of stretching the sidebar */}
                  <ul className="max-h-[40dvh] space-y-1 overflow-y-auto overscroll-contain [scrollbar-color:rgba(255,255,255,0.4)_transparent] [scrollbar-width:thin] sm:max-h-72">
                    {companies.map((company) => {
                      const isActiveCompany =
                        pathname === `/super-admin/company/${company._id}` ||
                        pathname.startsWith(
                          `/super-admin/company/${company._id}/`
                        );

                      return (
                        <li key={company._id}>
                          <button
                            type="button"
                            onClick={() => handleCompanyClick(company)}
                            title={company.companyName}
                            aria-current={isActiveCompany ? "page" : undefined}
                            className={[
                              "block w-full break-words rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors lg:py-2",
                              focusRing,
                              isActiveCompany ? activeStyle : idleStyle,
                            ].join(" ")}
                          >
                            {company.companyName}
                            {company.status === "inactive" && (
                              <span
                                className={`block text-xs font-normal ${
                                  isActiveCompany
                                    ? "text-red-700"
                                    : "text-red-200"
                                }`}
                              >
                                Inactive
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {companies.length > 0 && (
                    <button
                      type="button"
                      onClick={fetchCompanies}
                      disabled={loadingCompanies}
                      className={`mt-1 rounded px-3 py-2 text-sm font-semibold !text-white underline hover:no-underline disabled:opacity-60 ${focusRing}`}
                    >
                      {loadingCompanies ? "Refreshing..." : "Refresh list"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {renderDirectLink(directLinks.profile)}
          </nav>

          {/* Logout (bottom) */}
          <div className="mt-auto pt-6">
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

export default Sidebar;