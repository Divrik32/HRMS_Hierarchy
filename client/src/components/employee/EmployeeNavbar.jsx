import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  UserRound,
  BriefcaseBusiness,
} from "lucide-react";

import api from "../../api/axios";

const EmployeeNavbar = ({
  sidebarOpen,
  setSidebarOpen,
  employee,
  onLogout,
}) => {
  const [dropdown, setDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const dropdownRef = useRef(null);
  const { employeeId: routeEmployeeId } = useParams();

  const employeeId = employee?._id || routeEmployeeId;
  const basePath = `/employee/${employeeId}`;

  const employeeName = employee?.name || "Employee";

  const designation =
    employee?.roleId?.roleName ||
    employee?.designation ||
    "Employee";

  const profilePic = employee?.profilePic
    ? employee.profilePic.startsWith("http")
      ? employee.profilePic
      : `${api.defaults.baseURL?.replace(/\/api\/?$/, "") || ""}/uploads/${employee.profilePic.replace(/^\/+/, "")}`
    : null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

const handleLogout = async () => {
  if (loggingOut) return;

  setLoggingOut(true);
  const toastId = toast.loading("Logging out...");

  try {
    await onLogout?.();

    toast.update(toastId, {
      render: "Logged out successfully.",
      type: "success",
      isLoading: false,
      autoClose: 2500,
    });
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        err.message ||
        "Failed to log out.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setLoggingOut(false);
    setDropdown(false);
  }
};

  return (
    <nav className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Left Section */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setSidebarOpen((previous) => !previous)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          {sidebarOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-slate-800 sm:text-lg">
            Employee Portal
          </h1>

          <p className="hidden text-xs text-slate-500 sm:block">
            Your workspace
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="relative ml-3" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdown((previous) => !previous)}
          aria-expanded={dropdown}
          aria-label="Employee account menu"
          className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50 sm:gap-3 sm:px-2"
        >
          <div className="hidden text-right sm:block">
            <h3 className="max-w-40 truncate text-sm font-semibold text-slate-800">
              {employeeName}
            </h3>

            <p className="max-w-40 truncate text-xs text-slate-500">
              {designation}
            </p>
          </div>

          {profilePic ? (
            <img
              src={profilePic}
              alt={`${employeeName}'s profile`}
              className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100 object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600">
              <UserRound size={21} />
            </div>
          )}

          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${
              dropdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {dropdown && (
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {/* Account Details */}
            <div className="border-b border-slate-100 p-4">
              <p className="truncate text-sm font-semibold text-slate-800">
                {employeeName}
              </p>

              <p className="mt-1 truncate text-xs text-slate-500">
                {employee?.email || "Employee account"}
              </p>

              {employee?.empId && (
                <p className="mt-2 text-xs text-slate-500">
                  Employee ID:{" "}
                  <span className="font-medium text-slate-700">
                    {employee.empId}
                  </span>
                </p>
              )}
            </div>

            {/* Profile Link */}
            <Link
              to={`${basePath}/profile`}
              onClick={() => setDropdown(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <UserRound size={17} className="text-slate-500" />
              My Profile
            </Link>

            <div className="border-t border-slate-100" />

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={17} />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default EmployeeNavbar;