
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Clock3, Plus, RefreshCw, Search, Play, Square,
  Coffee, CheckCircle2, XCircle, Clock, Pause, RotateCcw,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-toastify";

const initialForm = {
  taskType: "Project",
  projectId: "",
  moduleId: "",
  description: "",
  estimatedTime: "",
};

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

const formatTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
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

const getStatusClass = (status) => {
  if (status === "Approved") return "bg-emerald-50 text-emerald-700";
  if (status === "Rejected") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
};

const getTaskStatusClass = (status) => {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "In Progress") return "bg-blue-50 text-blue-700";
  if (status === "On Break") return "bg-orange-50 text-orange-700";
  return "bg-slate-100 text-slate-600";
};

export default function Timesheet() {
  const [employee, setEmployee] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Live date/time display. Backend will save the actual submit timestamp.
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [profileRes, timesheetRes, projectRes] = await Promise.all([
        api.get("/employees/profile/me"),
        api.get("/timesheets"),
        api.get("/timesheets/projects"),
      ]);

      setEmployee(profileRes.data?.employee || null);
      setTimesheets(timesheetRes.data?.timesheets || []);
      setProjects(projectRes.data?.projects || []);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to load timesheet data.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const companyName =
    typeof employee?.companyId === "object"
      ? employee.companyId?.companyName
      : employee?.companyName;

  const departmentName =
    typeof employee?.departmentId === "object"
      ? employee.departmentId?.departmentName
      : "";

  const roleName =
    typeof employee?.roleId === "object"
      ? employee.roleId?.roleName
      : "";

  const selectedProject = projects.find(
    (project) => String(project._id) === String(form.projectId)
  );

  const projectModules = selectedProject?.modules || [];

  const selectedModule = projectModules.find(
    (module) => String(module._id) === String(form.moduleId)
  );

  const setField = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "projectId" ? { moduleId: "" } : {}),
    }));
  };

  const openCreateForm = () => {
    setForm({ ...initialForm });
    setError("");
    setShowForm(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.estimatedTime || Number(form.estimatedTime) <= 0) {
      setError("Estimated time must be greater than 0 minutes.");
      return;
    }

    if (form.taskType === "Project") {
      if (!form.projectId) {
        setError("Please select a project.");
        return;
      }

      if (!form.moduleId) {
        setError("Please select a task/module.");
        return;
      }
    } else if (!form.description.trim()) {
      setError("Please enter a description for Learning/Training.");
      return;
    }

    const payload = {
      taskType: form.taskType,
      estimatedTime: Number(form.estimatedTime),
      ...(form.taskType === "Project"
        ? {
            projectId: form.projectId,
            moduleId: form.moduleId,
          }
        : {
            projectId: null,
            moduleId: null,
            description: form.description.trim(),
          }),
    };

    setSaving(true);

    try {
      await api.post("/timesheets", payload);
      toast.success("Timesheet created successfully.");
      setShowForm(false);
      setForm({ ...initialForm });
      await loadData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to create timesheet."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTaskAction = async (item, action) => {
    const endpoints = {
      start: `/timesheets/${item._id}/start`,
      end: `/timesheets/${item._id}/end`,
      break: `/timesheets/${item._id}/break/start`,
      resume: `/timesheets/${item._id}/break/resume`,
    };

    const messages = {
      start: "Task started.",
      end: "Task completed.",
      break: "Break started.",
      resume: "Break ended. Task resumed.",
    };

    setActionId(`${item._id}-${action}`);

    try {
      await api.patch(endpoints[action]);
      toast.success(messages[action]);
      await loadData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Unable to update task status."
      );
    } finally {
      setActionId("");
    }
  };

  const filteredTimesheets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return timesheets.filter((item) => {
      const status = item.approvalStatus || "Pending";

      const matchesStatus =
        statusFilter === "All" || status === statusFilter;

      const projectName =
        typeof item.projectId === "object"
          ? item.projectId?.projectName || ""
          : "";

      const matchesSearch =
        !term ||
        [
          item.task,
          item.description,
          projectName,
          item.taskType,
          item.remarks?.reason,
        ].some((value) =>
          String(value || "").toLowerCase().includes(term)
        );

      return matchesStatus && matchesSearch;
    });
  }, [timesheets, search, statusFilter]);

  const stats = useMemo(
    () => ({
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
    }),
    [timesheets]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="mr-2 animate-spin" />
        Loading your timesheets...
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
              My Timesheets
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create tasks and track your working time.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} /> New Timesheet
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">
              Employee Information
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Employee Name" value={employee?.name} />
            <Info label="Employee ID" value={employee?.empId} />
            <Info label="Company" value={companyName} />
            <Info label="Department" value={departmentName} />
            <Info label="Role" value={roleName} />
            <Info label="Email" value={employee?.email} />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat label="Total" value={stats.total} icon={<Clock3 />} />
          <Stat label="Pending" value={stats.pending} icon={<Clock />} />
          <Stat label="Approved" value={stats.approved} icon={<CheckCircle2 />} />
          <Stat label="Rejected" value={stats.rejected} icon={<XCircle />} />
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-slate-900">My Timesheet Records</h2>
              <p className="text-sm text-slate-500">
                {filteredTimesheets.length} record(s)
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search timesheets..."
                  className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm sm:w-56"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="All">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {filteredTimesheets.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              No timesheets found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {[
                      "Date",
                      "Task Type",
                      "Project",
                      "Task / Module",
                      "Description",
                      "Estimated",
                      "Start",
                      "Break",
                      "End",
                      "Working Time",
                      "Idle Time",
                      "Estimated Error",
                      "Efficiency",
                      "Task Status",
                      "Approval",
                      "Audited By",
                      "Rejection Reason",
                    ].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-4 py-4">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredTimesheets.map((item) => {
                    const locked = item.approvalStatus !== "Pending";
                    const project =
                      typeof item.projectId === "object"
                        ? item.projectId?.projectName
                        : "—";

                    const activeBreak =
                      item.taskStatus === "On Break" &&
                      item.breakTime &&
                      !item.breakTime.endTime;

                    const isBusy = (action) =>
                      actionId === `${item._id}-${action}`;

                    return (
                      <tr key={item._id} className="align-top hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatDateTime(item.date)}
                        </td>
                        <td className="px-4 py-4">{item.taskType}</td>
                        <td className="px-4 py-4">{project || "—"}</td>
                        <td className="px-4 py-4 font-medium text-slate-800">
                          {item.task || "—"}
                        </td>
                        <td className="max-w-56 whitespace-normal px-4 py-4">
                          {item.description || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatMinutes(item.estimatedTime)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <div>{formatTime(item.startTime)}</div>
                          {!locked &&
                            item.taskStatus === "Not Started" &&
                            !item.startTime && (
                              <ActionButton
                                label="Start"
                                icon={<Play size={13} />}
                                busy={isBusy("start")}
                                onClick={() => handleTaskAction(item, "start")}
                              />
                            )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          {item.breakTime?.startTime
                            ? formatTime(item.breakTime.startTime)
                            : "—"}

                          {!locked &&
                            item.taskStatus === "In Progress" &&
                            !item.breakTime && (
                              <ActionButton
                                label="Break"
                                icon={<Coffee size={13} />}
                                busy={isBusy("break")}
                                onClick={() => handleTaskAction(item, "break")}
                              />
                            )}

                          {!locked && activeBreak && (
                            <ActionButton
                              label="Resume"
                              icon={<RotateCcw size={13} />}
                              busy={isBusy("resume")}
                              onClick={() => handleTaskAction(item, "resume")}
                            />
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <div>{formatTime(item.endTime)}</div>
                          {!locked &&
                            item.taskStatus === "In Progress" &&
                            !item.endTime && (
                              <ActionButton
                                label="End"
                                icon={<Square size={13} />}
                                busy={isBusy("end")}
                                onClick={() => handleTaskAction(item, "end")}
                              />
                            )}
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
                        <td className="px-4 py-4">
                          {item.efficiency == null ? "—" : `${item.efficiency}%`}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getTaskStatusClass(item.taskStatus)}`}>
                            {item.taskStatus || "Not Started"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(item.approvalStatus)}`}>
                            {item.approvalStatus || "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {item.auditedBy?.name || "—"}
                        </td>
                        <td className="max-w-48 whitespace-normal px-4 py-4 text-red-600">
                          {item.rejectionReason || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
            <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Create Timesheet
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Date and time are automatically updated.
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <XCircle size={21} />
                </button>
              </div>

              <form onSubmit={handleCreate}>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <FormField label="Date & Time">
                    <input
                      readOnly
                      value={liveTime.toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                      className="w-full rounded-xl border bg-slate-100 px-3 py-3 text-sm"
                    />
                  </FormField>

                  <FormField label="Employee">
                    <input
                      readOnly
                      value={`${employee?.name || ""}${employee?.empId ? ` (${employee.empId})` : ""}`}
                      className="w-full rounded-xl border bg-slate-100 px-3 py-3 text-sm"
                    />
                  </FormField>

                  <FormField label="Company">
                    <input
                      readOnly
                      value={companyName || ""}
                      className="w-full rounded-xl border bg-slate-100 px-3 py-3 text-sm"
                    />
                  </FormField>

                  <FormField label="Role / Category">
                    <input
                      readOnly
                      value={roleName || ""}
                      className="w-full rounded-xl border bg-slate-100 px-3 py-3 text-sm"
                    />
                  </FormField>

                  <FormField label="Task Type">
                    <select
                      value={form.taskType}
                      onChange={(event) =>
                        setField("taskType", event.target.value)
                      }
                      className="w-full rounded-xl border px-3 py-3 text-sm"
                    >
                      <option value="Project">Project</option>
                      <option value="Learning">Learning</option>
                      <option value="Training">Training</option>
                    </select>
                  </FormField>

                  {form.taskType === "Project" && (
                    <>
                      <FormField label="Project">
                        <select
                          value={form.projectId}
                          onChange={(event) =>
                            setField("projectId", event.target.value)
                          }
                          required
                          className="w-full rounded-xl border px-3 py-3 text-sm"
                        >
                          <option value="">Select Project</option>
                          {projects.map((project) => (
                            <option key={project._id} value={project._id}>
                              {project.projectName}
                              {project.projectCode
                                ? ` (${project.projectCode})`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="Task / Module">
                        <select
                          value={form.moduleId}
                          onChange={(event) =>
                            setField("moduleId", event.target.value)
                          }
                          required
                          disabled={!form.projectId}
                          className="w-full rounded-xl border px-3 py-3 text-sm disabled:bg-slate-100"
                        >
                          <option value="">Select Task / Module</option>
                          {projectModules.map((module) => (
                            <option key={module._id} value={module._id}>
                              {module.moduleName || module.name}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </>
                  )}

                  {form.taskType !== "Project" && (
                    <div className="sm:col-span-2">
                      <FormField label={`${form.taskType} Description`} required>
                        <textarea
                          rows={3}
                          value={form.description}
                          onChange={(event) =>
                            setField("description", event.target.value)
                          }
                          required
                          placeholder={`Describe your ${form.taskType.toLowerCase()} activity...`}
                          className="w-full rounded-xl border px-3 py-3 text-sm"
                        />
                      </FormField>
                    </div>
                  )}

                  <FormField label="Estimated Time (minutes)" required>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.estimatedTime}
                      onChange={(event) =>
                        setField("estimatedTime", event.target.value)
                      }
                      required
                      placeholder="e.g. 120"
                      className="w-full rounded-xl border px-3 py-3 text-sm"
                    />
                  </FormField>

                  <div className="flex items-end text-xs text-slate-500">
                    Start time, end time, break time, working time and
                    estimated error will be handled through task actions.
                  </div>
                </div>

                {error && (
                  <p className="mx-5 mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-3 border-t bg-slate-50 p-5">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    disabled={saving}
                    className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving && <RefreshCw size={16} className="animate-spin" />}
                    {saving ? "Saving..." : "Create Timesheet"}
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

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function ActionButton({ label, icon, busy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
    >
      {busy ? <RefreshCw size={13} className="animate-spin" /> : icon}
      {busy ? "Saving" : label}
    </button>
  );
}
