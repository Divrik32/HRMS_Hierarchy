import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import {
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
  Trash2,
  RotateCcw,
  Pencil,
  Check,
  X,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-toastify";

/* =========================================================
   Helpers
   ========================================================= */
const blankInline = {
  taskType: "Project",
  projectId: "",
  task: "Development",
  description: "",
  estimatedTime: "",
};

const IST = "Asia/Kolkata";
const getTodayIST = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    timeZone: IST,
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
    timeZone: IST,
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
  if (status === "Approved") return "bg-emerald-100 text-emerald-800 ring-emerald-300";
  if (status === "Rejected") return "bg-rose-100 text-rose-800 ring-rose-300";
  return "bg-amber-100 text-amber-800 ring-amber-300";
};

const getTaskStatusClass = (status) => {
  if (status === "Completed") return "bg-emerald-100 text-emerald-800 ring-emerald-300";
  if (status === "In Progress") return "bg-sky-100 text-sky-800 ring-sky-300";
  if (status === "On Break") return "bg-orange-100 text-orange-800 ring-orange-300";
  return "bg-slate-100 text-slate-700 ring-slate-300";
};

const getApprovalRowClass = (item) => {
  const status = item.approvalStatus || "Pending";
  const isUpdatedPending = Number(item.resubmissionCount || 0) > 0;

  if (status === "Approved") {
    return "bg-green-50 hover:bg-green-100";
  }

  if (status === "Rejected") {
    return "bg-red-50 hover:bg-red-100";
  }

  if (status === "Pending" && isUpdatedPending) {
    return "bg-purple-50 hover:bg-purple-100";
  }

  return "bg-yellow-50 hover:bg-yellow-100";
};

const getAccent = () => "";

/* Gold star burst fired from an element (used by the Save button) */
const burstGlitter = (el) => {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const colors = ["#fde68a", "#fbbf24", "#ffffff", "#fcd34d", "#34d399"];
  const star =
    "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)";

  // expanding ring
  const ring = document.createElement("span");
  Object.assign(ring.style, {
    position: "fixed", left: `${cx}px`, top: `${cy}px`, width: "20px", height: "20px",
    marginLeft: "-10px", marginTop: "-10px", borderRadius: "9999px",
    border: "2px solid #fde68a", pointerEvents: "none", zIndex: 9999,
  });
  document.body.appendChild(ring);
  gsap.fromTo(ring, { scale: 0.4, opacity: 0.9 }, {
    scale: 6, opacity: 0, duration: 0.7, ease: "power2.out", onComplete: () => ring.remove(),
  });

  // stars
  for (let i = 0; i < 30; i++) {
    const s = document.createElement("span");
    const size = 7 + Math.random() * 11;
    Object.assign(s.style, {
      position: "fixed", left: `${cx - size / 2}px`, top: `${cy - size / 2}px`,
      width: `${size}px`, height: `${size}px`, background: colors[i % colors.length],
      clipPath: star, pointerEvents: "none", zIndex: 9999,
      filter: "drop-shadow(0 0 4px rgba(253,230,138,0.9))",
    });
    document.body.appendChild(s);

    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 110;
    gsap.fromTo(
      s,
      { x: 0, y: 0, scale: 0, rotation: 0, opacity: 1 },
      {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist + 24,
        scale: 1,
        rotation: Math.random() * 400 - 200,
        opacity: 0,
        duration: 0.9 + Math.random() * 0.7,
        ease: "power3.out",
        onComplete: () => s.remove(),
      }
    );
  }
};

const headings = [
  "Date", "Task Type", "Project", "Task / Module", "Description", "Estimated",
  "Start", "Break", "End", "Working Time", "Idle Time", "Efficiency",
  "Task Status"
];

const filters = ["All", "Pending", "Updated Pending", "Approved", "Rejected"];

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

/* =========================================================
   Page
   ========================================================= */
