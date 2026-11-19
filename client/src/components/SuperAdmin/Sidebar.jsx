import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  UserCircle,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import api from "../../api/axios";

// =========================================
// COLOR TOKENS (WCAG AA contrast on navy)
// Rail bg      #0b1f3a
// Flyout bg    #10294d
// Main text    slate-100 / white      (~15:1)
// Muted text   slate-300              (~10:1)
// Accent       teal-300 on navy       (~10:1)
// Error/inactive red-300              (~7:1)
// =========================================

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1f3a]";

const flyoutFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300";

// onLogout: pass your real logout handler from the parent.
const Sidebar = ({ open, setSelectedCompany, onLogout }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sidebarRef = useRef(null);
  const closeTimer = useRef(null);

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyError, setCompanyError] = useState("");

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
  const openFlyout = (groupId, itemEl, estimatedHeight) => {
    cancelClose();

    if (itemEl && sidebarRef.current) {
      const itemRect = itemEl.getBoundingClientRect();
      const asideRect = sidebarRef.current.getBoundingClientRect();
      const height = Math.min(estimatedHeight, window.innerHeight * 0.7);
      const top = Math.max(
        8,
        Math.min(itemRect.top, window.innerHeight - height - 8)
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
      window.removeEventListener(
        "companies-updated",
        handleCompaniesUpdated
      );
    };
  }, [fetchCompanies]);

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

  const handleCompanyClick = (company) => {
    setSelectedCompany?.(company);
    setOpenGroupId(null);
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
  const idleStyle =
    "text-slate-100 hover:bg-white/10 hover:text-white";

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
              className={isActive ? "text-teal-300" : "text-slate-300"}
            />
            <span className="flex-1">{link.label}</span>
          </>
        )}
      </NavLink>
    );
  };

  // ---------- Company Directory (group with custom flyout) ----------
  const directoryId = "company-directory";
  const isDirectoryOpen = openGroupId === directoryId;
  const directoryOwnsRoute = pathname.startsWith("/super-admin/company/");
  const directoryEstimatedHeight = Math.max(companies.length, 2) * 40 + 90;

  return (
    <aside
      ref={sidebarRef}
      onScroll={() => setOpenGroupId(null)}
      className="sticky top-16 z-40 flex h-[calc(100vh-64px)] w-64 shrink-0 flex-col self-start overflow-y-auto overflow-x-hidden bg-[#0b1f3a] p-4 [scrollbar-color:#64748b_transparent] [scrollbar-width:thin]"
    >
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

            <p className="text-xs text-slate-300">
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
        <div
          onMouseEnter={(e) =>
            openFlyout(
              directoryId,
              e.currentTarget.firstElementChild,
              directoryEstimatedHeight
            )
          }
          onMouseLeave={scheduleClose}
        >
          <button
            type="button"
            onClick={(e) =>
              openFlyout(
                directoryId,
                e.currentTarget,
                directoryEstimatedHeight
              )
            }
            aria-expanded={isDirectoryOpen}
            aria-haspopup="true"
            aria-controls={`flyout-${directoryId}`}
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
              className={
                directoryOwnsRoute ? "text-teal-300" : "text-slate-300"
              }
            />
            <span className="flex-1">Company Directory</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">
              {companies.length}
            </span>
            <ChevronRight
              size={16}
              aria-hidden="true"
              className={
                isDirectoryOpen ? "text-white" : "text-slate-300"
              }
            />
          </button>

          {isDirectoryOpen && (
            <div
              id={`flyout-${directoryId}`}
              style={{
                position: "fixed",
                top: flyoutPos.top,
                left: flyoutPos.left,
                paddingLeft: flyoutPos.bridge,
              }}
              className="z-50 w-auto"
            >
              <div className="relative w-72 rounded-xl border border-white/15 bg-[#10294d] shadow-xl shadow-black/30">
                {/* pointer arrow toward the hovered item */}
                <span
                  aria-hidden="true"
                  style={{ top: flyoutPos.arrowTop }}
                  className="absolute -left-1.5 h-3 w-3 rotate-45 border-b border-l border-white/15 bg-[#10294d]"
                />

                <div className="relative max-h-[70vh] overflow-y-auto overscroll-contain rounded-xl p-2 [scrollbar-color:#64748b_transparent] [scrollbar-width:thin]">
                  <h3 className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-300">
                    Registered companies
                  </h3>

                  {loadingCompanies && companies.length === 0 && (
                    <p className="px-3 py-2 text-sm text-slate-300">
                      Loading companies...
                    </p>
                  )}

                  {!loadingCompanies && companyError && (
                    <div className="px-3 py-2">
                      <p className="text-sm text-red-300">
                        {companyError}
                      </p>

                      <button
                        type="button"
                        onClick={fetchCompanies}
                        className={`mt-2 rounded text-sm font-medium text-teal-300 underline hover:text-teal-200 ${flyoutFocusRing}`}
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

                  <ul className="space-y-1">
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
                            aria-current={
                              isActiveCompany ? "page" : undefined
                            }
                            className={[
                              "block w-full break-words rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                              flyoutFocusRing,
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
                      className={`mt-1 rounded px-3 py-2 text-sm font-medium text-teal-300 underline hover:text-teal-200 disabled:opacity-60 ${flyoutFocusRing}`}
                    >
                      {loadingCompanies ? "Refreshing..." : "Refresh list"}
                    </button>
                  )}
                </div>
              </div>
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