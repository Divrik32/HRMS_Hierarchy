import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/SuperAdmin/Navbar";
import Sidebar from "../components/SuperAdmin/Sidebar";

import api from "../api/axios";

// Tailwind `lg` breakpoint. Below this the sidebar is an overlay drawer,
// at/above it the sidebar sits beside the content (desktop behaviour).
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
        <p className="text-center text-sm font-medium text-slate-600 sm:text-base">
          Loading Super Admin dashboard...
        </p>
      </div>
    );
  }

  if (!superAdmin) {
    return null;
  }

  return (
    <div className="min-h-dvh bg-slate-100">
      <Navbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        superAdmin={superAdmin}
        onLogout={handleLogout}
      />

      <div className="flex">
        <Sidebar
          open={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
        />

        <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;