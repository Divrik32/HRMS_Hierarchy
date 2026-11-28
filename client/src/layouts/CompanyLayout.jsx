import { useCallback, useEffect, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Menu } from "lucide-react";

import api from "../api/axios";
import CompanySidebar from "../components/company/CompanySidebar";

// Tailwind `lg` breakpoint. Below this the sidebar is an overlay drawer,
// at/above it the sidebar pushes the content (desktop behaviour).
const DESKTOP_QUERY = "(min-width: 1024px)";

const isDesktopNow = () =>
  typeof window === "undefined" ? true : window.matchMedia(DESKTOP_QUERY).matches;

const CompanyLayout = () => {
  // Desktop: open by default. Mobile / tablet: closed by default.
  const [sidebarOpen, setSidebarOpen] = useState(isDesktopNow);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const { companyId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Screen crosses the breakpoint (rotate phone / resize window):
  // open on desktop, closed on mobile + tablet.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setSidebarOpen(e.matches);

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // On mobile / tablet, close the drawer after going to another page.
  useEffect(() => {
    if (!isDesktopNow()) setSidebarOpen(false);
  }, [pathname]);

  const loadCompany = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get(`/companies/workspace/${companyId}`);

      const result = response.data;

      if (!result.success || !result.company) {
        throw new Error(result.message || "Failed to load company.");
      }

      setCompany(result.company);
    } catch (error) {
      console.error(
        "Failed to load company:",
        error.response?.data || error.message
      );

      setCompany(null);
      navigate("/super-admin/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [companyId, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await api.post("/companies/logout");
    } catch (error) {
      console.error(
        "Company logout error:",
        error.response?.data || error.message
      );
    } finally {
      setCompany(null);
      navigate("/super-admin/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0b1f3a]" />
          <p className="mt-4 text-sm text-slate-600">
            Loading company workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!company) return null;

  const companyName = company.name || company.companyName || "Company";

  return (
    <div className="min-h-dvh bg-slate-100">
      <div className="flex min-h-dvh">
        {/* Sidebar:
            - below lg  -> slide-in drawer with a dark backdrop
            - lg and up -> sticky column that animates its own width */}
        <CompanySidebar
          open={sidebarOpen}
          company={company}
          onLogout={handleLogout}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile / tablet top bar (hidden on desktop) */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:px-4 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <Menu size={22} />
            </button>

            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 sm:text-base">
              {companyName}
            </p>
          </header>

          <main className="flex min-w-0 flex-1 items-start gap-3 px-3 pb-4 pt-3 sm:px-4 md:px-6 md:pb-6">
            {/* Desktop hamburger: only on lg+, fades + grows in when the
                sidebar closes. Change `top-14` to move it up / down. */}
            <div
              aria-hidden={sidebarOpen}
              className={[
                "sticky top-14 hidden shrink-0 self-start overflow-hidden lg:block",
                "transition-all duration-300 ease-in-out motion-reduce:transition-none",
                sidebarOpen
                  ? "invisible -ml-3 w-0 opacity-0"
                  : "visible ml-0 w-10 opacity-100",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                aria-expanded={sidebarOpen}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <Menu size={22} />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CompanyLayout;