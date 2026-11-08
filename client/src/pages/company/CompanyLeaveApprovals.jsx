
import { useCallback, useEffect, useState } from "react";
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

const getEmployeeName = (employee) =>
  employee?.name || employee?.fullName || "Unknown Employee";

const CompanyLeaveApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [search, setSearch] = useState("");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/leaves/super-admin/pending");

      setRequests(data?.requests || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load leave requests"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (request) => {
    const id = request._id;

    if (!window.confirm("Are you sure you want to approve this leave?")) {
      return;
    }

    try {
      setProcessingId(id);

      await api.patch(`/leaves/${id}/super-admin/approve`);

      toast.success("Leave approved successfully");
      setRequests((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to approve leave"
      );
    } finally {
      setProcessingId("");
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;

    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }

    const id = rejectModal._id;

    try {
      setProcessingId(id);

      await api.patch(`/leaves/${id}/super-admin/reject`, {
        rejectionReason: rejectionReason.trim(),
      });

      toast.success("Leave rejected successfully");

      setRequests((prev) => prev.filter((item) => item._id !== id));
      setRejectModal(null);
      setRejectionReason("");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to reject leave"
      );
    } finally {
      setProcessingId("");
    }
  };

  const filteredRequests = requests.filter((request) => {
    const employee = request.employeeId;
    const text = [
      getEmployeeName(employee),
      employee?.empId,
      request.leaveType,
      request.reason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Leave Approvals
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review pending leave requests from top-level employees.
            </p>
          </div>

          <button
            onClick={fetchRequests}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Requests</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {requests.length}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Showing Results</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">
                  {filteredRequests.length}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <FileText size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, ID or leave type..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-500">
            <RefreshCw className="mx-auto mb-3 animate-spin" size={24} />
            Loading leave requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
            <CalendarDays className="mx-auto mb-3 text-slate-300" size={42} />
            <h3 className="font-semibold text-slate-700">
              No pending leave requests
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              There are no matching requests to review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredRequests.map((request) => {
              const employee = request.employeeId;
              const busy = processingId === request._id;

              return (
                <div
                  key={request._id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                        <User size={21} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          {getEmployeeName(employee)}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Employee ID: {employee?.empId || "—"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Leave Type</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {request.leaveType || request.type || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Total Days</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {request.totalDays ?? request.days ?? "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">From Date</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatDate(request.startDate || request.fromDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">To Date</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatDate(request.endDate || request.toDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-medium text-slate-500">
                      Reason
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">
                      {request.reason || "No reason provided"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={busy}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={17} />
                      {busy ? "Processing..." : "Approve"}
                    </button>

                    <button
                      onClick={() => {
                        setRejectModal(request);
                        setRejectionReason("");
                      }}
                      disabled={busy}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={17} />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Reject Leave Request
              </h2>
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Enter the reason for rejecting this leave request.
            </p>

            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="mt-4 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-red-400"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!processingId}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyLeaveApprovals;
