import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { Menu } from "lucide-react";

import api from "../api/axios";
import EmployeeSidebar from "../components/employee/EmployeeSidebar";

const EmployeeLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { employeeId } = useParams();

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
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
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
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">
            Unable to load profile
          </h2>
          <p className="mt-2 text-sm text-red-600">
            {error || "Employee profile not found."}
          </p>
          <button
            type="button"
            onClick={fetchEmployeeProfile}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        {/* Sidebar (always mounted; it animates its own width + slide) */}
        <EmployeeSidebar
          open={sidebarOpen}
          employee={employee}
          onLogout={handleLogout}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main content. It slides left/right smoothly because the
            sidebar wrapper animates its width. */}
        <main className="flex min-h-screen min-w-0 flex-1 items-start gap-3 px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3">
          {/* Hamburger: always mounted, fades + grows in when the sidebar
              closes, fades + shrinks out when it opens.
              Change `top-14` to move it up / down. */}
          <div
            aria-hidden={sidebarOpen}
            className={[
              "sticky top-14 shrink-0 self-start overflow-hidden",
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
  );
};

export default EmployeeLayout;