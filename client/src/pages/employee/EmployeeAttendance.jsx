import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  LogIn,
  LogOut,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  UserRound,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

// =========================================
// DATE & TIME HELPERS
// =========================================

const getTodayDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const formatTime = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusClasses = (status) => {
  switch (status) {
    case "Checked Out":
      return "bg-emerald-50 text-emerald-700";

    case "Checked In":
      return "bg-blue-50 text-blue-700";

    case "Not Checked In":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-slate-100 text-slate-600";
  }
};

// =========================================
// EMPLOYEE ATTENDANCE PAGE
// =========================================

const EmployeeAttendance = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [myAttendance, setMyAttendance] = useState(null);
  const [companyAttendance, setCompanyAttendance] = useState([]);

  const [summary, setSummary] = useState({
    totalEmployees: 0,
    checkedIn: 0,
    checkedOut: 0,
    notCheckedIn: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  // =========================================
  // LOAD MY ATTENDANCE
  // EMPLOYEE ONLY
  // =========================================

  const loadMyAttendance = useCallback(async () => {
    const response = await api.get("/attendance/my-attendance");

    const records =
      response.data?.attendance ||
      response.data?.records ||
      [];

    const todayRecord = records.find(
      (item) => item.attendanceDate === getTodayDate()
    );

    setMyAttendance(todayRecord || null);
  }, []);

  // =========================================
  // LOAD COMPANY ATTENDANCE
  // EMPLOYEE ONLY
  // =========================================

  const loadCompanyAttendance = useCallback(async (date) => {
    const response = await api.get("/attendance/company", {
      params: { date },
    });

    setCompanyAttendance(response.data?.records || []);

    setSummary({
      totalEmployees: response.data?.totalEmployees || 0,
      checkedIn: response.data?.checkedIn || 0,
      checkedOut: response.data?.checkedOut || 0,
      notCheckedIn: response.data?.notCheckedIn || 0,
    });
  }, []);

  // =========================================
  // LOAD ALL ATTENDANCE DATA
  // =========================================

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMyAttendance(),
        loadCompanyAttendance(selectedDate),
      ]);
} catch (err) {
  toast.error(
    err.response?.data?.message ||
      "Failed to load attendance information."
  );
} finally {
      setLoading(false);
    }
  }, [
    loadMyAttendance,
    loadCompanyAttendance,
    selectedDate,
  ]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // =========================================
  // EMPLOYEE CHECK IN
  // =========================================

  const handleCheckIn = async () => {
    setActionLoading("check-in");
    try {
      const response = await api.post("/attendance/check-in");
toast.success(
  response.data?.message ||
    "Checked in successfully."
);
      await loadAttendance();
} catch (err) {
  toast.error(
    err.response?.data?.message ||
      "Unable to check in."
  );
} finally {
      setActionLoading("");
    }
  };

  // =========================================
  // EMPLOYEE CHECK OUT
  // =========================================