export default function Timesheet() {
  const reduce = useReducedMotion();

  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [hideAutoInlineRow, setHideAutoInlineRow] = useState(false);
  const [inlineRows, setInlineRows] = useState([]);
  const [savingRowId, setSavingRowId] = useState("");

  const [dateFrom, setDateFrom] = useState(getTodayIST);
  const [dateTo, setDateTo] = useState(getTodayIST);

  // one inline editor at a time: { id, field, value }
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [, timesheetRes, projectRes] = await Promise.all([
        api.get("/employees/profile/me"),
        api.get("/timesheets"),
        api.get("/timesheets/projects"),
      ]);
      setTimesheets(timesheetRes.data?.timesheets || []);
      setHideAutoInlineRow(false);
      setProjects(projectRes.data?.projects || []);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to load timesheet data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---------- create ---------- */
  /* ---------- Inline Rows ---------- */

const createInlineRow = () => ({
  id: `${Date.now()}-${Math.random()}`,
  form: { ...blankInline },
  dateTime: new Date().toLocaleString("en-IN", {
    timeZone: IST,
  }),
});

const addInlineRow = (currentRow = null) => {
  const newRow = createInlineRow();

  setInlineRows((prev) => {
    if (currentRow?.id === "auto-inline-row") {
      return [
        {
          ...currentRow,
          id: `converted-${Date.now()}`,
        },
        newRow,
      ];
    }

    return [...prev, newRow];
  });
};

const updateInlineRow = (rowId, key, value) => {
  setInlineRows((prev) => {
    // Auto-generated rowকে state-এর মধ্যে নিয়ে আসা
    if (rowId === "auto-inline-row") {
      setHideAutoInlineRow(true);

      return [
        {
          id: `converted-${Date.now()}`,
          form: {
            ...blankInline,
            [key]: value,
          },
          dateTime: new Date().toLocaleString("en-IN", {
            timeZone: IST,
          }),
        },
      ];
    }

    return prev.map((row) =>
      row.id === rowId
        ? {
            ...row,
            form: {
              ...row.form,
              [key]: value,
            },
          }
        : row
    );
  });
};

const removeInlineRow = (rowId) => {
  if (rowId === "auto-inline-row") {
    setHideAutoInlineRow(true);
    return;
  }

  setInlineRows((prev) =>
    prev.filter((row) => row.id !== rowId)
  );
};

const handleInlineSave = async (row) => {
  const { form } = row;

  if (
    !form.taskType ||
    !form.projectId ||
    !form.task ||
    !form.description.trim() ||
    form.estimatedTime === "" ||
    !Number.isFinite(Number(form.estimatedTime)) ||
    Number(form.estimatedTime) < 0
  ) {
    return;
  }

  if (savingRowId) return;

  setSavingRowId(row.id);

  try {
    await api.post("/timesheets", {
      taskType: form.taskType,
      projectId: form.projectId,
      task: form.task,
      description: form.description.trim(),
      estimatedTime: Number(form.estimatedTime),
      startTime: null,
      endTime: null,
      breakTime: null,
      totalCompletionTime: null,
      efficiency: null,
      idleTime: 0,
      taskStatus: "Not Started",
      approvalStatus: "Pending",
    });

    toast.success("Timesheet created successfully.");

    setInlineRows((prev) =>
      prev.filter((item) => item.id !== row.id)
    );

    await loadData();
  } catch (err) {
    toast.error(
      err?.response?.data?.message ||
        "Failed to create timesheet."
    );
  } finally {
    setSavingRowId("");
  }
};

useEffect(() => {
  if (savingRowId) return;

  const readyRow = inlineRows.find((row) => {
    const { form } = row;

    return (
      form.taskType &&
      form.projectId &&
      form.task &&
      form.description.trim() &&
      form.estimatedTime !== "" &&
      Number.isFinite(Number(form.estimatedTime)) &&
      Number(form.estimatedTime) >= 0
    );
  });

  if (readyRow) {
    handleInlineSave(readyRow);
  }
}, [inlineRows, savingRowId]);

  /* ---------- start / break / resume / end ---------- */
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
      toast.error(err.response?.data?.message || "Unable to update task status.");
    } finally {
      setActionId("");
    }
  };

  /* ---------- edit estimated / idle ---------- */
  const startEdit = (item, field) =>
    setEditing({
      id: item._id,
      field,
      value: String(field === "estimatedTime" ? item.estimatedTime ?? "" : item.idleTime ?? 0),
    });

  const saveEdit = async (item) => {
    const { field, value } = editing;
    const minutes = Number(value);
    const isEstimated = field === "estimatedTime";

    if (
      !value.trim() ||
      !Number.isInteger(minutes) ||
      (isEstimated ? minutes <= 0 : minutes < 0)
    ) {
      toast.error(
        isEstimated
          ? "Estimated time must be a positive whole number."
          : "Idle time must be a non-negative whole number."
      );
      return;
    }

    setSavingEdit(true);
    try {
      await api.patch(`/timesheets/${item._id}/edit`, { field, value: minutes });
      toast.success(
        isEstimated ? "Estimated time updated successfully." : "Idle time updated successfully."
      );
      setEditing(null);
      await loadData();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          (isEstimated ? "Failed to update estimated time." : "Failed to update idle time.")
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const latestTimesheet = useMemo(() => {
  if (!timesheets.length) return null;

  return [...timesheets].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )[0];
}, [timesheets]);

const displayedInlineRows = useMemo(() => {
  if (inlineRows.length > 0) {
    return inlineRows;
  }

  if (
    latestTimesheet?.taskStatus === "Completed" &&
    !hideAutoInlineRow
  ) {
    return [
      {
        id: "auto-inline-row",
        form: { ...blankInline },
        dateTime: new Date().toLocaleString("en-IN", {
          timeZone: IST,
        }),
      },
    ];
  }

  return [];
}, [inlineRows, latestTimesheet, hideAutoInlineRow]);

  /* ---------- derived ---------- */
  const filteredTimesheets = useMemo(() => {
  return timesheets.filter((item) => {
    if (!dateFrom && !dateTo) return true;

    if (!item.date) return false;

    const itemDate = new Date(item.date);

    if (Number.isNaN(itemDate.getTime())) return false;

    const recordDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: IST,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(itemDate);

    if (dateFrom && recordDate < dateFrom) return false;
    if (dateTo && recordDate > dateTo) return false;

    return true;
  });
}, [timesheets, dateFrom, dateTo]);

  const stats = useMemo(
    () => ({
      total: timesheets.length,
      pending: timesheets.filter((i) => (i.approvalStatus || "Pending") === "Pending").length,
      approved: timesheets.filter((i) => i.approvalStatus === "Approved").length,
      rejected: timesheets.filter((i) => i.approvalStatus === "Rejected").length,
    }),
    [timesheets]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600">
        <RefreshCw className="animate-spin text-sky-600" />
        Loading your timesheets...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-sky-50 p-4 sm:p-6 lg:p-8">
      <style>{`
        @keyframes tsShimmer { 0% { transform: translateX(-130%) skewX(-20deg); } 100% { transform: translateX(260%) skewX(-20deg); } }
        @keyframes tsGoldFlow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @media (prefers-reduced-motion: reduce) { .ts-anim { animation: none !important; } }
      `}</style>

      <motion.div
        className="mx-auto max-w-7xl space-y-6"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* ================= HERO ================= */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b2f45] via-[#14506f] to-[#348aaf] p-6 text-white shadow-[0_20px_50px_-15px_rgba(11,47,69,0.6)] sm:p-8">
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-200">
                Employee Workspace
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                My Timesheets
              </h1>
              <p className="mt-2 max-w-md text-sm text-sky-100">
                Create tasks and track your working time.
              </p>
            </div>
          </div>

          <div
            className="ts-anim absolute inset-x-0 bottom-0 h-1 bg-[length:200%_100%] [animation:tsGoldFlow_4s_linear_infinite]"
            style={{
              backgroundImage:
                "linear-gradient(90deg,#b45309,#fde68a,#f59e0b,#fef3c7,#b45309)",
            }}
          />
        </header>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= TABLE ================= */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,42,67,0.35)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-white to-sky-50/60 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#0b2f45]">My Timesheet Records</h2>
              <p className="text-sm text-slate-600">{filteredTimesheets.length} record(s)</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
      From Date
    </label>
    <div className="relative">
      <input
        type="date"
        value={dateFrom}
        max={dateTo || undefined}
        onChange={(e) => setDateFrom(e.target.value)}
        className={`${inputCls} w-full sm:w-48`}
      />
    </div>
  </div>

  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
      To Date
    </label>
    <div className="relative">
      <input
        type="date"
        value={dateTo}
        min={dateFrom || undefined}
        onChange={(e) => setDateTo(e.target.value)}
        className={`${inputCls} w-full sm:w-48`}
      />
    </div>
  </div>
</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[2400px] text-left text-sm text-slate-800">
              <thead className="bg-gradient-to-r from-[#0b2f45] to-[#14506f] text-xs uppercase tracking-wide text-white">
                <tr>
                  {headings.map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-4 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredTimesheets.length === 0 &&
  displayedInlineRows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-20 text-center text-slate-600">
                      No timesheets found.
                    </td>
                  </tr>
                )}

                <AnimatePresence initial={false}>
                  {filteredTimesheets.map((item, index) => {
                    const locked = item.approvalStatus === "Approved";
                    const project = typeof item.projectId === "object" ? item.projectId?.projectName : "—";
                    const activeBreak =
                      item.taskStatus === "On Break" && item.breakTime && !item.breakTime.endTime;
                    const isBusy = (action) => actionId === `${item._id}-${action}`;
                    const isEditing = (field) =>
                      editing?.id === item._id && editing?.field === field;

                    return (
                      <motion.tr
                        key={item._id}
                        layout="position"
                        initial={reduce ? false : { opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.04 }}
                        className={`align-top transition-colors ${getApprovalRowClass(item)}`}
                      >
                        <td className={`whitespace-nowrap px-4 py-4 font-medium ${getAccent(item)}`}>
                          {formatDateTime(item.date)}
                        </td>
                        <td className="px-4 py-4">{item.taskType}</td>
                        <td className="px-4 py-4">{project || "—"}</td>
                        <td className="px-4 py-4 font-semibold text-[#0b2f45]">{item.task || "—"}</td>
                        <td className="max-w-80 whitespace-normal px-4 py-4">{item.description || "—"}</td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <EditableMinutes
                            editing={isEditing("estimatedTime")}
                            value={editing?.value ?? ""}
                            onChange={(v) => setEditing((p) => ({ ...p, value: v }))}
                            display={formatMinutes(item.estimatedTime)}
                            min="1"
                            saving={savingEdit}
                            canEdit={!locked}
                            label="estimated time"
                            onEdit={() => startEdit(item, "estimatedTime")}
                            onSave={() => saveEdit(item)}
                            onCancel={() => setEditing(null)}
                          />
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <div>{formatTime(item.startTime)}</div>
                          {!locked && item.taskStatus === "Not Started" && !item.startTime && (
                            <ActionButton label="Start" icon={<Play size={13} />} tone="emerald" busy={isBusy("start")} onClick={() => handleTaskAction(item, "start")} />
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          {item.breakTime?.startTime ? formatTime(item.breakTime.startTime) : "—"}
                          {!locked && item.taskStatus === "In Progress" && !item.breakTime && (
                            <ActionButton label="Break" icon={<Coffee size={13} />} tone="amber" busy={isBusy("break")} onClick={() => handleTaskAction(item, "break")} />
                          )}
                          {!locked && activeBreak && (
                            <ActionButton label="Resume" icon={<RotateCcw size={13} />} tone="sky" busy={isBusy("resume")} onClick={() => handleTaskAction(item, "resume")} />
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <div>{formatTime(item.endTime)}</div>
                          {!locked && item.taskStatus === "In Progress" && !item.endTime && (
                            <ActionButton label="End" icon={<Square size={13} />} tone="rose" busy={isBusy("end")} onClick={() => handleTaskAction(item, "end")} />
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 font-medium">
                          {formatMinutes(item.totalCompletionTime)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <EditableMinutes
                            editing={isEditing("idleTime")}
                            value={editing?.value ?? ""}
                            onChange={(v) => setEditing((p) => ({ ...p, value: v }))}
                            display={formatMinutes(item.idleTime)}
                            min="0"
                            saving={savingEdit}
                            canEdit={!locked}
                            label="idle time"
                            onEdit={() => startEdit(item, "idleTime")}
                            onSave={() => saveEdit(item)}
                            onCancel={() => setEditing(null)}
                          />
                        </td>

                        <td className="px-4 py-4 font-semibold">
                          {item.efficiency == null ? "—" : `${item.efficiency}%`}
                        </td>

                        <td className="px-4 py-4">
                          <Chip className={getTaskStatusClass(item.taskStatus)}>
                            {item.taskStatus || "Not Started"}
                          </Chip>
                        </td>
                      </motion.tr>
                    );
                  })}
                  {displayedInlineRows.map((row, rowIndex) => {
  const isAutoRow = row.id === "auto-inline-row";
  const isSaving = savingRowId === row.id;

  return (
    <motion.tr
      key={row.id}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-r from-sky-50 to-amber-50"
    >
{/* Date */}
<td className="whitespace-nowrap px-4 py-3 shadow-[inset_4px_0_0_0_#f59e0b]">
  <div className="text-sm font-semibold text-slate-800">
    {row.dateTime}
  </div>

  <div className="text-xs font-medium text-sky-700">
    New Entry
  </div>

  <motion.button
    type="button"
    whileHover={{ y: -1 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => addInlineRow(row)}
    disabled={isSaving}
    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-700 to-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-sky-800 hover:to-sky-600 disabled:opacity-50"
  >
    <Plus size={14} />
    Add
  </motion.button>
</td>

      {/* Task Type */}
      <td className="px-4 py-3">
        <select
          value={row.form.taskType}
          onChange={(e) =>
            updateInlineRow(row.id, "taskType", e.target.value)
          }
          className={`${inputCls} w-full min-w-[160px]`}
        >
          <option value="Project">Project</option>
          <option value="Learning">Learning</option>
          <option value="Training">Training</option>
        </select>
      </td>

      {/* Project */}
      <td className="px-4 py-3">
        <select
          value={row.form.projectId}
          onChange={(e) =>
            updateInlineRow(row.id, "projectId", e.target.value)
          }
          className={`${inputCls} w-full min-w-[260px]`}
        >
          <option value="">Select Project</option>

          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.projectName || p.name}
            </option>
          ))}
        </select>
      </td>

      {/* Task */}
      <td className="px-4 py-3">
        <select
          value={row.form.task}
          onChange={(e) =>
            updateInlineRow(row.id, "task", e.target.value)
          }
          className={`${inputCls} w-full min-w-[180px]`}
        >
          {[
            "Testing",
            "Development",
            "Learning",
            "Graphics",
            "Management",
            "Meeting",
          ].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>

      {/* Description */}
<td className="px-4 py-3">
  <input
    type="text"
    value={row.form.description}
    onChange={(e) =>
      updateInlineRow(row.id, "description", e.target.value)
    }
    placeholder="Enter description"
    className={`${inputCls} w-full min-w-[300px]`}
  />
</td>

      {/* Estimated Time */}
<td className="px-4 py-3">
  <input
    type="number"
    min="0"
    step="1"
    value={row.form.estimatedTime}
    onChange={(e) =>
      updateInlineRow(row.id, "estimatedTime", e.target.value)
    }
    placeholder="Minutes"
    className={`${inputCls} w-full min-w-[120px]`}
  />
</td>

{/* Remaining Columns */}
<td colSpan={7} className="px-4 py-3">
  <div className="flex flex-wrap items-center gap-2">
    {isSaving && (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">
        <RefreshCw size={15} className="animate-spin" />
        Saving automatically...
      </span>
    )}

{/* Delete */}
<motion.button
  type="button"
  whileHover={{ y: -1 }}
  whileTap={{ scale: 0.95 }}
  onClick={() => removeInlineRow(row.id)}
  disabled={isSaving}
  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
>
  <Trash2 size={15} />
  Delete
</motion.button>
  </div>
</td>
    </motion.tr>
  );
})}
                </AnimatePresence>
                {displayedInlineRows.length === 0 && (
  <tr>
    <td colSpan={13} className="px-4 py-4">
      <div className="flex justify-start">
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => addInlineRow()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-700 to-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:from-sky-800 hover:to-sky-600"
        >
          <Plus size={17} />
          Add Timesheet
        </motion.button>
      </div>
    </td>
  </tr>
)}
              </tbody>
            </table>
          </div>
        </section>
      </motion.div>
    </div>
  );
}

/* =========================================================
   Small components
   ========================================================= */

// GSAP count-up
function CountUp({ value }) {
  const ref = useRef(null);
  useEffect(() => {
    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: value,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        if (ref.current) ref.current.textContent = Math.round(obj.v);
      },
    });
    return () => tween.kill();
  }, [value]);
  return <span ref={ref}>0</span>;
}

function StatCard({ label, value, icon, tone, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_-12px_rgba(15,42,67,0.3)]"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className={`rounded-lg p-2 ${tone}`}>{icon}</span>
      </div>
      <p className="mt-3 font-serif text-3xl font-bold text-[#0b2f45]">
        <CountUp value={value} />
      </p>
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
    </motion.div>
  );
}

function Chip({ className, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function EditableMinutes({
  editing, value, onChange, display, min, saving, canEdit, label, onEdit, onSave, onCancel,
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={saving}
          autoFocus
          className={`${inputCls} w-20 !px-2 !py-1.5`}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onSave}
          disabled={saving}
          title={`Save ${label}`}
          className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Check size={16} />}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onCancel}
          disabled={saving}
          title="Cancel editing"
          className="rounded-lg bg-rose-100 p-1.5 text-rose-700 hover:bg-rose-200 disabled:opacity-50"
        >
          <X size={16} />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-slate-800">{display}</span>
      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          title={`Edit ${label}`}
          className="rounded-md p-1.5 text-slate-500 transition hover:bg-sky-100 hover:text-sky-700"
        >
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
}

const toneMap = {
  emerald: "bg-emerald-600 text-white hover:bg-emerald-700",
  amber: "bg-amber-500 text-[#0b2f45] hover:bg-amber-400",
  sky: "bg-sky-700 text-white hover:bg-sky-800",
  rose: "bg-rose-600 text-white hover:bg-rose-700",
};

function ActionButton({ label, icon, busy, onClick, tone = "sky" }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      disabled={busy}
      className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm disabled:opacity-60 ${toneMap[tone]}`}
    >
      {busy ? <RefreshCw size={13} className="animate-spin" /> : icon}
      {busy ? "Saving" : label}
    </motion.button>
  );
}