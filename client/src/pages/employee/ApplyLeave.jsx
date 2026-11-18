
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FilePlus2,
  Send,
  X,
  RefreshCw,
  Wallet,
  Plus,
  Minus,
  Clock,
  AlertCircle,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-toastify";

// =====================================================
// LEAVE TYPES
// =====================================================

const LEAVE_TYPES = [
  { leaveType: "Casual Leave", field: "casualLeave", shortName: "CL" },
  { leaveType: "Sick Leave", field: "sickLeave", shortName: "SL" },
  { leaveType: "Paid Leave", field: "paidLeave", shortName: "PL" },
  { leaveType: "Comp-Off", field: "compOffBalance", shortName: "CO" },
  { leaveType: "Unpaid Leave", field: null, shortName: "UL" },
];

const createInitialAllocations = () => ({
  "Casual Leave": "",
  "Sick Leave": "",
  "Paid Leave": "",
  "Comp-Off": "",
  "Unpaid Leave": "",
});

// =====================================================
// DATE HELPERS
// =====================================================

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateString) => {
  if (!dateString) return null;

  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
};

const formatDateInput = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (date) => {
  if (!date) return "—";

  const dateString =
    typeof date === "string" ? date.slice(0, 10) : date;

  const parsed = parseLocalDate(dateString);

  if (!parsed || Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getDateRange = (startDate, endDate) => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (!start || !end || start > end) return [];

  const dates = [];

  for (
    let time = start.getTime();
    time <= end.getTime();
    time += 86400000
  ) {
    dates.push(formatDateInput(new Date(time)));
  }

  return dates;
};

const getStatusClass = (status) => {
  const normalized = String(status || "Pending").toLowerCase();

  if (normalized === "approved" || normalized === "used") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalized === "rejected") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-amber-50 text-amber-700";
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

// =====================================================
// COMPONENT
// =====================================================

const ApplyLeave = () => {
  const today = getToday();

  // =====================================================
  // STATES
  // =====================================================

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    halfDayDate: "",
    reason: "",
  });

  const [allocations, setAllocations] = useState(
    createInitialAllocations()
  );

  const [balance, setBalance] = useState({
    casualLeave: 0,
    sickLeave: 0,
    paidLeave: 0,
    compOffBalance: 0,
    extraLeaveTaken: 0,
  });

  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // =====================================================
  // COMP-OFF STATES
  // =====================================================

  const [compOffWorkDates, setCompOffWorkDates] = useState([""]);
  const [compOffSubmitting, setCompOffSubmitting] = useState(false);
  const [compOffRequests, setCompOffRequests] = useState([]);
  const [loadingCompOffRequests, setLoadingCompOffRequests] =
    useState(false);

  // =====================================================
  // FETCH LEAVE + COMP-OFF BALANCE
  // =====================================================

  const fetchLeaveBalance = useCallback(async () => {
    try {
      const response = await api.get("/leaves/my-balance");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to load leave balance."
        );
      }

      const data = response.data.balance || {};

      setBalance({
        casualLeave: toNumber(data.casualLeave),
        sickLeave: toNumber(data.sickLeave),
        paidLeave: toNumber(data.paidLeave),
        compOffBalance: toNumber(
          data.compOffBalance ??
          data.availableCompOffBalance ??
          data.availableBalance
        ),
        extraLeaveTaken: toNumber(data.extraLeaveTaken),
      });
    } catch (error) {
      console.error("Fetch Leave Balance Error:", error);

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to load leave balance."
      );
    }
  }, []);

  // =====================================================
  // FETCH COMP-OFF REQUESTS
  // =====================================================

  const fetchCompOffRequests = useCallback(async () => {
    try {
      setLoadingCompOffRequests(true);

      const response = await api.get("/comp-off/my-requests");

      if (response.data?.success) {
        const requests = response.data.requests;

        setCompOffRequests(
          Array.isArray(requests) ? requests : []
        );
      } else {
        setCompOffRequests([]);
      }
    } catch (error) {
      console.error("Fetch Comp-Off Requests Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to load Comp-Off requests."
      );
    } finally {
      setLoadingCompOffRequests(false);
    }
  }, []);

  // =====================================================
  // REFRESH ALL DATA
  // =====================================================

  const refreshAllData = useCallback(async () => {
    setLoadingBalance(true);

    try {
      await Promise.all([
        fetchLeaveBalance(),
        fetchCompOffRequests(),
      ]);
    } finally {
      setLoadingBalance(false);
    }
  }, [fetchLeaveBalance, fetchCompOffRequests]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // =====================================================
  // LEAVE BREAKDOWN
  // =====================================================

  const leaveBreakdown = useMemo(() => {
    return LEAVE_TYPES.map((item) => ({
      leaveType: item.leaveType,
      days: toNumber(allocations[item.leaveType]),
    })).filter((item) => item.days > 0);
  }, [allocations]);

  const totalDays = useMemo(
    () =>
      leaveBreakdown.reduce(
        (sum, item) => sum + item.days,
        0
      ),
    [leaveBreakdown]
  );

  const hasFractionalDays =
    Math.abs(totalDays - Math.round(totalDays)) > 0.000001;

  const expectedCalendarDays = Math.ceil(totalDays);

  // =====================================================
  // DATE RANGE
  // =====================================================

  const dateRange = useMemo(
    () => getDateRange(form.startDate, form.endDate),
    [form.startDate, form.endDate]
  );

  const isDateRangeValid =
    dateRange.length > 0 &&
    dateRange.length === expectedCalendarDays;

  // =====================================================
  // DAILY BREAKDOWN
  // =====================================================

  const dailyBreakdown = useMemo(() => {
    if (!isDateRangeValid) return [];

    return dateRange.map((date) => {
      const isHalfDay =
        hasFractionalDays && date === form.halfDayDate;

      return {
        date,
        dayType: isHalfDay ? "Half Day" : "Full Day",
        days: isHalfDay ? 0.5 : 1,
      };
    });
  }, [
    dateRange,
    isDateRangeValid,
    hasFractionalDays,
    form.halfDayDate,
  ]);

  // =====================================================
  // BALANCE VALIDATION
  // =====================================================

  const insufficientBalances = useMemo(() => {
    return leaveBreakdown.filter((item) => {
      if (item.leaveType === "Unpaid Leave") return false;

      const config = LEAVE_TYPES.find(
        (type) => type.leaveType === item.leaveType
      );

      return (
        item.days >
        toNumber(balance[config?.field])
      );
    });
  }, [leaveBreakdown, balance]);

  const hasInsufficientBalance =
    insufficientBalances.length > 0;

  // =====================================================
  // CATEGORY
  // =====================================================

  const hasCompOff = leaveBreakdown.some(
    (item) => item.leaveType === "Comp-Off"
  );

  const hasRegularPaidLeave = leaveBreakdown.some(
    (item) =>
      ["Casual Leave", "Sick Leave", "Paid Leave"].includes(
        item.leaveType
      )
  );

  const hasPaidLeave =
    hasCompOff || hasRegularPaidLeave;

  const hasUnpaidLeave = leaveBreakdown.some(
    (item) => item.leaveType === "Unpaid Leave"
  );

  const leaveCategory =
    hasPaidLeave && hasUnpaidLeave
      ? "Mixed Leave"
      : hasUnpaidLeave
        ? "Unpaid Leave"
        : hasCompOff && !hasRegularPaidLeave
          ? "Comp-Off"
          : "Paid Leave";

  // =====================================================
  // HANDLE FORM CHANGE
  // =====================================================

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "startDate") {
        if (updated.endDate && updated.endDate < value) {
          updated.endDate = "";
        }

        updated.halfDayDate = "";
      }

      if (name === "endDate") {
        updated.halfDayDate = "";
      }

      return updated;
    });
  };

  // =====================================================
  // HANDLE LEAVE ALLOCATION
  // =====================================================

  const handleAllocationChange = (leaveType, value) => {
    if (
      value !== "" &&
      (!Number.isFinite(Number(value)) || Number(value) < 0)
    ) {
      return;
    }

    if (value !== "" && Number(value) > 365) return;

    setAllocations((prev) => ({
      ...prev,
      [leaveType]: value,
    }));

    setForm((prev) => ({
      ...prev,
      halfDayDate: "",
    }));
  };

  const clearAllocation = (leaveType) => {
    setAllocations((prev) => ({
      ...prev,
      [leaveType]: "",
    }));

    setForm((prev) => ({
      ...prev,
      halfDayDate: "",
    }));
  };

  // =====================================================
  // RESET FORM
  // =====================================================

  const handleReset = () => {
    setForm({
      startDate: "",
      endDate: "",
      halfDayDate: "",
      reason: "",
    });

    setAllocations(createInitialAllocations());
  };

  // =====================================================
  // COMP-OFF WORK DATE HANDLERS
  // =====================================================

  const handleAddWorkDate = () => {
    setCompOffWorkDates((prev) => [...prev, ""]);
  };

  const handleRemoveWorkDate = (index) => {
    setCompOffWorkDates((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length ? updated : [""];
    });
  };

  const handleWorkDateChange = (index, value) => {
    setCompOffWorkDates((prev) =>
      prev.map((date, i) => (i === index ? value : date))
    );
  };

  // =====================================================
  // SUBMIT COMP-OFF REQUEST
  // =====================================================

  const handleCompOffRequest = async (e) => {
    e.preventDefault();

    const workDates = compOffWorkDates
      .map((date) => date.trim())
      .filter(Boolean)
      .sort();

    if (!workDates.length) {
      toast.error("Please select at least one attendance date.");
      return;
    }

    if (new Set(workDates).size !== workDates.length) {
      toast.error("Duplicate attendance dates are not allowed.");
      return;
    }

    if (workDates.some((date) => date >= today)) {
      toast.error(
        "Only completed past attendance dates can be selected."
      );
      return;
    }

    try {
      setCompOffSubmitting(true);

      const response = await api.post("/comp-off/request", {
        workDates,
      });

      if (response.data?.success) {
        toast.success(
          response.data.message ||
            "Comp-Off request submitted successfully."
        );

        setCompOffWorkDates([""]);

        await Promise.all([
          fetchLeaveBalance(),
          fetchCompOffRequests(),
        ]);
      } else {
        toast.error(
          response.data?.message ||
            "Unable to submit Comp-Off request."
        );
      }
    } catch (error) {
      console.error("Comp-Off Request Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to submit Comp-Off request."
      );
    } finally {
      setCompOffSubmitting(false);
    }
  };

  // =====================================================
  // SUBMIT LEAVE REQUEST
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!leaveBreakdown.length) {
      toast.error(
        "Please allocate days to at least one leave type."
      );
      return;
    }

    if (!form.startDate || !form.endDate) {
      toast.error("Please select both start date and end date.");
      return;
    }

    if (form.startDate < today || form.endDate < today) {
      toast.error("Past dates are not allowed for leave application.");
      return;
    }

    if (form.startDate > form.endDate) {
      toast.error("End date cannot be before start date.");
      return;
    }

    const invalidAllocation = leaveBreakdown.some(
      (item) =>
        Math.abs(item.days * 2 - Math.round(item.days * 2)) >
        0.000001
    );

    if (
      !Number.isFinite(totalDays) ||
      totalDays < 0.5 ||
      invalidAllocation
    ) {
      toast.error(
        "Each leave allocation must be in multiples of 0.5 days."
      );
      return;
    }

    if (!isDateRangeValid) {
      toast.error(
        `For ${totalDays} leave days, select exactly ${expectedCalendarDays} calendar date(s).`
      );
      return;
    }

    if (hasFractionalDays && !form.halfDayDate) {
      toast.error("Please select which date will be a Half Day.");
      return;
    }

    if (
      hasFractionalDays &&
      !dateRange.includes(form.halfDayDate)
    ) {
      toast.error(
        "The selected Half Day must be within the leave date range."
      );
      return;
    }

    if (!hasFractionalDays && form.halfDayDate) {
      toast.error(
        "Half Day is not required for a whole-day leave request."
      );
      return;
    }

    if (!form.reason.trim()) {
      toast.error("Leave reason is required.");
      return;
    }

    if (hasInsufficientBalance) {
      const message = insufficientBalances
        .map((item) => {
          const config = LEAVE_TYPES.find(
            (type) => type.leaveType === item.leaveType
          );

          return `${item.leaveType}: requested ${item.days}, available ${toNumber(
            balance[config?.field]
          )}`;
        })
        .join("; ");

      toast.error(`Insufficient leave balance. ${message}`);
      return;
    }

    const dailyTotal = dailyBreakdown.reduce(
      (sum, item) => sum + item.days,
      0
    );

    if (Math.abs(dailyTotal - totalDays) > 0.000001) {
      toast.error(
        "Daily breakdown does not match total leave days."
      );
      return;
    }

    try {
      setSubmitting(true);

      // Backend payload structure unchanged.
      // Comp-Off reservation is handled by leaveController.
      const payload = {
        startDate: form.startDate,
        endDate: form.endDate,
        totalDays,
        leaveBreakdown,
        dailyBreakdown,
        reason: form.reason.trim(),
      };

      const response = await api.post("/leaves", payload);

      if (response.data?.success) {
        toast.success(
          response.data.message ||
            "Leave request submitted successfully."
        );

        handleReset();

        await Promise.all([
          fetchLeaveBalance(),
          fetchCompOffRequests(),
        ]);
      } else {
        toast.error(
          response.data?.message ||
            "Failed to submit leave request."
        );
      }
    } catch (error) {
      console.error("Apply Leave Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to submit leave request."
      );

      await fetchLeaveBalance();
    } finally {
      setSubmitting(false);
    }
  };

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
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* HEADER */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-indigo-100 p-2.5">
                <FilePlus2 className="h-6 w-6 text-indigo-600" />
              </div>

              <h1 className="text-2xl font-bold text-slate-800">
                Apply Leave
              </h1>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Manage your leave applications and Comp-Off requests
              from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshAllData}
            disabled={loadingBalance || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loadingBalance ? "animate-spin" : ""}
            />
            Refresh Balance
          </button>
        </div>

        {/* BALANCE CARDS */}

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Wallet size={19} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              My Leave Balance
            </h2>
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

        {/* =====================================================
            MAIN LEAVE APPLICATION
            Placed directly after balance cards
        ===================================================== */}

        <div className="overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm">

          <div className="border-b border-indigo-100 bg-indigo-50/50 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2">
                <CalendarDays className="h-5 w-5 text-indigo-600" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-800">
                  Leave Application Form
                </h2>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Apply for Casual, Sick, Paid, Comp-Off or Unpaid Leave.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 p-4 sm:p-6"
          >
            {/* LEAVE ALLOCATION */}

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Leave Type Allocation
                    <span className="ml-1 text-rose-500">*</span>
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Enter the number of days for each leave type.
                    Use 0.5 increments.
                  </p>
                </div>

                <span className="shrink-0 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  Multiple Types
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {LEAVE_TYPES.map((item) => {
                  const value = allocations[item.leaveType];

                  const requested = toNumber(value);

                  const available = item.field
                    ? toNumber(balance[item.field])
                    : null;

                  const insufficient =
                    item.field && requested > available;

                  return (
                    <div
                      key={item.leaveType}
                      className="rounded-xl border border-slate-200 p-3 sm:p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                            {item.shortName}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {item.leaveType}
                            </p>

                            {item.field ? (
                              <p className="mt-0.5 text-xs text-slate-500">
                                Available:{" "}
                                {loadingBalance
                                  ? "Loading..."
                                  : `${available.toFixed(1)} days`}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-xs text-amber-600">
                                No balance deduction
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => clearAllocation(item.leaveType)}
                          disabled={!value}
                          className="shrink-0 rounded-md border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-rose-600 disabled:opacity-30"
                          title="Clear allocation"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          Requested Days
                        </label>

                        <input
                          type="number"
                          min="0"
                          max="365"
                          step="0.5"
                          value={value}
                          onChange={(e) =>
                            handleAllocationChange(
                              item.leaveType,
                              e.target.value
                            )
                          }
                          placeholder="0.0"
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                            insufficient
                              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                              : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                          }`}
                        />

                        {insufficient && (
                          <p className="mt-1 text-xs text-rose-600">
                            Insufficient balance
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* TOTAL SUMMARY */}

            <section className="grid grid-cols-3 gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 sm:gap-4 sm:p-4">
              <div>
                <p className="text-[10px] font-medium text-slate-500 sm:text-xs">
                  Total Leave Days
                </p>

                <p className="mt-1 text-xl font-bold text-indigo-700 sm:text-2xl">
                  {totalDays.toFixed(1)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium text-slate-500 sm:text-xs">
                  Calendar Days Required
                </p>

                <p className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                  {expectedCalendarDays}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium text-slate-500 sm:text-xs">
                  Leave Category
                </p>

                <p className="mt-1 break-words text-sm font-bold text-slate-800 sm:text-lg">
                  {leaveBreakdown.length
                    ? leaveCategory
                    : "Not Selected"}
                </p>
              </div>
            </section>

            {/* ALLOCATION SUMMARY */}

            {leaveBreakdown.length > 0 && (
              <section className="rounded-xl border border-slate-200 p-3 sm:p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Allocation Summary
                </h3>

                <div className="flex flex-wrap gap-2">
                  {leaveBreakdown.map((item) => (
                    <span
                      key={item.leaveType}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                        item.leaveType === "Unpaid Leave"
                          ? "bg-amber-50 text-amber-700"
                          : item.leaveType === "Comp-Off"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {item.leaveType}: {item.days.toFixed(1)} day(s)
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* DATE RANGE */}

            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                Leave Date Range
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Start Date <span className="text-rose-500">*</span>
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={form.startDate}
                      min={today}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    End Date <span className="text-rose-500">*</span>
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={form.endDate}
                      min={form.startDate || today}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      required
                    />
                  </div>
                </div>
              </div>

              {form.startDate && form.endDate && (
                <div
                  className={`mt-3 rounded-lg p-3 text-sm ${
                    isDateRangeValid
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {isDateRangeValid
                    ? `Date range valid: ${dateRange.length} calendar day(s).`
                    : `You selected ${dateRange.length} calendar day(s), but ${expectedCalendarDays} required for ${totalDays} leave day(s).`}
                </div>
              )}
            </section>

            {/* HALF DAY DATE */}

            {hasFractionalDays && (
              <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Select Half Day Date
                  <span className="ml-1 text-rose-500">*</span>
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  Your request contains a half day. Select which date
                  will be Half Day. All other dates will be Full Day.
                </p>

                <div className="mt-3">
                  <label
                    htmlFor="halfDayDate"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Half Day Date
                  </label>

                  <select
                    id="halfDayDate"
                    value={form.halfDayDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        halfDayDate: e.target.value,
                      }))
                    }
                    disabled={!isDateRangeValid}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                    required
                  >
                    <option value="">Select Half Day Date</option>

                    {dateRange.map((date) => (
                      <option key={date} value={date}>
                        {formatDate(date)}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            )}

            {/* DAILY BREAKDOWN PREVIEW */}

            {isDateRangeValid && (
              <section className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Daily Leave Breakdown
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Review the dates and day types before submitting.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {dailyBreakdown.map((item) => (
                    <div
                      key={item.date}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays
                          size={16}
                          className="text-slate-400"
                        />

                        <span className="text-sm font-medium text-slate-700">
                          {formatDate(item.date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.dayType === "Half Day"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {item.dayType}
                        </span>

                        <span className="w-12 text-right text-sm font-semibold text-slate-700">
                          {item.days.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">
                    Total
                  </span>

                  <span className="text-sm font-bold text-indigo-700">
                    {dailyBreakdown
                      .reduce((sum, item) => sum + item.days, 0)
                      .toFixed(1)}{" "}
                    Days
                  </span>
                </div>
              </section>
            )}

            {/* REASON */}

            <section>
              <label
                htmlFor="reason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Reason for Leave <span className="text-rose-500">*</span>
              </label>

              <textarea
                id="reason"
                name="reason"
                value={form.reason}
                onChange={handleFormChange}
                rows={3}
                maxLength={1000}
                placeholder="Please explain the reason for your leave..."
                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {form.reason.length}/1000
              </p>
            </section>

            {/* BALANCE WARNING */}

            {hasInsufficientBalance && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <p className="font-semibold">
                  Insufficient Leave Balance
                </p>

                {insufficientBalances.map((item) => {
                  const config = LEAVE_TYPES.find(
                    (type) => type.leaveType === item.leaveType
                  );

                  return (
                    <p key={item.leaveType} className="mt-1">
                      {item.leaveType}: Requested{" "}
                      {item.days.toFixed(1)}, Available{" "}
                      {toNumber(balance[config?.field]).toFixed(1)} days.
                    </p>
                  );
                })}
              </div>
            )}

            {/* COMP-OFF RESERVATION INFORMATION */}

            {leaveBreakdown.some(
              (item) => item.leaveType === "Comp-Off"
            ) && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle size={16} />
                  Comp-Off Reservation
                </div>

                <p className="mt-1 text-xs">
                  Requested Comp-Off days will be reserved from your
                  approved Comp-Off credits when this leave application
                  is submitted. If the leave is rejected or withdrawn,
                  the reserved days will be returned.
                </p>
              </div>
            )}

            {/* ACTIONS */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={17} />
                Reset
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingBalance ||
                  hasInsufficientBalance ||
                  !leaveBreakdown.length ||
                  !isDateRangeValid ||
                  (hasFractionalDays && !form.halfDayDate)
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* =====================================================
            COMP-OFF APPLICATION
            Moved below the main Leave Application
        ===================================================== */}

        <section className="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-sm">
          <div className="border-b border-violet-100 bg-violet-50/60 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-violet-600" />

                  <h2 className="font-semibold text-slate-800">
                    Apply for Comp-Off
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Select completed attendance dates to claim eligible
                  extra work hours.
                </p>
              </div>

              <span className="w-fit rounded-lg bg-white px-3 py-2 text-sm font-semibold text-violet-700">
                Available Balance:{" "}
                {toNumber(balance.compOffBalance).toFixed(1)} Days
              </span>
            </div>
          </div>

          <form
            onSubmit={handleCompOffRequest}
            className="space-y-4 p-4 sm:p-6"
          >
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              <div className="flex items-center gap-2 font-semibold">
                <Clock size={16} />
                Comp-Off Eligibility
              </div>

              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                <li>
                  Normal working day: eligible extra work after 8 hours.
                </li>
                <li>
                  Sunday: complete eligible attendance duration.
                </li>
                <li>
                  Company Holiday: complete eligible attendance duration.
                </li>
                <li>8 eligible hours = 1 Comp-Off day.</li>
                <li>
                  Submitted attendance dates will be verified by HR.
                </li>
                <li>
                  Only approved Comp-Off credits can be used in Leave
                  Application.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              {compOffWorkDates.map((date, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 sm:flex-row sm:items-end"
                >
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Work Date {index + 1}
                    </label>

                    <input
                      type="date"
                      value={date}
                      max={today}
                      onChange={(e) =>
                        handleWorkDateChange(index, e.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveWorkDate(index)}
                    disabled={compOffWorkDates.length === 1}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus size={15} />
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={handleAddWorkDate}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
              >
                <Plus size={16} />
                Add Work Date
              </button>

              <button
                type="submit"
                disabled={compOffSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {compOffSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Comp-Off Request
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* =====================================================
            COMP-OFF REQUEST HISTORY
        ===================================================== */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-800">
                My Comp-Off Requests
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Track your submitted Comp-Off claims and credited days.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCompOffRequests}
              disabled={loadingCompOffRequests}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  loadingCompOffRequests ? "animate-spin" : ""
                }
              />
              Refresh
            </button>
          </div>

          {loadingCompOffRequests ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading Comp-Off requests...
            </div>
          ) : compOffRequests.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="mx-auto h-9 w-9 text-slate-300" />

              <p className="mt-2 text-sm font-medium text-slate-600">
                No Comp-Off requests found.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Your submitted requests will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Request Date</th>
                    <th className="px-5 py-3">Work Dates</th>
                    <th className="px-5 py-3">Claimed Hours</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Credited Days</th>
                    <th className="px-5 py-3">Available Days</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {compOffRequests.map((request) => {
                    const workDates = [
                      ...new Set(
                        (request.workEntries || [])
                          .map((entry) => entry.workDate)
                          .filter(Boolean)
                      ),
                    ];

                    const claimedHours =
                      toNumber(request.totalClaimedMinutes) / 60;

                    return (
                      <tr key={request._id}>
                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(request.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {workDates.length ? (
                              workDates.map((date) => (
                                <span
                                  key={date}
                                  className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                                >
                                  {formatDate(date)}
                                </span>
                              ))
                            ) : (
                              "—"
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {claimedHours.toFixed(2)} hrs
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              request.status
                            )}`}
                          >
                            {request.status || "Pending"}
                          </span>

                          {request.rejectionReason && (
                            <p className="mt-1 max-w-[180px] text-xs text-rose-500">
                              {request.rejectionReason}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 font-semibold text-violet-700">
                          {toNumber(request.creditedDays).toFixed(1)} Days
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {toNumber(request.remainingDays).toFixed(1)} Days
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default ApplyLeave;
