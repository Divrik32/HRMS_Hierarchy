
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  RefreshCw,
  FileText,
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

const statusStyle = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
  Used: "bg-blue-100 text-blue-800",
};

const MyCompOff = () => {
  const [compOffs, setCompOffs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyCompOffs = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/leaves/my-comp-offs");

      const records = Array.isArray(data)
        ? data
        : data.compOffs || data.requests || data.data || [];

      setCompOffs(records);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load your Comp-Off records"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCompOffs();
  }, [fetchMyCompOffs]);

  const pendingCount = compOffs.filter(
    (item) => item.status === "Pending"
  ).length;

  const approvedCount = compOffs.filter(
    (item) => item.status === "Approved"
  ).length;

  const rejectedCount = compOffs.filter(
    (item) => item.status === "Rejected"
  ).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            My Comp-Off
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View your Comp-Off requests and their approval status.
          </p>
        </div>

        <button
          onClick={fetchMyCompOffs}
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

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-yellow-800">
              Pending
            </p>
            <Clock className="text-yellow-600" size={22} />
          </div>

          <p className="mt-2 text-2xl font-bold text-yellow-900">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-green-800">
              Approved
            </p>
            <CalendarPlus className="text-green-600" size={22} />
          </div>

          <p className="mt-2 text-2xl font-bold text-green-900">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-red-800">
              Rejected
            </p>
            <FileText className="text-red-600" size={22} />
          </div>

          <p className="mt-2 text-2xl font-bold text-red-900">
            {rejectedCount}
          </p>
        </div>
      </div>

      {/* Comp-Off Records */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h2 className="font-semibold text-gray-800">
              Comp-Off History
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Total {compOffs.length} records
            </p>
          </div>

          <CalendarDays size={22} className="text-blue-600" />
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500">
            Loading your Comp-Off records...
          </div>
        ) : compOffs.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarPlus
              size={40}
              className="mx-auto mb-3 text-gray-300"
            />

            <p className="font-medium text-gray-700">
              No Comp-Off records found
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Your Comp-Off requests will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="p-4">Work Date</th>
                  <th className="p-4">Leave Date</th>
                  <th className="p-4">Day Type</th>
                  <th className="p-4">Credit Days</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Rejection Reason</th>
                </tr>
              </thead>

              <tbody>
                {compOffs.map((item) => (
                  <tr
                    key={item._id}
                    className="border-t border-gray-100 text-gray-700"
                  >
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
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyle[item.status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.status || "Unknown"}
                      </span>
                    </td>

                    <td className="max-w-[200px] whitespace-normal p-4 text-red-600">
                      {item.rejectionReason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCompOff;
