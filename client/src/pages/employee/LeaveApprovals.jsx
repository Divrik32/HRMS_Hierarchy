
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  CalendarDays,
  Clock,
  UserRound,
  Wallet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getLeaveBreakdown = (item) => {
  if (
    Array.isArray(item.leaveBreakdown) &&
    item.leaveBreakdown.length > 0
  ) {
    return item.leaveBreakdown;
  }

  // Legacy records compatibility
  if (item.leaveType) {
    return [
      {
        leaveType: item.leaveType,
        days: item.totalDays,
      },
    ];
  }

  return [];
};

const getCategory = (item, breakdown) => {
  if (item.leaveCategory) return item.leaveCategory;

  const hasUnpaid = breakdown.some(
    (leave) => leave.leaveType === "Unpaid Leave"
  );

  const hasPaid = breakdown.some(
    (leave) => leave.leaveType !== "Unpaid Leave"
  );

  if (hasPaid && hasUnpaid) return "Mixed Leave";
  if (hasUnpaid || item.isUnpaid) return "Unpaid Leave";

  return "Paid Leave";
};

const LeaveApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [expandedId, setExpandedId] = useState("");

  // =====================================================
  // LOAD PENDING REQUESTS
  // =====================================================

  const loadRequests = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/leaves/pending", {
        withCredentials: true,
      });

      const data = response.data;

      setRequests(
        Array.isArray(data)
          ? data
          : data?.leaves ||
              data?.requests ||
              data?.leaveRequests ||
              []
      );
    } catch (error) {
      console.error("Load Leave Requests Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load pending leave requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // =====================================================
  // APPROVE / REJECT
  // =====================================================

  const handleAction = async (leaveId, action) => {
    const actionLabel = action === "approve" ? "approve" : "reject";

    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel} this leave request?`
      )
    ) {
      return;
    }

    setProcessingId(leaveId);

    try {
      const response = await api.patch(
        `/leaves/${leaveId}/${action}`,
        {},
        { withCredentials: true }
      );

      toast.success(
        response.data?.message ||
          `Leave request ${actionLabel}d successfully.`
      );

      await loadRequests();
    } catch (error) {
      console.error(`${actionLabel} Leave Error:`, error);

      toast.error(
        error.response?.data?.message ||
          `Failed to ${actionLabel} leave request.`
      );
    } finally {
      setProcessingId("");
    }
  };

  // =====================================================
  // EXPAND / COLLAPSE
  // =====================================================

  const toggleDetails = (id) => {
    setExpandedId((prev) => (prev === id ? "" : id));
  };

  // =====================================================
  // RENDER LEAVE TYPE BREAKDOWN
  // =====================================================

  const renderLeaveBreakdown = (item) => {
    const breakdown = getLeaveBreakdown(item);

    return (
      <div className="flex flex-wrap gap-2">
        {breakdown.map((leave, index) => (
          <span
            key={`${leave.leaveType}-${index}`}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              leave.leaveType === "Unpaid Leave"
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {leave.leaveType}: {Number(leave.days || 0).toFixed(1)} day(s)
          </span>
        ))}

        {breakdown.length === 0 && (
          <span className="text-slate-400">—</span>
        )}
      </div>
    );
  };

  // =====================================================
  // RENDER DAILY BREAKDOWN
  // =====================================================

  const renderDailyBreakdown = (item) => {
    const dailyBreakdown = Array.isArray(item.dailyBreakdown)
      ? item.dailyBreakdown
      : [];

    if (!dailyBreakdown.length) {
      return (
        <p className="text-xs text-slate-400">
          Daily breakdown is not available for this request.
        </p>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {dailyBreakdown.map((day, index) => (
          <div
            key={`${day.date}-${index}`}
            className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0"
          >
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-slate-400" />

              <span className="text-xs font-medium text-slate-700">
                {formatDate(day.date)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  day.dayType === "Half Day"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {day.dayType || "Full Day"}
              </span>

              <span className="w-8 text-right text-xs font-bold text-slate-700">
                {Number(day.days ?? 1).toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Leave Approvals
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review employee leave allocations and daily leave schedules.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRequests}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* PENDING COUNT */}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">
              Pending Requests
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {loading ? "..." : requests.length}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
            <CalendarDays size={24} />
          </div>
        </div>
      </div>

      {/* REQUESTS */}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900">
            Requests Awaiting Approval
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Expand a request to view its complete daily breakdown.
          </p>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Loading requests...
          </p>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2
              className="mx-auto mb-3 text-emerald-400"
              size={36}
            />

            <p className="font-medium text-slate-700">
              No pending requests
            </p>

            <p className="mt-1 text-sm text-slate-500">
              There are no leave requests awaiting your approval.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Leave Allocation</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">From</th>
                  <th className="px-5 py-3">To</th>
                  <th className="px-5 py-3">Total Days</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {requests.map((item) => {
                  const employee = item.employeeId || {};

                  const employeeName =
                    employee.name ||
                    item.employeeName ||
                    "Employee";

                  const breakdown = getLeaveBreakdown(item);

                  const category = getCategory(item, breakdown);

                  const isExpanded = expandedId === item._id;

                  const isProcessing =
                    processingId === item._id;

                  return (
                    <>
                      <tr
                        key={item._id}
                        className="align-top transition hover:bg-slate-50/70"
                      >
                        {/* EMPLOYEE */}

                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            <UserRound
                              size={17}
                              className="mt-0.5 text-slate-400"
                            />

                            <div>
                              <p className="font-semibold text-slate-800">
                                {employeeName}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {employee.empId || item.empId || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* LEAVE BREAKDOWN */}

                        <td className="max-w-[280px] px-5 py-4">
                          {renderLeaveBreakdown(item)}
                        </td>

                        {/* CATEGORY */}

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              category === "Mixed Leave"
                                ? "bg-violet-50 text-violet-700"
                                : category === "Unpaid Leave"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {category}
                          </span>
                        </td>

                        {/* DATE */}

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(item.startDate)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(item.endDate)}
                        </td>

                        {/* TOTAL */}

                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-800">
                            {Number(item.totalDays || 0).toFixed(1)}
                          </span>
                          <span className="ml-1 text-xs text-slate-400">
                            Days
                          </span>
                        </td>

                        {/* REASON */}

                        <td className="max-w-[220px] whitespace-normal px-5 py-4 text-slate-600">
                          {item.reason || "—"}
                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => toggleDetails(item._id)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp size={14} />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={14} />
                                  View Details
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleAction(item._id, "approve")
                              }
                              disabled={isProcessing}
                              className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} />
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleAction(item._id, "reject")
                              }
                              disabled={isProcessing}
                              className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </div>

                          {isProcessing && (
                            <p className="mt-2 text-center text-xs text-slate-400">
                              Processing...
                            </p>
                          )}
                        </td>
                      </tr>

                      {/* EXPANDED DETAILS */}

                      {isExpanded && (
                        <tr key={`${item._id}-details`}>
                          <td
                            colSpan={8}
                            className="bg-slate-50 px-5 py-5"
                          >
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                              {/* ALLOCATION DETAILS */}

                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-3 flex items-center gap-2">
                                  <Wallet
                                    size={17}
                                    className="text-indigo-600"
                                  />

                                  <h3 className="text-sm font-semibold text-slate-800">
                                    Leave Allocation Details
                                  </h3>
                                </div>

                                <div className="space-y-2">
                                  {breakdown.map((leave, index) => (
                                    <div
                                      key={`${leave.leaveType}-${index}`}
                                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
                                    >
                                      <span className="text-sm text-slate-700">
                                        {leave.leaveType}
                                      </span>

                                      <span className="text-sm font-bold text-slate-800">
                                        {Number(leave.days || 0).toFixed(1)} Days
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                                  <span className="text-sm font-semibold text-slate-700">
                                    Total Leave
                                  </span>

                                  <span className="text-sm font-bold text-indigo-700">
                                    {Number(item.totalDays || 0).toFixed(1)} Days
                                  </span>
                                </div>

                                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                                  <p className="text-xs text-slate-500">
                                    Leave Category
                                  </p>

                                  <p className="mt-1 text-sm font-semibold text-slate-800">
                                    {category}
                                  </p>

                                  <p className="mt-2 text-xs text-slate-500">
                                    {item.balanceDeducted
                                      ? "Paid leave balance deducted at submission."
                                      : "No paid leave balance deduction recorded."}
                                  </p>
                                </div>
                              </div>

                              {/* DAILY DETAILS */}

                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-3 flex items-center gap-2">
                                  <Clock
                                    size={17}
                                    className="text-indigo-600"
                                  />

                                  <h3 className="text-sm font-semibold text-slate-800">
                                    Daily Leave Schedule
                                  </h3>
                                </div>

                                {renderDailyBreakdown(item)}
                              </div>
                            </div>

                            {/* REASON */}

                            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase text-slate-500">
                                Reason for Leave
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                                {item.reason || "—"}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default LeaveApprovals;
