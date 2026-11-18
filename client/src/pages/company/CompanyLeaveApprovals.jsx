
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
  Clock,
  FileText,
  Search,
  X,
  Wallet,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

import api from "../../api/axios";
import { toast } from "react-toastify";

// =====================================================
// DATE HELPERS
// =====================================================

const formatDate = (date) => {
  if (!date) return "—";

  const dateString = String(date).slice(0, 10);
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? new Date(`${dateString}T00:00:00`)
    : new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getEmployeeName = (employee) =>
  employee?.name ||
  employee?.fullName ||
  "Unknown Employee";

const getEmployeeRole = (employee) => {
  const role = employee?.roleId || employee?.role;

  if (typeof role === "string") return role;

  return (
    role?.roleName ||
    role?.name ||
    employee?.roleName ||
    "—"
  );
};

// =====================================================
// LEAVE HELPERS
// =====================================================

const getLeaveBreakdown = (request) => {
  if (
    Array.isArray(request.leaveBreakdown) &&
    request.leaveBreakdown.length > 0
  ) {
    return request.leaveBreakdown;
  }

  // Legacy records compatibility
  if (request.leaveType) {
    return [
      {
        leaveType: request.leaveType,
        days: request.totalDays ?? request.days ?? 0,
      },
    ];
  }

  return [];
};

const getLeaveCategory = (request, breakdown) => {
  if (request.leaveCategory) {
    return request.leaveCategory;
  }

  const hasUnpaid = breakdown.some(
    (item) => item.leaveType === "Unpaid Leave"
  );

  const hasPaid = breakdown.some(
    (item) => item.leaveType !== "Unpaid Leave"
  );

  if (hasPaid && hasUnpaid) return "Mixed Leave";
  if (hasUnpaid || request.isUnpaid) return "Unpaid Leave";

  return "Paid Leave";
};

const getCategoryClass = (category) => {
  if (category === "Mixed Leave") {
    return "bg-violet-50 text-violet-700";
  }

  if (category === "Unpaid Leave") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-emerald-50 text-emerald-700";
};

const getLeaveTypeClass = (leaveType) => {
  if (leaveType === "Unpaid Leave") {
    return "bg-amber-50 text-amber-700";
  }

  if (leaveType === "Comp-Off") {
    return "bg-violet-50 text-violet-700";
  }

  return "bg-emerald-50 text-emerald-700";
};

// =====================================================
// COMPONENT
// =====================================================

const CompanyLeaveApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [processingId, setProcessingId] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState("");

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // =====================================================
  // FETCH SUPER ADMIN PENDING LEAVE REQUESTS
  // =====================================================

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.get(
        "/leaves/super-admin/pending"
      );

      const pendingRequests = Array.isArray(data)
        ? data
        : data?.requests ||
          data?.leaves ||
          data?.leaveRequests ||
          [];

      setRequests(
        Array.isArray(pendingRequests)
          ? pendingRequests
          : []
      );
    } catch (error) {
      console.error(
        "Fetch Super Admin Leave Requests Error:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Failed to load pending leave requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // =====================================================
  // FILTER REQUESTS
  // =====================================================

  const filteredRequests = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) return requests;

    return requests.filter((request) => {
      const employee = request.employeeId || {};
      const breakdown = getLeaveBreakdown(request);

      const searchableValues = [
        getEmployeeName(employee),
        employee.empId,
        employee.email,
        getEmployeeRole(employee),
        request.leaveType,
        request.leaveCategory,
        request.reason,
        request.startDate,
        request.endDate,
        ...breakdown.map((item) => item.leaveType),
      ];

      return searchableValues
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchText);
    });
  }, [requests, search]);

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalPendingDays = useMemo(
    () =>
      requests.reduce(
        (total, request) =>
          total + Number(request.totalDays || request.days || 0),
        0
      ),
    [requests]
  );

  // =====================================================
  // APPROVE LEAVE
  // =====================================================

  const handleApprove = async (request) => {
    const id = request._id;

    if (!id || processingId) return;

    const employeeName = getEmployeeName(
      request.employeeId
    );

    const confirmed = window.confirm(
      `Are you sure you want to approve the leave request of ${employeeName}?`
    );

    if (!confirmed) return;

    try {
      setProcessingId(id);

      const response = await api.patch(
        `/leaves/${id}/super-admin/approve`
      );

      toast.success(
        response.data?.message ||
          "Leave request approved successfully."
      );

      setRequests((previous) =>
        previous.filter((item) => item._id !== id)
      );

      if (expandedId === id) {
        setExpandedId("");
      }
    } catch (error) {
      console.error(
        "Super Admin Approve Leave Error:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Failed to approve leave request."
      );
    } finally {
      setProcessingId("");
    }
  };

  // =====================================================
  // OPEN REJECTION MODAL
  // =====================================================

  const openRejectModal = (request) => {
    if (processingId) return;

    setRejectModal(request);
    setRejectionReason("");
  };

  // =====================================================
  // CLOSE REJECTION MODAL
  // =====================================================

  const closeRejectModal = () => {
    if (processingId) return;

    setRejectModal(null);
    setRejectionReason("");
  };

  // =====================================================
  // REJECT LEAVE
  // =====================================================

  const handleReject = async () => {
    if (!rejectModal || processingId) return;

    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }

    const id = rejectModal._id;

    try {
      setProcessingId(id);

      const response = await api.patch(
        `/leaves/${id}/super-admin/reject`,
        {
          rejectionReason: rejectionReason.trim(),
        }
      );

      toast.success(
        response.data?.message ||
          "Leave request rejected successfully."
      );

      setRequests((previous) =>
        previous.filter((item) => item._id !== id)
      );

      if (expandedId === id) {
        setExpandedId("");
      }

      setRejectModal(null);
      setRejectionReason("");
    } catch (error) {
      console.error(
        "Super Admin Reject Leave Error:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Failed to reject leave request."
      );
    } finally {
      setProcessingId("");
    }
  };

  // =====================================================
  // EXPAND / COLLAPSE
  // =====================================================

  const toggleDetails = (id) => {
    setExpandedId((previous) =>
      previous === id ? "" : id
    );
  };

  // =====================================================
  // RENDER LEAVE BREAKDOWN
  // =====================================================

  const renderLeaveBreakdown = (request) => {
    const breakdown = getLeaveBreakdown(request);

    if (!breakdown.length) {
      return (
        <span className="text-sm text-slate-400">
          —
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {breakdown.map((item, index) => (
          <span
            key={`${item.leaveType}-${index}`}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${getLeaveTypeClass(
              item.leaveType
            )}`}
          >
            {item.leaveType}:{" "}
            {Number(item.days || 0).toFixed(1)} day(s)
          </span>
        ))}
      </div>
    );
  };

  // =====================================================
  // RENDER DAILY BREAKDOWN
  // =====================================================

  const renderDailyBreakdown = (request) => {
    const dailyBreakdown = Array.isArray(
      request.dailyBreakdown
    )
      ? request.dailyBreakdown
      : [];

    if (!dailyBreakdown.length) {
      return (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center">
          <CalendarDays
            size={22}
            className="mx-auto mb-2 text-slate-300"
          />

          <p className="text-xs text-slate-400">
            Daily breakdown is not available for this request.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200">
        {dailyBreakdown.map((day, index) => (
          <div
            key={`${day.date}-${index}`}
            className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-3 py-3 last:border-b-0"
          >
            <div className="flex items-center gap-2">
              <CalendarDays
                size={15}
                className="text-slate-400"
              />

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

              <span className="w-10 text-right text-xs font-bold text-slate-700">
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-indigo-100 p-2.5">
                <CalendarDays
                  size={23}
                  className="text-indigo-600"
                />
              </div>

              <h1 className="text-2xl font-bold text-slate-800">
                Super Admin Leave Approvals
              </h1>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Review and process the pending leave requests assigned
              to Super Admin by the leave approval rules.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading || !!processingId}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Pending Requests
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {loading ? "..." : requests.length}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Showing Results
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {loading ? "..." : filteredRequests.length}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <FileText size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Total Pending Leave Days
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {loading
                    ? "..."
                    : totalPendingDays.toFixed(1)}
                </p>
              </div>

              <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                <Wallet size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative max-w-xl">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search employee, employee ID, role or leave type..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* REQUEST LIST */}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-500">
            <RefreshCw
              className="mx-auto mb-3 animate-spin"
              size={25}
            />

            <p className="text-sm">
              Loading pending leave requests...
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
            {search ? (
              <Search
                className="mx-auto mb-3 text-slate-300"
                size={42}
              />
            ) : (
              <CheckCircle2
                className="mx-auto mb-3 text-emerald-400"
                size={42}
              />
            )}

            <h3 className="font-semibold text-slate-700">
              {search
                ? "No matching leave requests"
                : "No pending leave requests"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try searching with another employee name, ID or leave type."
                : "There are currently no leave requests awaiting Super Admin approval."}
            </p>

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const employee = request.employeeId || {};
              const breakdown = getLeaveBreakdown(request);
              const category = getLeaveCategory(
                request,
                breakdown
              );

              const busy = processingId === request._id;
              const expanded = expandedId === request._id;

              return (
                <div
                  key={request._id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* REQUEST HEADER */}

                  <div className="p-5">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">

                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-indigo-50 p-3 text-indigo-600">
                          <User size={21} />
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {getEmployeeName(employee)}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>
                              Employee ID:{" "}
                              {employee.empId ||
                                request.empId ||
                                "—"}
                            </span>

                            <span>
                              Role: {getEmployeeRole(employee)}
                            </span>
                          </div>

                          {employee.email && (
                            <p className="mt-1 text-xs text-slate-500">
                              {employee.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                          Pending
                        </span>

                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getCategoryClass(
                            category
                          )}`}
                        >
                          {category}
                        </span>
                      </div>
                    </div>

                    {/* BASIC DETAILS */}

                    <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3 lg:grid-cols-5">
                      <div>
                        <p className="text-xs text-slate-500">
                          Start Date
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatDate(
                            request.startDate || request.fromDate
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          End Date
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatDate(
                            request.endDate || request.toDate
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Total Days
                        </p>

                        <p className="mt-1 text-sm font-bold text-indigo-700">
                          {Number(
                            request.totalDays ??
                              request.days ??
                              0
                          ).toFixed(1)}{" "}
                          Days
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Applied On
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Leave Types
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {breakdown.length}
                        </p>
                      </div>
                    </div>

                    {/* LEAVE BREAKDOWN */}

                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Leave Allocation
                      </p>

                      {renderLeaveBreakdown(request)}
                    </div>

                    {/* REASON */}

                    <div className="mt-4 rounded-lg border border-slate-100 bg-white p-3">
                      <p className="mb-1 text-xs font-semibold text-slate-500">
                        Reason for Leave
                      </p>

                      <p className="whitespace-pre-wrap text-sm text-slate-700">
                        {request.reason || "No reason provided."}
                      </p>
                    </div>

                    {/* ACTIONS */}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          toggleDetails(request._id)
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        {expanded ? (
                          <>
                            <ChevronUp size={16} />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            View Full Details
                          </>
                        )}
                      </button>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() =>
                            openRejectModal(request)
                          }
                          disabled={!!processingId}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircle size={17} />
                          Reject
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleApprove(request)
                          }
                          disabled={!!processingId}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? (
                            <>
                              <RefreshCw
                                size={16}
                                className="animate-spin"
                              />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={17} />
                              Approve Leave
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED DETAILS */}

                  {expanded && (
                    <div className="border-t border-slate-200 bg-slate-50 p-5">
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                        {/* ALLOCATION DETAILS */}

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="mb-4 flex items-center gap-2">
                            <Wallet
                              size={18}
                              className="text-indigo-600"
                            />

                            <h4 className="text-sm font-semibold text-slate-800">
                              Leave Allocation Details
                            </h4>
                          </div>

                          <div className="space-y-2">
                            {breakdown.map((item, index) => (
                              <div
                                key={`${item.leaveType}-${index}`}
                                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3"
                              >
                                <span className="text-sm text-slate-700">
                                  {item.leaveType}
                                </span>

                                <span className="text-sm font-bold text-slate-800">
                                  {Number(
                                    item.days || 0
                                  ).toFixed(1)}{" "}
                                  Days
                                </span>
                              </div>
                            ))}

                            {!breakdown.length && (
                              <p className="text-sm text-slate-400">
                                Leave allocation details unavailable.
                              </p>
                            )}
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-sm font-semibold text-slate-700">
                              Total Leave
                            </span>

                            <span className="text-sm font-bold text-indigo-700">
                              {Number(
                                request.totalDays || 0
                              ).toFixed(1)}{" "}
                              Days
                            </span>
                          </div>

                          <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-500">
                                Leave Category
                              </span>

                              <span className="text-xs font-semibold text-slate-700">
                                {category}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-500">
                                Regular Paid Balance
                              </span>

                              <span className="text-xs font-semibold text-slate-700">
                                {request.balanceDeducted
                                  ? "Deducted at submission"
                                  : "No deduction recorded"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-500">
                                Comp-Off Balance
                              </span>

                              <span className="text-xs font-semibold text-violet-700">
                                {request.compOffBalanceDeducted
                                  ? "Reserved at submission"
                                  : breakdown.some(
                                      (item) =>
                                        item.leaveType === "Comp-Off"
                                    )
                                    ? "Not reserved / legacy request"
                                    : "Not applicable"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* DAILY SCHEDULE */}

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="mb-4 flex items-center gap-2">
                            <Clock
                              size={18}
                              className="text-indigo-600"
                            />

                            <h4 className="text-sm font-semibold text-slate-800">
                              Daily Leave Schedule
                            </h4>
                          </div>

                          {renderDailyBreakdown(request)}
                        </div>
                      </div>

                      {/* REQUEST INFORMATION */}

                      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <FileText
                            size={17}
                            className="text-indigo-600"
                          />

                          <h4 className="text-sm font-semibold text-slate-800">
                            Request Information
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <p className="text-xs text-slate-500">
                              Employee
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {getEmployeeName(employee)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Employee ID
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {employee.empId ||
                                request.empId ||
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Employee Role
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {getEmployeeRole(employee)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Request ID
                            </p>

                            <p className="mt-1 break-all text-xs font-medium text-slate-600">
                              {request._id}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Submitted At
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {request.createdAt
                                ? new Date(
                                    request.createdAt
                                  ).toLocaleString("en-IN")
                                : "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Current Status
                            </p>

                            <p className="mt-1 text-sm font-semibold text-amber-700">
                              {request.status || "Pending"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* FULL REASON */}

                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Reason for Leave
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {request.reason || "No reason provided."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REJECTION MODAL */}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                  <XCircle size={20} />
                </div>

                <h2 className="text-lg font-bold text-slate-800">
                  Reject Leave Request
                </h2>
              </div>

              <button
                type="button"
                onClick={closeRejectModal}
                disabled={!!processingId}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">
                Employee
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {getEmployeeName(rejectModal.employeeId)}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Leave Period
              </p>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatDate(rejectModal.startDate)} –{" "}
                {formatDate(rejectModal.endDate)}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Total Days
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {Number(rejectModal.totalDays || 0).toFixed(1)} Days
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Rejection Reason
                <span className="ml-1 text-rose-500">*</span>
              </label>

              <textarea
                rows={4}
                maxLength={1000}
                value={rejectionReason}
                onChange={(event) =>
                  setRejectionReason(event.target.value)
                }
                placeholder="Enter the reason for rejecting this leave request..."
                disabled={!!processingId}
                className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-slate-50"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {rejectionReason.length}/1000
              </p>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={!!processingId}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={
                  !!processingId ||
                  !rejectionReason.trim()
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingId ? (
                  <>
                    <RefreshCw
                      size={15}
                      className="animate-spin"
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Confirm Reject
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              <AlertCircle
                size={15}
                className="mt-0.5 shrink-0"
              />

              <p>
                Rejecting this request will process the balance
                restoration according to the backend leave
                controller.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyLeaveApprovals;
