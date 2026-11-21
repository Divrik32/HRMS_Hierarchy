import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  Play,
  Square,
  Coffee,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  RotateCcw,
  Pencil,
  Check,
  X,
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

  const [showInlineRow, setShowInlineRow] = useState(false);
const [inlineForm, setInlineForm] = useState({
  taskType: "Project",
  projectId: "",
  task: "Development",
  description: "",
  estimatedTime: "",
});

const [inlineDateTime, setInlineDateTime] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingEstimatedId, setEditingEstimatedId] = useState("");
  const [editingEstimatedValue, setEditingEstimatedValue] = useState("");
  const [savingEstimated, setSavingEstimated] = useState(false);
  const [editingIdleId, setEditingIdleId] = useState("");
  const [editingIdleValue, setEditingIdleValue] = useState("");
  const [savingIdle, setSavingIdle] = useState(false);

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

  const handleInlineSave = async () => {
  try {
    if (!inlineForm.taskType) {
      toast.error("Please select task type.");
      return;
    }

    if (!inlineForm.projectId) {
      toast.error("Please select a project.");
      return;
    }

    if (!inlineForm.task) {
      toast.error("Please select a task.");
      return;
    }

    if (!inlineForm.description.trim()) {
      toast.error("Please enter description.");
      return;
    }

    if (
      inlineForm.estimatedTime === "" ||
      Number(inlineForm.estimatedTime) < 0 ||
      !Number.isFinite(Number(inlineForm.estimatedTime))
    ) {
      toast.error("Please enter a valid estimated time.");
      return;
    }

    setSaving(true);

    const payload = {
      taskType: inlineForm.taskType,
      projectId: inlineForm.projectId,
      task: inlineForm.task,
      description: inlineForm.description.trim(),
      estimatedTime: Number(inlineForm.estimatedTime),

      // Defaults from Timesheet Model
      startTime: null,
      endTime: null,
      breakTime: null,
      totalCompletionTime: null,
      efficiency: null,
      idleTime: 0,
      taskStatus: "Not Started",
      approvalStatus: "Pending",
    };

    await api.post("/timesheets", payload);

    toast.success("Timesheet created successfully.");

    setShowInlineRow(false);

    setInlineForm({
      taskType: "Project",
      projectId: "",
      task: "Development",
      description: "",
      estimatedTime: "",
    });

    await loadData();
  } catch (error) {
    toast.error(
      error?.response?.data?.message ||
        "Failed to create timesheet."
    );
  } finally {
    setSaving(false);
  }
};

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

  // =========================================
// OPEN ESTIMATED TIME EDIT
// =========================================

const handleEditEstimated = (item) => {
  setEditingEstimatedId(item._id);
  setEditingEstimatedValue(String(item.estimatedTime ?? ""));
};


// =========================================
// SAVE ESTIMATED TIME
// =========================================

const handleSaveEstimated = async (item) => {
  const minutes = Number(editingEstimatedValue);

  if (
    !editingEstimatedValue.trim() ||
    !Number.isInteger(minutes) ||
    minutes <= 0
  ) {
    toast.error("Estimated time must be a positive whole number.");
    return;
  }

  setSavingEstimated(true);

  try {
    await api.patch(`/timesheets/${item._id}/edit`, {
      field: "estimatedTime",
      value: minutes,
    });

    toast.success("Estimated time updated successfully.");

    setEditingEstimatedId("");
    setEditingEstimatedValue("");

    await loadData();

  } catch (err) {
    toast.error(
      err.response?.data?.message ||
      "Failed to update estimated time."
    );
  } finally {
    setSavingEstimated(false);
  }
};

// =========================================
// OPEN IDLE TIME EDIT
// =========================================

const handleEditIdle = (item) => {
  setEditingIdleId(item._id);
  setEditingIdleValue(String(item.idleTime ?? 0));
};

// =========================================
// SAVE IDLE TIME
// =========================================

const handleSaveIdle = async (item) => {
  const minutes = Number(editingIdleValue);

  if (
    !editingIdleValue.trim() ||
    !Number.isInteger(minutes) ||
    minutes < 0
  ) {
    toast.error("Idle time must be a non-negative whole number.");
    return;
  }

  setSavingIdle(true);

  try {
    await api.patch(`/timesheets/${item._id}/edit`, {
      field: "idleTime",
      value: minutes,
    });

    toast.success("Idle time updated successfully.");

    setEditingIdleId("");
    setEditingIdleValue("");

    await loadData();
  } catch (err) {
    toast.error(
      err.response?.data?.message ||
        "Failed to update idle time."
    );
  } finally {
    setSavingIdle(false);
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
  type="button"
  onClick={() => {
    setInlineDateTime(new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    }));

    setInlineForm({
      taskType: "Project",
      projectId: "",
      task: "Development",
      description: "",
      estimatedTime: "",
    });

    setShowInlineRow(true);
  }}
  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
>
  <Plus size={16} />
  New Timesheet
