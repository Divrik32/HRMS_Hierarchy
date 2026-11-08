import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  RefreshCw,
  Search,
  Save,
  UserRound,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import api from "../../api/axios";

// =====================================================
// DATE HELPERS
// =====================================================

const getToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  const day = parts.find((part) => part.type === "day").value;

  return `${year}-${month}-${day}`;
};

const getIndiaTime = (date) => {
  if (!date) return "";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));

  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  return hour && minute ? `${hour}:${minute}` : "";
};

// =====================================================
// ATTENDANCE MANAGEMENT
// =====================================================

const AttendanceManagement = () => {
  const today = getToday();

  const [selectedDate, setSelectedDate] = useState(today);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // FETCH ATTENDANCE BY DATE
  // =====================================================

const fetchAttendance = async () => {
  if (!selectedDate) return;

  try {
    setLoading(true);
    setError("");
    setSuccess("");

    // Fetch company employees and attendance records separately
const [employeeResponse, attendanceResponse] = await Promise.all([
  api.get("/employees/my-company/employees"),
  api.get(`/attendance/company?date=${selectedDate}`),
]);

    if (!employeeResponse.data.success) {
      throw new Error(
        employeeResponse.data.message || "Failed to fetch company employees."
      );
    }

    if (!attendanceResponse.data.success) {
      throw new Error(
        attendanceResponse.data.message || "Failed to fetch attendance."
      );
    }

    const companyEmployees = employeeResponse.data.employees || [];
    const attendanceRecords = attendanceResponse.data.records || [];

    // Match attendance records with all active company employees
    const records = companyEmployees.map((employee) => {
      const attendanceRecord = attendanceRecords.find(
        (record) =>
          String(record.employee?._id) === String(employee._id)
      );

      return {
        employee,
        attendance: attendanceRecord?.attendance || null,
        checkIn: attendanceRecord?.checkIn || null,
        checkOut: attendanceRecord?.checkOut || null,
        status: attendanceRecord?.status || "Not Checked In",
      };
    });

    setEmployees(records);

    // Preserve selected employee after refresh/date change if available
    const existingEmployee = records.find(
      (record) =>
        String(record.employee._id) === String(selectedEmployeeId)
    );

    if (existingEmployee) {
      setCheckInTime(getIndiaTime(existingEmployee.attendance?.checkIn));
      setCheckOutTime(getIndiaTime(existingEmployee.attendance?.checkOut));
    } else {
      setSelectedEmployeeId("");
      setCheckInTime("");
      setCheckOutTime("");
    }
  } catch (err) {
    console.error("Fetch Attendance Error:", err);

    setEmployees([]);
    setSelectedEmployeeId("");
    setCheckInTime("");
    setCheckOutTime("");

    setError(
      err.response?.data?.message ||
        err.message ||
        "Unable to fetch company employees."
    );
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchAttendance();
    // Fetch records whenever the selected date changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // =====================================================
  // EMPLOYEE SEARCH
  // =====================================================

  const filteredEmployees = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return employees.filter(({ employee }) => {
      if (!employee) return false;

      return (
        !searchValue ||
        employee.empId?.toLowerCase().includes(searchValue) ||
        employee.name?.toLowerCase().includes(searchValue)
      );
    });
  }, [employees, search]);

  const selectedRecord = employees.find(
    (record) =>
      String(record.employee?._id) === String(selectedEmployeeId)
  );

  // =====================================================
  // SELECT EMPLOYEE
  // =====================================================

  const handleEmployeeChange = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setError("");
    setSuccess("");

    const record = employees.find(
      (item) => String(item.employee?._id) === String(employeeId)
    );

    setCheckInTime(getIndiaTime(record?.attendance?.checkIn));
    setCheckOutTime(getIndiaTime(record?.attendance?.checkOut));
  };

  // =====================================================
  // SAVE ATTENDANCE TIME
  // =====================================================

  const handleSave = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedEmployeeId) {
      setError("Please select an employee.");
      return;
    }

    if (!checkInTime && !checkOutTime) {
      setError("Please enter at least Check-in or Check-out time.");
      return;
    }

    try {
      setSaving(true);

const { data } = await api.put(
  "/attendance/update-employee-time",
  {
    employeeId: selectedEmployeeId,
    date: selectedDate,
    ...(checkInTime ? { checkInTime } : {}),
    ...(checkOutTime ? { checkOutTime } : {}),
  }
);

      if (data.success) {
        setSuccess(data.message || "Attendance updated successfully.");
        await fetchAttendance();
      } else {
        setError(data.message || "Failed to update attendance.");
      }
    } catch (err) {
      console.error("Update Attendance Error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to update attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Attendance Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Add or modify employee check-in and check-out times.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAttendance}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* DATE AND EMPLOYEE SELECTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <CalendarDays size={20} className="text-blue-600" />

            <h2 className="font-semibold text-slate-800">
              Select Employee and Date
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* DATE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Attendance Date
              </label>

              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* EMPLOYEE SEARCH */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Search Employee
              </label>

              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Employee ID or name"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* EMPLOYEE DROPDOWN */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Select Employee
              </label>

              <select
                value={selectedEmployeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="">
                  {loading
                    ? "Loading employees..."
                    : "Select an employee"}
                </option>

                {filteredEmployees.map(({ employee }) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.empId} - {employee.name}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-slate-500">
                {employees.length} active employee(s) found for this date.
              </p>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="shrink-0" />
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={19} className="shrink-0" />
            {success}
          </div>
        )}

        {/* ATTENDANCE FORM */}
        {selectedEmployeeId && selectedRecord && (
          <form
            onSubmit={handleSave}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <UserRound size={22} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-800">
                    {selectedRecord.employee.name}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Employee ID: {selectedRecord.employee.empId}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {selectedRecord.attendance ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    Existing Attendance Record
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    No Attendance Record - Add New
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-5 p-5">

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* CHECK IN */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Clock size={17} className="text-emerald-600" />
                    Check-in Time
                  </label>

                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => {
                      setCheckInTime(e.target.value);
                      setSuccess("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    {selectedRecord.attendance?.checkIn
                      ? "Modify the existing check-in time."
                      : "No check-in found. You can add one here."}
                  </p>
                </div>

                {/* CHECK OUT */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Clock size={17} className="text-red-500" />
                    Check-out Time
                  </label>

                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => {
                      setCheckOutTime(e.target.value);
                      setSuccess("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    {selectedRecord.attendance?.checkOut
                      ? "Modify the existing check-out time."
                      : "No check-out found. You can add one here."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500">
                  Date: {selectedDate}
                </p>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}

                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* EMPTY STATE */}
        {!loading && employees.length === 0 && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <CalendarDays
              size={38}
              className="mx-auto mb-3 text-slate-300"
            />

            <h3 className="font-semibold text-slate-700">
              No Active Employees Found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              No active employees were found for the selected date.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceManagement;