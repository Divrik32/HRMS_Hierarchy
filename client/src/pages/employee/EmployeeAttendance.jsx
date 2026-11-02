import { useCallback, useEffect, useMemo, useState } from "react";
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

const getCurrentMonth = () => {
  const today = getTodayDate();
  const [year, month] = today.split("-");

  return {
    month: Number(month),
    year: Number(year),
  };
};

const getEmployeeSearchText = (employee) => {
  return [
    employee?.name,
    employee?.empId,
    employee?.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

// =========================================
// EMPLOYEE ATTENDANCE PAGE
// =========================================

const EmployeeAttendance = () => {
const today = getTodayDate();
const currentMonth = getCurrentMonth();

const [selectedDate, setSelectedDate] = useState(today);

const [attendanceView, setAttendanceView] = useState("single");

const [startDate, setStartDate] = useState(today);
const [endDate, setEndDate] = useState(today);

const [selectedMonth, setSelectedMonth] = useState(
  String(currentMonth.month).padStart(2, "0")
);
const [selectedYear, setSelectedYear] = useState(
  String(currentMonth.year)
);

const [employeeSearch, setEmployeeSearch] = useState("");

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

// =========================================
// LOAD COMPANY ATTENDANCE
// SINGLE DATE / DATE RANGE / MONTHLY
// =========================================

const loadCompanyAttendance = useCallback(async () => {
  if (attendanceView === "range" && startDate > endDate) {
    toast.error("Start date cannot be after end date.");
    return;
  }
  
  if (
    attendanceView === "monthly" &&
    (!selectedYear ||
      !Number.isInteger(Number(selectedYear)) ||
      Number(selectedYear) < 1000 ||
      Number(selectedYear) > currentMonth.year)
  ) {
    toast.error("Please select a valid year.");
    return;
  }
  let response;

  if (attendanceView === "single") {
    response = await api.get("/attendance/company", {
      params: {
        date: selectedDate,
      },
    });
  } else if (attendanceView === "range") {
    response = await api.get("/attendance/date-range", {
      params: {
        startDate,
        endDate,
      },
    });
  } else {
    response = await api.get("/attendance/monthly", {
      params: {
        month: Number(selectedMonth),
        year: Number(selectedYear),
      },
    });
  }

  const records = response.data?.records || [];

  // Single date API already returns one attendance row per employee.
  // Range and monthly APIs return attendance arrays inside each employee row.
  const normalizedRecords =
    attendanceView === "single"
      ? records
      : records.flatMap((item) => {
          const attendanceRecords = item.attendance || [];

          if (attendanceRecords.length === 0) {
            return [
              {
                employee: item.employee,
                attendanceDate: null,
                checkIn: null,
                checkOut: null,
                status: "Not Checked In",
              },
            ];
          }

          return attendanceRecords.map((attendance) => ({
            ...attendance,
            employee: item.employee,
            attendanceDate: attendance.attendanceDate,
          }));
        });

  setCompanyAttendance(normalizedRecords);

  const totalEmployees =
    response.data?.totalEmployees || records.length;

  const checkedIn = normalizedRecords.filter(
    (item) => Boolean(item.checkIn)
  ).length;

  const checkedOut = normalizedRecords.filter(
    (item) => Boolean(item.checkOut)
  ).length;

  setSummary({
    totalEmployees,
    checkedIn,
    checkedOut,
    notCheckedIn: Math.max(0, totalEmployees - checkedIn),
  });
}, [
  attendanceView,
  selectedDate,
  startDate,
  endDate,
  selectedMonth,
  selectedYear,
]);

// =========================================
// LOAD ALL ATTENDANCE DATA
// =========================================

const loadAttendance = useCallback(async () => {
  setLoading(true);

  try {
    await Promise.all([
      loadMyAttendance(),
      loadCompanyAttendance(),
    ]);
  } catch (err) {
    toast.error(
      err.response?.data?.message ||
        "Failed to load attendance information."
    );
  } finally {
    setLoading(false);
  }
}, [loadMyAttendance, loadCompanyAttendance]);

useEffect(() => {
  loadAttendance();
}, [loadAttendance]);

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
// SEARCH EMPLOYEES
// NAME / EMPLOYEE ID / EMAIL
// =========================================

const filteredCompanyAttendance = useMemo(() => {
  const searchText = employeeSearch.trim().toLowerCase();

  if (!searchText) {
    return companyAttendance;
  }

  return companyAttendance.filter((record) =>
    getEmployeeSearchText(record.employee).includes(searchText)
  );
}, [companyAttendance, employeeSearch]);

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
<div className="space-y-5 border-b border-slate-200 p-5">
  <div>
    <h2 className="text-lg font-bold text-slate-800">
      Company Attendance
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      View employee attendance by single date, date range or month.
    </p>
  </div>

  {/* Attendance Tabs */}
  <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-100 p-1 sm:grid-cols-3">
    {[
      { value: "single", label: "Single Date" },
      { value: "range", label: "Date Range" },
      { value: "monthly", label: "Monthly" },
    ].map((tab) => (
      <button
        key={tab.value}
        type="button"
        onClick={() => setAttendanceView(tab.value)}
        className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${
          attendanceView === tab.value
            ? "bg-white text-blue-700 shadow-sm"
            : "text-slate-600 hover:bg-white/70"
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>

  {/* Date Selection */}
  {attendanceView === "single" && (
    <div className="max-w-xs">
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
        max={today}
        onChange={(event) => setSelectedDate(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  )}

  {attendanceView === "range" && (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label
          htmlFor="attendance-start-date"
          className="mb-1.5 block text-xs font-semibold text-slate-600"
        >
          Start Date
        </label>

        <input
          id="attendance-start-date"
          type="date"
          value={startDate}
          max={today}
          onChange={(event) => setStartDate(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor="attendance-end-date"
          className="mb-1.5 block text-xs font-semibold text-slate-600"
        >
          End Date
        </label>

        <input
          id="attendance-end-date"
          type="date"
          value={endDate}
          min={startDate}
          max={today}
          onChange={(event) => setEndDate(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </div>
  )}

  {attendanceView === "monthly" && (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label
          htmlFor="attendance-month"
          className="mb-1.5 block text-xs font-semibold text-slate-600"
        >
          Select Month
        </label>

        <select
          id="attendance-month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          {[
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ].map((month, index) => (
            <option
              key={month}
              value={String(index + 1).padStart(2, "0")}
            >
              {month}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="attendance-year"
          className="mb-1.5 block text-xs font-semibold text-slate-600"
        >
          Select Year
        </label>

        <input
          id="attendance-year"
          type="number"
          min="1000"
          max={currentMonth.year}
          value={selectedYear}
          onChange={(event) => setSelectedYear(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        />
      </div>
    </div>
  )}

  {/* Employee Search */}
  <div>
    <label
      htmlFor="attendance-search"
      className="mb-1.5 block text-xs font-semibold text-slate-600"
    >
      Search Employee
    </label>

    <div className="relative">
      <UserRound
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        id="attendance-search"
        type="text"
        value={employeeSearch}
        onChange={(event) => setEmployeeSearch(event.target.value)}
        placeholder="Search by employee name, ID or email..."
        className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
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
) : filteredCompanyAttendance.length === 0 ? (
  <div className="p-10 text-center">
    <Users
      size={32}
      className="mx-auto text-slate-300"
    />

    <p className="mt-3 font-medium text-slate-700">
      {employeeSearch
        ? "No matching employees found"
        : "No attendance records found"}
    </p>

    <p className="mt-1 text-sm text-slate-500">
      {employeeSearch
        ? "Try searching with another employee name, ID or email."
        : "No attendance information is available for this selection."}
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
                    Attendance Date
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
                {filteredCompanyAttendance.map((record, index) => {
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
                        {formatDate(record.attendanceDate)}
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
  Showing {filteredCompanyAttendance.length} attendance records
  {employeeSearch && " matching your search"}.
</div>

      </section>
    </div>
  );
};

export default EmployeeAttendance;