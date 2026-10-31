import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Search,
  AlertCircle,
} from "lucide-react";

import api from "../../api/axios";

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusStyle = (status) => {
  switch (status) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700";
    case "Rejected":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
};

const getEmployeeName = (employee) => {
  if (!employee) return "—";

  if (typeof employee === "object") {
    return [
      employee.name,
      employee.empId ? `(${employee.empId})` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return "—";
};

const getProjectName = (project) => {
  if (!project) return "—";

  if (typeof project === "object") {
    return [
      project.projectName,
      project.projectCode ? `(${project.projectCode})` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return "—";
};

const Timesheets = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const loadTimesheets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/timesheets");

      setTimesheets(response.data?.timesheets || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load timesheet records."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  const filteredTimesheets = timesheets.filter((item) => {
    const normalizedSearch = search.trim().toLowerCase();

    const employeeName = getEmployeeName(item.employeeId);
    const projectName = getProjectName(item.projectId);

    const matchesSearch =
      !normalizedSearch ||
      [
        employeeName,
        item.task,
        item.description,
        item.projectName,
        projectName,
        item.remarks?.reason,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch)
        );

    const matchesStatus =
      statusFilter === "All" ||
      (item.approvalStatus || "Pending") === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: timesheets.length,
    pending: timesheets.filter(
      (item) => (item.approvalStatus || "Pending") === "Pending"
    ).length,
    approved: timesheets.filter(
      (item) => item.approvalStatus === "Approved"
    ).length,
    rejected: timesheets.filter(
      (item) => item.approvalStatus === "Rejected"
    ).length,
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <CalendarDays size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Timesheets
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View and monitor company timesheet records.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadTimesheets}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            label: "Total Timesheets",
            value: stats.total,
            color: "text-blue-700",
          },
          {
            label: "Pending",
            value: stats.pending,
            color: "text-amber-700",
          },
          {
            label: "Approved",
            value: stats.approved,
            color: "text-emerald-700",
          },
          {
            label: "Rejected",
            value: stats.rejected,
            color: "text-red-700",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className={`mt-2 text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Timesheet Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredTimesheets.length} record(s) found
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search timesheets..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
            <RefreshCw size={19} className="animate-spin" />
            Loading timesheets...
          </div>
        ) : filteredTimesheets.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays
              size={35}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 font-semibold text-slate-700">
              No timesheets found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              No records match your search or selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[2600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-4">Employee</th>
                  <th className="px-4 py-4">Task</th>
                  <th className="px-4 py-4">Description</th>
                  <th className="px-4 py-4">Project</th>
                  <th className="px-4 py-4">Project Name</th>
                  <th className="px-4 py-4">Training Time</th>
                  <th className="px-4 py-4">Working Time</th>
                  <th className="px-4 py-4">Idle Time</th>
                  <th className="px-4 py-4">Start Time</th>
                  <th className="px-4 py-4">End Time</th>
                  <th className="px-4 py-4">Completion Time</th>
                  <th className="px-4 py-4">Efficiency</th>
                  <th className="px-4 py-4">Delay / Fast</th>
                  <th className="px-4 py-4">Reason</th>
                  <th className="px-4 py-4">Approval Status</th>
                  <th className="px-4 py-4">Audited By</th>
                  <th className="px-4 py-4">Created At</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredTimesheets.map((item) => (
                  <tr
                    key={item._id}
                    className="align-top hover:bg-slate-50"
                  >
                    <td className="min-w-48 px-4 py-4 font-medium text-slate-700">
                      {getEmployeeName(item.employeeId)}
                    </td>

                    <td className="min-w-48 px-4 py-4 text-slate-700">
                      {item.task || "—"}
                    </td>

                    <td className="min-w-56 whitespace-pre-wrap px-4 py-4 text-slate-600">
                      {item.description || "—"}
                    </td>

                    <td className="min-w-52 px-4 py-4 text-slate-700">
                      {getProjectName(item.projectId)}
                    </td>

                    <td className="min-w-48 px-4 py-4 text-slate-700">
                      {item.projectName || "—"}
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {item.allocatedTime?.trainingTime ?? 0} min
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {item.allocatedTime?.workingTime ?? 0} min
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {item.allocatedTime?.idleTime ?? 0} min
                    </td>

                    <td className="min-w-52 px-4 py-4 text-slate-600">
                      {formatDateTime(item.startTime)}
                    </td>

                    <td className="min-w-52 px-4 py-4 text-slate-600">
                      {formatDateTime(item.endTime)}
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {item.totalCompletionTime == null
                        ? "—"
                        : `${item.totalCompletionTime} min`}
                    </td>

                    <td className="px-4 py-4">
                      {item.efficiency == null ? (
                        "—"
                      ) : (
                        <span className="font-semibold text-blue-700">
                          {item.efficiency}%
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {item.remarks?.delayFast || "—"}
                    </td>

                    <td className="min-w-48 whitespace-pre-wrap px-4 py-4 text-slate-600">
                      {item.remarks?.reason || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                          item.approvalStatus || "Pending"
                        )}`}
                      >
                        {item.approvalStatus || "Pending"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {typeof item.auditedBy === "object"
                        ? item.auditedBy?.name || "—"
                        : "—"}
                    </td>

                    <td className="min-w-52 px-4 py-4 text-slate-600">
                      {formatDateTime(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Timesheets;