import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  RotateCcw,
  Wallet,
  Sun,
  Moon,
  Users,
  UserRound,
  Building2,
  FileText,
  Send,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-toastify";

// =====================================================
// CONSTANTS
// =====================================================

const PAID_LEAVE_TYPES = [
  { leaveType: "Casual Leave", field: "casualLeave", shortName: "CL" },
  { leaveType: "Sick Leave", field: "sickLeave", shortName: "SL" },
  { leaveType: "Paid Leave", field: "paidLeave", shortName: "PL" },
  { leaveType: "Comp-Off", field: "compOffBalance", shortName: "CO" },
];

const statusConfig = {
  Pending: {
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  Approved: {
    color: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  Rejected: {
    color: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  Withdrawn: {
    color: "bg-slate-100 text-slate-600 border-slate-200",
    icon: AlertCircle,
  },
};

const FULL = "Full Day";
const HALF = "Half Day";

// =====================================================
// GENERIC HELPERS
// =====================================================

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const roundDays = (value) => Number(toNumber(value).toFixed(2));

const formatDays = (days) => {
  const value = roundDays(days);
  return Number.isInteger(value) ? value : value.toFixed(1);
};

// Real timestamps (createdAt, approvedAt...)
const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Leave dates are stored as UTC midnight, so always format in UTC
const formatLeaveDate = (date) => {
  if (!date) return "N/A";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const buildDateString = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;

const formatInputDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "short",
      timeZone: "UTC",
    }
  );
};

// =====================================================
// LEAVE RECORD HELPERS (based on LeaveRequest model)
// =====================================================

const getLeaveDates = (leave) =>
  Array.isArray(leave?.leaveDates)
    ? [...leave.leaveDates].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      )
    : [];

const getStartDate = (leave) => getLeaveDates(leave)[0]?.date || null;

const getEndDate = (leave) => {
  const dates = getLeaveDates(leave);
  return dates.length ? dates[dates.length - 1].date : null;
};

const getLeaveBreakdown = (leave) => {
  const paidDays = toNumber(leave?.leaveDays);
  const unpaidDays = toNumber(leave?.unpaidDays);
  const items = [];

  if (paidDays > 0) {
    items.push({ leaveType: leave.leaveType, days: paidDays });
  }

  if (unpaidDays > 0) {
    items.push({ leaveType: "Unpaid Leave", days: unpaidDays });
  }

  if (!items.length && toNumber(leave?.totalDays) > 0) {
    items.push({
      leaveType: leave?.leaveType || "Leave",
      days: toNumber(leave.totalDays),
    });
  }

  return items;
};

const getLeaveCategory = (leave) => {
  const paidDays = toNumber(leave?.leaveDays);
  const unpaidDays = toNumber(leave?.unpaidDays);

  if (paidDays > 0 && unpaidDays > 0) return "Mixed Leave";
  if (unpaidDays > 0) return "Unpaid Leave";
  if (leave?.leaveType === "Comp-Off") return "Comp-Off";

  return "Paid Leave";
};

const renderLeaveTitle = (leave) => {
  const paidDays = toNumber(leave?.leaveDays);
  const unpaidDays = toNumber(leave?.unpaidDays);

  if (paidDays > 0 && unpaidDays > 0) {
    return `${leave.leaveType} + Unpaid`;
  }

  if (unpaidDays > 0) return "Unpaid Leave";

  return leave?.leaveType || "Leave Request";
};

const hasHalfDay = (leave) =>
  getLeaveDates(leave).some((item) => item.dayType === HALF);

// =====================================================
// SMALL REUSABLE COMPONENTS
// =====================================================

const LeaveStatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.Pending;
  const StatusIcon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.color}`}
    >
      <StatusIcon size={14} />
      {status || "Pending"}
    </span>
  );
};

const LeaveTypeBreakdown = ({ leave }) => {
  const breakdown = getLeaveBreakdown(leave);

  if (!breakdown.length) {
    return (
      <p className="text-sm text-slate-500">
        No leave type breakdown available.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {breakdown.map((item, index) => (
        <div
          key={`${item.leaveType}-${index}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
        >
          <span className="text-sm font-medium text-slate-700">
            {item.leaveType}
          </span>

          <span
            className={`shrink-0 rounded-lg px-3 py-1 text-sm font-bold ${
              item.leaveType === "Unpaid Leave"
                ? "bg-amber-50 text-amber-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {formatDays(item.days)}{" "}
            {Number(item.days) === 1 ? "Day" : "Days"}
          </span>
        </div>
      ))}
    </div>
  );
};

const DailyLeaveBreakdown = ({ leave }) => {
  const dates = getLeaveDates(leave);

  if (!dates.length) {
    return (
      <p className="text-sm text-slate-500">
        Daily breakdown is not available for this request.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {dates.map((item, index) => {
        const isHalfDay = item.dayType === HALF;

        return (
          <div
            key={`${item.date}-${index}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              {isHalfDay ? (
                <Moon size={16} className="text-amber-600" />
              ) : (
                <Sun size={16} className="text-blue-600" />
              )}

              <span className="text-sm font-medium text-slate-700">
                {formatLeaveDate(item.date)}
              </span>
            </div>

            <div className="text-right">
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  isHalfDay
                    ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {item.dayType || FULL}
              </span>

              <p className="mt-1 text-xs text-slate-500">
                {isHalfDay ? "0.5 Day" : "1 Day"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// =====================================================
// APPLY LEAVE — TONES
// green  = fully paid
// yellow = part paid / part unpaid
// red    = fully unpaid
// =====================================================

const TONE = {
  green: {
    cell: "bg-emerald-600 text-white hover:bg-emerald-700",
    row: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    active: "bg-emerald-600 text-white",
    dot: "bg-emerald-600",
  },
  yellow: {
    cell: "bg-amber-400 text-white hover:bg-amber-500",
    row: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    active: "bg-amber-500 text-white",
    dot: "bg-amber-400",
  },
  red: {
    cell: "bg-red-500 text-white hover:bg-red-600",
    row: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-700",
    active: "bg-red-500 text-white",
    dot: "bg-red-500",
  },
};

// =====================================================
// SINGLE CALENDAR
// =====================================================

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const LeaveCalendar = ({
  selected,
  onToggle,
  isDateDisabled,
  getTone,
  disabled = false,
  today,
}) => {
  const now = new Date();
  const [view, setView] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" }
  );

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const changeMonth = (step) => {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + step, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-3 ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft size={18} />
        </button>

        <p className="text-sm font-semibold text-slate-700">{monthLabel}</p>

        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEK_DAYS.map((day) => (
          <span key={day} className="py-1 text-xs font-medium text-slate-400">
            {day}
          </span>
        ))}

        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;

          const dateString = buildDateString(view.year, view.month, day);
          const isSelected = Boolean(selected[dateString]);
          const isHalf = selected[dateString] === HALF;
          const isPast = dateString < today;
          const isBlocked =
            !isSelected && (isPast || isDateDisabled(dateString));
          const isToday = dateString === today;
          const tone = isSelected ? TONE[getTone(dateString)] : null;

          return (
            <button
              key={dateString}
              type="button"
              disabled={isBlocked}
              onClick={() => onToggle(dateString)}
              className={`relative h-9 rounded-lg text-sm transition ${
                isSelected
                  ? tone.cell
                  : isBlocked
                    ? "cursor-not-allowed text-slate-300"
                    : "text-slate-700 hover:bg-slate-100"
              } ${isToday ? "ring-1 ring-blue-300" : ""}`}
            >
              {day}

              {isHalf && (
                <span className="absolute bottom-0.5 right-1 text-[9px] font-bold leading-none">
                  ½
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Full / Half toggle list for the dates selected in the calendar
const SelectedDateList = ({
  dates,
  selected,
  allocation,
  onChangeType,
  onRemove,
}) => {
  if (!dates.length) {
    return (
      <p className="py-6 text-center text-xs text-slate-400">
        No date selected yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {dates.map((date) => {
        const info = allocation[date];
        const tone = TONE[info.tone];

        return (
          <div
            key={date}
            className={`rounded-lg border px-3 py-2 ${tone.row}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">
                {formatInputDate(date)}
              </span>

              <div className="flex items-center gap-2">
                <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white text-xs font-semibold">
                  {[FULL, HALF].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onChangeType(date, type)}
                      className={`px-2.5 py-1.5 ${
                        selected[date] === type
                          ? tone.active
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(date)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                  title="Remove date"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <span
              className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone.badge}`}
            >
              {info.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const MyLeave = () => {
  const today = getToday();

  // Personal leaves
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave balance
  const [balance, setBalance] = useState({
    casualLeave: 0,
    sickLeave: 0,
    paidLeave: 0,
    compOffBalance: 0,
  });
  const [loadingBalance, setLoadingBalance] = useState(true);

  // HR profile
  const [isHR, setIsHR] = useState(false);

  // All employee leaves (HR)
  const [allEmployeeLeaves, setAllEmployeeLeaves] = useState([]);
  const [allLeavesLoading, setAllLeavesLoading] = useState(false);
  const [allLeavesLoaded, setAllLeavesLoaded] = useState(false);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // Filter
  const [activeFilter, setActiveFilter] = useState("All");

  // Details modal
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [selectedLeaveIsMine, setSelectedLeaveIsMine] = useState(false);

  // Withdraw
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(null);

  // Apply leave popup
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveType, setLeaveType] = useState("");
  const [isUnpaidLeave, setIsUnpaidLeave] = useState(false);
  const [selectedDates, setSelectedDates] = useState({}); // { "YYYY-MM-DD": "Full Day" | "Half Day" }
  const [reason, setReason] = useState("");

  // =====================================================
  // FETCH MY LEAVES
  // =====================================================

  const fetchMyLeaves = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const { data } = await api.get("/leaves/my-requests");

      if (data.success) {
        setRequests(data.requests || []);
      } else {
        toast.error(data.message || "Failed to load leave requests.");
      }
    } catch (error) {
      console.error("Fetch My Leaves Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to load your leave requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // FETCH LEAVE BALANCE
  // =====================================================

  const fetchLeaveBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);

      const response = await api.get("/leaves/my-balance");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to load leave balance."
        );
      }

      // Backend sends { success, data: { casualLeave, sickLeave, paidLeave, ... } }
      const data = response.data.data || response.data.balance || {};

      setBalance({
        casualLeave: toNumber(data.casualLeave),
        sickLeave: toNumber(data.sickLeave),
        paidLeave: toNumber(data.paidLeave),
        // Comp-Off is not implemented yet, so it stays 0 for now
        compOffBalance: 0,
      });
    } catch (error) {
      console.error("Fetch Leave Balance Error:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to load leave balance."
      );
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  // =====================================================
  // CHECK HR ROLE
  // =====================================================

  const checkHRRole = useCallback(async () => {
    try {
      const { data } = await api.get("/employees/profile/me");

      const roleName = data?.employee?.roleId?.roleName
        ?.trim()
        ?.toLowerCase();

      const employeeIsHR = ["hr", "head recruiter"].includes(roleName);

      setIsHR(employeeIsHR);

      return employeeIsHR;
    } catch (error) {
      console.error("Fetch Employee Profile Error:", error);

      setIsHR(false);

      return false;
    }
  }, []);

  // =====================================================
  // FETCH ALL EMPLOYEE LEAVES (HR ONLY)
  // =====================================================

  const fetchAllEmployeeLeaves = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setAllLeavesLoading(true);

      const { data } = await api.get("/leaves/all-employee-leaves");

      if (data.success) {
        const visibleRequests = (data.requests || []).filter(
          (leave) => leave.status !== "Withdrawn"
        );

        setAllEmployeeLeaves(visibleRequests);
        setAllLeavesLoaded(true);
      } else {
        toast.error(
          data.message || "Failed to load employee leave records."
        );
      }
    } catch (error) {
      console.error("Fetch All Employee Leaves Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to load all employee leave records."
      );
    } finally {
      setAllLeavesLoading(false);
    }
  }, []);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    const initializePage = async () => {
      await Promise.all([fetchMyLeaves(), fetchLeaveBalance()]);

      const employeeIsHR = await checkHRRole();

      if (employeeIsHR) {
        await fetchAllEmployeeLeaves();
      }
    };

    initializePage();
  }, [fetchMyLeaves, fetchLeaveBalance, checkHRRole, fetchAllEmployeeLeaves]);

  // =====================================================
  // REFRESH ALL
  // =====================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await Promise.all([fetchMyLeaves(false), fetchLeaveBalance()]);

      const employeeIsHR = await checkHRRole();

      if (employeeIsHR) {
        await fetchAllEmployeeLeaves(false);
      } else {
        setAllEmployeeLeaves([]);
        setAllLeavesLoaded(false);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // =====================================================
  // COUNTS / FILTERS
  // =====================================================

  const counts = useMemo(
    () => ({
      All: requests.length,
      Pending: requests.filter((item) => item.status === "Pending").length,
      Approved: requests.filter((item) => item.status === "Approved").length,
      Rejected: requests.filter((item) => item.status === "Rejected").length,
      Withdrawn: requests.filter((item) => item.status === "Withdrawn")
        .length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    if (activeFilter === "All") return requests;

    return requests.filter((item) => item.status === activeFilter);
  }, [requests, activeFilter]);

  const allEmployeeCounts = useMemo(
    () => ({
      total: allEmployeeLeaves.length,
      pending: allEmployeeLeaves.filter((item) => item.status === "Pending")
        .length,
      approved: allEmployeeLeaves.filter((item) => item.status === "Approved")
        .length,
      rejected: allEmployeeLeaves.filter((item) => item.status === "Rejected")
        .length,
    }),
    [allEmployeeLeaves]
  );

  const filters = ["All", "Pending", "Approved", "Rejected", "Withdrawn"];

  // =====================================================
  // BALANCE CARDS
  // =====================================================

  const balanceCards = [
    {
      title: "Sick Leave",
      shortName: "SL",
      value: balance.sickLeave,
      color: "bg-rose-50",
      textColor: "text-rose-600",
      borderColor: "border-rose-100",
    },
    {
      title: "Casual Leave",
      shortName: "CL",
      value: balance.casualLeave,
      color: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-100",
    },
    {
      title: "Paid Leave",
      shortName: "PL",
      value: balance.paidLeave,
      color: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-100",
    },
    {
      title: "Comp-Off",
      shortName: "CO",
      value: balance.compOffBalance,
      color: "bg-violet-50",
      textColor: "text-violet-600",
      borderColor: "border-violet-100",
    },
  ];

  // =====================================================
  // APPLY LEAVE — DERIVED DATA
  // =====================================================

  const selectedTypeConfig = PAID_LEAVE_TYPES.find(
    (item) => item.leaveType === leaveType
  );

  const availableBalance = selectedTypeConfig
    ? toNumber(balance[selectedTypeConfig.field])
    : 0;

  // Dates already used by my Pending / Approved requests
  const bookedDates = useMemo(() => {
    const set = new Set();

    requests
      .filter((item) => ["Pending", "Approved"].includes(item.status))
      .forEach((item) =>
        (item.leaveDates || []).forEach((entry) => {
          if (entry?.date) set.add(String(entry.date).slice(0, 10));
        })
      );

    return set;
  }, [requests]);

  const sortedSelectedDates = useMemo(
    () => Object.keys(selectedDates).sort(),
    [selectedDates]
  );

  // Calendar is usable only after a leave type is picked
  // OR "Add Non-Paid Leaves" is ticked
  const calendarEnabled = Boolean(leaveType) || isUnpaidLeave;

  // -----------------------------------------------------
  // Allocation (same logic as the backend):
  // dates are processed in ascending order, the balance of the
  // chosen leave type is consumed first, the rest is unpaid.
  //   green  = fully paid
  //   yellow = part paid / part unpaid
  //   red    = fully unpaid
  // -----------------------------------------------------
  const { allocation, paidDays, unpaidDays, totalDays } = useMemo(() => {
    const result = {};
    let remaining = leaveType ? availableBalance : 0;
    let paid = 0;
    let unpaid = 0;

    sortedSelectedDates.forEach((date) => {
      const dayValue = selectedDates[date] === HALF ? 0.5 : 1;
      const paidPart = roundDays(Math.min(dayValue, remaining));
      const unpaidPart = roundDays(dayValue - paidPart);

      remaining = roundDays(remaining - paidPart);
      paid += paidPart;
      unpaid += unpaidPart;

      if (unpaidPart === 0) {
        result[date] = {
          tone: "green",
          label: `Paid · ${formatDays(paidPart)} day`,
        };
      } else if (paidPart === 0) {
        result[date] = {
          tone: "red",
          label: `Unpaid · ${formatDays(unpaidPart)} day`,
        };
      } else {
        result[date] = {
          tone: "yellow",
          label: `${formatDays(paidPart)} Paid + ${formatDays(
            unpaidPart
          )} Unpaid`,
        };
      }
    });

    return {
      allocation: result,
      paidDays: roundDays(paid),
      unpaidDays: roundDays(unpaid),
      totalDays: roundDays(paid + unpaid),
    };
  }, [sortedSelectedDates, selectedDates, leaveType, availableBalance]);

  // Red validation message (null = everything fine)
  const balanceError = useMemo(() => {
    if (totalDays === 0) return null;

    // No leave type and no unpaid tick
    if (!leaveType && !isUnpaidLeave) {
      return 'Please select a leave type, or tick "Add Non-Paid Leaves" to apply for unpaid leave.';
    }

    // Unpaid days exist but the person has not ticked the box
    if (unpaidDays > 0 && !isUnpaidLeave) {
      return availableBalance > 0
        ? `You selected ${formatDays(totalDays)} day(s) but only ${formatDays(
            availableBalance
          )} ${leaveType} day(s) are available. Reduce the selected days by ${formatDays(
            unpaidDays
          )} day(s), or tick "Add Non-Paid Leaves" to take the remaining ${formatDays(
            unpaidDays
          )} day(s) as unpaid leave.`
        : `You do not have enough ${leaveType} balance. Tick "Add Non-Paid Leaves" to apply these ${formatDays(
            unpaidDays
          )} day(s) as unpaid leave, or remove the selected dates.`;
    }

    return null;
  }, [totalDays, unpaidDays, leaveType, isUnpaidLeave, availableBalance]);

  const canSubmit =
    calendarEnabled &&
    totalDays > 0 &&
    !balanceError &&
    Boolean(reason.trim()) &&
    !submitting &&
    !loadingBalance;

  // =====================================================
  // APPLY LEAVE — HANDLERS
  // =====================================================

  const resetApplyForm = () => {
    setLeaveType("");
    setIsUnpaidLeave(false);
    setSelectedDates({});
    setReason("");
  };

  const openApplyModal = () => {
    resetApplyForm();
    setShowApplyModal(true);
    fetchLeaveBalance();
  };

  const closeApplyModal = () => {
    if (submitting) return;
    setShowApplyModal(false);
    resetApplyForm();
  };

  const toggleDate = (date) => {
    setSelectedDates((prev) => {
      if (prev[date]) {
        const { [date]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [date]: FULL };
    });
  };

  const changeDateType = (date, type) =>
    setSelectedDates((prev) => ({ ...prev, [date]: type }));

  const removeDate = (date) =>
    setSelectedDates((prev) => {
      const { [date]: removed, ...rest } = prev;
      return rest;
    });

  const isDateDisabled = (date) => bookedDates.has(date);

  const getDateTone = (date) => allocation[date]?.tone || "green";

  // =====================================================
  // SUBMIT LEAVE
  // Backend payload: { leaveType?, isUnpaidLeave, leaveDates, reason }
  // The backend deducts the available balance first and treats
  // the remaining days as unpaid.
  // =====================================================

  const handleSubmitLeave = async (e) => {
    e.preventDefault();

    if (!canSubmit) return;

    const leaveDates = sortedSelectedDates.map((date) => ({
      date,
      dayType: selectedDates[date],
    }));

    const payload = {
      isUnpaidLeave,
      leaveDates,
      reason: reason.trim(),
    };

    if (leaveType) payload.leaveType = leaveType;

    try {
      setSubmitting(true);

      const { data } = await api.post("/leaves", payload);

      if (data.success) {
        toast.success(
          data.message || "Leave request submitted successfully."
        );

        setShowApplyModal(false);
        resetApplyForm();

        await Promise.all([fetchMyLeaves(false), fetchLeaveBalance()]);
      } else {
        toast.error(data.message || "Failed to submit leave request.");
      }
    } catch (error) {
      console.error("Apply Leave Error:", error);

      toast.error(
        error.response?.data?.message || "Failed to submit leave request."
      );

      await fetchLeaveBalance();
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // WITHDRAW
  // =====================================================

  const handleWithdraw = async (leave) => {
    try {
      setWithdrawingId(leave._id);

      const { data } = await api.patch(`/leaves/${leave._id}/withdraw`);

      if (data.success) {
        toast.success(
          data.message || "Leave request withdrawn successfully."
        );

        setConfirmLeave(null);

        if (selectedLeave?._id === leave._id) {
          setSelectedLeave((previous) => ({
            ...previous,
            ...data.request,
            status: "Withdrawn",
          }));
        }

        await Promise.all([fetchMyLeaves(false), fetchLeaveBalance()]);
      }
    } catch (error) {
      console.error("Withdraw Leave Error:", error);

      toast.error(
        error.response?.data?.message || "Failed to withdraw leave request."
      );

      await fetchMyLeaves(false);
    } finally {
      setWithdrawingId(null);
    }
  };

  // =====================================================
  // DETAILS
  // =====================================================

  const openMyLeaveDetails = (leave) => {
    setSelectedLeave(leave);
    setSelectedLeaveIsMine(true);
  };

  const openEmployeeLeaveDetails = (leave) => {
    setSelectedLeave(leave);
    setSelectedLeaveIsMine(false);
  };

  const closeDetails = () => {
    setSelectedLeave(null);
    setSelectedLeaveIsMine(false);
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ================= HEADER ================= */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <CalendarDays size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">My Leaves</h1>

              <p className="mt-1 text-sm text-slate-500">
                View and manage your leave applications.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openApplyModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <CalendarDays size={17} />
            Apply Leave
          </button>
        </div>

        {/* ================= MY LEAVE BALANCE ================= */}

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet size={19} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                My Leave Balance
              </h2>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loadingBalance}
              title="Refresh"
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={refreshing || loadingBalance ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {balanceCards.map((item) => (
              <div
                key={item.shortName}
                className={`rounded-xl border ${item.borderColor} bg-white p-3 shadow-sm sm:p-4`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
                      {item.title}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-800 sm:text-3xl">
                      {loadingBalance ? (
                        <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-100" />
                      ) : (
                        toNumber(item.value).toFixed(1)
                      )}

                      <span className="ml-1 text-xs font-medium text-slate-400">
                        Days
                      </span>
                    </p>
                  </div>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.color} ${item.textColor} text-sm font-bold sm:h-11 sm:w-11 sm:text-base`}
                  >
                    {item.shortName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= FILTERS ================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter}

                <span className="ml-2 opacity-75">{counts[filter]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ================= MY LEAVE APPLICATIONS ================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Leave Applications
              </h2>

              <p className="text-sm text-slate-500">
                Your submitted leave request history.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {filteredRequests.length} request(s)
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw size={30} className="animate-spin text-blue-600" />

              <p className="mt-3 text-sm text-slate-500">
                Loading your leave requests...
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CalendarDays size={30} />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-700">
                No Leave Requests Found
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {activeFilter === "All"
                  ? "You have not submitted any leave applications yet."
                  : `You do not have any ${activeFilter.toLowerCase()} leave requests.`}
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Leave Details</th>
                      <th className="px-5 py-4">Duration</th>
                      <th className="px-5 py-4">Total Days</th>
                      <th className="px-5 py-4">Applied On</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((leave) => (
                      <tr
                        key={leave._id}
                        className="align-top transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {renderLeaveTitle(leave)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {getLeaveCategory(leave)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {formatLeaveDate(getStartDate(leave))}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            to {formatLeaveDate(getEndDate(leave))}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-700">
                            {formatDays(leave.totalDays)} days
                          </span>

                          {hasHalfDay(leave) && (
                            <p className="mt-1 text-xs font-medium text-amber-600">
                              Includes Half Day
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(leave.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <LeaveStatusBadge status={leave.status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openMyLeaveDetails(leave)}
                              title="View Details"
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Eye size={17} />
                            </button>

                            {leave.status === "Pending" && (
                              <button
                                type="button"
                                onClick={() => setConfirmLeave(leave)}
                                disabled={withdrawingId === leave._id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                <RotateCcw size={14} />
                                Withdraw
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}

              <div className="space-y-3 p-4 md:hidden">
                {filteredRequests.map((leave) => (
                  <div
                    key={leave._id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-800">
                          {renderLeaveTitle(leave)}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {getLeaveCategory(leave)}
                        </p>
                      </div>

                      <LeaveStatusBadge status={leave.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-400">Start Date</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatLeaveDate(getStartDate(leave))}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">End Date</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatLeaveDate(getEndDate(leave))}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Total Days</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDays(leave.totalDays)} days
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Applied On</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatDate(leave.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-semibold text-slate-500">
                        LEAVE ALLOCATION
                      </p>

                      <div className="space-y-1.5">
                        {getLeaveBreakdown(leave).map((item, index) => (
                          <div
                            key={`${item.leaveType}-${index}`}
                            className="flex justify-between gap-2 text-xs"
                          >
                            <span className="text-slate-600">
                              {item.leaveType}
                            </span>

                            <span className="font-semibold text-slate-800">
                              {formatDays(item.days)} days
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => openMyLeaveDetails(leave)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Eye size={16} />
                        Details
                      </button>

                      {leave.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => setConfirmLeave(leave)}
                          disabled={withdrawingId === leave._id}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <RotateCcw size={16} />
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ================= ALL EMPLOYEE LEAVES (HR ONLY) ================= */}

        {isHR && (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Users size={25} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    All Employee Leaves
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    View leave applications submitted by employees in your
                    company.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchAllEmployeeLeaves()}
                disabled={allLeavesLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={allLeavesLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Applications",
                  value: allEmployeeCounts.total,
                  icon: FileText,
                  color: "text-indigo-600",
                  bg: "bg-indigo-50",
                },
                {
                  label: "Pending",
                  value: allEmployeeCounts.pending,
                  icon: Clock,
                  color: "text-amber-600",
                  bg: "bg-amber-50",
                },
                {
                  label: "Approved",
                  value: allEmployeeCounts.approved,
                  icon: CheckCircle2,
                  color: "text-green-600",
                  bg: "bg-green-50",
                },
                {
                  label: "Rejected",
                  value: allEmployeeCounts.rejected,
                  icon: XCircle,
                  color: "text-red-600",
                  bg: "bg-red-50",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} ${item.color}`}
                      >
                        <Icon size={20} />
                      </div>

                      <p className="text-2xl font-bold text-slate-800">
                        {item.value}
                      </p>
                    </div>

                    <p className="mt-3 text-sm font-medium text-slate-500">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Employee Leave Records
                  </h3>

                  <p className="text-sm text-slate-500">
                    Withdrawn applications are excluded from this list.
                  </p>
                </div>

                <span className="text-sm font-medium text-slate-500">
                  {allEmployeeLeaves.length} record(s)
                </span>
              </div>

              {allLeavesLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw
                    size={30}
                    className="animate-spin text-indigo-600"
                  />

                  <p className="mt-3 text-sm text-slate-500">
                    Loading employee leave records...
                  </p>
                </div>
              ) : allEmployeeLeaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400">
                    <Users size={30} />
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-slate-700">
                    No Employee Leave Records
                  </h3>

                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    No non-withdrawn leave applications were found for your
                    company.
                  </p>

                  {!allLeavesLoaded && (
                    <button
                      type="button"
                      onClick={() => fetchAllEmployeeLeaves()}
                      className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Load Employee Leaves
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* DESKTOP TABLE */}

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1150px] text-left">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Employee</th>
                          <th className="px-5 py-4">Department</th>
                          <th className="px-5 py-4">Leave Details</th>
                          <th className="px-5 py-4">Duration</th>
                          <th className="px-5 py-4">Total Days</th>
                          <th className="px-5 py-4">Applied On</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4 text-right">Action</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {allEmployeeLeaves.map((leave) => {
                          const employee = leave.employeeId || {};

                          return (
                            <tr
                              key={leave._id}
                              className="align-top transition hover:bg-slate-50"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                    <UserRound size={18} />
                                  </div>

                                  <div>
                                    <p className="font-semibold text-slate-800">
                                      {employee.name || "Unknown Employee"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      ID: {employee.empId || "N/A"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {employee.email || ""}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-medium text-slate-700">
                                  {employee.departmentId?.departmentName ||
                                    "N/A"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {employee.roleId?.roleName || "N/A"}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-800">
                                  {renderLeaveTitle(leave)}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {getLeaveCategory(leave)}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-medium text-slate-700">
                                  {formatLeaveDate(getStartDate(leave))}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  to {formatLeaveDate(getEndDate(leave))}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <span className="font-semibold text-slate-700">
                                  {formatDays(leave.totalDays)} days
                                </span>

                                {hasHalfDay(leave) && (
                                  <p className="mt-1 text-xs font-medium text-amber-600">
                                    Includes Half Day
                                  </p>
                                )}
                              </td>

                              <td className="px-5 py-4 text-sm text-slate-600">
                                {formatDate(leave.createdAt)}
                              </td>

                              <td className="px-5 py-4">
                                <LeaveStatusBadge status={leave.status} />
                              </td>

                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEmployeeLeaveDetails(leave)
                                  }
                                  title="View Leave Details"
                                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                  <Eye size={17} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS */}

                  <div className="space-y-3 p-4 md:hidden">
                    {allEmployeeLeaves.map((leave) => {
                      const employee = leave.employeeId || {};

                      return (
                        <div
                          key={leave._id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                <UserRound size={18} />
                              </div>

                              <div>
                                <h4 className="font-bold text-slate-800">
                                  {employee.name || "Unknown Employee"}
                                </h4>

                                <p className="mt-1 text-xs text-slate-500">
                                  ID: {employee.empId || "N/A"}
                                </p>
                              </div>
                            </div>

                            <LeaveStatusBadge status={leave.status} />
                          </div>

                          <div className="mt-3 rounded-lg bg-slate-50 p-3">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Building2 size={14} />
                              {employee.departmentId?.departmentName || "N/A"}
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              Role: {employee.roleId?.roleName || "N/A"}
                            </p>
                          </div>

                          <div className="mt-3">
                            <p className="font-semibold text-slate-800">
                              {renderLeaveTitle(leave)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {getLeaveCategory(leave)}
                            </p>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-slate-400">
                                Start Date
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-700">
                                {formatLeaveDate(getStartDate(leave))}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">End Date</p>
                              <p className="mt-1 text-sm font-medium text-slate-700">
                                {formatLeaveDate(getEndDate(leave))}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">
                                Total Days
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {formatDays(leave.totalDays)} days
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">
                                Applied On
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-700">
                                {formatDate(leave.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 border-t border-slate-100 pt-3">
                            <button
                              type="button"
                              onClick={() => openEmployeeLeaveDetails(leave)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 px-3 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                            >
                              <Eye size={16} />
                              View Leave Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ================= APPLY LEAVE POPUP ================= */}

        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <FilePlus2 className="h-5 w-5 text-blue-600" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      Apply Leave
                    </h2>

                    <p className="text-xs text-slate-500">
                      Select leave type, dates and day type.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeApplyModal}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSubmitLeave}
                className="flex-1 space-y-5 overflow-y-auto p-5"
              >
                {/* LEAVE TYPE + ADD NON-PAID LEAVES */}

                <div>
                  <label
                    htmlFor="leaveType"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Leave Type
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <select
                      id="leaveType"
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:flex-1"
                    >
                      <option value="">Select leave type</option>

                      {PAID_LEAVE_TYPES.map((item) => (
                        <option key={item.leaveType} value={item.leaveType}>
                          {item.leaveType} (Available:{" "}
                          {toNumber(balance[item.field]).toFixed(1)} days)
                        </option>
                      ))}
                    </select>

                    <label
                      htmlFor="isUnpaidLeave"
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition sm:flex-1 ${
                        isUnpaidLeave
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Add Non-Paid Leaves</span>

                      <input
                        id="isUnpaidLeave"
                        type="checkbox"
                        checked={isUnpaidLeave}
                        onChange={(e) => setIsUnpaidLeave(e.target.checked)}
                        className="h-5 w-5 cursor-pointer accent-red-500"
                      />
                    </label>
                  </div>

                  {leaveType && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Available {leaveType} balance:{" "}
                      <span className="font-semibold text-slate-700">
                        {availableBalance.toFixed(1)} days
                      </span>
                    </p>
                  )}
                </div>

                {/* CALENDAR + SELECTED DATES */}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* LEFT: CALENDAR */}

                  <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Leave Days
                      </h3>

                      <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {formatDays(totalDays)} day(s)
                      </span>
                    </div>

                    <LeaveCalendar
                      selected={selectedDates}
                      onToggle={toggleDate}
                      isDateDisabled={isDateDisabled}
                      getTone={getDateTone}
                      disabled={!calendarEnabled}
                      today={today}
                    />

                    {!calendarEnabled && (
                      <p className="mt-2 text-xs text-slate-500">
                        Select a leave type or tick "Add Non-Paid Leaves" to
                        choose dates.
                      </p>
                    )}
                  </section>

                  {/* RIGHT: SELECTED DATES */}

                  <section className="flex max-h-[420px] flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Selected Dates
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <span className={`h-2.5 w-2.5 rounded-full ${TONE.green.dot}`} />
                          Paid
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <span className={`h-2.5 w-2.5 rounded-full ${TONE.yellow.dot}`} />
                          Part paid
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <span className={`h-2.5 w-2.5 rounded-full ${TONE.red.dot}`} />
                          Unpaid
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1">
                      <SelectedDateList
                        dates={sortedSelectedDates}
                        selected={selectedDates}
                        allocation={allocation}
                        onChangeType={changeDateType}
                        onRemove={removeDate}
                      />
                    </div>
                  </section>
                </div>

                {/* BALANCE ERROR */}

                {balanceError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p>{balanceError}</p>
                  </div>
                )}

                {/* SUMMARY */}

                {totalDays > 0 && !balanceError && (
                  <div className="grid grid-cols-3 gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <div>
                      <p className="text-xs text-slate-500">Paid</p>
                      <p className="mt-1 text-lg font-bold text-emerald-700">
                        {formatDays(paidDays)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Unpaid</p>
                      <p className="mt-1 text-lg font-bold text-red-600">
                        {formatDays(unpaidDays)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="mt-1 text-lg font-bold text-blue-700">
                        {formatDays(totalDays)}
                      </p>
                    </div>
                  </div>
                )}

                {/* REASON */}

                <div>
                  <label
                    htmlFor="reason"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Reason for Leave <span className="text-rose-500">*</span>
                  </label>

                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Please explain the reason for your leave..."
                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-right text-xs text-slate-400">
                    {reason.length}/1000
                  </p>
                </div>

                {/* ACTIONS */}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeApplyModal}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <X size={17} />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={17} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={17} />
                        Submit Leave Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= LEAVE DETAILS MODAL ================= */}

        {selectedLeave && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Leave Details
                  </h2>

                  <p className="text-xs text-slate-500">
                    Application information
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDetails}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                {/* EMPLOYEE INFORMATION - HR VIEW */}

                {!selectedLeaveIsMine && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="flex items-center gap-2">
                      <UserRound size={18} className="text-indigo-600" />

                      <h3 className="text-sm font-bold text-indigo-800">
                        Employee Information
                      </h3>
                    </div>

                    <p className="mt-3 font-semibold text-slate-800">
                      {selectedLeave.employeeId?.name || "Unknown Employee"}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Employee ID: {selectedLeave.employeeId?.empId || "N/A"}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Email: {selectedLeave.employeeId?.email || "N/A"}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Department:{" "}
                      {selectedLeave.employeeId?.departmentId
                        ?.departmentName || "N/A"}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Role: {selectedLeave.employeeId?.roleId?.roleName || "N/A"}
                    </p>
                  </div>
                )}

                {/* STATUS & CATEGORY */}

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Leave Category</p>

                    <h3 className="mt-1 text-lg font-bold text-slate-800">
                      {getLeaveCategory(selectedLeave)}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {renderLeaveTitle(selectedLeave)}
                    </p>
                  </div>

                  <LeaveStatusBadge status={selectedLeave.status} />
                </div>

                {/* SUMMARY */}

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Start Date</p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {formatLeaveDate(getStartDate(selectedLeave))}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">End Date</p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {formatLeaveDate(getEndDate(selectedLeave))}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-3">
                    <p className="text-xs text-blue-600">Total Leave Days</p>

                    <p className="mt-1 text-xl font-bold text-blue-800">
                      {formatDays(selectedLeave.totalDays)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Applied On</p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {formatDate(selectedLeave.createdAt)}
                    </p>
                  </div>
                </div>

                {/* LEAVE TYPE ALLOCATION */}

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Wallet size={17} className="text-blue-600" />

                    <h3 className="text-sm font-bold text-slate-800">
                      Leave Type Allocation
                    </h3>
                  </div>

                  <LeaveTypeBreakdown leave={selectedLeave} />

                  <div className="mt-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-3">
                    <span className="text-sm font-semibold text-blue-800">
                      Total Allocated
                    </span>

                    <span className="text-sm font-bold text-blue-800">
                      {formatDays(
                        getLeaveBreakdown(selectedLeave).reduce(
                          (sum, item) => sum + Number(item.days || 0),
                          0
                        )
                      )}{" "}
                      Days
                    </span>
                  </div>
                </div>

                {/* DAILY BREAKDOWN */}

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays size={17} className="text-indigo-600" />

                    <h3 className="text-sm font-bold text-slate-800">
                      Daily Breakdown
                    </h3>
                  </div>

                  <DailyLeaveBreakdown leave={selectedLeave} />

                  {getLeaveDates(selectedLeave).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-blue-700">
                        <Sun size={14} />
                        Full Day
                      </span>

                      <span className="inline-flex items-center gap-1.5 text-amber-700">
                        <Moon size={14} />
                        Half Day
                      </span>
                    </div>
                  )}
                </div>

                {/* REASON */}

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Reason
                  </p>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-600">
                    {selectedLeave.reason || "No reason provided."}
                  </div>
                </div>

                {selectedLeave.rejectionReason && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-red-700">
                      Rejection Reason
                    </p>

                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-700">
                      {selectedLeave.rejectionReason}
                    </div>
                  </div>
                )}

                {selectedLeave.approvedAt && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                    <p className="text-sm font-semibold text-green-800">
                      Approved On
                    </p>

                    <p className="mt-1 text-sm text-green-700">
                      {formatDateTime(selectedLeave.approvedAt)}
                    </p>
                  </div>
                )}

                {selectedLeave.rejectedAt && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-800">
                      Rejected On
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                      {formatDateTime(selectedLeave.rejectedAt)}
                    </p>
                  </div>
                )}

                {selectedLeave.status === "Pending" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-800">
                      Awaiting Approval
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-amber-700">
                      {selectedLeaveIsMine
                        ? "Your leave application is still pending. You can withdraw this request until it is approved or rejected."
                        : "This employee's leave application is awaiting approval."}
                    </p>
                  </div>
                )}

                {selectedLeaveIsMine && selectedLeave.status === "Pending" && (
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(selectedLeave)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <RotateCcw size={17} />
                    Withdraw This Request
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= WITHDRAW CONFIRMATION ================= */}

        {confirmLeave && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertCircle size={28} />
              </div>

              <h2 className="mt-4 text-center text-xl font-bold text-slate-800">
                Withdraw Leave Request?
              </h2>

              <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
                Are you sure you want to withdraw your{" "}
                <strong>{renderLeaveTitle(confirmLeave)}</strong> request for{" "}
                <strong>{formatDays(confirmLeave.totalDays)} day(s)</strong>?
              </p>

              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">
                  LEAVE ALLOCATION
                </p>

                <div className="space-y-2">
                  {getLeaveBreakdown(confirmLeave).map((item, index) => (
                    <div
                      key={`${item.leaveType}-${index}`}
                      className="flex justify-between gap-2 text-sm"
                    >
                      <span className="text-slate-600">{item.leaveType}</span>

                      <span className="font-semibold text-slate-800">
                        {formatDays(item.days)} days
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-700">
                This action cannot be undone. Any paid leave balance deducted
                for this request will be refunded automatically. Unpaid leave
                is not refunded as a balance deduction.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmLeave(null)}
                  disabled={withdrawingId === confirmLeave._id}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleWithdraw(confirmLeave)}
                  disabled={withdrawingId === confirmLeave._id}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {withdrawingId === confirmLeave._id
                    ? "Withdrawing..."
                    : "Yes, Withdraw"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLeave;