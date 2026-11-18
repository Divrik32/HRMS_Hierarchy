
import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  RefreshCw,
  CalendarDays,
  Clock3,
  UserRound,
  CheckCircle2,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Building2,
  BriefcaseBusiness,
  LoaderCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

const formatDate = (date) => {
  if (!date) return "-";

  const [year, month, day] = String(date).split("-");

  if (!year || !month || !day) return date;

  return `${day}-${month}-${year}`;
};

const formatMinutes = (minutes = 0) => {
  const value = Number(minutes) || 0;
  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;

  return `${hours} hr ${remainingMinutes} min`;
};

const getEmployeeName = (employee) => {
  if (!employee) return "Unknown Employee";

  return employee.name || "Unknown Employee";
};

const getDepartmentName = (employee) => {
  const department = employee?.departmentId;

  if (!department) return "-";

  return typeof department === "object"
    ? department.departmentName || department.name || "-"
    : "-";
};

const getRoleName = (employee) => {
  const role = employee?.roleId;

  if (!role) return "-";

  return typeof role === "object" ? role.roleName || "-" : "-";
};

const getWorkTypeStyle = (workType) => {
  switch (workType) {
    case "Sunday":
      return "bg-purple-100 text-purple-700";
    case "Holiday":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
};

const Tickets = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // ==========================================
  // FETCH PENDING COMP-OFF TICKETS
  // ==========================================
  const fetchTickets = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get("/comp-off/pending", {
        withCredentials: true,
      });

      setRequests(response.data?.requests || []);
    } catch (error) {
      console.error("Fetch Comp-Off Tickets Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load Comp-Off tickets."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ==========================================
  // EXPAND / COLLAPSE TICKET
  // ==========================================
  const toggleExpand = (id) => {
    setExpandedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  // ==========================================
  // APPROVE COMP-OFF TICKET
  // ==========================================
  const handleApprove = async (request) => {
    const confirmed = window.confirm(
      `Approve Comp-Off request for ${getEmployeeName(
        request.employeeId
      )}?\n\nOne Comp-Off day will be credited to this employee.`
    );

    if (!confirmed) return;

    try {
      setProcessingId(request._id);

      const response = await api.patch(
        `/comp-off/${request._id}/approve`,
        {},
        { withCredentials: true }
      );

      toast.success(
        response.data?.message ||
          "Comp-Off approved successfully. One day credited."
      );

      setRequests((previous) =>
        previous.filter((item) => item._id !== request._id)
      );

      setRejectingId(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Approve Comp-Off Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to approve Comp-Off request."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // ==========================================
  // REJECT COMP-OFF TICKET
  // ==========================================
  const handleReject = async (requestId) => {
    const reason = rejectionReason.trim();

    if (!reason) {
      toast.error("Please enter a rejection reason.");
      return;
    }

    try {
      setProcessingId(requestId);

      const response = await api.patch(
        `/comp-off/${requestId}/reject`,
        { rejectionReason: reason },
        { withCredentials: true }
      );

      toast.success(
        response.data?.message || "Comp-Off request rejected."
      );

      setRequests((previous) =>
        previous.filter((item) => item._id !== requestId)
      );

      setRejectingId(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Reject Comp-Off Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to reject Comp-Off request."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // ==========================================
  // SEARCH FILTER
  // ==========================================
  const filteredRequests = requests.filter((request) => {
    const employee = request.employeeId;

    const searchText = [
      employee?.name,
      employee?.empId,
      employee?.email,
      getDepartmentName(employee),
      getRoleName(employee),
      ...(request.workEntries || []).map((entry) => entry.workDate),
    ]
      .join(" ")
      .toLowerCase();

    return searchText.includes(search.trim().toLowerCase());
  });

  // ==========================================
  // SUMMARY
  // ==========================================
  const totalPendingMinutes = requests.reduce(
    (total, request) =>
      total + Number(request.totalClaimedMinutes || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-3">
                <ClipboardList className="h-6 w-6 text-indigo-600" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Comp-Off Tickets
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Review employees' extra working hours and credit
                  their Comp-Off balance.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchTickets(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Pending Tickets
                </p>

                <h2 className="mt-2 text-3xl font-bold text-gray-800">
                  {requests.length}
                </h2>
              </div>

              <div className="rounded-xl bg-amber-100 p-3">
                <ClipboardList className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Claimed Extra Time
                </p>

                <h2 className="mt-2 text-3xl font-bold text-gray-800">
                  {formatMinutes(totalPendingMinutes)}
                </h2>
              </div>

              <div className="rounded-xl bg-indigo-100 p-3">
                <Clock3 className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by employee name, ID, email, department or work date..."
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {/* TICKETS */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm">Loading Comp-Off tickets...</p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-center">
              <div className="rounded-full bg-gray-100 p-4">
                <ClipboardList className="h-8 w-8 text-gray-400" />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-700">
                {search
                  ? "No matching tickets found"
                  : "No Pending Tickets"}
              </h3>

              <p className="mt-1 max-w-md text-sm text-gray-500">
                {search
                  ? "Try searching with a different employee name, ID or date."
                  : "There are currently no Comp-Off requests waiting for HR approval."}
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => {
              const employee = request.employeeId;
              const isExpanded = expandedIds.includes(request._id);
              const isProcessing = processingId === request._id;
              const isRejecting = rejectingId === request._id;

              return (
                <div
                  key={request._id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  {/* TICKET HEADER */}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="rounded-xl bg-indigo-50 p-3">
                          <UserRound className="h-6 w-6 text-indigo-600" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold text-gray-800">
                            {getEmployeeName(employee)}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                            <span>
                              Employee ID: {employee?.empId || "-"}
                            </span>

                            <span className="hidden sm:inline">•</span>

                            <span>{employee?.email || "-"}</span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Building2 size={14} />
                              {getDepartmentName(employee)}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <BriefcaseBusiness size={14} />
                              {getRoleName(employee)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                          Pending
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleExpand(request._id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                          {isExpanded ? (
                            <>
                              Hide Details
                              <ChevronUp size={16} />
                            </>
                          ) : (
                            <>
                              View Details
                              <ChevronDown size={16} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* QUICK SUMMARY */}
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          Work Dates
                        </p>

                        <p className="mt-1 text-lg font-bold text-gray-800">
                          {request.workEntries?.length || 0}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          Claimed Extra Time
                        </p>

                        <p className="mt-1 text-lg font-bold text-gray-800">
                          {formatMinutes(request.totalClaimedMinutes)}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-lg bg-indigo-50 p-3 sm:col-span-1">
                        <p className="text-xs text-indigo-600">
                          Comp-Off on Approval
                        </p>

                        <p className="mt-1 text-lg font-bold text-indigo-700">
                          {Number(request.creditedDays || 1)} Day
                        </p>
                      </div>
                    </div>

                    {/* WORK DATES PREVIEW */}
                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <CalendarDays size={16} />
                        Employee's Selected Work Dates
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {(request.workEntries || []).map((entry, index) => (
                          <span
                            key={`${request._id}-${entry.workDate}-${index}`}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                          >
                            {formatDate(entry.workDate)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* EXPANDED DETAILS */}
                    {isExpanded && (
                      <div className="mt-5 border-t border-gray-200 pt-5">
                        <h4 className="mb-3 text-sm font-bold text-gray-800">
                          Work & Attendance Details
                        </h4>

                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                              <tr>
                                <th className="px-4 py-3">Work Date</th>
                                <th className="px-4 py-3">Work Type</th>
                                <th className="px-4 py-3">Actual Time</th>
                                <th className="px-4 py-3">Eligible Time</th>
                                <th className="px-4 py-3">Claimed Time</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                              {(request.workEntries || []).map(
                                (entry, index) => (
                                  <tr
                                    key={`${request._id}-detail-${index}`}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-700">
                                      {formatDate(entry.workDate)}
                                    </td>

                                    <td className="px-4 py-3">
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getWorkTypeStyle(
                                          entry.workType
                                        )}`}
                                      >
                                        {entry.workType}
                                      </span>
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                      {formatMinutes(entry.actualMinutes)}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-700">
                                      {formatMinutes(entry.eligibleMinutes)}
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-indigo-700">
                                      {formatMinutes(entry.claimedMinutes)}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                          <strong>Note:</strong> Normal working days count
                          only the time worked beyond 8 hours. Sunday and
                          Holiday attendance count as eligible working time.
                        </div>

                        <div className="mt-3 text-xs text-gray-500">
                          Ticket submitted:{" "}
                          {request.createdAt
                            ? new Date(request.createdAt).toLocaleString(
                                "en-IN"
                              )
                            : "-"}
                        </div>
                      </div>
                    )}

                    {/* ACTIONS */}
                    <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                      <button
                        type="button"
                        onClick={() => handleApprove(request)}
                        disabled={isProcessing}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isProcessing && !isRejecting ? (
                          <LoaderCircle size={17} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={17} />
                        )}
                        Approve & Credit 1 Day
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(
                            isRejecting ? null : request._id
                          );
                          setRejectionReason("");
                        }}
                        disabled={isProcessing}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <XCircle size={17} />
                        Reject
                      </button>
                    </div>

                    {/* REJECTION REASON */}
                    {isRejecting && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Rejection Reason
                        </label>

                        <textarea
                          rows={3}
                          value={rejectionReason}
                          onChange={(event) =>
                            setRejectionReason(event.target.value)
                          }
                          placeholder="Enter why this Comp-Off request is being rejected..."
                          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        />

                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectionReason("");
                            }}
                            disabled={isProcessing}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReject(request._id)}
                            disabled={isProcessing || !rejectionReason.trim()}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isProcessing ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <XCircle size={16} />
                            )}
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER INFO */}
        {!loading && requests.length > 0 && (
          <p className="text-center text-xs text-gray-500">
            Showing {filteredRequests.length} of {requests.length} pending
            Comp-Off tickets.
          </p>
        )}
      </div>
    </div>
  );
};

export default Tickets;
