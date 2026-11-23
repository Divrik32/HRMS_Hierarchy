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
  estimatedHours: "",
  estimatedMinutes: "",
  idleHours: "0",
  idleMinutes: "0",
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
  const [rejectedDateFrom, setRejectedDateFrom] = useState(getTodayIST);
  const [rejectedDateTo, setRejectedDateTo] = useState(getTodayIST);
  // one inline editor at a time: { id, field, value }
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [rejectedEditingId, setRejectedEditingId] = useState("");
  const [rejectedDrafts, setRejectedDrafts] = useState({});
  const [rejectionComments, setRejectionComments] = useState({});
  const [rejectionSubmittingId, setRejectionSubmittingId] = useState("");
  
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

const updateInlineEstimatedTime = (rowId, key, value, row) => {
  const hours =
    key === "estimatedHours" ? value : row.form.estimatedHours;

  const minutes =
    key === "estimatedMinutes" ? value : row.form.estimatedMinutes;

  const estimatedTime =
    hours !== "" && minutes !== ""
      ? String(Number(hours) * 60 + Number(minutes))
      : "";

  setInlineRows((prev) => {
    const updatedForm = {
      ...row.form,
      [key]: value,
      estimatedTime,
    };

    if (rowId === "auto-inline-row") {
      setHideAutoInlineRow(true);

      return [
        {
          id: `converted-${Date.now()}`,
          form: updatedForm,
          dateTime: new Date().toLocaleString("en-IN", {
            timeZone: IST,
          }),
        },
      ];
    }

    return prev.map((item) =>
      item.id === rowId
        ? { ...item, form: updatedForm }
        : item
    );
  });
};

