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
  FileText,
  Wallet,
} from "lucide-react";

import api from "../../api/axios";
import { toast } from "react-toastify";

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

const MyLeave = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(null);

  const fetchMyLeaves = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const { data } = await api.get("/leaves/my-requests");

      if (data.success) {
        setRequests(data.requests || []);
      } else {
        toast.error(data.message || "Failed to load leave requests.");
      }
    } catch (error) {
      console.error("Fetch My Leaves Error:", error);
      toast.error(
        error.response?.data?.message || "Unable to load your leave requests."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyLeaves();
  }, [fetchMyLeaves]);

  const counts = useMemo(() => {
    return {
      All: requests.length,
      Pending: requests.filter((item) => item.status === "Pending").length,
      Approved: requests.filter((item) => item.status === "Approved").length,
      Rejected: requests.filter((item) => item.status === "Rejected").length,
      Withdrawn: requests.filter((item) => item.status === "Withdrawn").length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (activeFilter === "All") return requests;

    return requests.filter((item) => item.status === activeFilter);
  }, [requests, activeFilter]);

  const handleWithdraw = async (leave) => {
    try {
      setWithdrawingId(leave._id);

      const { data } = await api.patch(
        `/leaves/${leave._id}/withdraw`
      );

      if (data.success) {
        toast.success(data.message || "Leave request withdrawn successfully.");

        setRequests((previous) =>
          previous.map((item) =>
            item._id === leave._id
              ? { ...item, ...data.request, status: "Withdrawn" }
              : item
          )
        );

        setConfirmLeave(null);

        if (selectedLeave?._id === leave._id) {
          setSelectedLeave((previous) => ({
            ...previous,
            ...data.request,
            status: "Withdrawn",
          }));
        }

        fetchMyLeaves(false);
      }
    } catch (error) {
      console.error("Withdraw Leave Error:", error);

      toast.error(
        error.response?.data?.message || "Failed to withdraw leave request."
      );

      fetchMyLeaves(false);
    } finally {
      setWithdrawingId(null);
    }
  };

  const filters = [
    "All",
    "Pending",
    "Approved",
    "Rejected",
    "Withdrawn",
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <CalendarDays size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  My Leaves
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  View and manage your leave applications
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchMyLeaves(false)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            {
              label: "Total Requests",
              value: counts.All,
              icon: FileText,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Pending",
              value: counts.Pending,
              icon: Clock,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "Approved",
              value: counts.Approved,
              icon: CheckCircle2,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "Rejected",
              value: counts.Rejected,
              icon: XCircle,
              color: "text-red-600",
              bg: "bg-red-50",
            },
            {
              label: "Withdrawn",
              value: counts.Withdrawn,
              icon: RotateCcw,
              color: "text-slate-600",
              bg: "bg-slate-100",
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

        {/* Filters */}
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
                <span className="ml-2 opacity-75">
                  {counts[filter]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Leave Requests */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Leave Applications
              </h2>
              <p className="text-sm text-slate-500">
                Your submitted leave request history
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {filteredRequests.length} request(s)
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw
                size={30}
                className="animate-spin text-blue-600"
              />
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
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Leave Details</th>
                      <th className="px-5 py-4">Duration</th>
                      <th className="px-5 py-4">Days</th>
                      <th className="px-5 py-4">Applied On</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((leave) => {
                      const config =
                        statusConfig[leave.status] || statusConfig.Pending;

                      const StatusIcon = config.icon;

                      return (
                        <tr
                          key={leave._id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {leave.leaveType}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {leave.leaveCategory}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-700">
                              {formatDate(leave.startDate)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              to {formatDate(leave.endDate)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-semibold text-slate-700">
                              {leave.totalDays} days
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(leave.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.color}`}
                            >
                              <StatusIcon size={14} />
                              {leave.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedLeave(leave)}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-3 p-4 md:hidden">
                {filteredRequests.map((leave) => {
                  const config =
                    statusConfig[leave.status] || statusConfig.Pending;

                  const StatusIcon = config.icon;

                  return (
                    <div
                      key={leave._id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-800">
                            {leave.leaveType}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {leave.leaveCategory}
                          </p>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.color}`}
                        >
                          <StatusIcon size={13} />
                          {leave.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-400">
                            Start Date
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatDate(leave.startDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            End Date
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatDate(leave.endDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Total Days
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {leave.totalDays} days
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

                      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => setSelectedLeave(leave)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <Eye size={16} />
                          Details
                        </button>

                        {leave.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => setConfirmLeave(leave)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            <RotateCcw size={16} />
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Leave Details Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
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
                onClick={() => setSelectedLeave(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">Leave Type</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-800">
                    {selectedLeave.leaveType}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {selectedLeave.leaveCategory}
                  </p>
                </div>

                {(() => {
                  const config =
                    statusConfig[selectedLeave.status] ||
                    statusConfig.Pending;

                  const Icon = config.icon;

                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold ${config.color}`}
                    >
                      <Icon size={14} />
                      {selectedLeave.status}
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Start Date</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {formatDate(selectedLeave.startDate)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">End Date</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {formatDate(selectedLeave.endDate)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Total Duration</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedLeave.totalDays} days
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Applied On</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {formatDate(selectedLeave.createdAt)}
                  </p>
                </div>
              </div>

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
                    Your leave application is still pending. You can withdraw
                    this request until it is approved or rejected.
                  </p>
                </div>
              )}

              {selectedLeave.status === "Pending" && (
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

      {/* Withdraw Confirmation Modal */}
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
              <strong>{confirmLeave.leaveType}</strong> request for{" "}
              <strong>{confirmLeave.totalDays} day(s)</strong>?
            </p>

            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-700">
              This action cannot be undone. If paid leave balance was deducted,
              it will be refunded automatically.
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
  );
};

export default MyLeave;