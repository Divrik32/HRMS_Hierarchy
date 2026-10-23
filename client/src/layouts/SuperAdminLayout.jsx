
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/SuperAdmin/Navbar";
import Sidebar from "../components/SuperAdmin/Sidebar";

import api from "../api/axios";

const SuperAdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [superAdmin, setSuperAdmin] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

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
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600 font-medium">
          Loading Super Admin dashboard...
        </p>
      </div>
    );
  }

  if (!superAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        superAdmin={superAdmin}
        onLogout={handleLogout}
      />

      <div className="flex">
        <Sidebar
          open={sidebarOpen}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;