const handleCheckOut = () => {
  toast.info(
    ({ closeToast }) => (
      <div>
        <p className="mb-3 text-sm font-medium text-slate-800">
          You don't need to check out for lunch or any other break.
          Please check out only when your shift ends.
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeToast}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={async () => {
              closeToast();

              setActionLoading("check-out");

              try {
                const response = await api.patch(
                  "/attendance/check-out"
                );

                toast.success(
                  response.data?.message ||
                    "Checked out successfully."
                );

                await loadAttendance();
              } catch (err) {
                toast.error(
                  err.response?.data?.message ||
                    "Unable to check out."
                );
              } finally {
                setActionLoading("");
              }
            }}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            OK
          </button>
        </div>
      </div>
    ),
    {
      position: "top-right",
      autoClose: false,
      closeOnClick: false,
      pauseOnHover: true,
      closeButton: false,
    }
  );
};

  // =========================================
  // ATTENDANCE STATUS
  // =========================================

  const checkedIn = Boolean(myAttendance?.checkIn);
  const checkedOut = Boolean(myAttendance?.checkOut);

  const isToday = selectedDate === getTodayDate();

  const getEmployeeName = (employee) => {
    return employee?.name || "Unknown employee";
  };

  const getEmployeeId = (employee) => {
    return employee?.empId || "—";
  };

  // =========================================
  // UI
  // =========================================

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
              Attendance
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your attendance and view company attendance.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAttendance}
          disabled={loading || Boolean(actionLoading)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />

          Refresh
        </button>
      </div>

      {/* =========================================
          MY ATTENDANCE
      ========================================= */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-800">
            My Attendance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Check in when you start work and check out when you finish.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-5 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" />
            Loading your attendance...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* Check In Time */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <LogIn size={17} />
                  Check In
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {formatTime(myAttendance?.checkIn)}
                </p>
              </div>

              {/* Check Out Time */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <LogOut size={17} />
                  Check Out
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {formatTime(myAttendance?.checkOut)}
                </p>
              </div>

            </div>

            {/* Check In / Check Out Buttons */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={handleCheckIn}
                disabled={
                  !isToday ||
                  checkedIn ||
                  Boolean(actionLoading)
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "check-in" ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <LogIn size={17} />
                )}

                {checkedIn ? "Already Checked In" : "Check In"}
              </button>

              <button
                type="button"
                onClick={handleCheckOut}
                disabled={
                  !isToday ||
                  !checkedIn ||
                  checkedOut ||
                  Boolean(actionLoading)
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "check-out" ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <LogOut size={17} />
                )}

                {checkedOut
                  ? "Already Checked Out"
                  : "Check Out"}
              </button>

            </div>

            {!isToday && (
              <p className="mt-3 text-xs text-amber-700">
                You can only check in or check out for today's date.
              </p>
            )}

            {checkedIn && !checkedOut && isToday && (
              <p className="mt-3 text-sm text-blue-700">
                You have checked in. Don't forget to check out when you finish work.
              </p>
            )}

            {checkedOut && (
              <p className="mt-3 text-sm text-emerald-700">
                Your attendance for today is complete.
              </p>
            )}
          </>
        )}
      </section>

      {/* =========================================
          COMPANY ATTENDANCE
      ========================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Section Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Company Attendance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              View attendance records of company employees by date.
            </p>
          </div>

          <div className="w-full sm:w-56">
            <label
              htmlFor="attendance-date"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Select Date
            </label>

            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              max={getTodayDate()}
              onChange={(event) =>
                setSelectedDate(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">
              Total Employees
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-800">
              {summary.totalEmployees}
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-medium text-blue-700">
              Checked In
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-700">
              {summary.checkedIn}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-700">
              Checked Out
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {summary.checkedOut}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700">
              Not Checked In
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-700">
              {summary.notCheckedIn}
            </p>
          </div>

        </div>

        {/* Attendance Table */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" />
            Loading company attendance...
          </div>
        ) : companyAttendance.length === 0 ? (
          <div className="p-10 text-center">
            <Users
              size={32}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 font-medium text-slate-700">
              No employees found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              No attendance information is available for this date.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Employee
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Employee ID
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Department
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Check In
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Check Out
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {companyAttendance.map((record, index) => {
                  const employee = record.employee;

                  return (
                    <tr
                      key={employee?._id || index}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="rounded-full bg-slate-100 p-2 text-slate-500">
                            <UserRound size={16} />
                          </div>

                          <span className="font-medium text-slate-800">
                            {getEmployeeName(employee)}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {getEmployeeId(employee)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {employee?.departmentId?.departmentName || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatTime(record.checkIn)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatTime(record.checkOut)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(record.status)}`}
                        >
                          {record.status || "Not Checked In"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Showing attendance for {formatDate(selectedDate)}
        </div>

      </section>
    </div>
  );
};

export default EmployeeAttendance;