</button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

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
                  {filteredTimesheets.length === 0 && !showInlineRow && (
  <tr>
    <td
      colSpan={16}
      className="py-16 text-center text-slate-500"
    >
      No timesheets found.
    </td>
  </tr>
)}
                  {filteredTimesheets.map((item) => {
                    const locked = item.approvalStatus === "Approved";
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
  {editingEstimatedId === item._id ? (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="1"
        step="1"
        value={editingEstimatedValue}
        onChange={(event) =>
          setEditingEstimatedValue(event.target.value)
        }
        disabled={savingEstimated}
        autoFocus
        className="w-20 rounded-lg border border-blue-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      <button
        type="button"
        onClick={() => handleSaveEstimated(item)}
        disabled={savingEstimated}
        title="Save estimated time"
        className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
      >
        {savingEstimated ? (
          <RefreshCw size={15} className="animate-spin" />
        ) : (
          <Check size={16} />
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          setEditingEstimatedId("");
          setEditingEstimatedValue("");
        }}
        disabled={savingEstimated}
        title="Cancel editing"
        className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
      >
        <X size={16} />
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <span className="font-medium text-slate-700">
        {formatMinutes(item.estimatedTime)}
      </span>

      {!locked && (
  <button
    type="button"
    onClick={() => handleEditEstimated(item)}
    title="Edit estimated time"
    className="rounded-md p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
  >
    <Pencil size={14} />
  </button>
)}
    </div>
  )}
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
  {editingIdleId === item._id ? (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        step="1"
        value={editingIdleValue}
        onChange={(event) =>
          setEditingIdleValue(event.target.value)
        }
        disabled={savingIdle}
        autoFocus
        className="w-20 rounded-lg border border-blue-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      <button
        type="button"
        onClick={() => handleSaveIdle(item)}
        disabled={savingIdle}
        title="Save idle time"
        className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
      >
        {savingIdle ? (
          <RefreshCw size={15} className="animate-spin" />
        ) : (
          <Check size={16} />
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          setEditingIdleId("");
          setEditingIdleValue("");
        }}
        disabled={savingIdle}
        title="Cancel editing"
        className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-50"
      >
        <X size={16} />
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <span className="font-medium text-slate-700">
        {formatMinutes(item.idleTime)}
      </span>

      {!locked && (
  <button
    type="button"
    onClick={() => handleEditIdle(item)}
    title="Edit idle time"
    className="rounded-md p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
  >
    <Pencil size={14} />
  </button>
)}
    </div>
  )}
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
                  {showInlineRow && (
  <tr className="bg-blue-50/50">
    {/* DATE & TIME */}
    <td className="border-b px-4 py-3 whitespace-nowrap">
      <div className="text-sm font-medium text-slate-800">
        {inlineDateTime}
      </div>
      <div className="text-xs text-blue-600">
        New Entry
      </div>
    </td>

    {/* TASK TYPE */}
    <td className="border-b px-4 py-3">
      <select
        value={inlineForm.taskType}
        onChange={(e) =>
          setInlineForm((prev) => ({
            ...prev,
            taskType: e.target.value,
          }))
        }
        className="w-full rounded-lg border px-2 py-2 text-sm"
      >
        <option value="Project">Project</option>
        <option value="Learning">Learning</option>
        <option value="Training">Training</option>
      </select>
    </td>

    {/* PROJECT */}
    <td className="border-b px-4 py-3">
      <select
        value={inlineForm.projectId}
        onChange={(e) =>
          setInlineForm((prev) => ({
            ...prev,
            projectId: e.target.value,
          }))
        }
        className="w-full min-w-[150px] rounded-lg border px-2 py-2 text-sm"
      >
        <option value="">Select Project</option>

        {projects.map((project) => (
          <option key={project._id} value={project._id}>
            {project.projectName || project.name}
          </option>
        ))}
      </select>
    </td>

    {/* TASK */}
    <td className="border-b px-4 py-3">
      <select
        value={inlineForm.task}
        onChange={(e) =>
          setInlineForm((prev) => ({
            ...prev,
            task: e.target.value,
          }))
        }
        className="w-full min-w-[130px] rounded-lg border px-2 py-2 text-sm"
      >
        <option value="Testing">Testing</option>
        <option value="Development">Development</option>
        <option value="Learning">Learning</option>
        <option value="Graphics">Graphics</option>
        <option value="Management">Management</option>
        <option value="Meeting">Meeting</option>
      </select>
    </td>

    {/* DESCRIPTION */}
    <td className="border-b px-4 py-3">
      <input
        type="text"
        value={inlineForm.description}
        onChange={(e) =>
          setInlineForm((prev) => ({
            ...prev,
            description: e.target.value,
          }))
        }
        placeholder="Enter description"
        className="w-full min-w-[200px] rounded-lg border px-3 py-2 text-sm"
      />
    </td>

    {/* ESTIMATED TIME */}
    <td className="border-b px-4 py-3">
      <input
        type="number"
        min="0"
        value={inlineForm.estimatedTime}
        onChange={(e) =>
          setInlineForm((prev) => ({
            ...prev,
            estimatedTime: e.target.value,
          }))
        }
        placeholder="Minutes"
        className="w-24 rounded-lg border px-2 py-2 text-sm"
      />
    </td>

    {/* REMAINING COLUMNS */}
    <td colSpan={10} className="border-b px-4 py-3">
      <div className="flex items-center gap-2">
<button
  type="button"
  onClick={handleInlineSave}
  disabled={saving}
  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
>
  {saving ? (
    <RefreshCw size={15} className="animate-spin" />
  ) : (
    <Check size={15} />
  )}

  {saving ? "Saving..." : "Save"}
</button>

        <button
          type="button"
          onClick={() => setShowInlineRow(false)}
          className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <X size={15} />
          Cancel
        </button>
      </div>
    </td>
  </tr>
)}
                </tbody>
              </table>
            </div>
        </section>
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
