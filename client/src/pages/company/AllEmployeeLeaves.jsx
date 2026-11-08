
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Search,
  FileText,
  User,
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

const getStatusStyle = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "bg-emerald-50 text-emerald-700";
    case "rejected":
      return "bg-red-50 text-red-700";
    case "pending":
      return "bg-amber-50 text-amber-700";
    case "withdrawn":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-blue-50 text-blue-700";
  }
};

const AllEmployeeLeaves = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.get(
        "/leaves/super-admin/all-employee-leaves"
      );

      setRequests(data?.requests || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load employee leave records"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = requests.filter((request) => {
    const employee = request.employeeId;

    const searchableText = [
      employee?.name,
      employee?.empId,
      employee?.email,
      employee?.roleId?.roleName,
      employee?.departmentId?.departmentName,
      request.leaveType,
      request.reason,
      request.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      String(request.status || "").toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(
    (item) => String(item.status).toLowerCase() === "pending"
  ).length;

  const approvedCount = requests.filter(
    (item) => String(item.status).toLowerCase() === "approved"
  ).length;

  const rejectedCount = requests.filter(
    (item) => String(item.status).toLowerCase() === "rejected"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              All Employee Leaves
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View leave records of all employees in this company.
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

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Total Requests</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">
              {requests.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Rejected</p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {rejectedCount}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee, ID, department or leave type..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <FileText size={19} className="text-blue-600" />
              <h2 className="font-semibold text-slate-800">
                Employee Leave Records
              </h2>
            </div>

            <span className="text-sm text-slate-500">
              {filteredRequests.length} records
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="mx-auto mb-3 animate-spin" size={24} />
              Loading leave records...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarDays
                className="mx-auto mb-3 text-slate-300"
                size={42}
              />
              <h3 className="font-semibold text-slate-700">
                No leave records found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Employee</th>
                    <th className="px-5 py-4 font-semibold">Department</th>
                    <th className="px-5 py-4 font-semibold">Leave Type</th>
                    <th className="px-5 py-4 font-semibold">From Date</th>
                    <th className="px-5 py-4 font-semibold">To Date</th>
                    <th className="px-5 py-4 font-semibold">Days</th>
                    <th className="px-5 py-4 font-semibold">Reason</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Applied On</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((request) => {
                    const employee = request.employeeId;

                    return (
                      <tr
                        key={request._id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                              <User size={17} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {employee?.name || "Unknown Employee"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {employee?.empId || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {employee?.departmentId?.departmentName || "—"}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {request.leaveType || request.type || "—"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(request.startDate || request.fromDate)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(request.endDate || request.toDate)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {request.totalDays ?? request.days ?? "—"}
                        </td>

                        <td className="max-w-[220px] px-5 py-4 text-slate-600">
                          <p className="line-clamp-2">
                            {request.reason || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                              request.status
                            )}`}
                          >
                            {request.status || "Unknown"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(request.createdAt)}
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
    </div>
  );
};

export default AllEmployeeLeaves;
