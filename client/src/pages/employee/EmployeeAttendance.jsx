import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Building2,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { useParams } from "react-router-dom";

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
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "Checked In":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "Not Checked In":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

const getStatusDotClasses = (status) => {
  switch (status) {
    case "Checked Out":
      return "bg-emerald-500";

    case "Checked In":
      return "bg-blue-500";

    default:
      return "bg-slate-400";
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
  return [employee?.name, employee?.empId, employee?.email]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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

  return Array.from({ length: totalDays }, (_, index) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(
      index + 1
    ).padStart(2, "0")}`;
  });
};

const getMonthLabel = (dateKey) => {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getDayNumber = (dateKey) => {
  return Number(dateKey.slice(8, 10));
};

const getWeekdayLabel = (dateKey) => {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    timeZone: "UTC",
  });
};

const isSunday = (dateKey) => {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay() === 0;
};

const getAttendanceDateKey = (date) => {
  if (!date) return "";

  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return new Date(date).toISOString().slice(0, 10);
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
// =========================================

const DualScrollTable = ({ children, maxHeight = "68vh" }) => {
  const topRef = useRef(null);
  const mainRef = useRef(null);
  const contentRef = useRef(null);

  const today = getTodayDate();
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

      {/* Main scroll area (vertical scrollbar on the right) */}
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

const StatusBadge = ({ status }) => {
  const label = status || "Not Checked In";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
        label
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${getStatusDotClasses(label)}`}
      />
      {label}
    </span>
  );
};

// =========================================
// EMPLOYEE ATTENDANCE PAGE
// =========================================

