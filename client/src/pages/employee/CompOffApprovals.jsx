
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
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

const CompOffApprovals = () => {
  const [compOffs, setCompOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchCompOffs = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/leaves/comp-off/pending");

      const records = Array.isArray(data)
        ? data
        : data.compOffs || data.requests || data.data || [];

      setCompOffs(records);
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
    fetchCompOffs();
  }, [fetchCompOffs]);

  const handleApprove = async (id) => {
    try {
      setProcessingId(id);

      await api.patch(`/leaves/comp-off/${id}/approve`);

      toast.success("Comp-Off approved successfully");

      setCompOffs((prev) =>
        prev.filter((item) => item._id !== id)
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to approve Comp-Off"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }

    try {
      setProcessingId(id);

      await api.patch(`/leaves/comp-off/${id}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });

      toast.success("Comp-Off rejected successfully");

      setCompOffs((prev) =>
        prev.filter((item) => item._id !== id)
      );

      setRejectingId(null);
      setRejectionReason("");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to reject Comp-Off"
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Comp-Off Approvals
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Review and approve Comp-Off requests submitted for employees.
          </p>
        </div>

        <button
          onClick={fetchCompOffs}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Pending Summary */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Pending Comp-Off Requests
            </p>

            <p className="mt-1 text-2xl font-bold text-yellow-900">
              {compOffs.length}
            </p>
          </div>

          <Users size={28} className="text-yellow-600" />
        </div>
      </div>

      {/* Approval Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h2 className="font-semibold text-gray-800">
              Employee Comp-Off Requests
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Requests created by you for other employees.
            </p>
          </div>

          <CalendarDays size={22} className="text-blue-600" />
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500">
            Loading Comp-Off requests...
          </div>
        ) : compOffs.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2
              size={40}
              className="mx-auto mb-3 text-green-400"
            />

            <p className="font-medium text-gray-700">
              No pending Comp-Off requests
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Employee requests awaiting your approval will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Work Date</th>
                  <th className="p-4">Leave Date</th>
                  <th className="p-4">Day Type</th>
                  <th className="p-4">Credit Days</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {compOffs.map((item) => {
                  const employee = item.employeeId || {};

                  return (
                    <tr
                      key={item._id}
                      className="border-t border-gray-100 text-gray-700"
                    >
                      <td className="p-4">
                        <p className="font-semibold">
                          {employee.name || "Unknown"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {employee.empId || ""}
                        </p>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        {formatDate(item.workDate)}
                      </td>

                      <td className="whitespace-nowrap p-4">
                        {formatDate(item.leaveDate)}
                      </td>

                      <td className="p-4">
                        {item.dayType || "—"}
                      </td>

                      <td className="p-4">
                        {item.creditedDays ?? 0}
                      </td>

                      <td className="max-w-[220px] whitespace-normal p-4">
                        {item.workDescription || "—"}
                      </td>

                      <td className="p-4">
                        {rejectingId === item._id ? (
                          <div className="flex min-w-[200px] flex-col gap-2">
                            <textarea
                              value={rejectionReason}
                              onChange={(e) =>
                                setRejectionReason(e.target.value)
                              }
                              placeholder="Enter rejection reason..."
                              rows={2}
                              className="w-full rounded-lg border border-gray-300 p-2 outline-none focus:border-blue-500"
                            />

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleReject(item._id)
                                }
                                disabled={processingId === item._id}
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Confirm Reject
                              </button>

                              <button
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectionReason("");
                                }}
                                disabled={processingId === item._id}
                                className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-medium text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() =>
                                handleApprove(item._id)
                              }
                              disabled={processingId === item._id}
                              title="Approve"
                              className="rounded-lg bg-green-100 p-2 text-green-700 hover:bg-green-200 disabled:opacity-50"
                            >
                              <CheckCircle2 size={19} />
                            </button>

                            <button
                              onClick={() => {
                                setRejectingId(item._id);
                                setRejectionReason("");
                              }}
                              disabled={processingId === item._id}
                              title="Reject"
                              className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200 disabled:opacity-50"
                            >
                              <XCircle size={19} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompOffApprovals;