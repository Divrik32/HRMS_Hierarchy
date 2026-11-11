
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FilePlus2,
  Send,
  X,
  RefreshCw,
  Clock,
  Wallet,
  Plus,
  Minus,
} from "lucide-react";

import api from "../../api/axios";
import { toast } from "react-toastify";
const LEAVE_TYPES = [
  {
    leaveType: "Casual Leave",
    field: "casualLeave",
    shortName: "CL",
  },
  {
    leaveType: "Sick Leave",
    field: "sickLeave",
    shortName: "SL",
  },
  {
    leaveType: "Paid Leave",
    field: "paidLeave",
    shortName: "PL",
  },
  {
    leaveType: "Unpaid Leave",
    field: null,
    shortName: "UL",
  },
];

const initialAllocations = {
  "Casual Leave": "",
  "Sick Leave": "",
  "Paid Leave": "",
  "Unpaid Leave": "",
};

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

const formatDate = (date) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const ApplyLeave = () => {
  const today = getToday();

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    halfDayDate: "",
    reason: "",
  });

  const [allocations, setAllocations] = useState(initialAllocations);

  const [balance, setBalance] = useState({
    casualLeave: 0,
    sickLeave: 0,
    paidLeave: 0,
    extraLeaveTaken: 0,
  });

  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // =====================================================
  // FETCH LEAVE BALANCE
  // =====================================================

  const fetchLeaveBalance = async () => {
    try {
      setLoadingBalance(true);

      const response = await api.get("/leaves/my-balance");

      if (response.data.success) {
        setBalance({
          casualLeave: Number(response.data.balance?.casualLeave ?? 0),
          sickLeave: Number(response.data.balance?.sickLeave ?? 0),
          paidLeave: Number(response.data.balance?.paidLeave ?? 0),
          extraLeaveTaken: Number(
            response.data.balance?.extraLeaveTaken ?? 0
          ),
        });
      }
    } catch (error) {
      console.error("Fetch Leave Balance Error:", error);

      toast.error(
        error.response?.data?.message || "Unable to load leave balance."
      );
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchLeaveBalance();
  }, []);

  // =====================================================
  // LEAVE BREAKDOWN
  // =====================================================

  const leaveBreakdown = useMemo(() => {
    return LEAVE_TYPES
      .map((item) => ({
        leaveType: item.leaveType,
        days: Number(allocations[item.leaveType]) || 0,
      }))
      .filter((item) => item.days > 0);
  }, [allocations]);

  const totalDays = useMemo(
    () =>
      leaveBreakdown.reduce((sum, item) => sum + item.days, 0),
    [leaveBreakdown]
  );

  const hasFractionalDays = !Number.isInteger(totalDays);
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
      const isHalfDay = hasFractionalDays && date === form.halfDayDate;

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
  // PAID LEAVE BALANCE VALIDATION
  // =====================================================

  const insufficientBalances = useMemo(() => {
    return leaveBreakdown.filter((item) => {
      if (item.leaveType === "Unpaid Leave") return false;

      const config = LEAVE_TYPES.find(
        (type) => type.leaveType === item.leaveType
      );

      return item.days > Number(balance[config.field] || 0);
    });
  }, [leaveBreakdown, balance]);

  const hasInsufficientBalance = insufficientBalances.length > 0;

  // =====================================================
  // DERIVE CATEGORY
  // =====================================================

  const hasPaidLeave = leaveBreakdown.some(
    (item) => item.leaveType !== "Unpaid Leave"
  );

  const hasUnpaidLeave = leaveBreakdown.some(
    (item) => item.leaveType === "Unpaid Leave"
  );

  const leaveCategory =
    hasPaidLeave && hasUnpaidLeave
      ? "Mixed Leave"
      : hasUnpaidLeave
        ? "Unpaid Leave"
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

      if (name === "endDate" || name === "startDate") {
        updated.halfDayDate = "";
      }

      return updated;
    });
  };

  // =====================================================
  // HANDLE LEAVE ALLOCATION
  // =====================================================

  const handleAllocationChange = (leaveType, value) => {
    if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
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
    setAllocations(initialAllocations);
  };

  // =====================================================
  // SUBMIT LEAVE REQUEST
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!leaveBreakdown.length) {
      toast.error("Please allocate days to at least one leave type.");
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

    if (
      !Number.isFinite(totalDays) ||
      totalDays < 0.5 ||
      Math.abs(totalDays * 2 - Math.round(totalDays * 2)) > 0.000001
    ) {
      toast.error("Leave allocation must be in multiples of 0.5 days.");
      return;
    }

    if (!isDateRangeValid) {
      toast.error(
        `For ${totalDays} leave days, you must select exactly ${expectedCalendarDays} calendar date(s).`
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
      toast.error("The selected Half Day must be within the leave date range.");
      return;
    }

    if (!hasFractionalDays && form.halfDayDate) {
      toast.error("Half Day is not required for a whole-day leave request.");
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

          return `${item.leaveType}: requested ${item.days}, available ${
            balance[config.field]
          }`;
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
      toast.error("Daily breakdown does not match total leave days.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        startDate: form.startDate,
        endDate: form.endDate,
        totalDays,
        leaveBreakdown,
        dailyBreakdown,
        reason: form.reason.trim(),
      };

      const response = await api.post("/leaves", payload);

      if (response.data.success) {
        toast.success(
          response.data.message || "Leave request submitted successfully."
        );

        handleReset();
        await fetchLeaveBalance();
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
  ];

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

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
              Select multiple leave types and choose your Half Day date if required.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchLeaveBalance}
            disabled={loadingBalance}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {balanceCards.map((item) => (
              <div
                key={item.shortName}
                className={`rounded-xl border ${item.borderColor} bg-white p-5 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {item.title}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-800">
                      {loadingBalance ? (
                        <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-100" />
                      ) : (
                        Number(item.value).toFixed(1)
                      )}
                      <span className="ml-1 text-sm font-medium text-slate-400">
                        Days
                      </span>
                    </p>
                  </div>

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color} ${item.textColor} text-lg font-bold`}
                  >
                    {item.shortName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FORM */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-800">
              Leave Application Form
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Allocate your leave days across one or more leave types.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">

            {/* LEAVE ALLOCATION */}

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Leave Type Allocation
                    <span className="ml-1 text-rose-500">*</span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter the number of days for each leave type. Use 0.5 increments.
                  </p>
                </div>

                <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  Multiple Types
                </span>
              </div>

              <div className="space-y-3">
                {LEAVE_TYPES.map((item) => {
                  const value = allocations[item.leaveType];
                  const requested = Number(value) || 0;
                  const available = item.field
                    ? Number(balance[item.field] || 0)
                    : null;

                  const insufficient =
                    item.field && requested > available;

                  return (
                    <div
                      key={item.leaveType}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_160px_auto] sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                            {item.shortName}
                          </span>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
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
                      </div>

                      <div>
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

                      <button
                        type="button"
                        onClick={() => clearAllocation(item.leaveType)}
                        disabled={!value}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus size={14} />
                        Clear
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* TOTAL SUMMARY */}

            <section className="grid grid-cols-1 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Total Leave Days
                </p>
                <p className="mt-1 text-2xl font-bold text-indigo-700">
                  {totalDays.toFixed(1)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Calendar Days Required
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-800">
                  {expectedCalendarDays}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Leave Category
                </p>
                <p className="mt-1 text-lg font-bold text-slate-800">
                  {leaveBreakdown.length ? leaveCategory : "Not Selected"}
                </p>
              </div>
            </section>

            {/* ALLOCATION SUMMARY */}

            {leaveBreakdown.length > 0 && (
              <section className="rounded-xl border border-slate-200 p-4">
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

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                  Your request contains a half day. Select which date will be Half Day. All other dates will be Full Day.
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
                rows={4}
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
                      {item.leaveType}: Requested {item.days.toFixed(1)}, Available{" "}
                      {Number(balance[config.field]).toFixed(1)} days.
                    </p>
                  );
                })}
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
      </div>
    </div>
  );
};

export default ApplyLeave;