const EmployeeAttendance = () => {
  const { companyId } = useParams();
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
  const [companyAttendanceGroups, setCompanyAttendanceGroups] = useState([]);
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
        Number(selectedYear) > currentMonth.year ||
        !selectedMonth ||
        Number(selectedMonth) < 1 ||
        Number(selectedMonth) > 12)
    ) {
      toast.error("Please select a valid month and year.");
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

    // Preserve employee-wise attendance data for Range and Monthly matrix.
    if (attendanceView === "single") {
      setCompanyAttendanceGroups([]);
    } else {
      setCompanyAttendanceGroups(records);
    }

    // Single Date: one row per employee.
    // Range / Monthly: flatten records for existing summary and search.
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

 
// =========================================
// SUMMARY CALCULATION
// EXCLUDE SUNDAYS AND COMPANY HOLIDAYS
// =========================================

const totalEmployees =
  response.data?.totalEmployees ?? records.length;

// Selected date / range / month-এর date keys
let dateKeys = [];

if (attendanceView === "single") {
  dateKeys = [selectedDate];
} else if (attendanceView === "range") {
  dateKeys = getDateKeysBetween(startDate, endDate);
} else if (attendanceView === "monthly") {
  dateKeys = getMonthDateKeys(
    selectedMonth,
    selectedYear
  ).filter((dateKey) => dateKey <= getTodayDate());
}

// যে বছরগুলোর holiday প্রয়োজন, সেগুলো বের করো
const years = [
  ...new Set(dateKeys.map((dateKey) => dateKey.slice(0, 4))),
];

// Company holidays fetch করো
const holidayResponses = await Promise.all(
  years.map((year) =>
    api.get(`/holidays/${companyId}`, {
      params: {
        year: Number(year),
      },
    })
  )
);

// Holiday date Set তৈরি করো
const holidayDates = new Set(
  holidayResponses.flatMap((holidayResponse) =>
    (holidayResponse.data?.holidays || []).map((holiday) =>
      getAttendanceDateKey(holiday.date)
    )
  )
);

// Sunday এবং Holiday বাদ দিয়ে eligible working dates
const eligibleDateKeys = dateKeys.filter((dateKey) => {
  return (
    !isSunday(dateKey) &&
    !holidayDates.has(dateKey)
  );
});

const eligibleDateSet = new Set(eligibleDateKeys);

// শুধু eligible working dates-এর attendance count
const checkedIn = normalizedRecords.filter((item) => {
  const attendanceDate =
    attendanceView === "single"
      ? selectedDate
      : getAttendanceDateKey(item.attendanceDate);

  return (
    eligibleDateSet.has(attendanceDate) &&
    Boolean(item.checkIn)
  );
}).length;

const checkedOut = normalizedRecords.filter((item) => {
  const attendanceDate =
    attendanceView === "single"
      ? selectedDate
      : getAttendanceDateKey(item.attendanceDate);

  return (
    eligibleDateSet.has(attendanceDate) &&
    Boolean(item.checkOut)
  );
}).length;

// Eligible employee-days
const totalEmployeeDays =
  totalEmployees * eligibleDateKeys.length;

// Final Not Checked In
const notCheckedIn = Math.max(
  0,
  totalEmployeeDays - checkedIn
);

setSummary({
  totalEmployees,
  checkedIn,
  checkedOut,
  notCheckedIn,
});

  }, [
  companyId,
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
      await Promise.all([loadMyAttendance(), loadCompanyAttendance()]);
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

  // =========================================
  // EMPLOYEE CHECK IN
  // =========================================

  const handleCheckIn = async () => {
    setActionLoading("check-in");
    try {
      const response = await api.post("/attendance/check-in");
      toast.success(
        response.data?.message || "Checked in successfully."
      );
      await loadAttendance();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Unable to check in."
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

  const matrixDates = useMemo(() => {
    if (attendanceView === "range") {
      return getDateKeysBetween(startDate, endDate);
    }

    if (attendanceView === "monthly") {
      return getMonthDateKeys(selectedMonth, selectedYear);
    }

    return [];
  }, [attendanceView, startDate, endDate, selectedMonth, selectedYear]);

  const filteredMatrixEmployees = useMemo(() => {
    const searchText = employeeSearch.trim().toLowerCase();

    if (!searchText) {
      return companyAttendanceGroups;
    }

    return companyAttendanceGroups.filter((item) =>
      getEmployeeSearchText(item.employee).includes(searchText)
    );
  }, [companyAttendanceGroups, employeeSearch]);

  const monthGroups = useMemo(() => {
    const groups = [];

    matrixDates.forEach((dateKey) => {
      const monthLabel = getMonthLabel(dateKey);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.label === monthLabel) {
        lastGroup.dates.push(dateKey);
      } else {
        groups.push({
          label: monthLabel,
          dates: [dateKey],
        });
      }
    });

    return groups;
  }, [matrixDates]);

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
                  !isToday || checkedIn || Boolean(actionLoading)
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "check-in" ? (
                  <LoaderCircle size={17} className="animate-spin" />
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
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <LogOut size={17} />
                )}

                {checkedOut ? "Already Checked Out" : "Check Out"}
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
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-lg bg-white p-2.5 text-slate-600 shadow-sm">
              <Users size={18} />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">
                Total Employees
              </p>
              <p className="mt-0.5 text-2xl font-bold text-slate-800">
                {summary.totalEmployees}
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
                {summary.checkedIn}
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
                {summary.checkedOut}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="rounded-lg bg-white p-2.5 text-amber-600 shadow-sm">
              <AlertCircle size={18} />
            </div>

            <div>
              <p className="text-xs font-medium text-amber-700">
                Not Checked In
              </p>
              <p className="mt-0.5 text-2xl font-bold text-amber-700">
                {summary.notCheckedIn}
              </p>
            </div>
          </div>
        </div>

        {/* Attendance Table / Matrix */}
        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 p-10 text-sm text-slate-500">
              <LoaderCircle size={18} className="animate-spin" />
              Loading company attendance...
            </div>
          ) : attendanceView === "single" ? (
            /* =====================================
               SINGLE DATE TABLE
            ===================================== */
            filteredCompanyAttendance.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center">
                <Users size={32} className="mx-auto text-slate-300" />

                <p className="mt-3 font-medium text-slate-700">
                  {employeeSearch
                    ? "No matching employees found"
                    : "No attendance records found"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  No attendance information is available for this selection.
                </p>
              </div>
            ) : (
              <DualScrollTable maxHeight="68vh">
                <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr>
                      {[
                        "Employee",
                        "Employee ID",
                        "Attendance Date",
                        "Department",
                        "Check In",
                        "Check Out",
                        "Status",
                      ].map((heading, index) => (
                        <th
                          key={heading}
                          className={`sticky top-0 border-b border-slate-200 bg-slate-50 px-5 py-3.5 text-xs font-semibold tracking-wide text-slate-500 ${
                            index === 0
                              ? "left-0 z-30"
                              : "z-20"
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCompanyAttendance.map((record, index) => {
                      const employee = record.employee;

                      return (
                        <tr
                          key={`${employee?._id || index}-${index}`}
                          className="group"
                        >
                          <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                            <div className="flex items-center gap-3">
                              <Avatar name={employee?.name} />

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-800">
                                  {getEmployeeName(employee)}
                                </p>

                                {employee?.email && (
                                  <p className="truncate text-xs text-slate-500">
                                    {employee.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                            <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-600">
                              {getEmployeeId(employee)}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 bg-white px-5 py-3.5 text-slate-600 group-hover:bg-blue-50/60">
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays
                                size={14}
                                className="text-slate-400"
                              />
                              {formatDate(
      record.attendanceDate || record.date || selectedDate
    )}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                            {employee?.departmentId?.departmentName ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-100">
                                <Building2 size={12} />
                                {employee.departmentId.departmentName}
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
                            <StatusBadge status={record.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DualScrollTable>
            )
          ) : /* =====================================
               DATE RANGE / MONTHLY - MATRIX
            ===================================== */
          filteredMatrixEmployees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center">
              <Users size={32} className="mx-auto text-slate-300" />

              <p className="mt-3 font-medium text-slate-700">
                {employeeSearch
                  ? "No matching employees found"
                  : "No employees found"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                No employee attendance information is available.
              </p>
            </div>
          ) : (
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

                  {/* Individual Date Header */}
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
                                isCurrentDay
                                  ? "bg-blue-600 text-white"
                                  : ""
                              }`}
                            >
                              {getDayNumber(dateKey)}
                            </span>

                            <span className="text-[11px] font-medium opacity-80">
                              {getWeekdayLabel(dateKey)}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {filteredMatrixEmployees.map((item, index) => {
                    const employee = item.employee;

                    const attendanceByDate = new Map(
                      (item.attendance || []).map((attendance) => [
                        getAttendanceDateKey(attendance.attendanceDate),
                        attendance,
                      ])
                    );

                    return (
                      <tr key={employee?._id || index} className="group">
                        {/* Fixed Employee Column */}
                        <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-3 text-left group-hover:bg-blue-50">
                          <div className="flex min-w-[190px] items-center gap-3">
                            <Avatar name={employee?.name} size="sm" />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {getEmployeeName(employee)}
                              </p>

                              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                                {getEmployeeId(employee)}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Daily Attendance Cells */}
                        {matrixDates.map((dateKey) => {
                          const attendance = attendanceByDate.get(dateKey);
                          const sunday = isSunday(dateKey);

                          return (
                            <td
                              key={dateKey}
                              className={`min-w-[108px] border-b border-r border-slate-100 px-2 py-2.5 group-hover:bg-blue-50/50 ${
                                sunday ? "bg-rose-50/40" : "bg-white"
                              }`}
                            >
                              {attendance ? (
                                <div className="mx-auto w-[92px] space-y-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
                                  <p className="flex items-center justify-between gap-1 whitespace-nowrap font-semibold tabular-nums text-blue-700">
                                    <LogIn size={11} />
                                    {formatTime(attendance.checkIn)}
                                  </p>

                                  <p
                                    className={`flex items-center justify-between gap-1 whitespace-nowrap font-semibold tabular-nums ${
                                      attendance.checkOut
                                        ? "text-emerald-700"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    <LogOut size={11} />
                                    {formatTime(attendance.checkOut)}
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
            {attendanceView === "single"
              ? filteredCompanyAttendance.length
              : filteredMatrixEmployees.length}
          </span>{" "}
          employees
          {attendanceView !== "single" &&
            ` across ${matrixDates.length} days`}
          {employeeSearch && " matching your search"}.
        </div>
      </section>
    </div>
  );
};

export default EmployeeAttendance;