import { useCallback, useEffect, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Menu } from "lucide-react";

import api from "../api/axios";
import EmployeeSidebar from "../components/employee/EmployeeSidebar";

// Tailwind `lg` breakpoint. Below this the sidebar is an overlay drawer,
// at/above it the sidebar pushes the content (desktop behaviour).
const DESKTOP_QUERY = "(min-width: 1024px)";

const isDesktopNow = () =>
  typeof window === "undefined" ? true : window.matchMedia(DESKTOP_QUERY).matches;

const EmployeeLayout = () => {
  // Desktop: open by default. Mobile / tablet: closed by default.
  const [sidebarOpen, setSidebarOpen] = useState(isDesktopNow);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { employeeId } = useParams();

  // When the screen crosses the breakpoint (rotate phone, resize window),
  // pick the sensible default: open on desktop, closed on mobile/tablet.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setSidebarOpen(e.matches);

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // On mobile / tablet, close the drawer after navigating to a page.
  useEffect(() => {
    if (!isDesktopNow()) setSidebarOpen(false);
  }, [pathname]);

  const fetchEmployeeProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/employees/profile/me", {
        withCredentials: true,
      });

      if (!data?.success || !data?.employee) {
        throw new Error(data?.message || "Employee profile not found.");
      }

      const employeeData = data.employee;

      setEmployee(employeeData);

      if (employeeId && String(employeeData._id) !== String(employeeId)) {
        navigate(`/employee/${employeeData._id}/dashboard`, {
          replace: true,
        });
      }
    } catch (err) {
      const status = err.response?.status;

      if (status === 401 || status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load employee profile."
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId, navigate]);

  useEffect(() => {
    fetchEmployeeProfile();
  }, [fetchEmployeeProfile]);

  const handleLogout = async () => {
    try {
      await api.post("/employees/logout", {}, { withCredentials: true });
    } catch (err) {
      console.error(
        "Logout error:",
        err.response?.data?.message || err.message
      );
    } finally {
      setEmployee(null);
      navigate("/employee/login", { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-slate-600">
            Loading employee profile...
          </p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">
            Unable to load profile
          </h2>
          <p className="mt-2 break-words text-sm text-red-600">
            {error || "Employee profile not found."}
          </p>
          <button
            type="button"
            onClick={fetchEmployeeProfile}
            className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-100">
      <div className="flex min-h-dvh">
        {/* Sidebar:
            - below lg  -> slide-in drawer with a dark backdrop
            - lg and up -> sticky column that animates its own width */}
        <EmployeeSidebar
          open={sidebarOpen}
          employee={employee}
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
              {employee?.name || "Employee"}
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
              <Outlet
                context={{
                  employee,
                  setEmployee,
                  refreshEmployee: fetchEmployeeProfile,
                }}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLayout;