import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  CalendarDays,
  RefreshCw,
  Users,
  Clock3,
  CheckCircle2,
  LoaderCircle,
  History,
  LogIn,
  LogOut,
  UserRound,
  Building2,
  X,
} from "lucide-react";

import api from "../../api/axios";

// =========================================
// DATE & TIME HELPERS
// =========================================

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

const getDateKeysBetween = (startDate, endDate) => {
  if (!startDate || !endDate || startDate > endDate) return [];

  const dates = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const last = new Date(`${endDate}T00:00:00Z`);

  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

const getMonthDateKeys = (month, year) => {
  const totalDays = new Date(Number(year), Number(month), 0).getDate();

  return Array.from(
    { length: totalDays },
    (_, index) =>
      `${year}-${String(month).padStart(2, "0")}-${String(
        index + 1
      ).padStart(2, "0")}`
  );
};

const getMonthLabel = (dateKey) =>
  new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const getDayNumber = (dateKey) => Number(dateKey.slice(8, 10));

const getWeekdayShort = (dateKey) =>
  new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    timeZone: "UTC",
  });

const isSunday = (dateKey) =>
  new Date(`${dateKey}T00:00:00Z`).getUTCDay() === 0;

const getAttendanceDateKey = (date) => {
  if (!date) return "";

  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return new Date(date).toISOString().slice(0, 10);
};

const getEmployeeSearchText = (employee) =>
  [employee?.name, employee?.empId, employee?.email]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const getStatusClasses = (status) => {
  switch (status?.toLowerCase()) {
    case "present":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "late":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "absent":
      return "bg-red-50 text-red-700 ring-red-200";
    case "half-day":
    case "half day":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

const getStatusDot = (status) => {
  switch (status?.toLowerCase()) {
    case "present":
      return "bg-emerald-500";
    case "late":
      return "bg-amber-500";
    case "absent":
      return "bg-red-500";
    case "half-day":
    case "half day":
      return "bg-orange-500";
    default:
      return "bg-slate-400";
  }
};

// =========================================
// AVATAR HELPERS
// =========================================

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

const getInitials = (name) => {
  if (!name) return "";

  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name) => {
  const text = String(name || "");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1000;
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const Avatar = ({ name, size = "md" }) => {
  const initials = getInitials(name);
  const sizeClasses =
    size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizeClasses} ${getAvatarColor(
        name
      )}`}
    >
      {initials || <UserRound size={16} />}
    </div>
  );
};

// =========================================
// SCROLL STYLES
// Top horizontal scrollbar + right vertical scrollbar
// =========================================

const SCROLLBAR_CSS = `
.att-scroll {
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
}
.att-scroll::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
.att-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
}
.att-scroll::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 999px;
  border: 3px solid #f1f5f9;
}
.att-scroll::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
.att-scroll-main::-webkit-scrollbar:horizontal {
  height: 0;
  display: none;
}
.att-scroll-top {
  overflow-x: auto;
  overflow-y: hidden;
}
`;

// =========================================
// DUAL SCROLL TABLE WRAPPER
// - Horizontal scrollbar on TOP (synced)
// - Vertical scrollbar on the RIGHT
// - Bottom horizontal scrollbar hidden
// =========================================

const DualScrollTable = ({ children, maxHeight = "68vh" }) => {
  const topRef = useRef(null);
  const mainRef = useRef(null);
  const contentRef = useRef(null);

  const [contentWidth, setContentWidth] = useState(0);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [scrollbarHeight, setScrollbarHeight] = useState(0);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    const main = mainRef.current;

    if (!content || !main) return undefined;

    const measure = () => {
      setContentWidth(content.offsetWidth);
      setScrollbarWidth(main.offsetWidth - main.clientWidth);
      setScrollbarHeight(main.offsetHeight - main.clientHeight);
      setOverflowing(content.offsetWidth > main.clientWidth + 1);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(content);
    observer.observe(main);

    return () => observer.disconnect();
  }, []);

  const handleTopScroll = () => {
    const top = topRef.current;
    const main = mainRef.current;

    if (top && main && main.scrollLeft !== top.scrollLeft) {
      main.scrollLeft = top.scrollLeft;
    }
  };

  const handleMainScroll = () => {
    const top = topRef.current;
    const main = mainRef.current;

    if (top && main && top.scrollLeft !== main.scrollLeft) {
      top.scrollLeft = main.scrollLeft;
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <style>{SCROLLBAR_CSS}</style>

      {/* Top horizontal scrollbar */}
      <div
        ref={topRef}
        onScroll={handleTopScroll}
        className="att-scroll att-scroll-top border-b border-slate-200 bg-slate-100"
        style={{
          marginRight: scrollbarWidth,
          display: overflowing ? "block" : "none",
        }}
        aria-hidden="true"
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>

      {/* Wrapper clips the bottom horizontal scrollbar (all browsers) */}
      <div className="overflow-hidden">
        <div
          ref={mainRef}
          onScroll={handleMainScroll}
          className="att-scroll att-scroll-main overflow-auto"
          style={{
            maxHeight: `calc(${maxHeight} + ${scrollbarHeight}px)`,
            marginBottom: -scrollbarHeight,
          }}
        >
          <div ref={contentRef} className="w-max min-w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================
// SMALL UI PIECES
// =========================================

const TimePill = ({ value, type }) => {
  if (!value) {
    return <span className="text-slate-300">—</span>;
  }

  const isIn = type === "in";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums ring-1 ring-inset ${
        isIn
          ? "bg-blue-50 text-blue-700 ring-blue-100"
          : "bg-emerald-50 text-emerald-700 ring-emerald-100"
      }`}
    >
      {isIn ? <LogIn size={12} /> : <LogOut size={12} />}
      {formatTime(value)}
    </span>
  );
};