const updateInlineIdleTime = (rowId, key, value, row) => {
  setInlineRows((prev) => {
    const updatedForm = {
      ...row.form,
      [key]: value,
    };

    if (rowId === "auto-inline-row") {
      setHideAutoInlineRow(true);

      return [
        {
          id: `converted-${Date.now()}`,
          form: updatedForm,
          dateTime: new Date().toLocaleString("en-IN", {
            timeZone: IST,
          }),
        },
      ];
    }

    return prev.map((item) =>
      item.id === rowId
        ? { ...item, form: updatedForm }
        : item
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
  const idleTime = Number(form.idleHours || 0) * 60 + Number(form.idleMinutes || 0);
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

const handleInlineEnter = (e, row) => {
  if (e.key !== "Enter") return;

  e.preventDefault();

  const { form } = row;

  // পাঁচটি ফিল্ড পূর্ণ না হলে নীরবে return করবে
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

  handleInlineSave(row);
};

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
const startEdit = (item, field) => {
  const totalMinutes = Number(
    field === "estimatedTime"
      ? item.estimatedTime ?? 0
      : item.idleTime ?? 0
  );

  setEditing({
    id: item._id,
    field,
    hours: String(Math.floor(totalMinutes / 60)),
    minutes: String(totalMinutes % 60),
  });
};

const saveEdit = async (item) => {
  const { field, hours, minutes } = editing;

  const isEstimated = field === "estimatedTime";

  if (
    hours === "" ||
    minutes === "" ||
    !Number.isInteger(Number(hours)) ||
    Number(hours) < 0 ||
    Number(hours) > 12 ||
    !Number.isInteger(Number(minutes)) ||
    Number(minutes) < 0 ||
    Number(minutes) > 59
  ) {
    toast.error(`Please select valid ${isEstimated ? "Estimated" : "Idle"} Time.`);
    return;
  }

  const totalMinutes =
    Number(hours) * 60 + Number(minutes);

  if (isEstimated && totalMinutes <= 0) {
    toast.error("Estimated time must be greater than zero.");
    return;
  }

  setSavingEdit(true);

  try {
    await api.patch(`/timesheets/${item._id}/edit`, {
      field,
      value: totalMinutes,
    });

    toast.success(
      isEstimated
        ? "Estimated time updated successfully."
        : "Idle time updated successfully."
    );

    setEditing(null);
    await loadData();
  } catch (err) {
    toast.error(
      err.response?.data?.message ||
        (isEstimated
          ? "Failed to update estimated time."
          : "Failed to update idle time.")
    );
  } finally {
    setSavingEdit(false);
  }
};

  /* ---------- Rejected Timesheet Actions ---------- */

const startRejectedUpdate = (item) => {
  const estimatedMinutes = Number(item.estimatedTime || 0);
  const idleMinutes = Number(item.idleTime || 0);

  setRejectedDrafts((prev) => ({
    ...prev,
    [item._id]: {
      estimatedTime: String(item.estimatedTime ?? ""),
      estimatedHours: String(Math.floor(estimatedMinutes / 60)),
      estimatedMinutes: String(estimatedMinutes % 60),

      idleTime: String(item.idleTime ?? 0),
      idleHours: String(Math.floor(idleMinutes / 60)),
      idleMinutes: String(idleMinutes % 60),

      description: item.description || "",
    },
  }));

  setRejectedEditingId(item._id);
};

const handleRejectedAccept = async (item) => {
  const draft = rejectedDrafts[item._id];

  if (!draft || rejectedEditingId !== item._id) {
    toast.error("Please click Update and change a field first.");
    return;
  }

if (
  draft.estimatedHours === "" ||
  draft.estimatedMinutes === "" ||
  !Number.isInteger(Number(draft.estimatedHours)) ||
  Number(draft.estimatedHours) < 0 ||
  Number(draft.estimatedHours) > 12 ||
  !Number.isInteger(Number(draft.estimatedMinutes)) ||
  Number(draft.estimatedMinutes) < 0 ||
  Number(draft.estimatedMinutes) > 59
) {
  toast.error("Please select valid Estimated Time.");
  return;
}

  const newEstimatedTime =
    Number(draft.estimatedHours) * 60 +
    Number(draft.estimatedMinutes);

if (
  draft.idleHours === "" ||
  draft.idleMinutes === "" ||
  !Number.isInteger(Number(draft.idleHours)) ||
  Number(draft.idleHours) < 0 ||
  Number(draft.idleHours) > 12 ||
  !Number.isInteger(Number(draft.idleMinutes)) ||
  Number(draft.idleMinutes) < 0 ||
  Number(draft.idleMinutes) > 59
) {
  toast.error("Please select valid Idle Time.");
  return;
}

const newIdleTime =
  Number(draft.idleHours) * 60 +
  Number(draft.idleMinutes);

  const changes = [];

  if (newEstimatedTime !== Number(item.estimatedTime ?? 0)) {
    changes.push({
      field: "estimatedTime",
      value: newEstimatedTime,
    });
  }

  if (newIdleTime !== Number(item.idleTime ?? 0)) {
    changes.push({
      field: "idleTime",
      value: newIdleTime,
    });
  }

  if (draft.description.trim() !== (item.description || "")) {
    changes.push({
      field: "description",
      value: draft.description.trim(),
    });
  }

  if (changes.length === 0) {
    toast.error("Please change at least one field before accepting.");
    return;
  }

  setRejectionSubmittingId(item._id);

  try {
    // Description update
    const descriptionChange = changes.find(
      (change) => change.field === "description"
    );

    if (descriptionChange) {
      await api.patch(`/timesheets/${item._id}/edit`, descriptionChange);
    }

    // Numeric field updates
    const numericChanges = changes.filter(
      (change) => change.field !== "description"
    );

    for (const change of numericChanges.slice(0, -1)) {
      await api.patch(`/timesheets/${item._id}/edit`, change);
    }

    if (numericChanges.length > 0) {
      const finalChange = numericChanges[numericChanges.length - 1];

      await api.patch(
        `/timesheets/${item._id}/respond-to-rejection`,
        {
          response: "Accepted",
          field: finalChange.field,
          value: finalChange.value,
        }
      );
    } else {
      await api.patch(
        `/timesheets/${item._id}/respond-to-rejection`,
        { response: "Accepted" }
      );
    }

    toast.success("Timesheet updated and resubmitted successfully.");

    setRejectedEditingId("");

    setRejectedDrafts((prev) => {
      const updated = { ...prev };
      delete updated[item._id];
      return updated;
    });

    await loadData();
  } catch (err) {
    toast.error(
      err.response?.data?.message ||
        "Failed to update and resubmit timesheet."
    );
  } finally {
    setRejectionSubmittingId("");
  }
};

  const handleRejectedComment = async (item) => {
    const reason = (rejectionComments[item._id] || "").trim();

    if (!reason) {
      toast.error("Please enter your comment.");
      return;
    }

    setRejectionSubmittingId(item._id);

    try {
      await api.patch(
        `/timesheets/${item._id}/respond-to-rejection`,
        {
          response: "Disagreed",
          reason,
        }
      );

      toast.success("Your comment has been submitted successfully.");

      setRejectionComments((prev) => ({
        ...prev,
        [item._id]: "",
      }));

      await loadData();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Failed to submit your comment."
      );
    } finally {
      setRejectionSubmittingId("");
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
  return timesheets
    .filter((item) => {
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
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}, [timesheets, dateFrom, dateTo]);

const rejectedTimesheets = useMemo(() => {
  return timesheets
    .filter((item) => {
      if (item.approvalStatus !== "Rejected") return false;
      if (!rejectedDateFrom && !rejectedDateTo) return true;
      if (!item.date) return false;

      const itemDate = new Date(item.date);

      if (Number.isNaN(itemDate.getTime())) return false;

      const recordDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: IST,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(itemDate);

      if (rejectedDateFrom && recordDate < rejectedDateFrom) return false;
      if (rejectedDateTo && recordDate > rejectedDateTo) return false;

      return true;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}, [timesheets, rejectedDateFrom, rejectedDateTo]);

const visibleTimesheets = useMemo(
  () =>
    filteredTimesheets.filter(
      (item) => item.approvalStatus !== "Rejected"
    ),
  [filteredTimesheets]
);

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
              <p className="text-sm text-slate-600">{visibleTimesheets.length} record(s)</p>
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

          <div className="max-h-[600px] overflow-auto">
  <table className="w-full min-w-[2400px] text-left text-sm text-slate-800">
              <thead className="sticky top-0 z-20 bg-gradient-to-r from-[#0b2f45] to-[#14506f] text-xs uppercase tracking-wide text-white">
                <tr>
                  {headings.map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-4 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {visibleTimesheets.length === 0 &&
  displayedInlineRows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-20 text-center text-slate-600">
                      No timesheets found.
                    </td>
                  </tr>
                )}

                <AnimatePresence initial={false}>
                  {visibleTimesheets.map((item, index) => {
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
  value={editing || {}}
  onChange={(key, value) =>
    setEditing((prev) => ({ ...prev, [key]: value }))
  }
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
  value={editing || {}}
  onChange={(key, value) =>
    setEditing((prev) => ({ ...prev, [key]: value }))
  }
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
    onKeyDown={(e) => handleInlineEnter(e, row)}
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
    onKeyDown={(e) => handleInlineEnter(e, row)}
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
    onKeyDown={(e) => handleInlineEnter(e, row)}
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
    onKeyDown={(e) => handleInlineEnter(e, row)}
    placeholder="Enter description"
    className={`${inputCls} w-full min-w-[300px]`}
  />
</td>

{/* Estimated Time */}
<td className="px-4 py-3">
  <div className="flex min-w-[220px] items-center gap-2">
    <select
      value={row.form.estimatedHours}
      onChange={(e) =>
  updateInlineEstimatedTime(
    row.id,
    "estimatedHours",
    e.target.value,
    row
  )
}
      onKeyDown={(e) => handleInlineEnter(e, row)}
      className={`${inputCls} w-full`}
    >
<option value="">Hour</option>
{Array.from({ length: 13 }, (_, i) => i).map((hour) => (
  <option key={hour} value={hour}>
    {hour} hr
  </option>
))}
    </select>

    <select
      value={row.form.estimatedMinutes}
      onChange={(e) =>
  updateInlineEstimatedTime(
    row.id,
    "estimatedMinutes",
    e.target.value,
    row
  )
}
      onKeyDown={(e) => handleInlineEnter(e, row)}
      className={`${inputCls} w-full`}
    >
      <option value="">Minute</option>
{Array.from({ length: 60 }, (_, i) => i).map((minute) => (
  <option key={minute} value={minute}>
    {minute} min
  </option>
))}
    </select>
  </div>
</td>


{/* Start, Break, End, Working Time */}
<td colSpan={4} className="px-4 py-3">
  <div className="flex flex-wrap items-center gap-2">
    {isSaving && (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">
        <RefreshCw size={15} className="animate-spin" />
        Saving...
      </span>
    )}

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

{/* Idle Time */}
<td className="px-4 py-3">
  <div className="flex min-w-[220px] items-center gap-2">
    <select
      value={row.form.idleHours}
      disabled={isSaving}
      onChange={(e) =>
        updateInlineIdleTime(row.id, "idleHours", e.target.value, row)
      }
      onKeyDown={(e) => handleInlineEnter(e, row)}
      className={`${inputCls} w-full`}
    >
      {Array.from({ length: 13 }, (_, i) => i).map((hour) => (
        <option key={hour} value={hour}>
          {hour} hr
        </option>
      ))}
    </select>

    <select
      value={row.form.idleMinutes}
      disabled={isSaving}
      onChange={(e) =>
        updateInlineIdleTime(row.id, "idleMinutes", e.target.value, row)
      }
      onKeyDown={(e) => handleInlineEnter(e, row)}
      className={`${inputCls} w-full`}
    >
      {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
        <option key={minute} value={minute}>
          {minute} min
        </option>
      ))}
    </select>
  </div>
</td>

{/* Efficiency and Task Status */}
<td colSpan={2} className="px-4 py-3" />

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

{/* ================= REJECTED RECORDS ================= */}

<section className="overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-[0_20px_50px_-20px_rgba(127,29,29,0.2)]">

  <div className="border-b border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-serif text-xl font-bold text-rose-900">
          Rejected Records
        </h2>
        <p className="text-sm text-rose-700">
          {rejectedTimesheets.length} rejected record(s)
        </p>
      </div>

<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-wide text-rose-700">
      From Date
    </label>

    <input
      type="date"
      value={rejectedDateFrom}
      max={rejectedDateTo || undefined}
      onChange={(e) => setRejectedDateFrom(e.target.value)}
      className={`${inputCls} w-full sm:w-44`}
    />
  </div>

  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-wide text-rose-700">
      To Date
    </label>

    <input
      type="date"
      value={rejectedDateTo}
      min={rejectedDateFrom || undefined}
      onChange={(e) => setRejectedDateTo(e.target.value)}
      className={`${inputCls} w-full sm:w-44`}
    />
  </div>
</div>
    </div>
  </div>

  {rejectedTimesheets.length === 0 ? (
    <div className="py-16 text-center text-sm text-slate-500">
      No rejected timesheets found for the selected date range.
    </div>
  ) : (
    <div className="max-h-[600px] overflow-auto">
  <table className="w-full min-w-[3000px] text-left text-sm text-slate-800">

        <thead className="sticky top-0 z-20 bg-gradient-to-r from-rose-900 to-rose-700 text-xs uppercase tracking-wide text-white">
          <tr>
            {[
              ...headings,
              "Rejection Reason",
              "Action",
              "Comment",
            ].map((heading) => (
              <th
                key={heading}
                className="whitespace-nowrap px-4 py-4 font-semibold"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-rose-100">

          {rejectedTimesheets.map((item) => {
            const isEditingRejected = rejectedEditingId === item._id;
            const isSubmitting = rejectionSubmittingId === item._id;

            const draft = rejectedDrafts[item._id] || {
              estimatedTime: String(item.estimatedTime ?? ""),
              idleTime: String(item.idleTime ?? 0),
            };

            const rejectionHistory = item.rejectionHistory || [];

            const latestRejection =
              rejectionHistory.length > 0
                ? rejectionHistory[rejectionHistory.length - 1]
                : null;

            const latestReason =
              latestRejection?.reason ||
              item.rejectionReason ||
              "No rejection reason available.";

            const project =
              typeof item.projectId === "object"
                ? item.projectId?.projectName
                : "—";

            return (
              <motion.tr
                key={item._id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="align-top bg-rose-50/60 transition-colors hover:bg-rose-100/70"
              >

                {/* Date */}
                <td className="whitespace-nowrap px-4 py-4 font-medium">
                  {formatDateTime(item.date)}
                </td>

                {/* Task Type */}
                <td className="whitespace-nowrap px-4 py-4">
                  {item.taskType || "—"}
                </td>

                {/* Project */}
                <td className="whitespace-nowrap px-4 py-4">
                  {project || "—"}
                </td>

                {/* Task */}
                <td className="whitespace-nowrap px-4 py-4 font-semibold text-[#0b2f45]">
                  {item.task || "—"}
                </td>

                {/* Description */}
                <td className="min-w-[300px] whitespace-normal px-4 py-4">
  {isEditingRejected ? (
    <textarea
      rows={3}
      value={draft.description}
      disabled={isSubmitting}
      onChange={(e) =>
        setRejectedDrafts((prev) => ({
          ...prev,
          [item._id]: {
            ...draft,
            description: e.target.value,
          },
        }))
      }
      className={`${inputCls} w-full`}
      placeholder="Update description..."
    />
  ) : (
    <p className="whitespace-pre-wrap">
      {item.description || "—"}
    </p>
  )}
</td>

                {/* Estimated Time */}
                <td className="whitespace-nowrap px-4 py-4">
{isEditingRejected ? (
  <div className="flex min-w-[220px] items-center gap-2">
    <select
      value={draft.estimatedHours}
      disabled={isSubmitting}
      onChange={(e) =>
        setRejectedDrafts((prev) => ({
          ...prev,
          [item._id]: {
            ...draft,
            estimatedHours: e.target.value,
          },
        }))
      }
      className={`${inputCls} w-full`}
    >
{Array.from({ length: 13 }, (_, i) => i).map((hour) => (
  <option key={hour} value={hour}>
    {hour} hr
  </option>
))}
    </select>

    <select
      value={draft.estimatedMinutes}
      disabled={isSubmitting}
      onChange={(e) =>
        setRejectedDrafts((prev) => ({
          ...prev,
          [item._id]: {
            ...draft,
            estimatedMinutes: e.target.value,
          },
        }))
      }
      className={`${inputCls} w-full`}
    >
      {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
  <option key={minute} value={minute}>
    {minute} min
  </option>
))}
    </select>
  </div>
) : (
  <span className="font-semibold">
    {formatMinutes(item.estimatedTime)}
  </span>
)}
                </td>

                {/* Start */}
                <td className="whitespace-nowrap px-4 py-4">
                  {formatTime(item.startTime)}
                </td>

                {/* Break */}
                <td className="whitespace-nowrap px-4 py-4">
                  {item.breakTime?.startTime
                    ? formatTime(item.breakTime.startTime)
                    : "—"}
                </td>

                {/* End */}
                <td className="whitespace-nowrap px-4 py-4">
                  {formatTime(item.endTime)}
                </td>

                {/* Working Time */}
                <td className="whitespace-nowrap px-4 py-4 font-medium">
                  {formatMinutes(item.totalCompletionTime)}
                </td>

                {/* Idle Time */}
<td className="whitespace-nowrap px-4 py-4">
  {isEditingRejected ? (
    <div className="flex min-w-[220px] items-center gap-2">
      <select
        value={draft.idleHours}
        disabled={isSubmitting}
        onChange={(e) =>
          setRejectedDrafts((prev) => ({
            ...prev,
            [item._id]: {
              ...draft,
              idleHours: e.target.value,
            },
          }))
        }
        className={`${inputCls} w-full`}
      >
        {Array.from({ length: 13 }, (_, i) => i).map((hour) => (
          <option key={hour} value={hour}>
            {hour} hr
          </option>
        ))}
      </select>

      <select
        value={draft.idleMinutes}
        disabled={isSubmitting}
        onChange={(e) =>
          setRejectedDrafts((prev) => ({
            ...prev,
            [item._id]: {
              ...draft,
              idleMinutes: e.target.value,
            },
          }))
        }
        className={`${inputCls} w-full`}
      >
        {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
          <option key={minute} value={minute}>
            {minute} min
          </option>
        ))}
      </select>
    </div>
  ) : (
    <span className="font-semibold">
      {formatMinutes(item.idleTime)}
    </span>
  )}
</td>

                {/* Efficiency */}
                <td className="whitespace-nowrap px-4 py-4 font-semibold">
                  {item.efficiency == null
                    ? "—"
                    : `${item.efficiency}%`}
                </td>

                {/* Task Status */}
                <td className="whitespace-nowrap px-4 py-4">
                  <Chip className={getStatusClass("Rejected")}>
                    Rejected
                  </Chip>
                </td>

                {/* Latest Rejection Reason */}
                <td className="min-w-[280px] whitespace-normal px-4 py-4">
                  <div className="rounded-lg border border-rose-200 bg-white p-3">
                    <p className="whitespace-pre-wrap text-sm text-rose-900">
                      {latestReason}
                    </p>

                    {latestRejection?.rejectedAt && (
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDateTime(latestRejection.rejectedAt)}
                      </p>
                    )}
                  </div>
                </td>

                {/* Action */}
                <td className="whitespace-nowrap px-4 py-4">
                  <div className="flex items-center gap-2">

                    <button
                      type="button"
                      onClick={() => handleRejectedAccept(item)}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingRejected) {
                          setRejectedEditingId("");
                        } else {
                          startRejectedUpdate(item);
                        }
                      }}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isEditingRejected ? (
                        <X size={13} />
                      ) : (
                        <Pencil size={13} />
                      )}
                      {isEditingRejected ? "Cancel" : "Update"}
                    </button>

                  </div>

                  {isEditingRejected && (
                    <p className="mt-2 max-w-[190px] whitespace-normal text-xs text-slate-500">
                      Update Estimated Time, Idle Time or Description, then click Accept.
                    </p>
                  )}
                </td>

                {/* Comment */}
                <td className="min-w-[280px] px-4 py-4">
                  <input
                    type="text"
                    value={rejectionComments[item._id] || ""}
                    disabled={isSubmitting}
                    onChange={(e) =>
                      setRejectionComments((prev) => ({
                        ...prev,
                        [item._id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleRejectedComment(item);
                      }
                    }}
                    placeholder="Write your disagreement..."
                    className={`${inputCls} w-full`}
                  />

                  <p className="mt-1.5 text-xs text-slate-500">
                    Press Enter to submit your comment.
                  </p>

                  {isSubmitting && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-rose-700">
                      <RefreshCw size={12} className="animate-spin" />
                      Submitting...
                    </span>
                  )}
                </td>

              </motion.tr>
            );
          })}

        </tbody>
      </table>
    </div>
  )}

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
  editing,
  value,
  onChange,
  display,
  min,
  saving,
  canEdit,
  label,
  onEdit,
  onSave,
  onCancel,
}) {
  if (editing) {
    return (
      <div className="flex min-w-[220px] items-center gap-2">
        <select
          value={value.hours ?? ""}
          onChange={(e) => onChange("hours", e.target.value)}
          disabled={saving}
          autoFocus
          className={`${inputCls} w-full`}
        >
          {Array.from({ length: 13 }, (_, i) => i).map((hour) => (
            <option key={hour} value={hour}>
              {hour} hr
            </option>
          ))}
        </select>

        <select
          value={value.minutes ?? ""}
          onChange={(e) => onChange("minutes", e.target.value)}
          disabled={saving}
          className={`${inputCls} w-full`}
        >
          {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
            <option key={minute} value={minute}>
              {minute} min
            </option>
          ))}
        </select>

        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onSave}
          disabled={saving}
          title={`Save ${label}`}
          className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
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