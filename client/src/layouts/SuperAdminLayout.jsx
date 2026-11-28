import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";

import Sidebar from "../components/SuperAdmin/Sidebar";
import api from "../api/axios";

// Tailwind `lg` breakpoint. Below this the sidebar is an overlay drawer,
// at/above it the sidebar pushes the content (desktop behaviour).
const DESKTOP_QUERY = "(min-width: 1024px)";

const isDesktopNow = () =>
  typeof window === "undefined" ? true : window.matchMedia(DESKTOP_QUERY).matches;

const SuperAdminLayout = () => {
  // Desktop: open by default. Mobile / tablet: closed by default.
  const [sidebarOpen, setSidebarOpen] = useState(isDesktopNow);
  const [superAdmin, setSuperAdmin] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const location = useLocation();
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
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        // Use login response immediately if available.
        const loginProfile = location.state?.superAdmin;

        if (loginProfile && !cancelled) {
          setSuperAdmin((prev) => prev || loginProfile);
        }

        const response = await api.get("/super-admin/profile");
        const result = response.data;

        if (!result.success) {
          throw new Error(result.message || "Authentication required");
        }

        if (!cancelled) {
          setSuperAdmin(result.superAdmin);
        }
      } catch (error) {
        if (!cancelled) {
          // Do not leave a protected dashboard open without authentication.
          navigate("/login", {
            replace: true,
            state: {
              message: "Please sign in to access the Super Admin dashboard.",
            },
          });
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [location.state, navigate]);

  const handleLogout = async () => {
    try {
      const response = await api.post("/super-admin/logout");
      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || "Logout failed.");
      }

      setSuperAdmin(null);
      navigate("/login", { replace: true });
    } catch (error) {
      window.alert(
        error.response?.data?.message ||
          error.message ||
          "Unable to sign out."
      );
    }
  };

  if (profileLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0e4a68]" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading Super Admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!superAdmin) {
    return null;
  }

  const adminName = superAdmin.name || superAdmin.fullName || "Super Admin";

  return (
    <div className="min-h-dvh bg-slate-100">
      <div className="flex min-h-dvh">
        {/* Sidebar:
            - below lg  -> slide-in drawer with a dark backdrop
            - lg and up -> sticky column that animates its own width */}
        <Sidebar
          open={sidebarOpen}
          superAdmin={superAdmin}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
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
              {adminName}
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

export default SuperAdminLayout;