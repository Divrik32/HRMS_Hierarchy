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

// onLogout: pass your real logout handler from the parent.
const Sidebar = ({ open, setSelectedCompany, onLogout }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyError, setCompanyError] = useState("");

  // Company Directory dropdown: null = follow route, true/false = user toggled
  const [directoryToggled, setDirectoryToggled] = useState(null);

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

  if (!open) return null;

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
              className={isActive ? "text-teal-300" : "text-slate-300"}
            />
            <span className="flex-1">{link.label}</span>
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
    <aside className="sticky top-16 z-40 flex h-[calc(100vh-64px)] w-64 shrink-0 flex-col self-start overflow-y-auto overflow-x-hidden bg-[#0b1f3a] p-4 [scrollbar-color:#64748b_transparent] [scrollbar-width:thin]">
      {/* Header */}
      <div className="mb-5 px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-300 text-[#0b1f3a]">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">
              Super Admin
            </h2>

            <p className="text-xs text-slate-300">Company Administration</p>
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
              className={directoryOwnsRoute ? "text-teal-300" : "text-slate-300"}
            />
            <span className="flex-1">Company Directory</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">
              {companies.length}
            </span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={[
                "transition-transform duration-200",
                isDirectoryOpen ? "rotate-180" : "rotate-0",
                isDirectoryOpen ? "text-white" : "text-slate-300",
              ].join(" ")}
            />
          </button>

          {/* Dropdown: opens right below the Company Directory item */}
          {isDirectoryOpen && (
            <div
              id="submenu-company-directory"
              className="ml-5 mt-1 border-l border-white/15 pl-3"
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
                  <p className="text-sm text-red-300">{companyError}</p>

                  <button
                    type="button"
                    onClick={fetchCompanies}
                    className={`mt-2 rounded text-sm font-medium text-teal-300 underline hover:text-teal-200 ${focusRing}`}
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loadingCompanies && !companyError && companies.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-300">
                  No companies registered yet.
                </p>
              )}

              {/* Long lists scroll inside the dropdown instead of stretching the sidebar */}
              <ul className="max-h-72 space-y-1 overflow-y-auto overscroll-contain [scrollbar-color:#64748b_transparent] [scrollbar-width:thin]">
                {companies.map((company) => {
                  const isActiveCompany =
                    pathname === `/super-admin/company/${company._id}` ||
                    pathname.startsWith(`/super-admin/company/${company._id}/`);

                  return (
                    <li key={company._id}>
                      <button
                        type="button"
                        onClick={() => handleCompanyClick(company)}
                        title={company.companyName}
                        aria-current={isActiveCompany ? "page" : undefined}
                        className={[
                          "block w-full break-words rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
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
  );
};

export default Sidebar;