const StatusBadge = ({ status, label }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
      status
    )}`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(status)}`} />
    {label}
  </span>
);

// =========================================
// COMPANY ATTENDANCE CHECKER PAGE
// =========================================

const CompanyAttendanceChecker = () => {
  const today = getTodayDate();
  const currentDate = new Date(`${today}T00:00:00`);
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [attendanceView, setAttendanceView] = useState("single");

  const [selectedDate, setSelectedDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [selectedMonth, setSelectedMonth] = useState(
    String(currentMonth).padStart(2, "0")
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const [employeeSearch, setEmployeeSearch] = useState("");

  const [attendance, setAttendance] = useState([]);
  const [attendanceGroups, setAttendanceGroups] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // =========================================
  // LOAD ATTENDANCE
  // SINGLE DATE / DATE RANGE / MONTHLY
  // =========================================

  const loadAttendance = useCallback(
    async (showRefresh = false) => {
      if (attendanceView === "range" && startDate > endDate) {
        toast.error("Start date cannot be after end date.");
        return;
      }

      if (
        attendanceView === "monthly" &&
        (!selectedYear ||
          !Number.isInteger(Number(selectedYear)) ||
          Number(selectedYear) < 1000 ||
          Number(selectedYear) > currentYear ||
          !selectedMonth ||
          Number(selectedMonth) < 1 ||
          Number(selectedMonth) > 12)
      ) {
        toast.error("Please select a valid month and year.");
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        let response;

        if (attendanceView === "single") {
          response = await api.get("/attendance/super-admin/company", {
            params: { date: selectedDate },
          });
        } else if (attendanceView === "range") {
          response = await api.get("/attendance/super-admin/date-range", {
            params: { startDate, endDate },
          });
        } else {
          response = await api.get("/attendance/super-admin/monthly", {
            params: {
              month: Number(selectedMonth),
              year: Number(selectedYear),
            },
          });
        }

        const records =
          response.data?.attendance || response.data?.records || [];

        if (attendanceView === "single") {
          setAttendance(records);
          setAttendanceGroups([]);
        } else {
          setAttendanceGroups(records);

          // Flatten employee-wise attendance for summary calculation.
          const flattened = records.flatMap((item) =>
            (item.attendance || []).map((record) => ({
              ...record,
              employee: item.employee,
            }))
          );

          setAttendance(flattened);
        }
      } catch (err) {
        setAttendance([]);
        setAttendanceGroups([]);

        toast.error(
          err.response?.data?.message ||
            "Failed to load company attendance."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      attendanceView,
      selectedDate,
      startDate,
      endDate,
      selectedMonth,
      selectedYear,
      currentYear,
    ]
  );

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // =========================================
  // EMPLOYEE HISTORY
  // =========================================

  const loadEmployeeHistory = async (employee) => {
    const employeeId =
      employee?._id || employee?.id || employee?.employee?._id;

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
        response.data?.attendance || response.data?.records || []
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

  // =========================================
  // DERIVED DATA
  // =========================================

  const matrixDates = useMemo(() => {
    if (attendanceView === "range") {
      return getDateKeysBetween(startDate, endDate);
    }

    if (attendanceView === "monthly") {
      return getMonthDateKeys(selectedMonth, selectedYear);
    }

    return [];
  }, [attendanceView, startDate, endDate, selectedMonth, selectedYear]);

  const filteredAttendance = useMemo(() => {
    const searchText = employeeSearch.trim().toLowerCase();

    if (attendanceView === "single") {
      if (!searchText) return attendance;

      return attendance.filter((record) => {
        const employee = record.employee || record.employeeId || {};

        return getEmployeeSearchText(employee).includes(searchText);
      });
    }

    if (!searchText) return attendanceGroups;

    return attendanceGroups.filter((item) =>
      getEmployeeSearchText(item.employee).includes(searchText)
    );
  }, [attendance, attendanceGroups, attendanceView, employeeSearch]);

  const monthGroups = useMemo(() => {
    const groups = [];

    matrixDates.forEach((dateKey) => {
      const label = getMonthLabel(dateKey);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.label === label) {
        lastGroup.dates.push(dateKey);
      } else {
        groups.push({
          label,
          dates: [dateKey],
        });
      }
    });

    return groups;
  }, [matrixDates]);

  const checkedInCount =
    attendanceView === "single"
      ? attendance.filter((item) => Boolean(item.checkIn)).length
      : attendanceGroups.reduce(
          (total, item) =>
            total +
            (item.attendance || []).filter((record) =>
              Boolean(record.checkIn)
            ).length,
          0
        );

  const checkedOutCount =
    attendanceView === "single"
      ? attendance.filter((item) => Boolean(item.checkOut)).length
      : attendanceGroups.reduce(
          (total, item) =>
            total +
            (item.attendance || []).filter((record) =>
              Boolean(record.checkOut)
            ).length,
          0
        );

  const employeeDetails = (record) =>
    record.employee || record.employeeId || {};

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
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* =========================================
          COMPANY ATTENDANCE
      ========================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Section Header */}
        <div className="space-y-5 border-b border-slate-200 p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Company Attendance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {attendanceView === "single"
                  ? `Attendance records for ${formatDate(selectedDate)}`
                  : attendanceView === "range"
                    ? `Attendance from ${formatDate(startDate)} to ${formatDate(endDate)}`
                    : `Attendance for ${getMonthLabel(`${selectedYear}-${selectedMonth}-01`)}`}
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {filteredAttendance.length}{" "}
              {attendanceView === "single" ? "records" : "employees"}
            </span>
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
                Select Attendance Date
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
                  max={currentYear}
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
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-lg bg-white p-2.5 text-slate-600 shadow-sm">
              <Users size={18} />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">
                {attendanceView === "single"
                  ? "Total Attendance Records"
                  : "Total Employees"}
              </p>
              <p className="mt-0.5 text-2xl font-bold text-slate-800">
                {attendanceView === "single"
                  ? attendance.length
                  : attendanceGroups.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="rounded-lg bg-white p-2.5 text-blue-600 shadow-sm">
              <LogIn size={18} />
            </div>

            <div>
              <p className="text-xs font-medium text-blue-700">
                Checked In
              </p>
              <p className="mt-0.5 text-2xl font-bold text-blue-700">
                {checkedInCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="rounded-lg bg-white p-2.5 text-emerald-600 shadow-sm">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <p className="text-xs font-medium text-emerald-700">
                Checked Out
              </p>
              <p className="mt-0.5 text-2xl font-bold text-emerald-700">
                {checkedOutCount}
              </p>
            </div>
          </div>
        </div>

        {/* Attendance Table / Matrix */}
        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 p-10 text-sm text-slate-500">
              <LoaderCircle size={18} className="animate-spin" />
              Loading attendance...
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center">
              <CalendarDays size={32} className="mx-auto text-slate-300" />

              <p className="mt-3 font-medium text-slate-700">
                {employeeSearch
                  ? "No matching employees found"
                  : "No attendance records found"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {employeeSearch
                  ? "Try another employee name, ID or email."
                  : "No employee attendance is available for this selection."}
              </p>
            </div>
          ) : attendanceView === "single" ? (
            /* =====================================
               SINGLE DATE TABLE
            ===================================== */
            <DualScrollTable maxHeight="68vh">
              <table className="w-full min-w-[950px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "Employee",
                      "Employee ID",
                      "Department",
                      "Check In",
                      "Check Out",
                      "Status",
                      "History",
                    ].map((heading, index) => (
                      <th
                        key={heading}
                        className={`sticky top-0 border-b border-slate-200 bg-slate-50 px-5 py-3.5 text-xs font-semibold tracking-wide text-slate-500 ${
                          index === 0 ? "left-0 z-30" : "z-20"
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredAttendance.map((record, index) => {
                    const employee = employeeDetails(record);
                    const statusText =
                      record.status ||
                      (record.checkIn ? "Present" : "Not recorded");
                    const departmentName =
                      employee.departmentId?.departmentName ||
                      employee.department?.departmentName;

                    return (
                      <tr key={record._id || index} className="group">
                        <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                          <div className="flex items-center gap-3">
                            <Avatar name={employee.name} />

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {employee.name || "Unknown employee"}
                              </p>

                              {employee.email && (
                                <p className="truncate text-xs text-slate-500">
                                  {employee.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-600">
                            {employee.empId || "--"}
                          </span>
                        </td>

                        <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                          {departmentName ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-100">
                              <Building2 size={12} />
                              {departmentName}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                          <TimePill value={record.checkIn} type="in" />
                        </td>

                        <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                          <TimePill value={record.checkOut} type="out" />
                        </td>

                        <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                          <StatusBadge
                            status={record.status}
                            label={statusText}
                          />
                        </td>

                        <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                          <button
                            type="button"
                            onClick={() =>
                              loadEmployeeHistory({
                                ...employee,
                                _id:
                                  employee._id ||
                                  record.employeeId?._id ||
                                  record.employee?._id,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-600 hover:text-white"
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
            </DualScrollTable>
          ) : (
            /* =====================================
               DATE RANGE / MONTHLY MATRIX
            ===================================== */
            <DualScrollTable maxHeight="72vh">
              <table className="border-separate border-spacing-0 text-center text-xs">
                <thead>
                  {/* Month Header */}
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 top-0 z-40 min-w-[220px] border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-bold text-slate-700"
                    >
                      Employee
                    </th>

                    {monthGroups.map((group) => (
                      <th
                        key={group.label}
                        colSpan={group.dates.length}
                        style={{ height: 44 }}
                        className="sticky top-0 z-20 border-b border-r border-blue-100 bg-blue-50 px-3 text-left text-sm font-bold text-blue-800"
                      >
                        <span className="sticky left-[236px]">
                          {group.label}
                        </span>
                      </th>
                    ))}
                  </tr>

                  {/* Day Header */}
                  <tr>
                    {matrixDates.map((dateKey) => {
                      const sunday = isSunday(dateKey);
                      const isCurrentDay = dateKey === today;

                      return (
                        <th
                          key={dateKey}
                          style={{ top: 44 }}
                          className={`sticky z-20 min-w-[108px] border-b border-r border-slate-200 px-2 py-2 font-semibold ${
                            sunday
                              ? "bg-rose-50 text-rose-600"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                                isCurrentDay ? "bg-blue-600 text-white" : ""
                              }`}
                            >
                              {getDayNumber(dateKey)}
                            </span>

                            <span className="text-[11px] font-medium opacity-80">
                              {getWeekdayShort(dateKey)}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {filteredAttendance.map((item, index) => {
                    const employee = item.employee || {};

                    const attendanceByDate = new Map(
                      (item.attendance || []).map((record) => [
                        getAttendanceDateKey(record.attendanceDate),
                        record,
                      ])
                    );

                    return (
                      <tr key={employee._id || index} className="group">
                        {/* Fixed Employee Column */}
                        <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-3 text-left group-hover:bg-blue-50">
                          <div className="flex min-w-[190px] items-center gap-3">
                            <Avatar name={employee.name} size="sm" />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {employee.name || "Unknown employee"}
                              </p>

                              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                                {employee.empId || "--"}
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  loadEmployeeHistory({
                                    ...employee,
                                    _id: employee._id,
                                  })
                                }
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
                              >
                                <History size={11} />
                                History
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Daily Attendance Cells */}
                        {matrixDates.map((dateKey) => {
                          const record = attendanceByDate.get(dateKey);
                          const sunday = isSunday(dateKey);

                          return (
                            <td
                              key={dateKey}
                              className={`min-w-[108px] border-b border-r border-slate-100 px-2 py-2.5 group-hover:bg-blue-50/50 ${
                                sunday ? "bg-rose-50/40" : "bg-white"
                              }`}
                            >
                              {record ? (
                                <div className="mx-auto w-[92px] space-y-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
                                  <p className="flex items-center justify-between gap-1 whitespace-nowrap font-semibold tabular-nums text-blue-700">
                                    <LogIn size={11} />
                                    {formatTime(record.checkIn)}
                                  </p>

                                  <p
                                    className={`flex items-center justify-between gap-1 whitespace-nowrap font-semibold tabular-nums ${
                                      record.checkOut
                                        ? "text-emerald-700"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    <LogOut size={11} />
                                    {formatTime(record.checkOut)}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DualScrollTable>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {filteredAttendance.length}
          </span>{" "}
          {attendanceView === "single" ? "attendance records" : "employees"}
          {attendanceView !== "single" &&
            ` across ${matrixDates.length} days`}
          {employeeSearch && " matching your search"}.
        </div>
      </section>

      {/* =========================================
          EMPLOYEE HISTORY MODAL
      ========================================= */}

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <Avatar name={selectedEmployee.name} />

                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Attendance History
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {selectedEmployee.name || "Employee"}{" "}
                    {selectedEmployee.empId
                      ? `(${selectedEmployee.empId})`
                      : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeHistory}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
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
                <DualScrollTable maxHeight="55vh">
                  <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr>
                        {["Date", "Check In", "Check Out", "Status"].map(
                          (heading) => (
                            <th
                              key={heading}
                              className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-5 py-3.5 text-xs font-semibold tracking-wide text-slate-500"
                            >
                              {heading}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {employeeHistory.map((record, index) => (
                        <tr key={record._id || index} className="group">
                          <td className="border-b border-slate-100 bg-white px-5 py-3.5 text-slate-600 group-hover:bg-blue-50/60">
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays
                                size={14}
                                className="text-slate-400"
                              />
                              {formatDate(
                                record.attendanceDate || record.date
                              )}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                            <TimePill value={record.checkIn} type="in" />
                          </td>

                          <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                            <TimePill value={record.checkOut} type="out" />
                          </td>

                          <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                            <StatusBadge
                              status={record.status}
                              label={record.status || "--"}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DualScrollTable>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAttendanceChecker;