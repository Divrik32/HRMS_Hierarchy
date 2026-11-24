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
import * as XLSX from "xlsx-js-style";
import { FileSpreadsheet, Eye } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import {
  addTimesheetDraft,
  updateTimesheetDraft,
  removeTimesheetDraft,
  removeSavedTimesheetDrafts,
  selectTimesheetDrafts,
  selectCompletedTimesheetDrafts,
  addInlineRowDraft,
  updateInlineRowDraft,
  removeInlineRowDraft,
  selectInlineRows,
} from "../../redux/slices/timesheetSlice";

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
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
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
const getProjectName = (projectId, projects = [], fallbackName = "") => {
  // MongoDB populated project
  if (projectId && typeof projectId === "object") {
    return (
      projectId.projectName ||
      projectId.name ||
      fallbackName ||
      "—"
    );
  }

  // Redux draft / MongoDB unpopulated project ID
  const project = projects.find(
    (p) => String(p._id) === String(projectId)
  );

  return (
    project?.projectName ||
    project?.name ||
    fallbackName ||
    "—"
  );
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
  "Start", "Break", "End", "Working Time", "Efficiency",
  "Task Status", "Action"
];

const filters = ["All", "Pending", "Updated Pending", "Approved", "Rejected"];

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

/* =========================================================
   Page
   ========================================================= */
export default function Timesheet() {
  const reduce = useReducedMotion();
  const dispatch = useDispatch();
  const [employeeScopeKey, setEmployeeScopeKey] = useState(null);
  const timesheetDrafts = useSelector((state) =>
    employeeScopeKey
      ? selectTimesheetDrafts(state, employeeScopeKey)
      : []
  );
  const completedDrafts = useSelector((state) =>
    employeeScopeKey
      ? selectCompletedTimesheetDrafts(state, employeeScopeKey)
      : []
  );
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [hideAutoInlineRow, setHideAutoInlineRow] = useState(false);
  const inlineRows = useSelector((state) =>
  employeeScopeKey
    ? selectInlineRows(state, employeeScopeKey)
    : []
);
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
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [recordsDateFrom, setRecordsDateFrom] = useState("");
  const [recordsDateTo, setRecordsDateTo] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
const [profileResponse, timesheetRes, projectRes] = await Promise.all([
  api.get("/employees/profile/me"),
  api.get("/timesheets"),
  api.get("/timesheets/projects"),
]);

const currentEmployee = profileResponse.data?.employee;

if (!currentEmployee?._id) {
  throw new Error("Employee profile not found");
}

const companyId =
  currentEmployee.companyId?._id ||
  currentEmployee.companyId;

if (!companyId) {
  throw new Error("Employee company not found");
}

const scopeKey = `${companyId}:${currentEmployee._id}`;

setEmployeeScopeKey(scopeKey);
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
  id:
    globalThis.crypto?.randomUUID?.() ||
    `inline-${Date.now()}-${Math.random()}`,
  form: { ...blankInline },
  dateTime: new Date().toLocaleString("en-IN", {
    timeZone: IST,
  }),
});

const addInlineRow = () => {
  if (!employeeScopeKey) {
    toast.error("Employee information not loaded.");
    return;
  }

  dispatch(
    addInlineRowDraft({
      scopeKey: employeeScopeKey,
      row: createInlineRow(),
    })
  );
};

const updateInlineRow = (rowId, key, value) => {
  if (!employeeScopeKey) return;

  // Auto-generated row-তে প্রথমবার কিছু লিখলে Redux-এ নিয়ে আসবে
  if (rowId === "auto-inline-row") {
    const newRow = {
      id:
        globalThis.crypto?.randomUUID?.() ||
        `inline-${Date.now()}-${Math.random()}`,
      form: {
        ...blankInline,
        [key]: value,
      },
      dateTime: new Date().toLocaleString("en-IN", {
        timeZone: IST,
      }),
    };

    dispatch(
      addInlineRowDraft({
        scopeKey: employeeScopeKey,
        row: newRow,
      })
    );

    setHideAutoInlineRow(true);
    return;
  }

  const existingRow = inlineRows.find((row) => row.id === rowId);

  if (!existingRow) return;

  dispatch(
    updateInlineRowDraft({
      scopeKey: employeeScopeKey,
      rowId,
      updates: {
        form: {
          ...existingRow.form,
          [key]: value,
        },
      },
    })
  );
};

const updateInlineEstimatedTime = (rowId, key, value, row) => {
  if (!employeeScopeKey) return;

  const hours =
    key === "estimatedHours"
      ? value
      : row.form.estimatedHours;

  const minutes =
    key === "estimatedMinutes"
      ? value
      : row.form.estimatedMinutes;

  const estimatedTime =
    hours !== "" && minutes !== ""
      ? String(Number(hours) * 60 + Number(minutes))
      : "";

  const updatedForm = {
    ...row.form,
    [key]: value,
    estimatedTime,
  };

  // Auto-generated row
  if (rowId === "auto-inline-row") {
    const newRow = {
      id:
        globalThis.crypto?.randomUUID?.() ||
        `inline-${Date.now()}-${Math.random()}`,
      form: updatedForm,
      dateTime: new Date().toLocaleString("en-IN", {
        timeZone: IST,
      }),
    };

    dispatch(
      addInlineRowDraft({
        scopeKey: employeeScopeKey,
        row: newRow,
      })
    );

    setHideAutoInlineRow(true);
    return;
  }

  dispatch(
    updateInlineRowDraft({
      scopeKey: employeeScopeKey,
      rowId,
      updates: {
        form: updatedForm,
      },
    })
  );
};

const updateInlineIdleTime = (rowId, key, value, row) => {
  if (!employeeScopeKey) return;

  const updatedForm = {
    ...row.form,
    [key]: value,
  };

  if (rowId === "auto-inline-row") {
    const newRow = {
      id:
        globalThis.crypto?.randomUUID?.() ||
        `inline-${Date.now()}-${Math.random()}`,
      form: updatedForm,
      dateTime: new Date().toLocaleString("en-IN", {
        timeZone: IST,
      }),
    };

    dispatch(
      addInlineRowDraft({
        scopeKey: employeeScopeKey,
        row: newRow,
      })
    );

    setHideAutoInlineRow(true);
    return;
  }

  dispatch(
    updateInlineRowDraft({
      scopeKey: employeeScopeKey,
      rowId,
      updates: {
        form: updatedForm,
      },
    })
  );
};

const removeInlineRow = (rowId) => {
  if (rowId === "auto-inline-row") {
    setHideAutoInlineRow(true);
    return;
  }

  if (!employeeScopeKey) return;

  dispatch(
    removeInlineRowDraft({
      scopeKey: employeeScopeKey,
      rowId,
    })
  );
};

const handleInlineSave = (form, rowId, row) => {
  if (!employeeScopeKey) {
    toast.error("Employee information not loaded.");
    return;
  }

  if (!form.taskType) {
    toast.error("Please select task type.");
    return;
  }

  if (!form.projectId) {
    toast.error("Please select project.");
    return;
  }

  if (!form.task) {
    toast.error("Please select task.");
    return;
  }

  if (!form.description?.trim()) {
    toast.error("Please enter description.");
    return;
  }

  const estimatedTime =
    Number(form.estimatedTime) ||
    Number(form.estimatedHours || 0) * 60 +
      Number(form.estimatedMinutes || 0);

  if (!estimatedTime || estimatedTime <= 0) {
    toast.error("Please enter estimated time.");
    return;
  }

  const idleTime =
    Number(form.idleHours || 0) * 60 +
    Number(form.idleMinutes || 0);

  const [companyId, employeeId] = employeeScopeKey.split(":");

  const selectedProject = projects.find(
    (project) => project._id === form.projectId
  );

  const draft = {
    clientTimesheetId:
      globalThis.crypto?.randomUUID?.() ||
      `draft-${Date.now()}-${Math.random()}`,

    companyId,
    employeeId,

    taskType: form.taskType,
    projectId: form.projectId,
    projectName:
      selectedProject?.projectName ||
      selectedProject?.name ||
      "",

    task: form.task,
    description: form.description.trim(),

    date: new Date().toISOString(),

    estimatedTime,
    idleTime,

    startTime: row?.startTime || null,
endTime: row?.endTime || null,
breakTime: row?.breakTime || null,
totalCompletionTime: row?.totalCompletionTime ?? null,
efficiency: row?.efficiency ?? null,
estimatedError: row?.estimatedError ?? null,

taskStatus: row?.taskStatus || "Not Started",
    approvalStatus: "Pending",
  };

  // Completed form-টি Timesheet draft stack-এ যাবে
  dispatch(
    addTimesheetDraft({
      scopeKey: employeeScopeKey,
      draft,
    })
  );

  // যে incomplete row থেকে draft তৈরি হয়েছে সেটি সরবে
  dispatch(
    removeInlineRowDraft({
      scopeKey: employeeScopeKey,
      rowId,
    })
  );

  toast.success("Timesheet added to stack.");
};
const handleInlineTaskAction = (row, action) => {
  if (!employeeScopeKey) return;

  let targetRow = row;

  // Auto row-তে Action click করলে সেটিকে Redux Inline Row বানাবে
  if (row.id === "auto-inline-row") {
    targetRow = createInlineRow();

    dispatch(
      addInlineRowDraft({
        scopeKey: employeeScopeKey,
        row: targetRow,
      })
    );

    setHideAutoInlineRow(true);
  }

  const now = new Date().toISOString();
  const updates = {};

  if (action === "start") {
    if (targetRow.taskStatus && targetRow.taskStatus !== "Not Started") {
      toast.error("This task cannot be started.");
      return;
    }

    if (targetRow.startTime) {
      toast.error("Task has already started.");
      return;
    }

    updates.startTime = now;
    updates.taskStatus = "In Progress";
  }

  if (action === "break") {
    if (
      targetRow.taskStatus !== "In Progress" ||
      !targetRow.startTime
    ) {
      toast.error("Start the task before taking a break.");
      return;
    }

    if (targetRow.breakTime?.startTime) {
      toast.error("Break has already been used.");
      return;
    }

    updates.breakTime = {
      startTime: now,
      endTime: null,
      duration: null,
    };

    updates.taskStatus = "On Break";
  }

  if (action === "resume") {
    if (
      targetRow.taskStatus !== "On Break" ||
      !targetRow.breakTime?.startTime ||
      targetRow.breakTime?.endTime
    ) {
      toast.error("No active break found.");
      return;
    }

    const breakStart = new Date(targetRow.breakTime.startTime);
    const breakEnd = new Date(now);

    updates.breakTime = {
      ...targetRow.breakTime,
      endTime: now,
      duration: Math.max(
        0,
        Math.round((breakEnd - breakStart) / 60000)
      ),
    };

    updates.taskStatus = "In Progress";
  }

  if (action === "end") {
    if (
      targetRow.taskStatus !== "In Progress" ||
      !targetRow.startTime ||
      targetRow.endTime
    ) {
      toast.error("Task cannot be ended.");
      return;
    }

    if (
      targetRow.breakTime?.startTime &&
      !targetRow.breakTime?.endTime
    ) {
      toast.error("Please resume your task before ending it.");
      return;
    }

    const start = new Date(targetRow.startTime);
    const end = new Date(now);

    const elapsedMinutes = Math.max(
      0,
      Math.round((end - start) / 60000)
    );

    const breakMinutes = Number(
      targetRow.breakTime?.duration || 0
    );

    const totalCompletionTime = Math.max(
      0,
      elapsedMinutes - breakMinutes
    );

    const estimatedTime = Number(
      targetRow.form?.estimatedTime || 0
    );

    const efficiency =
      totalCompletionTime > 0
        ? Number(
            (
              (estimatedTime / totalCompletionTime) *
              100
            ).toFixed(2)
          )
        : 0;

    updates.endTime = now;
    updates.totalCompletionTime = totalCompletionTime;
    updates.estimatedError = totalCompletionTime - estimatedTime;
    updates.efficiency = efficiency;
    updates.taskStatus = "Completed";
  }

  dispatch(
    updateInlineRowDraft({
      scopeKey: employeeScopeKey,
      rowId: targetRow.id,
      updates,
    })
  );

  toast.success(
    action === "start"
      ? "Task started successfully."
      : action === "break"
      ? "Break started."
      : action === "resume"
      ? "Task resumed."
      : "Task completed successfully."
  );
};

