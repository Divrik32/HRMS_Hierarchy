
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw, Search, CheckCircle2, XCircle, Clock3,
  UserRound, CalendarDays, BriefcaseBusiness, ShieldCheck,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-toastify";

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatMinutes = (value) => {
  if (value == null) return "—";

  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return "—";

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return hours ? `${hours}h ${remaining}m` : `${remaining}m`;
};

export default function TimesheetApprovals() {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/timesheets/approval");
      setTimesheets(response.data?.timesheets || []);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to load timesheet approvals.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const pendingTimesheets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return timesheets.filter((item) => {
      const status = item.approvalStatus || "Pending";

      // Only completed and pending timesheets can be audited.
      if (item.taskStatus !== "Completed" || status !== "Pending") {
        return false;
      }

      const employeeName =
        typeof item.employeeId === "object"
          ? item.employeeId?.name || ""
          : "";

      const employeeCode =
        typeof item.employeeId === "object"
          ? item.employeeId?.empId || ""
          : "";

      const employeeRole =
        typeof item.employeeId?.roleId === "object"
          ? item.employeeId.roleId?.roleName || ""
          : "";

      const projectName =
        typeof item.projectId === "object"
          ? item.projectId?.projectName || ""
          : "";

      return (
        !term ||
        [
          employeeName,
          employeeCode,
          employeeRole,
          item.task,
          item.description,
          item.taskType,
          projectName,
        ].some((value) =>
          String(value || "").toLowerCase().includes(term)
        )
      );
    });
  }, [timesheets, search]);

  const handleApprove = async (item) => {
    const confirmed = window.confirm(
      `Approve the timesheet of ${item.employeeId?.name || "this employee"}?`
    );

    if (!confirmed) return;

    setActionId(item._id);

    try {
      await api.patch(`/timesheets/${item._id}/audit`, {
        approvalStatus: "Approved",
      });

      toast.success("Timesheet approved successfully.");
      await loadApprovals();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to approve timesheet."
      );
    } finally {
      setActionId("");
    }
  };

  const openRejectModal = (item) => {
    setSelectedTimesheet(item);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleReject = async (event) => {
    event.preventDefault();

    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }

    if (!selectedTimesheet?._id) return;

    setActionId(selectedTimesheet._id);

    try {
await api.patch(
  `/timesheets/${selectedTimesheet._id}/audit`,
  {
    approvalStatus: "Rejected",
    rejectionReason: rejectionReason.trim(),
  }
);

      toast.success("Timesheet rejected.");
      setShowRejectModal(false);
      setSelectedTimesheet(null);
      setRejectionReason("");
      await loadApprovals();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to reject timesheet."
      );
    } finally {
      setActionId("");
    }
  };

  const stats = {
    total: timesheets.length,
    pending: timesheets.filter(
      (item) =>
        item.taskStatus === "Completed" &&
        item.approvalStatus === "Pending"
    ).length,
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="mr-2 animate-spin" />
        Loading approval records...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Employee Workspace
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Timesheet Approvals
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review completed timesheets submitted by your child and
              grandchild role employees.
            </p>
          </div>

          <button
            onClick={loadApprovals}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Approval Records</p>
              <BriefcaseBusiness className="text-blue-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Pending Approval</p>
              <Clock3 className="text-amber-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {stats.pending}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-slate-900">
                Employee Timesheets
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {pendingTimesheets.length} timesheet(s) waiting for your
                decision.
              </p>
            </div>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee or task..."
                className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm sm:w-72"
              />
            </div>
          </div>

          {pendingTimesheets.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <ShieldCheck size={26} />
              </div>
              <h3 className="font-semibold text-slate-800">
                No pending approvals
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Completed timesheets from your eligible employees will appear
                here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1550px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {[
                      "Employee",
                      "Role",
                      "Date",
                      "Task Type",
                      "Project",
                      "Task / Module",
                      "Description",
                      "Estimated",
                      "Start Time",
                      "End Time",
                      "Working Time",
                      "Idle Time",
                      "Estimated Error",
                      "Efficiency",
                      "Action",
                    ].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-4 py-4">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {pendingTimesheets.map((item) => {
                    const employee =
                      typeof item.employeeId === "object"
                        ? item.employeeId
                        : {};

                    const role =
                      typeof employee?.roleId === "object"
                        ? employee.roleId?.roleName
                        : "—";

                    const project =
                      typeof item.projectId === "object"
                        ? item.projectId?.projectName
                        : "—";

                    const busy = actionId === item._id;

                    return (
                      <tr key={item._id} className="align-top hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                              <UserRound size={17} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {employee?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {employee?.empId || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">{role}</td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatDateTime(item.date)}
                        </td>
                        <td className="px-4 py-4">{item.taskType}</td>
                        <td className="px-4 py-4">{project || "—"}</td>
                        <td className="px-4 py-4 font-semibold text-slate-800">
                          {item.task || "—"}
                        </td>
                        <td className="max-w-56 whitespace-normal px-4 py-4">
                          {item.description || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatMinutes(item.estimatedTime)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatDateTime(item.startTime)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatDateTime(item.endTime)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatMinutes(item.totalCompletionTime)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatMinutes(item.idleTime)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {item.estimatedError == null
                            ? "—"
                            : formatMinutes(item.estimatedError)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold text-blue-700">
                          {item.efficiency == null
                            ? "—"
                            : `${item.efficiency}%`}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleApprove(item)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {busy ? (
                                <RefreshCw size={13} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              Approve
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openRejectModal(item)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="border-b p-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Reject Timesheet
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Employee: {selectedTimesheet?.employeeId?.name || "Unknown"}
                </p>
              </div>

              <form onSubmit={handleReject}>
                <div className="p-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>

                  <textarea
                    rows={4}
                    autoFocus
                    required
                    value={rejectionReason}
                    onChange={(event) =>
                      setRejectionReason(event.target.value)
                    }
                    placeholder="Explain why this timesheet is being rejected..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t bg-slate-50 p-5">
                  <button
                    type="button"
                    disabled={Boolean(actionId)}
                    onClick={() => {
                      setShowRejectModal(false);
                      setSelectedTimesheet(null);
                      setRejectionReason("");
                    }}
                    className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={Boolean(actionId) || !rejectionReason.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionId ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <XCircle size={15} />
                    )}
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
