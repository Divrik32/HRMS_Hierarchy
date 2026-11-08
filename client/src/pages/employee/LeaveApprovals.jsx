
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, CalendarDays } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

const LeaveApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");

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
          : data?.leaves || data?.requests || data?.leaveRequests || []
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load pending leave requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleAction = async (leaveId, action) => {
    const actionLabel = action === "approve" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${actionLabel} this leave request?`)) return;

    setProcessingId(leaveId);
    try {
      const response = await api.patch(
        `/leaves/${leaveId}/${action}`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data?.message || `Leave request ${actionLabel}d.`);
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${actionLabel} leave request.`);
    } finally {
      setProcessingId("");
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN") : "—";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">Review and process pending employee leave requests.</p>
        </div>
        <button onClick={loadRequests} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Pending Requests</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{loading ? "..." : requests.length}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
            <CalendarDays size={24} />
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900">Requests Awaiting Approval</h2>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading requests...</p>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={36} />
            <p className="font-medium text-slate-700">No pending requests</p>
            <p className="mt-1 text-sm text-slate-500">There are no leave requests awaiting your approval.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Leave Type</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">From</th>
                  <th className="px-5 py-3">To</th>
                  <th className="px-5 py-3">Days</th>
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

                  return (
                    <tr key={item._id} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{employeeName}</p>
                        <p className="mt-1 text-xs text-slate-500">{employee.empId || item.empId || "—"}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{item.leaveType}</td>
                      <td className="px-5 py-4 text-slate-600">{item.leaveCategory || (item.isUnpaid ? "Unpaid Leave" : "Paid Leave")}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(item.startDate)}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(item.endDate)}</td>
                      <td className="px-5 py-4 text-slate-600">{item.totalDays ?? "—"}</td>
                      <td className="max-w-[220px] whitespace-normal px-5 py-4 text-slate-600">{item.reason || "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(item._id, "approve")}
                            disabled={processingId === item._id}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleAction(item._id, "reject")}
                            disabled={processingId === item._id}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                        {processingId === item._id && (
                          <p className="mt-1 text-xs text-slate-400">Processing...</p>
                        )}
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
  );
};

export default LeaveApprovals;