const handleTaskAction = async (item, action) => {
  const isDraft = Boolean(item.clientTimesheetId);

  const actionKey = `${item._id || item.clientTimesheetId}-${action}`;

  setActionId(actionKey);

  try {
    // =========================================
    // REDUX DRAFT: NO API CALL
    // =========================================
    if (isDraft) {
      const now = new Date().toISOString();

      const updates = {};

      if (action === "start") {
        if (item.taskStatus !== "Not Started") {
          throw new Error("This task cannot be started.");
        }

        updates.startTime = now;
        updates.taskStatus = "In Progress";
      }

      if (action === "break") {
        if (item.taskStatus !== "In Progress") {
          throw new Error("Task must be running before taking a break.");
        }

        if (item.breakTime?.startTime) {
          throw new Error("Break has already been used.");
        }

        updates.breakTime = {
          startTime: now,
          endTime: null,
          duration: null,
        };

        updates.taskStatus = "On Break";
      }

      if (action === "resume") {
        if (
          item.taskStatus !== "On Break" ||
          !item.breakTime?.startTime ||
          item.breakTime?.endTime
        ) {
          throw new Error("No active break found.");
        }

        const breakStart = new Date(item.breakTime.startTime);
        const breakEnd = new Date(now);

        updates.breakTime = {
          ...item.breakTime,
          endTime: now,
          duration: Math.max(
            0,
            Math.round((breakEnd - breakStart) / 60000)
          ),
        };

        updates.taskStatus = "In Progress";
      }

      if (action === "end") {
        if (
          item.taskStatus !== "In Progress" ||
          !item.startTime ||
          item.endTime
        ) {
          throw new Error("Task cannot be ended.");
        }

        const start = new Date(item.startTime);
        const end = new Date(now);

        if (item.breakTime?.startTime && !item.breakTime?.endTime) {
          throw new Error("Please resume your task before ending it.");
        }

        const totalCompletionTime = Math.max(
          0,
          Math.round((end - start) / 60000)
        );

        const estimatedTime = Number(item.estimatedTime || 0);

        const efficiency =
          totalCompletionTime > 0
            ? Number(
                (
                  (estimatedTime / totalCompletionTime) *
                  100
                ).toFixed(2)
              )
            : 0;

        updates.endTime = now;
        updates.totalCompletionTime = totalCompletionTime;
        updates.estimatedError = totalCompletionTime - estimatedTime;
        updates.efficiency = efficiency;
        updates.taskStatus = "Completed";
      }

      dispatch(
        updateTimesheetDraft({
          scopeKey: employeeScopeKey,
          clientTimesheetId: item.clientTimesheetId,
          updates,
        })
      );

      toast.success(
        action === "start"
          ? "Task started successfully."
          : action === "break"
          ? "Break started."
          : action === "resume"
          ? "Task resumed."
          : "Task completed successfully."
      );

      return;
    }

    // =========================================
    // SAVED MONGODB TIMESHEET: OLD API LOGIC
    // =========================================
    const endpoints = {
      start: `/timesheets/${item._id}/start`,
      end: `/timesheets/${item._id}/end`,
      break: `/timesheets/${item._id}/break/start`,
      resume: `/timesheets/${item._id}/break/resume`,
    };

    if (!item._id || !endpoints[action]) {
      throw new Error("Invalid timesheet ID or action.");
    }

    await api.patch(endpoints[action]);

    await loadData();

    toast.success("Timesheet updated successfully.");
  } catch (error) {
    console.error("Timesheet action error:", error);

    toast.error(
      error.response?.data?.message ||
        error.message ||
        "Unable to update timesheet."
    );
  } finally {
    setActionId(null);
  }
};

