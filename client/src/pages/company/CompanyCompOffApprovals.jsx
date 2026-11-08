
import { useCallback, useEffect, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
  Clock,
  Search,
  X,
  CalendarDays,
  BriefcaseBusiness,
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

const CompanyCompOffApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [search, setSearch] = useState("");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.get(
        "/leaves/comp-off/super-admin/pending"
      );

      setRequests(data?.requests || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load Comp-Off requests"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (request) => {
    if (!window.confirm("Approve this HR personal Comp-Off request?")) {
      return;
    }

    try {
      setProcessingId(request._id);

      await api.patch(
        `/leaves/comp-off/${request._id}/super-admin/approve`
      );

      toast.success("Comp-Off approved successfully");
      setRequests((prev) =>
        prev.filter((item) => item._id !== request._id)
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to approve Comp-Off request"
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

    try {
      setProcessingId(rejectModal._id);

      await api.patch(
        `/leaves/comp-off/${rejectModal._id}/super-admin/reject`,
        { rejectionReason: rejectionReason.trim() }
      );

      toast.success("Comp-Off rejected successfully");

      setRequests((prev) =>
        prev.filter((item) => item._id !== rejectModal._id)
      );

      setRejectModal(null);
      setRejectionReason("");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to reject Comp-Off request"
      );
    } finally {
      setProcessingId("");
    }
  };

  const filteredRequests = requests.filter((request) => {
    const employee = request.employeeId;

    const text = [
      employee?.name,
      employee?.empId,
      request.dayType,
      request.workDescription,
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
              HR Comp-Off Approvals
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Approve or reject Comp-Off requests submitted by HR for themselves.
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
            <p className="text-sm text-slate-500">Pending HR Requests</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {requests.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Matching Requests</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {filteredRequests.length}
            </p>
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
              placeholder="Search HR name, employee ID..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-500">
            <RefreshCw className="mx-auto mb-3 animate-spin" size={24} />
            Loading Comp-Off requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
            <CalendarPlus className="mx-auto mb-3 text-slate-300" size={42} />
            <h3 className="font-semibold text-slate-700">
              No pending HR Comp-Off requests
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              HR personal requests awaiting approval will appear here.
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
                      <div className="rounded-full bg-violet-50 p-3 text-violet-600">
                        <User size={21} />
                      </div>

                      <div>
                        <h3 className="font-semibold text-slate-800">
                          {employee?.name || "Unknown HR"}
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
                      <p className="text-xs text-slate-500">Work Date</p>
                      <p className="mt-1 flex items-center gap-2 font-medium text-slate-800">
                        <CalendarDays size={15} />
                        {formatDate(request.workDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Comp-Off Leave Date</p>
                      <p className="mt-1 flex items-center gap-2 font-medium text-slate-800">
                        <CalendarDays size={15} />
                        {formatDate(request.leaveDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Day Type</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {request.dayType || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Credited Days</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {request.creditedDays ?? 1}
                      </p>
                    </div>
                  </div>

                  {request.holidayId?.name && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500">Holiday</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {request.holidayId.name}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                      <BriefcaseBusiness size={14} />
                      Work Description
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">
                      {request.workDescription || "—"}
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
                Reject Comp-Off Request
              </h2>
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Enter the reason for rejecting this Comp-Off request.
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

export default CompanyCompOffApprovals;
