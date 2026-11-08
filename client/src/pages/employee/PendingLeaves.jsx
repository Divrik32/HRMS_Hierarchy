import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock3,
  Search,
  RefreshCw,
  Eye,
  X,
  User,
  Building2,
  BriefcaseBusiness,
  FileText,
  Check,
  Ban,
} from "lucide-react";

import api from "../../api/axios";
import { toast } from "react-toastify";

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "E";

const PendingLeaves = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data } = await api.get("/leaves/pending");

      setRequests(data.requests || []);
    } catch (error) {
      console.error("Fetch Pending Leaves Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load pending leave requests."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (request) => {
    const applicantName = request.employeeId?.name || "this employee";

    const confirmed = window.confirm(
      `Are you sure you want to approve ${applicantName}'s leave request?`
    );

    if (!confirmed) return;

    try {
      setProcessingId(request._id);

      const { data } = await api.patch(
        `/leaves/${request._id}/approve`,
        { remarks: "" }
      );

      toast.success(data.message || "Leave approved successfully.");

      setRequests((previous) =>
        previous.filter((item) => item._id !== request._id)
      );

      if (selectedRequest?._id === request._id) {
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error("Approve Leave Error:", error);

      toast.error(
        error.response?.data?.message || "Failed to approve leave."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (request) => {
    setRejectingRequest(request);
    setRejectionReason("");
    setRejectModal(true);
  };

  const handleReject = async (e) => {
    e.preventDefault();

    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }

    if (!rejectingRequest) return;

    try {
      setProcessingId(rejectingRequest._id);

      const { data } = await api.patch(
        `/leaves/${rejectingRequest._id}/reject`,
        {
          rejectionReason: rejectionReason.trim(),
        }
      );

      toast.success(
        data.message || "Leave rejected and applicable balance refunded."
      );

      setRequests((previous) =>
        previous.filter((item) => item._id !== rejectingRequest._id)
      );

      if (selectedRequest?._id === rejectingRequest._id) {
        setSelectedRequest(null);
      }

      setRejectModal(false);
      setRejectingRequest(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Reject Leave Error:", error);

      toast.error(
        error.response?.data?.message || "Failed to reject leave."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const employee = request.employeeId || {};

    const searchText = [
      employee.name,
      employee.empId,
      employee.departmentId?.departmentName,
      employee.roleId?.roleName,
      request.leaveType,
      request.leaveCategory,
      request.reason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchText.includes(search.toLowerCase().trim());
  });

  const totalDays = requests.reduce(
    (total, request) => total + Number(request.totalDays || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <CalendarDays size={23} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Leave Approvals
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Review and manage pending employee leave applications.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => fetchRequests(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Pending Applications
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {requests.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Clock3 size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Requested Days
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {totalDays}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <CalendarDays size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, ID, department, role or leave type..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {/* Applications */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-800">
                Pending Applications
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredRequests.length} application(s) found
              </p>
            </div>

            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Pending
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <RefreshCw size={26} className="animate-spin text-indigo-500" />
                <p className="text-sm">Loading leave applications...</p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <CalendarDays size={27} />
              </div>

              <h3 className="font-semibold text-slate-700">
                No Pending Applications
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {search
                  ? "No applications match your search."
                  : "There are no leave applications waiting for approval."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Employee</th>
                      <th className="px-5 py-4 font-semibold">Leave Type</th>
                      <th className="px-5 py-4 font-semibold">Duration</th>
                      <th className="px-5 py-4 font-semibold">Days</th>
                      <th className="px-5 py-4 font-semibold">Applied On</th>
                      <th className="px-5 py-4 text-center font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((request) => {
                      const employee = request.employeeId || {};

                      return (
                        <tr
                          key={request._id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                                {getInitials(employee.name)}
                              </div>

                              <div>
                                <p className="font-semibold text-slate-800">
                                  {employee.name || "Unknown Employee"}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-500">
                                  ID: {employee.empId || "—"}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {employee.roleId?.roleName || "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-700">
                              {request.leaveType}
                            </p>

                            <p
                              className={`mt-1 text-xs font-medium ${
                                request.isUnpaid
                                  ? "text-orange-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {request.leaveCategory}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm text-slate-700">
                              {formatDate(request.startDate)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              to {formatDate(request.endDate)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                              {request.totalDays} days
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(request.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedRequest(request)}
                                title="View details"
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                              >
                                <Eye size={17} />
                              </button>

                              <button
                                onClick={() => handleApprove(request)}
                                disabled={processingId === request._id}
                                title="Approve"
                                className="rounded-lg bg-emerald-600 p-2 text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <Check size={17} />
                              </button>

                              <button
                                onClick={() => openRejectModal(request)}
                                disabled={processingId === request._id}
                                title="Reject"
                                className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-700 disabled:opacity-50"
                              >
                                <X size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 p-4 lg:hidden">
                {filteredRequests.map((request) => {
                  const employee = request.employeeId || {};

                  return (
                    <div
                      key={request._id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                            {getInitials(employee.name)}
                          </div>

                          <div>
                            <h3 className="font-semibold text-slate-800">
                              {employee.name || "Unknown Employee"}
                            </h3>

                            <p className="text-xs text-slate-500">
                              {employee.empId || "—"} ·{" "}
                              {employee.roleId?.roleName || "—"}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Pending
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                        <div>
                          <p className="text-xs text-slate-500">Leave Type</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {request.leaveType}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Category</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {request.leaveCategory}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">From</p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatDate(request.startDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">To</p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatDate(request.endDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Total Days</p>
                          <p className="mt-1 text-sm font-bold text-indigo-700">
                            {request.totalDays} days
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Applied On</p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatDate(request.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={16} />
                          Details
                        </button>

                        <button
                          onClick={() => handleApprove(request)}
                          disabled={processingId === request._id}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check size={16} />
                          Approve
                        </button>

                        <button
                          onClick={() => openRejectModal(request)}
                          disabled={processingId === request._id}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Leave Application Details
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Review the employee's leave request.
                </p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Employee */}
              <div className="flex items-center gap-3 rounded-xl bg-indigo-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                  {getInitials(selectedRequest.employeeId?.name)}
                </div>

                <div>
                  <h3 className="font-bold text-slate-800">
                    {selectedRequest.employeeId?.name || "Unknown Employee"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Employee ID: {selectedRequest.employeeId?.empId || "—"}
                  </p>
                </div>
              </div>

              {/* Employee Information */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoItem
                  icon={<BriefcaseBusiness size={17} />}
                  label="Role"
                  value={
                    selectedRequest.employeeId?.roleId?.roleName || "—"
                  }
                />

                <InfoItem
                  icon={<Building2 size={17} />}
                  label="Department"
                  value={
                    selectedRequest.employeeId?.departmentId?.departmentName ||
                    "—"
                  }
                />

                <InfoItem
                  icon={<CalendarDays size={17} />}
                  label="Leave Type"
                  value={selectedRequest.leaveType}
                />

                <InfoItem
                  icon={<FileText size={17} />}
                  label="Leave Category"
                  value={selectedRequest.leaveCategory}
                />

                <InfoItem
                  icon={<CalendarDays size={17} />}
                  label="Start Date"
                  value={formatDate(selectedRequest.startDate)}
                />

                <InfoItem
                  icon={<CalendarDays size={17} />}
                  label="End Date"
                  value={formatDate(selectedRequest.endDate)}
                />

                <InfoItem
                  icon={<Clock3 size={17} />}
                  label="Total Days"
                  value={`${selectedRequest.totalDays} days`}
                />

                <InfoItem
                  icon={<Clock3 size={17} />}
                  label="Applied On"
                  value={formatDateTime(selectedRequest.createdAt)}
                />
              </div>

              {/* Reason */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <FileText size={17} />
                  Employee's Reason
                </h4>

                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedRequest.reason || "No reason provided."}
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                This application is waiting for your approval.
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => openRejectModal(selectedRequest)}
                  disabled={processingId === selectedRequest._id}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle size={17} />
                  Reject
                </button>

                <button
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={processingId === selectedRequest._id}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={17} />
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && rejectingRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Ban size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-800">
                    Reject Leave
                  </h2>

                  <p className="text-xs text-slate-500">
                    {rejectingRequest.employeeId?.name || "Employee"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setRejectModal(false);
                  setRejectingRequest(null);
                  setRejectionReason("");
                }}
                disabled={processingId === rejectingRequest._id}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleReject}>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Rejection Reason <span className="text-red-500">*</span>
              </label>

              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejecting this leave application..."
                required
                className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                If paid leave balance was deducted during application, it will
                be refunded automatically after rejection.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModal(false);
                    setRejectingRequest(null);
                    setRejectionReason("");
                  }}
                  disabled={processingId === rejectingRequest._id}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    !rejectionReason.trim() ||
                    processingId === rejectingRequest._id
                  }
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processingId === rejectingRequest._id
                    ? "Rejecting..."
                    : "Confirm Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
    <div className="mt-0.5 text-indigo-500">{icon}</div>

    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value || "—"}
      </p>
    </div>
  </div>
);

export default PendingLeaves;