const handleDeleteTimesheet = async (item) => {
  const isDraft = Boolean(item.clientTimesheetId);

  const confirmed = window.confirm(
    "Are you sure you want to delete this timesheet?"
  );

  if (!confirmed) return;

  const deleteKey = item._id || item.clientTimesheetId;

  setActionId(`delete-${deleteKey}`);

  try {
    if (isDraft) {
      // Redux Draft Delete
      dispatch(
        removeTimesheetDraft({
          scopeKey: employeeScopeKey,
          clientTimesheetId: item.clientTimesheetId,
        })
      );
    } else {
      // MongoDB Saved Timesheet Delete
      await api.delete(`/timesheets/${item._id}`);

      setTimesheets((prev) =>
        prev.filter((record) => record._id !== item._id)
      );
    }

    toast.success("Timesheet deleted successfully.");
  } catch (error) {
    toast.error(
      error.response?.data?.message ||
      "Failed to delete timesheet."
    );
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
  setRejectedDrafts((prev) => ({
    ...prev,
    [item._id]: {
      estimatedTime: String(item.estimatedTime ?? ""),
      estimatedHours: String(Math.floor(estimatedMinutes / 60)),
      estimatedMinutes: String(estimatedMinutes % 60),
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

  const changes = [];

  if (newEstimatedTime !== Number(item.estimatedTime ?? 0)) {
    changes.push({
      field: "estimatedTime",
      value: newEstimatedTime,
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
  return [
    ...inlineRows,
    ...(!hideAutoInlineRow
      ? [
          {
            id: "auto-inline-row",
            form: { ...blankInline },
            dateTime: new Date().toLocaleString("en-IN", {
              timeZone: IST,
            }),
          },
        ]
      : []),
  ];
}, [inlineRows, hideAutoInlineRow]);

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

const allTimesheetRecords = useMemo(() => {
  return timesheets
    .filter((item) => {
      if (!item.date) return false;

      const itemDate = new Date(item.date);

      if (Number.isNaN(itemDate.getTime())) return false;

      const recordDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: IST,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(itemDate);

      if (recordsDateFrom && recordDate < recordsDateFrom) {
        return false;
      }

      if (recordsDateTo && recordDate > recordsDateTo) {
        return false;
      }

      return true;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}, [timesheets, recordsDateFrom, recordsDateTo]);

const exportAllTimesheetsToExcel = () => {
  if (!allTimesheetRecords.length) {
    toast.warning("No timesheet records available to export.");
    return;
  }

  const exportData = allTimesheetRecords.map((item) => {
    const project = getProjectName(
  item.projectId,
  projects,
  item.projectName
);

    return {
      Date: formatDateTime(item.date),
      "Task Type": item.taskType || "—",
      Project: project || "—",
      "Task / Module": item.task || "—",
      Description: item.description || "—",
      Estimated: formatMinutes(item.estimatedTime),
      "Start Time": formatTime(item.startTime),
      "End Time": formatTime(item.endTime),
      "Working Time": formatMinutes(item.totalCompletionTime),
      Efficiency: item.efficiency == null ? "—" : `${item.efficiency}%`,
      "Task Status": item.taskStatus || "Not Started",
      "Approval Status": item.approvalStatus || "Pending",
    };
  });

  
const worksheet = XLSX.utils.json_to_sheet(exportData);

// Header styling
const headerRange = XLSX.utils.decode_range(worksheet["!ref"]);

for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
  const cellAddress = XLSX.utils.encode_cell({
    r: 0,
    c: col,
  });

  if (worksheet[cellAddress]) {
    worksheet[cellAddress].s = {
      font: {
        bold: true,
        color: { rgb: "FFFFFF" },
      },
      fill: {
        patternType: "solid",
        fgColor: { rgb: "14506F" },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };
  }
}

// Approval status based row colors
allTimesheetRecords.forEach((item, index) => {
  const status = item.approvalStatus || "Pending";

  let backgroundColor = "FEF3C7"; // Pending - Yellow

  if (status === "Approved") {
    backgroundColor = "DCFCE7"; // Green
  } else if (status === "Rejected") {
    backgroundColor = "FEE2E2"; // Red
  }

  const excelRow = index + 1;

  for (let col = 0; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({
      r: excelRow,
      c: col,
    });

    if (worksheet[cellAddress]) {
      worksheet[cellAddress].s = {
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: backgroundColor,
          },
        },
        alignment: {
          vertical: "center",
        },
      };
    }
  }
});


  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 15 },
    { wch: 25 },
    { wch: 20 },
    { wch: 40 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Show Records"
  );

  const fileName =
    recordsDateFrom || recordsDateTo
      ? `My_Timesheets_${recordsDateFrom || "All"}_to_${recordsDateTo || "All"}.xlsx`
      : "My_All_Timesheets.xlsx";

  XLSX.writeFile(workbook, fileName);

  toast.success("Timesheet Excel exported successfully.");
};

const visibleTimesheets = useMemo(
  () =>
    filteredTimesheets.filter(
      (item) => item.approvalStatus !== "Rejected"
    ),
  [filteredTimesheets]
);
const combinedVisibleTimesheets = useMemo(() => {
  const drafts = timesheetDrafts.filter(
    (item) => item.taskStatus !== "Rejected"
  );

  return [...visibleTimesheets, ...drafts].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
}, [visibleTimesheets, timesheetDrafts]);
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
            <motion.button
  type="button"
  whileHover={{ y: -2 }}
  whileTap={{ scale: 0.96 }}
  onClick={() => setShowRecordsModal(true)}
  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 py-3 text-sm font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-white/25"
>
  <Eye size={18} />
  Show Records
</motion.button>
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
                {combinedVisibleTimesheets.length === 0 && displayedInlineRows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-20 text-center text-slate-600">
                      No timesheets found.
                    </td>
                  </tr>
                )}

                <AnimatePresence initial={false}>
                  {combinedVisibleTimesheets.map((item, index) => {
                    const locked = item.approvalStatus === "Approved";
                    const project = getProjectName(
                      item.projectId,
                      projects,
                      item.projectName
                    );
                    const activeBreak = item.taskStatus === "On Break" && item.breakTime && !item.breakTime.endTime;
                    const isBusy = (action) => actionId === `${item._id || item.clientTimesheetId}-${action}`;
                    const isEditing = (field) => editing?.id === item._id && editing?.field === field;
                    return (
                      <motion.tr
                        key={item._id || item.clientTimesheetId}
                        layout="position"
                        initial={reduce ? false : { opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.04 }}
                        className={`align-middle transition-colors ${getApprovalRowClass(item)}`}
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
                          {item.breakTime?.startTime ? formatTime(item.breakTime.startTime) : ""}
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

                        <td className="px-4 py-4 font-semibold">
                          {item.efficiency == null ? "—" : `${item.efficiency}%`}
                        </td>

                        <td className="px-4 py-4">
                          <Chip className={getTaskStatusClass(item.taskStatus)}>
                            {item.taskStatus || "Not Started"}
                          </Chip>
                        </td>
                        {/* Action */}
<td className="whitespace-nowrap px-4 py-4 align-middle">
  <button
    type="button"
    onClick={() => handleDeleteTimesheet(item)}
    disabled={actionId === `delete-${item._id || item.clientTimesheetId}`}
    className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {actionId === `delete-${item._id || item.clientTimesheetId}` ? (
      <RefreshCw size={15} className="animate-spin" />
    ) : (
      <Trash2 size={15} />
    )}
    Delete
  </button>
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

{isAutoRow && (
  <motion.button
    type="button"
    whileHover={{ y: -1 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => addInlineRow()}
    className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-700 to-sky-500 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:from-sky-800 hover:to-sky-600"
  >
    <Plus size={16} />
    Add Task
  </motion.button>
)}
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



{/* Start */}
<td className="whitespace-nowrap px-4 py-3">
  <div>{formatTime(row.startTime)}</div>

  {!isAutoRow &&
    (!row.taskStatus || row.taskStatus === "Not Started") &&
    !row.startTime && (
      <ActionButton
        label="Start"
        icon={<Play size={13} />}
        tone="emerald"
        onClick={() => handleInlineTaskAction(row, "start")}
      />
    )}
</td>

{/* Break */}
<td className="whitespace-nowrap px-4 py-3">
  {row.breakTime?.startTime
    ? formatTime(row.breakTime.startTime)
    : ""}

  {!isAutoRow &&
    row.taskStatus === "In Progress" &&
    !row.breakTime?.startTime && (
      <ActionButton
        label="Break"
        icon={<Coffee size={13} />}
        tone="amber"
        onClick={() => handleInlineTaskAction(row, "break")}
      />
    )}

  {!isAutoRow &&
    row.taskStatus === "On Break" &&
    row.breakTime?.startTime &&
    !row.breakTime?.endTime && (
      <ActionButton
        label="Resume"
        icon={<RotateCcw size={13} />}
        tone="sky"
        onClick={() => handleInlineTaskAction(row, "resume")}
      />
    )}
</td>

{/* End */}
<td className="whitespace-nowrap px-4 py-3">
  <div>{formatTime(row.endTime)}</div>

  {!isAutoRow &&
    row.taskStatus === "In Progress" &&
    !row.endTime && (
      <ActionButton
        label="End"
        icon={<Square size={13} />}
        tone="rose"
        onClick={() => handleInlineTaskAction(row, "end")}
      />
    )}
</td>

{/* Working Time */}
<td className="whitespace-nowrap px-4 py-3 font-medium">
  {formatMinutes(row.totalCompletionTime)}
</td>

{/* Efficiency */}
<td className="whitespace-nowrap px-4 py-3 font-semibold">
  {row.efficiency == null ? "—" : `${row.efficiency}%`}
</td>

{/* Task Status */}
<td className="whitespace-nowrap px-4 py-3">
  <Chip className={getTaskStatusClass(row.taskStatus)}>
    {row.taskStatus || "Not Started"}
  </Chip>
</td>

{/* Action */}
<td className="whitespace-nowrap px-4 py-3">
  {!isAutoRow && (
    <div className="flex flex-col items-start gap-2">

      <button
        type="button"
        onClick={() => handleInlineSave(row.form, row.id, row)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        <Check size={15} />
        Save
      </button>

      <button
        type="button"
        onClick={() => removeInlineRow(row.id)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
      >
        <Trash2 size={15} />
        Delete
      </button>

    </div>
  )}
</td>

    </motion.tr>
  );
})}
                </AnimatePresence>
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

            const project = getProjectName(
  item.projectId,
  projects,
  item.projectName
);

            return (
              <motion.tr
                key={item._id || item.clientTimesheetId}
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
                      Update Estimated Time or Description, then click Accept.
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

{/* ================= ALL TIMESHEET RECORDS MODAL ================= */}

<AnimatePresence>
  {showRecordsModal && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setShowRecordsModal(false);
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.25 }}
        className="flex max-h-[92vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >

        {/* Header */}

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-[#0b2f45] to-[#14506f] p-5 text-white">

          <div>
            <h2 className="text-xl font-bold">
              Show Records
            </h2>

            <p className="mt-1 text-sm text-sky-100">
              {allTimesheetRecords.length} record(s)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRecordsModal(false)}
            className="rounded-lg bg-white/15 p-2 text-white transition hover:bg-white/25"
            title="Close"
          >
            <X size={21} />
          </button>

        </div>

        {/* Filters and Export */}
<div className="flex flex-col justify-end gap-4 border-b border-slate-200 bg-slate-50 p-5 xl:flex-row xl:items-end">

  <div className="flex flex-wrap items-end justify-end gap-3">

    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        From Date
      </label>
      <input
        type="date"
        value={recordsDateFrom}
        max={recordsDateTo || undefined}
        onChange={(e) => setRecordsDateFrom(e.target.value)}
        className={`${inputCls} w-full sm:w-48`}
      />
    </div>

    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        To Date
      </label>
      <input
        type="date"
        value={recordsDateTo}
        min={recordsDateFrom || undefined}
        onChange={(e) => setRecordsDateTo(e.target.value)}
        className={`${inputCls} w-full sm:w-48`}
      />
    </div>

    <button
      type="button"
      onClick={exportAllTimesheetsToExcel}
      disabled={!allTimesheetRecords.length}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FileSpreadsheet size={18} />
      Export Excel
    </button>

  </div>
</div>


        {/* Records Table */}

        <div className="min-h-0 flex-1 overflow-auto">

          <table className="w-full min-w-[2300px] text-left text-sm text-slate-800">

            <thead className="sticky top-0 z-20 bg-gradient-to-r from-[#0b2f45] to-[#14506f] text-xs uppercase tracking-wide text-white">

              <tr>
                {[
                  "Date",
                  "Task Type",
                  "Project",
                  "Task / Module",
                  "Description",
                  "Estimated",
                  "Start Time",
                  "End Time",
                  "Working Time",
                  "Efficiency",
                  "Task Status",
                  "Approval Status",
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

            <tbody className="divide-y divide-slate-200">

              {allTimesheetRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="py-20 text-center text-slate-500"
                  >
                    No timesheet records found for the selected date range.
                  </td>
                </tr>
              ) : (
                allTimesheetRecords.map((item, index) => {

                  const project = getProjectName(
  item.projectId,
  projects,
  item.projectName
);

                  const approvalStatus =
                    item.approvalStatus || "Pending";

                  return (
                    <motion.tr
                      key={item._id || item.clientTimesheetId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 0.2,
                        delay: Math.min(index, 15) * 0.015,
                      }}
                      className={`align-top transition-colors ${
                        getApprovalRowClass(item)
                      }`}
                    >

                      <td className="whitespace-nowrap px-4 py-4 font-medium">
                        {formatDateTime(item.date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {item.taskType || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {project || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-[#0b2f45]">
                        {item.task || "—"}
                      </td>

                      <td className="max-w-[350px] whitespace-normal px-4 py-4">
                        {item.description || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {formatMinutes(item.estimatedTime)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {formatTime(item.startTime)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {formatTime(item.endTime)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-medium">
                        {formatMinutes(item.totalCompletionTime)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 font-semibold">
                        {item.efficiency == null
                          ? "—"
                          : `${item.efficiency}%`}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <Chip
                          className={getTaskStatusClass(item.taskStatus)}
                        >
                          {item.taskStatus || "Not Started"}
                        </Chip>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <Chip
                          className={getStatusClass(approvalStatus)}
                        >
                          {approvalStatus}
                        </Chip>
                      </td>

                    </motion.tr>
                  );
                })
              )}

            </tbody>

          </table>

        </div>

        {/* Footer */}

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">

          <p className="text-xs text-slate-500">
            Showing {allTimesheetRecords.length} timesheet record(s)
          </p>

          <button
            type="button"
            onClick={() => setShowRecordsModal(false)}
            className="rounded-lg bg-[#0b2f45] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#14506f]"
          >
            Close
          </button>

        </div>

      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

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
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={busy}
      className={`
        mt-2 inline-flex min-h-10 min-w-[105px]
        items-center justify-center gap-2
        rounded-lg px-4 py-2.5
        text-sm font-bold shadow-md
        transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-60
        ${toneMap[tone]}
      `}
    >
      {busy ? (
        <RefreshCw size={16} className="animate-spin" />
      ) : (
        icon
      )}

      {busy ? "Saving..." : label}
    </motion.button>
  );
}