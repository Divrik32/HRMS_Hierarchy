import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";

import api from "../api/axios";
import EmployeeNavbar from "../components/employee/EmployeeNavbar";
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
        throw new Error(
          data?.message || "Employee profile not found."
        );
      }

      const employeeData = data.employee;

      setEmployee(employeeData);

      // URL-এর employeeId logged-in employee-এর সঙ্গে না মিললে
      // নিজের dashboard-এ redirect করো।
      if (
        employeeId &&
        String(employeeData._id) !== String(employeeId)
      ) {
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
      await api.post(
        "/employees/logout",
        {},
        { withCredentials: true }
      );
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
      <EmployeeNavbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        employee={employee}
        onLogout={handleLogout}
      />

      <div className="flex">
        <EmployeeSidebar open={sidebarOpen} employee={employee} />

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet
            context={{
              employee,
              setEmployee,
              refreshEmployee: fetchEmployeeProfile,
            }}
          />
        </main>
      </div>
    </div>
  );
};

export default EmployeeLayout;