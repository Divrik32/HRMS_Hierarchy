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
  Pencil,
  X,
  Save,
  Download,
  Clock,
} from "lucide-react";

import { useDispatch, useSelector } from "react-redux";

import {
  selectCompletedTimesheetDrafts,
  removeSavedTimesheetDrafts,
} from "../../redux/slices/timesheetSlice";

import { toast } from "react-toastify";
import api from "../../api/axios";

// =========================================
// DATE & TIME HELPERS
// =========================================

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// Returns the YYYY-MM-DD date key of this week's Monday (IST).
// Week runs Monday to Sunday, so on a Sunday it returns the Monday 6 days back.
const getCurrentWeekMonday = () => {
  const date = new Date(`${getTodayDate()}T00:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
};

const getCurrentMonth = () => {
  const [year, month] = getTodayDate().split("-");
  return { month: Number(month), year: Number(year) };
};

const formatTime = (date) => {
  if (!date) return "—";

  return new Date(date)
    .toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
};

const getTimeInputValue = (date) => {
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

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getAttendanceDateKey = (date) => {
  if (!date) return "";

  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return new Date(date).toISOString().slice(0, 10);
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
  if (!month || !year) return [];

  const totalDays = new Date(Number(year), Number(month), 0).getDate();

  return Array.from({ length: totalDays }, (_, index) =>
    `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`
  );
};

const getMonthLabel = (dateKey) =>
  new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const getDayNumber = (dateKey) => Number(dateKey.slice(8, 10));

const getWeekdayLabel = (dateKey) =>
  new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    timeZone: "UTC",
  });

const isSunday = (dateKey) =>
  new Date(`${dateKey}T00:00:00Z`).getUTCDay() === 0;

// Duration = check out time - check in time  (e.g. "7 hr 39 min")
const getDuration = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return "—";

  const diff = new Date(checkOut) - new Date(checkIn);

  if (!Number.isFinite(diff) || diff < 0) return "—";

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} hr ${String(minutes).padStart(2, "0")} min`;
};

const getEmployeeSearchText = (employee) =>
  [employee?.name, employee?.empId, employee?.email]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const getEmployeeName = (employee) =>
  employee?.name || "Unknown employee";

const getEmployeeId = (employee) =>
  employee?.empId || "—";

const getEmployeeMongoId = (employee) => {
  if (!employee) return "";

  if (typeof employee === "string") return employee;

  return employee._id || employee.id || "";
};

const getStatusClasses = (status) => {
  switch (status) {
    case "Checked Out":
    case "Present":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "Checked In":
    case "Incomplete":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "Sunday":
      return "bg-rose-50 text-rose-700 ring-rose-200";

    case "Company Holiday":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "Not Checked In":
    case "No Record":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

const getStatusDotClasses = (status) => {
  if (["Checked Out", "Present"].includes(status)) {
    return "bg-emerald-500";
  }

  if (["Checked In", "Incomplete"].includes(status)) {
    return "bg-blue-500";
  }

  if (status === "Sunday") return "bg-rose-500";
  if (status === "Company Holiday") return "bg-amber-500";

  return "bg-slate-400";
};

const getDisplayStatus = (attendance) => {
  if (!attendance) return "Not Checked In";
  if (attendance.checkOut) return "Checked Out";
  if (attendance.checkIn) return "Checked In";
  return "Not Checked In";
};

// =========================================
// EXCEL EXPORT HELPERS
// =========================================

const escapeHTML = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const downloadExcelFile = (html, filename) => {
  const blob = new Blob(
    ["\ufeff", html],
    {
      type: "application/vnd.ms-excel;charset=utf-8;",
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Allow the browser to start downloading before releasing the URL.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
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
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizeClasses} ${getAvatarColor(name)}`}
    >
      {initials || <UserRound size={16} />}
    </div>
  );
};

// =========================================
// SCROLL STYLES
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
// DUAL SCROLL TABLE
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
// SMALL UI COMPONENTS
// =========================================

const TimePill = ({ value, type }) => {
  if (!value) return <span className="text-slate-300">—</span>;

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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(label)}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${getStatusDotClasses(label)}`}
      />
      {label}
    </span>
  );
};

const EditTimeButton = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="ml-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
  >
    <Pencil size={13} />
  </button>
);

// =========================================
// ATTENDANCE EDIT MODAL
// =========================================

const AttendanceEditModal = ({
  editData,
  onClose,
  onSave,
  saving,
}) => {
  const [checkInTime, setCheckInTime] = useState(
    getTimeInputValue(editData?.attendance?.checkIn)
  );

  const [checkOutTime, setCheckOutTime] = useState(
    getTimeInputValue(editData?.attendance?.checkOut)
  );

  if (!editData) return null;

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!checkInTime && !checkOutTime) {
      toast.error("Please provide at least one attendance time.");
      return;
    }

    onSave({
      employeeId: editData.employee?._id,
      date: editData.date,
      checkInTime,
      checkOutTime,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Edit Attendance
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Add or update employee attendance time.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-800">
              {getEmployeeName(editData.employee)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Employee ID: {getEmployeeId(editData.employee)}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <CalendarDays size={15} />
              {formatDate(editData.date)}
            </p>
          </div>

          <div>
            <label
              htmlFor="edit-check-in"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Check In Time
            </label>

            <div className="relative">
              <LogIn
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600"
              />
              <input
                id="edit-check-in"
                type="time"
                value={checkInTime}
                onChange={(event) => setCheckInTime(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-check-out"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Check Out Time
            </label>

            <div className="relative">
              <LogOut
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
              />
              <input
                id="edit-check-out"
                type="time"
                value={checkOutTime}
                onChange={(event) => setCheckOutTime(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Leave an existing time unchanged if you do not want to modify it.
            At least one time is required.
          </p>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================
// RCO (HR ATTENDANCE REQUEST) COMMENT MODAL
// POST /attendance/request-hr  { comment }
// =========================================

const RcoCommentModal = ({ rcoData, onClose }) => {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!rcoData) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    const trimmedComment = comment.trim();

    if (!trimmedComment) {
      toast.error("Please write a comment for HR.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post("/attendance/request-hr", {
        comment: trimmedComment,
        // Sent for reference. The current backend stores the request
        // against today's attendance record and ignores this field.
        date: rcoData.date,
      });

      toast.success(
        response.data?.message ||
          "Attendance request sent to HR successfully."
      );

      setComment("");
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to send HR attendance request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Add Comment
            </h3>

            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays size={13} />
              {formatDate(rcoData.date)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label
              htmlFor="rco-comment"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Comment
            </label>

            <textarea
              id="rco-comment"
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={submitting}
              placeholder="e.g. Forgot to add checkout"
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <LoaderCircle size={16} className="animate-spin" />
              )}
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================
// EMPLOYEE ATTENDANCE PAGE
// =========================================

const EmployeeAttendance = () => {
  const dispatch = useDispatch();
  const [timesheetScopeKey, setTimesheetScopeKey] = useState("");
const completedTimesheetDrafts = useSelector((state) =>
  selectCompletedTimesheetDrafts(
    state,
    timesheetScopeKey
  )
);

const checkOutInProgressRef = useRef(false);
  const today = getTodayDate();
  const currentMonth = getCurrentMonth();
  // =========================================
  // VIEW STATES
  // =========================================

  const [isCompanyWide, setIsCompanyWide] = useState(null);
  const [attendanceView, setAttendanceView] = useState("single");

  const [selectedDate, setSelectedDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [selectedMonth, setSelectedMonth] = useState(
    String(currentMonth.month).padStart(2, "0")
  );

  const [selectedYear, setSelectedYear] = useState(
    String(currentMonth.year)
  );

  const [employeeSearch, setEmployeeSearch] = useState("");

  // Normal employee view: runs once to switch to "last 7 days" range
  const employeeViewInitRef = useRef(false);

  // =========================================
  // ATTENDANCE DATA
  // =========================================

  const [myAttendance, setMyAttendance] = useState(null);
  const [companyAttendance, setCompanyAttendance] = useState([]);
  const [companyAttendanceGroups, setCompanyAttendanceGroups] = useState([]);

  const [summary, setSummary] = useState({
    totalEmployees: 0,
    checkedIn: 0,
    checkedOut: 0,
    notCheckedIn: 0,
  });

  // =========================================
  // HR / LEAVE / HOLIDAY STATES
  // =========================================

  const [isHRViewer, setIsHRViewer] = useState(false);
  // Key format: employeeMongoId_YYYY-MM-DD
  // Value: "Full Day" / "Half Day"
  const [approvedLeaveDates, setApprovedLeaveDates] = useState({});
  
  const [companyHolidayDates, setCompanyHolidayDates] = useState([]);

  // =========================================
  // LOADING STATES
  // =========================================

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editData, setEditData] = useState(null);

  // RCO comment popup (normal employee section)
  const [rcoData, setRcoData] = useState(null);

  // =========================================
  // LOAD VIEWER PROFILE / DETECT HR
  // =========================================

  const loadViewerProfile = useCallback(async () => {
  try {
    const response = await api.get("/employees/profile/me");

    const profile =
      response.data?.employee ||
      response.data?.profile ||
      response.data?.data ||
      response.data;

    const roleName = String(
      profile?.roleId?.roleName ||
      profile?.role?.roleName ||
      profile?.roleName ||
      ""
    )
      .trim()
      .toLowerCase();

    const isHR = ["hr", "head recruiter"].includes(roleName);

    const employeeId = getEmployeeMongoId(profile);
    const companyId = getEmployeeMongoId(profile?.companyId);

    if (employeeId && companyId) {
      setTimesheetScopeKey(`${companyId}:${employeeId}`);
    } else {
      setTimesheetScopeKey("");
    }

    setIsHRViewer(isHR);

    return isHR;
  } catch (error) {
    setTimesheetScopeKey("");
    setIsHRViewer(false);

    return false;
  }
}, []);

  // =========================================
  // LOAD MY ATTENDANCE
  // HR + ORDINARY EMPLOYEE
  // SUPER ADMIN DOES NOT NEED THIS
  // =========================================

  const loadMyAttendance = useCallback(async () => {
    const response = await api.get("/attendance/my-attendance");

    const records =
      response.data?.attendance ||
      response.data?.records ||
      [];

    const todayRecord = records.find(
      (item) =>
        getAttendanceDateKey(item.attendanceDate) === getTodayDate()
    );

    setMyAttendance(todayRecord || null);
  }, []);

  // =========================================
  // LOAD APPROVED LEAVES
  // HR ONLY
  // =========================================

  const loadApprovedLeaves = useCallback(async () => {
    try {
      const response = await api.get("/leaves/all-employee-leaves");

      const requests = response.data?.requests || [];
      const leaveMap = {};

      requests.forEach((request) => {
        if (request?.status !== "Approved") return;

        const employeeId = getEmployeeMongoId(request.employeeId);

        if (!employeeId) return;

        if (
          Array.isArray(request.dailyBreakdown) &&
          request.dailyBreakdown.length > 0
        ) {
          request.dailyBreakdown.forEach((day) => {
            const dateKey = getAttendanceDateKey(day.date);

            if (!dateKey) return;

            leaveMap[`${employeeId}_${dateKey}`] =
              day.dayType ||
              (Number(day.days) === 0.5 ? "Half Day" : "Full Day");
          });

          return;
        }

        const dates = getDateKeysBetween(
          getAttendanceDateKey(request.startDate),
          getAttendanceDateKey(request.endDate)
        );

        dates.forEach((dateKey) => {
          leaveMap[`${employeeId}_${dateKey}`] = "Full Day";
        });
      });

      setApprovedLeaveDates(leaveMap);
    } catch (error) {
      setApprovedLeaveDates({});

      toast.error(
        error.response?.data?.message ||
          "Failed to load approved employee leaves."
      );
    }
  }, []);

  // =========================================
  // LOAD COMPANY / OWN ATTENDANCE
  // =========================================

  const loadAttendanceData = useCallback(async () => {
    if (attendanceView === "range" && startDate > endDate) {
      throw new Error("Start date cannot be after end date.");
    }

    if (
      attendanceView === "monthly" &&
      (
        !selectedYear ||
        !Number.isInteger(Number(selectedYear)) ||
        Number(selectedYear) < 1000 ||
        Number(selectedYear) > currentMonth.year ||
        !selectedMonth ||
        Number(selectedMonth) < 1 ||
        Number(selectedMonth) > 12
      )
    ) {
      throw new Error("Please select a valid month and year.");
    }

    let response;

    if (attendanceView === "single") {
      response = await api.get("/attendance/company", {
        params: { date: selectedDate },
      });
    } else if (attendanceView === "range") {
      response = await api.get("/attendance/date-range", {
        params: { startDate, endDate },
      });
    } else {
      response = await api.get("/attendance/monthly", {
        params: {
          month: Number(selectedMonth),
          year: Number(selectedYear),
        },
      });
    }

    if (typeof response.data?.isCompanyWide !== "boolean") {
      throw new Error(
        "Attendance access information is missing. Please add isCompanyWide to the attendance controller responses."
      );
    }

    const companyWide = response.data.isCompanyWide;
    setIsCompanyWide(companyWide);

    const records = response.data?.records || [];

    setCompanyAttendanceGroups(
      attendanceView === "single" ? [] : records
    );

    // =========================================
    // NORMALIZE ATTENDANCE RECORDS
    // =========================================

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
                  attendance: null,
                },
              ];
            }

            return attendanceRecords.map((attendance) => ({
              ...attendance,
              employee: item.employee,
              attendanceDate: attendance.attendanceDate,
              attendance,
              status: getDisplayStatus(attendance),
            }));
          });

    setCompanyAttendance(normalizedRecords);

    // =========================================
    // DATE KEYS
    // =========================================

    let dateKeys = [];

    if (attendanceView === "single") {
      dateKeys = [selectedDate];
    } else if (attendanceView === "range") {
      dateKeys = getDateKeysBetween(startDate, endDate);
    } else {
      dateKeys = getMonthDateKeys(
        selectedMonth,
        selectedYear
      ).filter((dateKey) => dateKey <= getTodayDate());
    }

    // =========================================
    // HOLIDAY FETCH
    // =========================================

    const years = [
      ...new Set(dateKeys.map((dateKey) => dateKey.slice(0, 4))),
    ];

    const holidayResponses = await Promise.all(
      years.map((year) =>
        api.get("/holidays/employee", {
          params: { year: Number(year) },
        })
      )
    );

    const holidayDates = new Set(
      holidayResponses.flatMap((holidayResponse) =>
        (holidayResponse.data?.holidays || []).map((holiday) =>
          getAttendanceDateKey(holiday.date)
        )
      )
    );

    setCompanyHolidayDates([...holidayDates]);

    // =========================================
    // ELIGIBLE WORKING DAYS
    // EXCLUDE SUNDAY + COMPANY HOLIDAYS
    // =========================================

    const eligibleDateKeys = dateKeys.filter(
      (dateKey) =>
        !isSunday(dateKey) && !holidayDates.has(dateKey)
    );

    const eligibleDateSet = new Set(eligibleDateKeys);

    // =========================================
    // SUMMARY
    // =========================================

    const totalEmployees =
      response.data?.totalEmployees ?? records.length;

    const checkedInCount = normalizedRecords.filter((item) => {
      const attendanceDate =
        attendanceView === "single"
          ? selectedDate
          : getAttendanceDateKey(item.attendanceDate);

      return (
        eligibleDateSet.has(attendanceDate) &&
        Boolean(item.checkIn)
      );
    }).length;

    const checkedOutCount = normalizedRecords.filter((item) => {
      const attendanceDate =
        attendanceView === "single"
          ? selectedDate
          : getAttendanceDateKey(item.attendanceDate);

      return (
        eligibleDateSet.has(attendanceDate) &&
        Boolean(item.checkOut)
      );
    }).length;

    const totalEmployeeDays =
      totalEmployees * eligibleDateKeys.length;

    const notCheckedInCount = Math.max(
      0,
      totalEmployeeDays - checkedInCount
    );

    setSummary({
      totalEmployees,
      checkedIn: checkedInCount,
      checkedOut: checkedOutCount,
      notCheckedIn: notCheckedInCount,
    });

    return companyWide;
  }, [
    attendanceView,
    selectedDate,
    startDate,
    endDate,
    selectedMonth,
    selectedYear,
    currentMonth.year,
  ]);

  // =========================================
  // LOAD ALL DATA
  // =========================================

  const loadAttendance = useCallback(async () => {
    setLoading(true);

    try {
      const hrViewer = await loadViewerProfile();
      const companyWide = await loadAttendanceData();

      if (!companyWide || hrViewer) {
        await loadMyAttendance();
      } else {
        setMyAttendance(null);
      }

      if (hrViewer && companyWide) {
        await loadApprovedLeaves();
      } else {
        setApprovedLeaveDates({});
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load attendance information."
      );
    } finally {
      setLoading(false);
    }
  }, [
    loadViewerProfile,
    loadAttendanceData,
    loadMyAttendance,
    loadApprovedLeaves,
  ]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // =========================================
  // NORMAL EMPLOYEE: DEFAULT TO CURRENT WEEK (MONDAY -> TODAY)
  // (runs once, only when the viewer is NOT company-wide)
  // =========================================

  useEffect(() => {
    if (isCompanyWide === false && !employeeViewInitRef.current) {
      employeeViewInitRef.current = true;

      setAttendanceView("range");
      setStartDate(getCurrentWeekMonday());
      setEndDate(getTodayDate());
    }
  }, [isCompanyWide]);

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

    // Sync Employee Dashboard
    window.dispatchEvent(
      new Event("employee-attendance-updated")
    );
  } catch (error) {
    toast.error(
      error.response?.data?.message || "Unable to check in."
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
            disabled={actionLoading === "check-out"}
            onClick={async () => {
              closeToast();

              if (checkOutInProgressRef.current) return;

              checkOutInProgressRef.current = true;
              setActionLoading("check-out");

              try {
                if (!timesheetScopeKey) {
                  throw new Error(
                    "Employee information is not ready. Please refresh and try again."
                  );
                }

                // =====================================
                // STEP 1: GET COMPLETED REDUX DRAFTS
                // =====================================

                const draftsToSync = completedTimesheetDrafts.map(
                  (draft) => ({ ...draft })
                );

                // =====================================
                // STEP 2: SAVE COMPLETED DRAFTS
                // =====================================

                if (draftsToSync.length > 0) {
                  const syncResponse = await api.post(
                    "/timesheets/sync-completed-drafts",
                    {
                      drafts: draftsToSync,
                    }
                  );

                  const savedClientTimesheetIds = Array.isArray(
                    syncResponse.data?.savedClientTimesheetIds
                  )
                    ? syncResponse.data.savedClientTimesheetIds
                    : [];

                  // =====================================
                  // STEP 3: REMOVE ONLY CONFIRMED SAVED DRAFTS
                  // =====================================

                  if (savedClientTimesheetIds.length > 0) {
                    dispatch(
                      removeSavedTimesheetDrafts({
                        scopeKey: timesheetScopeKey,
                        clientTimesheetIds:
                          savedClientTimesheetIds,
                      })
                    );
                  }

                  // =====================================
                  // STEP 4: CHECK WHETHER ALL DRAFTS SAVED
                  // =====================================

                  const unsavedDrafts = draftsToSync.filter(
                    (draft) =>
                      !savedClientTimesheetIds.includes(
                        draft.clientTimesheetId
                      )
                  );

                  if (
                    unsavedDrafts.length > 0 ||
                    syncResponse.data?.failedDrafts?.length > 0
                  ) {
                    throw new Error(
                      `${unsavedDrafts.length} completed timesheet(s) could not be saved. Please try checkout again.`
                    );
                  }
                }

                // =====================================
                // STEP 5: ATTENDANCE CHECK OUT
                // Only after successful timesheet sync
                // =====================================

                const response = await api.patch(
                  "/attendance/check-out"
                );

                toast.success(
                  response.data?.message ||
                    "Checked out successfully."
                );

                await loadAttendance();

                window.dispatchEvent(
                  new Event("employee-attendance-updated")
                );
              } catch (error) {
                toast.error(
                  error.response?.data?.message ||
                    error.message ||
                    "Unable to check out."
                );
              } finally {
                checkOutInProgressRef.current = false;
                setActionLoading("");
              }
            }}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
  // OPEN EDIT MODAL
  // =========================================

  const openEditModal = (employee, date, attendance) => {
    if (!isCompanyWide) return;

    setEditData({
      employee,
      date,
      attendance: attendance || null,
    });
  };

  // =========================================
  // SAVE HR ATTENDANCE EDIT
  // =========================================

  const handleSaveAttendanceEdit = async (payload) => {
    if (!payload.employeeId || !payload.date) {
      toast.error("Employee and attendance date are required.");
      return;
    }

    const requestBody = {
      employeeId: payload.employeeId,
      date: payload.date,
    };

    if (payload.checkInTime) {
      requestBody.checkInTime = payload.checkInTime;
    }

    if (payload.checkOutTime) {
      requestBody.checkOutTime = payload.checkOutTime;
    }

    if (
      !requestBody.checkInTime &&
      !requestBody.checkOutTime
    ) {
      toast.error("Please provide at least one attendance time.");
      return;
    }

    setSavingEdit(true);

    try {
      const response = await api.put(
        "/attendance/update-employee-time",
        requestBody
      );

      toast.success(
        response.data?.message ||
          "Employee attendance updated successfully."
      );

      setEditData(null);
      await loadAttendance();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update employee attendance."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // =========================================
  // SEARCH
  // =========================================

  const filteredCompanyAttendance = useMemo(() => {
    const searchText = employeeSearch.trim().toLowerCase();

    if (!searchText) return companyAttendance;

    return companyAttendance.filter((record) =>
      getEmployeeSearchText(record.employee).includes(searchText)
    );
  }, [companyAttendance, employeeSearch]);

  const filteredMatrixEmployees = useMemo(() => {
    const searchText = employeeSearch.trim().toLowerCase();

    if (!searchText) return companyAttendanceGroups;

    return companyAttendanceGroups.filter((item) =>
      getEmployeeSearchText(item.employee).includes(searchText)
    );
  }, [companyAttendanceGroups, employeeSearch]);

  // =========================================
  // MATRIX DATES
  // =========================================

  const matrixDates = useMemo(() => {
    if (attendanceView === "range") {
      return getDateKeysBetween(startDate, endDate);
    }

    if (attendanceView === "monthly") {
      return getMonthDateKeys(
        selectedMonth,
        selectedYear
      ).filter((dateKey) => dateKey <= today);
    }

    return [];
  }, [
    attendanceView,
    startDate,
    endDate,
    selectedMonth,
    selectedYear,
    today,
  ]);

  // =========================================
  // MATRIX MONTH GROUPS
  // =========================================

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
  // MY ATTENDANCE STATUS
  // =========================================

  const checkedIn = Boolean(myAttendance?.checkIn);
  const checkedOut = Boolean(myAttendance?.checkOut);
  const isToday = selectedDate === getTodayDate();

  // =========================================
  // DATE CELL HELPERS
  // =========================================

  const isCompanyHoliday = (dateKey) =>
    companyHolidayDates.includes(dateKey);

  const getApprovedLeaveType = (employee, dateKey) => {
    const employeeId = getEmployeeMongoId(employee);

    if (!employeeId || !dateKey) return "";

    return approvedLeaveDates[`${employeeId}_${dateKey}`] || "";
  };

  const getMatrixDateClasses = (dateKey) => {
    if (isSunday(dateKey)) {
      return "bg-rose-100 text-rose-700 border-rose-200";
    }

    if (isCompanyHoliday(dateKey)) {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }

    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const getMatrixCellClasses = (employee, dateKey) => {
    if (isSunday(dateKey)) {
      return "bg-rose-50 text-rose-700";
    }

    if (isCompanyHoliday(dateKey)) {
      return "bg-amber-50 text-amber-800";
    }

    const leaveType = getApprovedLeaveType(employee, dateKey);

    if (leaveType) {
      return "bg-emerald-100 text-emerald-800";
    }

    return "bg-white";
  };

  // =========================================
  // NORMAL EMPLOYEE: ROWS FOR THE SELECTED RANGE
  // One row per date (earliest first), built from the
  // same /attendance/date-range response.
  // =========================================

  const myEmployee = companyAttendanceGroups[0]?.employee || null;

  const myAttendanceRows = useMemo(() => {
    if (isCompanyWide !== false || attendanceView !== "range") return [];

    const attendanceByDate = new Map(
      companyAttendanceGroups
        .flatMap((group) => group.attendance || [])
        .map((attendance) => [
          getAttendanceDateKey(attendance.attendanceDate),
          attendance,
        ])
    );

    return getDateKeysBetween(startDate, endDate)
      .filter((dateKey) => dateKey <= today)
      .reverse()
      .map((dateKey) => {
        const attendance = attendanceByDate.get(dateKey) || null;
        const sunday = isSunday(dateKey);
        const holiday = companyHolidayDates.includes(dateKey);

        let status = getDisplayStatus(attendance);

        if (!attendance?.checkIn && !attendance?.checkOut) {
          if (sunday) status = "Sunday";
          else if (holiday) status = "Company Holiday";
        }

        return {
          dateKey,
          attendance,
          sunday,
          holiday,
          status,
          duration: getDuration(
            attendance?.checkIn,
            attendance?.checkOut
          ),
        };
      });
  }, [
    isCompanyWide,
    attendanceView,
    companyAttendanceGroups,
    companyHolidayDates,
    startDate,
    endDate,
    today,
  ]);

  const myAttendanceSummary = useMemo(
    () => ({
      records: myAttendanceRows.filter(
        (row) => row.attendance?.checkIn || row.attendance?.checkOut
      ).length,
      checkedIn: myAttendanceRows.filter(
        (row) => row.attendance?.checkIn
      ).length,
      checkedOut: myAttendanceRows.filter(
        (row) => row.attendance?.checkOut
      ).length,
      notCheckedIn: myAttendanceRows.filter(
        (row) =>
          !row.sunday && !row.holiday && !row.attendance?.checkIn
      ).length,
    }),
    [myAttendanceRows]
  );

  // =========================================
  // EXPORT MY ATTENDANCE TO EXCEL
  // NORMAL EMPLOYEE (DATE / ID / IN / OUT / DURATION / STATUS)
  // =========================================

  const handleExportMyAttendance = () => {
    if (!startDate || !endDate || startDate > endDate) {
      toast.error("Please select a valid date range.");
      return;
    }

    if (myAttendanceRows.length === 0) {
      toast.error("No attendance data available to export.");
      return;
    }

    const cellStyle =
      "border:1px solid #cbd5e1;padding:8px;text-align:center;";

    const bodyRows = myAttendanceRows
      .map((row) => {
        let background = "#ffffff";

        if (row.sunday) background = "#fee2e2";
        else if (row.holiday) background = "#fef3c7";

        return `
          <tr>
            <td style="${cellStyle}background-color:${background};">${escapeHTML(formatDate(row.dateKey))}</td>
            <td style="${cellStyle}background-color:${background};">${escapeHTML(getEmployeeId(myEmployee))}</td>
            <td style="${cellStyle}background-color:${background};">${escapeHTML(formatTime(row.attendance?.checkIn))}</td>
            <td style="${cellStyle}background-color:${background};">${escapeHTML(formatTime(row.attendance?.checkOut))}</td>
            <td style="${cellStyle}background-color:${background};">${escapeHTML(row.duration)}</td>
            <td style="${cellStyle}background-color:${background};">${escapeHTML(row.status)}</td>
          </tr>
        `;
      })
      .join("");

    const headCell =
      "background-color:#dbeafe;border:1px solid #cbd5e1;padding:8px;";

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table {
              border-collapse: collapse;
              font-family: Arial, sans-serif;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th colspan="6" style="background-color:#1e40af;color:#ffffff;font-size:16px;padding:12px;text-align:center;border:1px solid #1e40af;">
                  ${escapeHTML(`My Attendance - ${formatDate(startDate)} to ${formatDate(endDate)}`)}
                </th>
              </tr>
              <tr>
                <th style="${headCell}">Date</th>
                <th style="${headCell}">Employee ID</th>
                <th style="${headCell}">Check In</th>
                <th style="${headCell}">Check Out</th>
                <th style="${headCell}">Duration</th>
                <th style="${headCell}">Status</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      downloadExcelFile(
        html,
        `My_Attendance_${startDate}_to_${endDate}.xls`
      );
      toast.success("Attendance Excel file downloaded successfully.");
    } catch (error) {
      toast.error("Unable to export attendance.");
    }
  };

  // =========================================
  // EXPORT ATTENDANCE TO EXCEL
  // DATE RANGE + MONTHLY ONLY
  // =========================================

  const handleExportAttendance = () => {
    if (!["range", "monthly"].includes(attendanceView)) {
      toast.info("Excel export is available for Date Range and Monthly views.");
      return;
    }

    if (attendanceView === "range" && (!startDate || !endDate || startDate > endDate)) {
      toast.error("Please select a valid date range.");
      return;
    }

    if (
      attendanceView === "monthly" &&
      (
        !selectedMonth ||
        !selectedYear ||
        Number(selectedYear) < 1000 ||
        Number(selectedYear) > currentMonth.year
      )
    ) {
      toast.error("Please select a valid month and year.");
      return;
    }

    // Date Range: export every selected date.
    // Monthly: export every calendar date of the selected month.
    const exportDates =
      attendanceView === "range"
        ? getDateKeysBetween(startDate, endDate)
        : getMonthDateKeys(selectedMonth, selectedYear);

    if (exportDates.length === 0) {
      toast.error("No dates available to export.");
      return;
    }

    if (!companyAttendanceGroups.length) {
      toast.error("No attendance data available to export.");
      return;
    }

    const headerDateCells = exportDates
      .map((dateKey) => {
        let background = "#e2e8f0";
        let color = "#334155";
        let dayLabel = getWeekdayLabel(dateKey).toUpperCase();

        if (isSunday(dateKey)) {
          background = "#fecaca";
          color = "#991b1b";
          dayLabel = "SUNDAY";
        } else if (isCompanyHoliday(dateKey)) {
          background = "#fde68a";
          color = "#92400e";
          dayLabel = "HOLIDAY";
        }

        return `
          <th style="
            background-color:${background};
            color:${color};
            border:1px solid #cbd5e1;
            padding:8px;
            min-width:115px;
            text-align:center;
            vertical-align:middle;
          ">
            <strong>${escapeHTML(formatDate(dateKey))}</strong>
            <br/>
            <span style="font-size:10px;">${escapeHTML(dayLabel)}</span>
          </th>
        `;
      })
      .join("");

    const employeeRows = companyAttendanceGroups
      .map((item) => {
        const employee = item.employee;

        if (!employee) return "";

        const attendanceByDate = new Map(
          (item.attendance || []).map((attendance) => [
            getAttendanceDateKey(attendance.attendanceDate),
            attendance,
          ])
        );

        const dailyCells = exportDates
          .map((dateKey) => {
            const attendance = attendanceByDate.get(dateKey) || null;

            const leaveType = getApprovedLeaveType(employee, dateKey);

            let background = "#ffffff";
            let color = "#334155";
            let label = "";

            // Same priority as the attendance matrix:
            // Sunday > Company Holiday > Approved Leave > Normal day.

            if (isSunday(dateKey)) {
              background = "#fee2e2";
              color = "#991b1b";
              label = "SUNDAY";
            } else if (isCompanyHoliday(dateKey)) {
              background = "#fef3c7";
              color = "#92400e";
              label = "COMPANY HOLIDAY";
            } else if (leaveType) {
              background = "#d1fae5";
              color = "#065f46";
              label = `APPROVED LEAVE${String(leaveType).toLowerCase().includes("half") ? " - HALF DAY" : ""}`;
            }

            const checkIn = attendance?.checkIn
              ? formatTime(attendance.checkIn)
              : "—";

            const checkOut = attendance?.checkOut
              ? formatTime(attendance.checkOut)
              : "—";

            return `
              <td style="
                background-color:${background};
                color:${color};
                border:1px solid #cbd5e1;
                padding:8px;
                text-align:center;
                vertical-align:middle;
                min-width:115px;
              ">
                ${
                  label
                    ? `<div style="font-weight:bold;font-size:10px;margin-bottom:5px;">${escapeHTML(label)}</div>`
                    : ""
                }

                <div style="font-size:11px;">
                  <strong>IN:</strong> ${escapeHTML(checkIn)}
                </div>

                <div style="font-size:11px;margin-top:3px;">
                  <strong>OUT:</strong> ${escapeHTML(checkOut)}
                </div>
              </td>
            `;
          })
          .join("");

        const department =
          employee?.departmentId?.departmentName ||
          employee?.department?.departmentName ||
          "—";

        return `
          <tr>
            <td style="
              border:1px solid #cbd5e1;
              padding:8px;
              font-weight:bold;
              min-width:160px;
              background-color:#ffffff;
            ">
              ${escapeHTML(getEmployeeName(employee))}
            </td>

            <td style="
              border:1px solid #cbd5e1;
              padding:8px;
              text-align:center;
              background-color:#ffffff;
            ">
              ${escapeHTML(getEmployeeId(employee))}
            </td>

            <td style="
              border:1px solid #cbd5e1;
              padding:8px;
              background-color:#ffffff;
            ">
              ${escapeHTML(department)}
            </td>

            ${dailyCells}
          </tr>
        `;
      })
      .filter(Boolean)
      .join("");

    if (!employeeRows) {
      toast.error("No employee records available to export.");
      return;
    }

    const reportTitle =
      attendanceView === "monthly"
        ? `Attendance Report - ${getMonthLabel(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`)}`
        : `Attendance Report - ${formatDate(startDate)} to ${formatDate(endDate)}`;

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table {
              border-collapse: collapse;
              font-family: Arial, sans-serif;
              font-size: 11px;
            }

            th, td {
              mso-number-format: "\\@";
            }
          </style>
        </head>

        <body>
          <table>
            <thead>
              <tr>
                <th
                  colspan="${3 + exportDates.length}"
                  style="
                    background-color:#1e40af;
                    color:#ffffff;
                    font-size:16px;
                    padding:12px;
                    text-align:center;
                    border:1px solid #1e40af;
                  "
                >
                  ${escapeHTML(reportTitle)}
                </th>
              </tr>

              <tr>
                <th style="
                  background-color:#dbeafe;
                  border:1px solid #cbd5e1;
                  padding:8px;
                ">
                  Employee Name
                </th>

                <th style="
                  background-color:#dbeafe;
                  border:1px solid #cbd5e1;
                  padding:8px;
                ">
                  Employee ID
                </th>

                <th style="
                  background-color:#dbeafe;
                  border:1px solid #cbd5e1;
                  padding:8px;
                ">
                  Department
                </th>

                ${headerDateCells}
              </tr>
            </thead>

            <tbody>
              ${employeeRows}
            </tbody>
          </table>

          <br/>

          <table>
            <tr>
              <td style="background-color:#fee2e2;border:1px solid #cbd5e1;padding:7px;">
                Sunday
              </td>

              <td style="background-color:#fef3c7;border:1px solid #cbd5e1;padding:7px;">
                Company Holiday
              </td>

              <td style="background-color:#d1fae5;border:1px solid #cbd5e1;padding:7px;">
                Approved Leave
              </td>

              <td style="background-color:#ffffff;border:1px solid #cbd5e1;padding:7px;">
                Working Day
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const filename =
      attendanceView === "monthly"
        ? `Attendance_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.xls`
        : `Attendance_${startDate}_to_${endDate}.xls`;

    try {
      downloadExcelFile(html, filename);
      toast.success("Attendance Excel file downloaded successfully.");
    } catch (error) {
      toast.error("Unable to export attendance.");
    }
  };

  // =========================================
  // ATTENDANCE EDIT CELL
  // =========================================

  const renderEditableTime = (
    employee,
    date,
    attendance,
    type
  ) => {
    const value =
      type === "in"
        ? attendance?.checkIn
        : attendance?.checkOut;

    return (
      <div className="flex items-center justify-center gap-1">
        <TimePill value={value} type={type} />

        {isCompanyWide && (
          <EditTimeButton
            label={
              type === "in"
                ? "Edit Check In Time"
                : "Edit Check Out Time"
            }
            onClick={() =>
              openEditModal(employee, date, attendance)
            }
          />
        )}
      </div>
    );
  };

  // =========================================
  // UI
  // =========================================

  return (
  <div className="space-y-6 p-4 sm:p-6">
    {/* =========================================
        COMMON PAGE HEADER
    ========================================= */}

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
            {isCompanyWide === true
              ? "Manage and monitor company employee attendance."
              : "Manage your attendance and view your attendance history."}
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
        INITIAL ACCESS LOADING
    ========================================= */}

    {isCompanyWide === null && loading && (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
        <LoaderCircle size={18} className="animate-spin" />
        Checking attendance access...
      </div>
    )}

    {/* =====================================================
        SECTION 1: HR ATTENDANCE
        ONLY isCompanyWide === true
    ===================================================== */}

    {isCompanyWide === true && (
      <section className="space-y-6">
        {/* HR SECTION HEADER */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-5 border-b border-slate-200 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Building2 size={19} className="text-blue-600" />

                <h2 className="text-lg font-bold text-slate-800">
                  Company Attendance
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                View and manage attendance of all employees in your company.
              </p>
            </div>

            {/* HR ATTENDANCE TABS */}

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

            {/* HR SINGLE DATE */}

            {attendanceView === "single" && (
              <div className="max-w-xs">
                <label
                  htmlFor="hr-attendance-date"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Select Date
                </label>

                <input
                  id="hr-attendance-date"
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(event) =>
                    setSelectedDate(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            {/* HR DATE RANGE */}

            {attendanceView === "range" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="hr-attendance-start-date"
                    className="mb-1.5 block text-xs font-semibold text-slate-600"
                  >
                    Start Date
                  </label>

                  <input
                    id="hr-attendance-start-date"
                    type="date"
                    value={startDate}
                    max={today}
                    onChange={(event) =>
                      setStartDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hr-attendance-end-date"
                    className="mb-1.5 block text-xs font-semibold text-slate-600"
                  >
                    End Date
                  </label>

                  <input
                    id="hr-attendance-end-date"
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={today}
                    onChange={(event) =>
                      setEndDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            )}

            {/* HR MONTHLY */}

            {attendanceView === "monthly" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="hr-attendance-month"
                    className="mb-1.5 block text-xs font-semibold text-slate-600"
                  >
                    Select Month
                  </label>

                  <select
                    id="hr-attendance-month"
                    value={selectedMonth}
                    onChange={(event) =>
                      setSelectedMonth(event.target.value)
                    }
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
                    htmlFor="hr-attendance-year"
                    className="mb-1.5 block text-xs font-semibold text-slate-600"
                  >
                    Select Year
                  </label>

                  <input
                    id="hr-attendance-year"
                    type="number"
                    min="1000"
                    max={currentMonth.year}
                    value={selectedYear}
                    onChange={(event) =>
                      setSelectedYear(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* HR EMPLOYEE SEARCH */}

            <div>
              <label
                htmlFor="hr-attendance-search"
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
                  id="hr-attendance-search"
                  type="text"
                  value={employeeSearch}
                  onChange={(event) =>
                    setEmployeeSearch(event.target.value)
                  }
                  placeholder="Search by employee name, ID or email..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* HR EXCEL EXPORT */}

            {(attendanceView === "range" ||
              attendanceView === "monthly") && (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Export attendance with Sunday, holiday and approved leave colors.
                </p>

                <button
                  type="button"
                  onClick={handleExportAttendance}
                  disabled={
                    loading ||
                    companyAttendanceGroups.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={17} />
                  Export Excel
                </button>
              </div>
            )}
          </div>

          {/* HR LEGEND */}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-5 py-3 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-rose-200 ring-1 ring-rose-300" />
              Sunday
            </span>

            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-amber-200 ring-1 ring-amber-300" />
              Company Holiday
            </span>

            {isHRViewer && (
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-emerald-200 ring-1 ring-emerald-300" />
                Approved Leave
              </span>
            )}
          </div>

          {/* HR SUMMARY */}

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

          {/* HR ATTENDANCE TABLE / MATRIX */}

          <div className="px-5 pb-5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 p-10 text-sm text-slate-500">
                <LoaderCircle size={18} className="animate-spin" />
                Loading attendance...
              </div>
            ) : attendanceView === "single" ? (
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
                  <table className="w-full min-w-[1050px] border-separate border-spacing-0 text-left text-sm">
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
                      {filteredCompanyAttendance.map(
                        (record, index) => {
                          const employee = record.employee;

                          const attendance =
                            record.attendance ||
                            (record.checkIn || record.checkOut
                              ? record
                              : null);

                          const attendanceDate =
                            record.attendanceDate ||
                            record.date ||
                            selectedDate;

                          const status = getDisplayStatus(attendance);

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
                                  {formatDate(attendanceDate)}
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
                                {renderEditableTime(
                                  employee,
                                  attendanceDate,
                                  attendance,
                                  "in"
                                )}
                              </td>

                              <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                                {renderEditableTime(
                                  employee,
                                  attendanceDate,
                                  attendance,
                                  "out"
                                )}
                              </td>

                              <td className="border-b border-slate-100 bg-white px-5 py-3.5 group-hover:bg-blue-50/60">
                                <StatusBadge status={status} />
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </DualScrollTable>
              )
            ) : filteredMatrixEmployees.length === 0 ? (
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

                    <tr>
                      {matrixDates.map((dateKey) => (
                        <th
                          key={dateKey}
                          style={{ top: 44 }}
                          className={`sticky z-20 min-w-[108px] border-b border-r px-2 py-2 font-semibold ${getMatrixDateClasses(dateKey)}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                                dateKey === today
                                  ? "bg-blue-600 text-white"
                                  : ""
                              }`}
                            >
                              {getDayNumber(dateKey)}
                            </span>

                            <span className="text-[11px] font-medium opacity-80">
                              {getWeekdayLabel(dateKey)}
                            </span>

                            {isSunday(dateKey) && (
                              <span className="text-[9px] font-bold">
                                SUNDAY
                              </span>
                            )}

                            {!isSunday(dateKey) &&
                              isCompanyHoliday(dateKey) && (
                                <span className="text-[9px] font-bold">
                                  HOLIDAY
                                </span>
                              )}
                          </div>
                        </th>
                      ))}
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
                        <tr
                          key={employee?._id || index}
                          className="group"
                        >
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

                          {matrixDates.map((dateKey) => {
                            const attendance =
                              attendanceByDate.get(dateKey) || null;

                            const leaveType =
                              getApprovedLeaveType(employee, dateKey);

                            return (
                              <td
                                key={dateKey}
                                className={`min-w-[108px] border-b border-r border-slate-100 px-2 py-2.5 ${getMatrixCellClasses(employee, dateKey)}`}
                              >
                                <div
                                  className={`mx-auto w-[104px] space-y-1 rounded-lg border px-1.5 py-2 shadow-sm ${
                                    leaveType &&
                                    !isSunday(dateKey) &&
                                    !isCompanyHoliday(dateKey)
                                      ? "border-emerald-300 bg-emerald-100"
                                      : isSunday(dateKey)
                                        ? "border-rose-200 bg-rose-50"
                                        : isCompanyHoliday(dateKey)
                                          ? "border-amber-200 bg-amber-50"
                                          : "border-slate-200 bg-white"
                                  }`}
                                >
                                  <div className="flex items-center justify-center gap-0.5">
                                    <span className="text-blue-700">
                                      <LogIn size={11} />
                                    </span>

                                    <span className="font-semibold tabular-nums text-blue-700">
                                      {formatTime(attendance?.checkIn)}
                                    </span>

                                    <button
                                      type="button"
                                      title="Edit Check In"
                                      onClick={() =>
                                        openEditModal(
                                          employee,
                                          dateKey,
                                          attendance
                                        )
                                      }
                                      className="ml-0.5 rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-700"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-center gap-0.5">
                                    <span className="text-emerald-700">
                                      <LogOut size={11} />
                                    </span>

                                    <span
                                      className={`font-semibold tabular-nums ${
                                        attendance?.checkOut
                                          ? "text-emerald-700"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      {formatTime(attendance?.checkOut)}
                                    </span>

                                    <button
                                      type="button"
                                      title="Edit Check Out"
                                      onClick={() =>
                                        openEditModal(
                                          employee,
                                          dateKey,
                                          attendance
                                        )
                                      }
                                      className="ml-0.5 rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  </div>

                                  {leaveType &&
                                    !isSunday(dateKey) &&
                                    !isCompanyHoliday(dateKey) && (
                                      <div className="pt-1 text-[10px] font-bold text-emerald-800">
                                        Approved Leave
                                        {String(leaveType)
                                          .toLowerCase()
                                          .includes("half") && (
                                          <span> · Half Day</span>
                                        )}
                                      </div>
                                    )}
                                </div>
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

          {/* HR FOOTER */}

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
        </div>

        {/* HR EDIT MODAL */}

        {editData && (
          <AttendanceEditModal
            editData={editData}
            onClose={() => {
              if (!savingEdit) {
                setEditData(null);
              }
            }}
            onSave={handleSaveAttendanceEdit}
            saving={savingEdit}
          />
        )}
      </section>
    )}

    {/* =====================================================
        SECTION 2: NORMAL EMPLOYEE ATTENDANCE
        ONLY isCompanyWide === false
    ===================================================== */}

    {isCompanyWide === false && (
      <section className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* EMPLOYEE SECTION HEADER */}

          <div className="space-y-5 border-b border-slate-200 p-5">
            <div>
              <div className="flex items-center gap-2">
                <UserRound size={19} className="text-blue-600" />

                <h2 className="text-lg font-bold text-slate-800">
                  My Attendance History
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                View your attendance by single date, date range or month.
              </p>
            </div>

            {/* EMPLOYEE FROM DATE / END DATE */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="employee-attendance-start-date"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  From Date
                </label>

                <input
                  id="employee-attendance-start-date"
                  type="date"
                  value={startDate}
                  max={today}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="employee-attendance-end-date"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  End Date
                </label>

                <input
                  id="employee-attendance-end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={today}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* EMPLOYEE EXCEL EXPORT */}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExportMyAttendance}
                disabled={loading || myAttendanceRows.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={17} />
                Export Excel
              </button>
            </div>
          </div>

          {/* EMPLOYEE LEGEND */}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-5 py-3 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-rose-200 ring-1 ring-rose-300" />
              Sunday
            </span>

            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-amber-200 ring-1 ring-amber-300" />
              Company Holiday
            </span>
          </div>

          {/* EMPLOYEE SUMMARY */}

          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="rounded-lg bg-white p-2.5 text-slate-600 shadow-sm">
                <Users size={18} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  My Records
                </p>

                <p className="mt-0.5 text-2xl font-bold text-slate-800">
                  {myAttendanceSummary.records}
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
                  {myAttendanceSummary.checkedIn}
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
                  {myAttendanceSummary.checkedOut}
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
                  {myAttendanceSummary.notCheckedIn}
                </p>
              </div>
            </div>
          </div>

          {/* EMPLOYEE ATTENDANCE HISTORY TABLE */}

          <div className="px-5 pb-5">
            {loading || attendanceView !== "range" ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 p-10 text-sm text-slate-500">
                <LoaderCircle size={18} className="animate-spin" />
                Loading attendance...
              </div>
            ) : myAttendanceRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center">
                <CalendarDays
                  size={32}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-medium text-slate-700">
                  No attendance records found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  No attendance information is available for this date range.
                </p>
              </div>
            ) : (
              <DualScrollTable maxHeight="68vh">
                <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr>
                      {[
                        "Date",
                        "Employee ID",
                        "Check In",
                        "Check Out",
                        "Duration",
                        "Status",
                        "HR Attendance Request",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-5 py-3.5 text-xs font-semibold tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {myAttendanceRows.map((row) => {
                      const rowBg = row.sunday
                        ? "bg-rose-50/70"
                        : row.holiday
                          ? "bg-amber-50/70"
                          : "bg-white";

                      return (
                        <tr key={row.dateKey} className="group">
                          {/* DATE */}
                          <td className={`border-b border-slate-100 px-5 py-3.5 text-slate-600 group-hover:bg-blue-50/60 ${rowBg}`}>
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays
                                size={14}
                                className="text-slate-400"
                              />
                              {formatDate(row.dateKey)}
                            </span>
                          </td>

                          {/* EMPLOYEE ID */}
                          <td className={`border-b border-slate-100 px-5 py-3.5 group-hover:bg-blue-50/60 ${rowBg}`}>
                            <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-600">
                              {getEmployeeId(myEmployee)}
                            </span>
                          </td>

                          {/* CHECK IN */}
                          <td className={`border-b border-slate-100 px-5 py-3.5 group-hover:bg-blue-50/60 ${rowBg}`}>
                            <TimePill
                              value={row.attendance?.checkIn}
                              type="in"
                            />
                          </td>

                          {/* CHECK OUT */}
                          <td className={`border-b border-slate-100 px-5 py-3.5 group-hover:bg-blue-50/60 ${rowBg}`}>
                            <TimePill
                              value={row.attendance?.checkOut}
                              type="out"
                            />
                          </td>

                          {/* DURATION */}
                          <td className={`border-b border-slate-100 px-5 py-3.5 group-hover:bg-blue-50/60 ${rowBg}`}>
                            {row.duration === "—" ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-700 ring-1 ring-inset ring-slate-200">
                                <Clock size={12} />
                                {row.duration}
                              </span>
                            )}
                          </td>

                          {/* STATUS */}
                          <td className={`border-b border-slate-100 px-5 py-3.5 group-hover:bg-blue-50/60 ${rowBg}`}>
                            <StatusBadge status={row.status} />
                          </td>

                          {/* HR ATTENDANCE REQUEST */}
                          <td className={`border-b border-slate-100 px-5 py-3.5 group-hover:bg-blue-50/60 ${rowBg}`}>
                            <button
                              type="button"
                              onClick={() =>
                                setRcoData({
                                  date: row.dateKey,
                                  employeeId: getEmployeeId(myEmployee),
                                  attendance: row.attendance,
                                })
                              }
                              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                            >
                              RCO
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DualScrollTable>
            )}
          </div>

          {/* EMPLOYEE FOOTER */}

          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {myAttendanceSummary.records}
            </span>{" "}
            attendance record{myAttendanceSummary.records === 1 ? "" : "s"}
            {` across ${myAttendanceRows.length} days`}.
          </div>
        </div>

        {/* RCO COMMENT POPUP */}

        {rcoData && (
          <RcoCommentModal
            rcoData={rcoData}
            onClose={() => setRcoData(null)}
          />
        )}
      </section>
    )}
  </div>
);
};

export default EmployeeAttendance;