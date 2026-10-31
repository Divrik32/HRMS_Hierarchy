import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  CalendarDays,
  RefreshCw,
  Users,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LoaderCircle,
  History,
  X,
} from "lucide-react";

import api from "../../api/axios";

const getTodayDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

const formatTime = (value) => {
  if (!value) return "--";

  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (value) => {
  if (!value) return "--";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusClasses = (status) => {
  switch (status?.toLowerCase()) {
    case "present":
      return "bg-emerald-50 text-emerald-700";
    case "late":
      return "bg-amber-50 text-amber-700";
    case "absent":
      return "bg-red-50 text-red-700";
    case "half-day":
    case "half day":
      return "bg-orange-50 text-orange-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const CompanyAttendanceChecker = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [attendance, setAttendance] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadAttendance = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get(
        "/attendance/super-admin/company",
        {
          params: { date: selectedDate },
        }
      );

      setAttendance(
        response.data?.attendance ||
        response.data?.records ||
        []
      );
    } catch (err) {
  setAttendance([]);
  toast.error(
    err.response?.data?.message ||
      "Failed to load company attendance."
  );
}finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const loadEmployeeHistory = async (employee) => {
    const employeeId =
      employee?._id ||
      employee?.id ||
      employee?.employee?._id;

    if (!employeeId) {
      toast.error("Employee ID not found.");
      return;
    }

    setSelectedEmployee(employee);
    setEmployeeHistory([]);
    setHistoryLoading(true);

    try {
      const response = await api.get(
        "/attendance/super-admin/my-attendance",
        {
          params: { employeeId },
        }
      );

      setEmployeeHistory(
        response.data?.attendance ||
        response.data?.records ||
        []
      );
    } catch (err) {
  toast.error(
    err.response?.data?.message ||
      "Failed to load employee attendance history."
  );
} finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setSelectedEmployee(null);
    setEmployeeHistory([]);
  };

  const presentCount = attendance.filter(
    (item) =>
      ["present", "late", "half-day", "half day"].includes(
        item.status?.toLowerCase()
      ) || item.checkIn
  ).length;

  const checkedOutCount = attendance.filter(
    (item) => Boolean(item.checkOut)
  ).length;

  const employeeDetails = (record) =>
    record.employee || record.employeeId || {};

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <CalendarDays size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Attendance Checker
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View company employee attendance by date.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadAttendance(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Date selector */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label
          htmlFor="attendance-date"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Select Attendance Date
        </label>

        <input
          id="attendance-date"
          type="date"
          value={selectedDate}
          max={getTodayDate()}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 sm:max-w-xs"
        />
      </section>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Total Attendance Records
            </p>
            <Users className="text-blue-600" size={21} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-800">
            {attendance.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Checked In
            </p>
            <CheckCircle2 className="text-emerald-600" size={21} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-800">
            {presentCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Checked Out
            </p>
            <Clock3 className="text-indigo-600" size={21} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-800">
            {checkedOutCount}
          </p>
        </div>
      </div>

      {/* Attendance Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Company Attendance
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Attendance records for {formatDate(selectedDate)}
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {attendance.length} records
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" />
            Loading attendance...
          </div>
        ) : attendance.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarDays
              size={34}
              className="mx-auto text-slate-300"
            />
            <p className="mt-3 font-medium text-slate-700">
              No attendance records found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              No employee attendance has been recorded for this date.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Check In</th>
                  <th className="px-5 py-4">Check Out</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">History</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {attendance.map((record, index) => {
                  const employee = employeeDetails(record);

                  return (
                    <tr
                      key={record._id || index}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {employee.name || "Unknown employee"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {employee.empId || "--"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {employee.departmentId?.departmentName ||
                          employee.department?.departmentName ||
                          "--"}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700">
                        {formatTime(record.checkIn)}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700">
                        {formatTime(record.checkOut)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(record.status)}`}
                        >
                          {record.status || (record.checkIn ? "Present" : "Not recorded")}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            loadEmployeeHistory({
                              ...employee,
                              _id: employee._id || record.employeeId?._id,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <History size={14} />
                          View History
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Employee History Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Attendance History
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedEmployee.name || "Employee"}{" "}
                  {selectedEmployee.empId
                    ? `(${selectedEmployee.empId})`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={closeHistory}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto p-5">
              {historyLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                  <LoaderCircle size={18} className="animate-spin" />
                  Loading history...
                </div>
              ) : employeeHistory.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No attendance history found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Check In</th>
                        <th className="px-4 py-3">Check Out</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {employeeHistory.map((record, index) => (
                        <tr key={record._id || index}>
                          <td className="px-4 py-3 text-slate-700">
                            {formatDate(
                              record.attendanceDate || record.date
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatTime(record.checkIn)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatTime(record.checkOut)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(record.status)}`}
                            >
                              {record.status || "--"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAttendanceChecker;