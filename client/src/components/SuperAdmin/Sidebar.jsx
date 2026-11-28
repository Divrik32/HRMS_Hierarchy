import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  UserCircle,
  ChevronDown,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import api from "../../api/axios";

// =========================================
// COLOR TOKENS (WCAG AA contrast on navy)
// Rail bg      #0b1f3a
// Sub-menu bg  #10294d
// Main text    slate-100 / white      (~15:1)
// Muted text   slate-300              (~10:1)
// Accent       teal-300 on navy       (~10:1)
// Error/inactive red-300              (~7:1)
// =========================================

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1f3a]";

// Below this width the sidebar is a drawer (Tailwind `lg` = 1024px)
const MOBILE_QUERY = "(max-width: 1023px)";

// onLogout: pass your real logout handler from the parent.
const Sidebar = ({ open, setSidebarOpen, setSelectedCompany, onLogout }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyError, setCompanyError] = useState("");

  // Company Directory dropdown: null = follow route, true/false = user toggled
  const [directoryToggled, setDirectoryToggled] = useState(null);

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
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors";

  const activeStyle =
    "bg-teal-300/15 text-teal-200 ring-1 ring-inset ring-teal-300/40";
  const idleStyle = "text-slate-100 hover:bg-white/10 hover:text-white";

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
                isActive ? "text-teal-300" : "text-slate-300"
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
          {/* Header */}
          <div className="mb-4 px-1 sm:mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-300 text-[#0b1f3a]">
                <ShieldCheck size={22} aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-white">
                  Super Admin
                </h2>

                <p className="truncate text-xs text-slate-300">
                  Company Administration
                </p>
              </div>
            </div>
          </div>

          <div className="mb-2 border-t border-white/15 px-3 pt-4 text-xs font-semibold text-slate-300">
            Menu
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
                    ? "bg-white/10 text-white"
                    : idleStyle,
                ].join(" ")}
              >
                <Building2
                  size={20}
                  aria-hidden="true"
                  className={`shrink-0 ${
                    directoryOwnsRoute ? "text-teal-300" : "text-slate-300"
                  }`}
                />
                <span className="min-w-0 flex-1 break-words">
                  Company Directory
                </span>
                <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">
                  {companies.length}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={[
                    "shrink-0 transition-transform duration-200",
                    isDirectoryOpen ? "rotate-180" : "rotate-0",
                    isDirectoryOpen ? "text-white" : "text-slate-300",
                  ].join(" ")}
                />
              </button>

              {/* Dropdown: opens right below the Company Directory item */}
              {isDirectoryOpen && (
                <div
                  id="submenu-company-directory"
                  className="ml-4 mt-1 border-l border-white/15 pl-3 sm:ml-5"
                >
                  <h3 className="px-3 pb-1 pt-1 text-xs font-semibold text-slate-300">
                    Registered companies
                  </h3>

                  {loadingCompanies && companies.length === 0 && (
                    <p className="px-3 py-2 text-sm text-slate-300">
                      Loading companies...
                    </p>
                  )}

                  {!loadingCompanies && companyError && (
                    <div className="px-3 py-2">
                      <p className="break-words text-sm text-red-300">
                        {companyError}
                      </p>

                      <button
                        type="button"
                        onClick={fetchCompanies}
                        className={`mt-2 rounded py-1 text-sm font-medium text-teal-300 underline hover:text-teal-200 ${focusRing}`}
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {!loadingCompanies &&
                    !companyError &&
                    companies.length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-300">
                        No companies registered yet.
                      </p>
                    )}

                  {/* Long lists scroll inside the dropdown instead of stretching the sidebar */}
                  <ul className="max-h-[40dvh] space-y-1 overflow-y-auto overscroll-contain [scrollbar-color:#64748b_transparent] [scrollbar-width:thin] sm:max-h-72">
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
                              <span className="block text-xs font-normal text-red-300">
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
                      className={`mt-1 rounded px-3 py-2 text-sm font-medium text-teal-300 underline hover:text-teal-200 disabled:opacity-60 ${focusRing}`}
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

export default Sidebar;