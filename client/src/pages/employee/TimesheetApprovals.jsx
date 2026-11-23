import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import {
  RefreshCw, Search, CheckCircle2, XCircle, Clock3,
  UserRound, BriefcaseBusiness, ShieldCheck,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-toastify";

/* =========================================================
   Helpers
   ========================================================= */
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

/* Gold star burst fired from an element (used on Approve) */
const burstGlitter = (el) => {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const colors = ["#fde68a", "#fbbf24", "#ffffff", "#fcd34d", "#34d399"];
  const star =
    "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)";

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
  "Employee", "Role", "Date", "Task Type", "Project", "Task / Module", "Description",
  "Estimated", "Start Time", "End Time", "Working Time", "Idle Time",
  "Employee Justification", "Efficiency", "Action",
];

/* =========================================================
   Page
   ========================================================= */
export default function TimesheetApprovals() {
  const reduce = useReducedMotion();

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
      setError(
        err.response?.data?.message || err.message || "Failed to load timesheet approvals."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const getApprovalRowClass = (item) => {
  const isUpdatedPending = Number(item.resubmissionCount || 0) > 0;

  if (isUpdatedPending) {
    return "bg-purple-50 hover:bg-purple-100";
  }

  return "bg-yellow-50 hover:bg-yellow-100";
};

  const pendingTimesheets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return timesheets.filter((item) => {
      const status = item.approvalStatus || "Pending";

      // Only completed and pending timesheets can be audited.
      if (item.taskStatus !== "Completed" || status !== "Pending") return false;

      const employeeName = typeof item.employeeId === "object" ? item.employeeId?.name || "" : "";
      const employeeCode = typeof item.employeeId === "object" ? item.employeeId?.empId || "" : "";
      const employeeRole =
        typeof item.employeeId?.roleId === "object" ? item.employeeId.roleId?.roleName || "" : "";
      const projectName = typeof item.projectId === "object" ? item.projectId?.projectName || "" : "";

      return (
        !term ||
        [employeeName, employeeCode, employeeRole, item.task, item.description, item.taskType, projectName]
          .some((value) => String(value || "").toLowerCase().includes(term))
      );
    });
  }, [timesheets, search]);

  const handleApprove = async (item, btn) => {
    const confirmed = window.confirm(
      `Approve the timesheet of ${item.employeeId?.name || "this employee"}?`
    );
    if (!confirmed) return;

    burstGlitter(btn);
    setActionId(item._id);

    try {
      await api.patch(`/timesheets/${item._id}/audit`, { approvalStatus: "Approved" });
      toast.success("Timesheet approved successfully.");
      await loadApprovals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve timesheet.");
    } finally {
      setActionId("");
    }
  };

  const openRejectModal = (item) => {
    setSelectedTimesheet(item);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedTimesheet(null);
    setRejectionReason("");
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
      await api.patch(`/timesheets/${selectedTimesheet._id}/audit`, {
        approvalStatus: "Rejected",
        rejectionReason: rejectionReason.trim(),
      });

      toast.success("Timesheet rejected.");
      closeRejectModal();
      await loadApprovals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject timesheet.");
    } finally {
      setActionId("");
    }
  };

  const stats = {
    total: timesheets.length,
    pending: timesheets.filter(
      (item) => item.taskStatus === "Completed" && item.approvalStatus === "Pending"
    ).length,
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600">
        <RefreshCw className="animate-spin text-sky-600" />
        Loading approval records...
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
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-amber-200">Employee Workspace</p>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                Timesheet Approvals
              </h1>
              <p className="mt-2 max-w-xl text-sm text-sky-100">
                Review completed timesheets submitted by your child and grandchild role employees.
              </p>
            </div>

            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={loadApprovals}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-[#0b2f45]/60 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-[#0b2f45]"
            >
              <RefreshCw size={16} /> Refresh
            </motion.button>
          </div>

          <div
            className="ts-anim absolute inset-x-0 bottom-0 h-1 bg-[length:200%_100%] [animation:tsGoldFlow_4s_linear_infinite]"
            style={{
              backgroundImage: "linear-gradient(90deg,#b45309,#fde68a,#f59e0b,#fef3c7,#b45309)",
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
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-white to-sky-50/60 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#0b2f45]">Employee Timesheets</h2>
              <p className="mt-1 text-sm text-slate-600">
                {pendingTimesheets.length} timesheet(s) waiting for your decision.
              </p>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee or task..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 sm:w-72"
              />
            </div>
          </div>

          {pendingTimesheets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-5 py-20 text-center"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ShieldCheck size={26} />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#0b2f45]">No pending approvals</h3>
              <p className="mt-1 text-sm text-slate-600">
                Completed timesheets from your eligible employees will appear here.
              </p>
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[2000px] text-left text-sm text-slate-800">
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
                  <AnimatePresence initial={false}>
                    {pendingTimesheets.map((item, index) => {
                      const employee = typeof item.employeeId === "object" ? item.employeeId : {};
                      const role = typeof employee?.roleId === "object" ? employee.roleId?.roleName : "—";
                      const project = typeof item.projectId === "object" ? item.projectId?.projectName : "—";
                      const busy = actionId === item._id;

                      return (
                        <motion.tr
                          key={item._id}
                          layout="position"
                          initial={reduce ? false : { opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 24 }}
                          transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.04 }}
                          className={`${getApprovalRowClass(item)} align-top transition-colors`}
                        >
                          <td className="whitespace-nowrap px-4 py-4 shadow-[inset_4px_0_0_0_#f59e0b]">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0b2f45] to-[#348aaf] text-white ring-2 ring-amber-300">
                                <UserRound size={18} />
                              </div>
                              <div>
                                <p className="font-semibold text-[#0b2f45]">{employee?.name || "Unknown"}</p>
                                <p className="text-xs text-slate-600">{employee?.empId || "—"}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">{role}</td>
                          <td className="whitespace-nowrap px-4 py-4 font-medium">{formatDateTime(item.date)}</td>
                          <td className="px-4 py-4">{item.taskType}</td>
                          <td className="px-4 py-4">{project || "—"}</td>
                          <td className="px-4 py-4 font-semibold text-[#0b2f45]">{item.task || "—"}</td>
                          <td className="max-w-80 whitespace-normal px-4 py-4">{item.description || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-4">{formatMinutes(item.estimatedTime)}</td>
                          <td className="whitespace-nowrap px-4 py-4">{formatDateTime(item.startTime)}</td>
                          <td className="whitespace-nowrap px-4 py-4">{formatDateTime(item.endTime)}</td>
                          <td className="whitespace-nowrap px-4 py-4 font-medium">{formatMinutes(item.totalCompletionTime)}</td>
                          <td className="whitespace-nowrap px-4 py-4">{formatMinutes(item.idleTime)}</td>
                          <td className="min-w-[250px] whitespace-normal px-4 py-4 text-slate-700">
                            {item.employeeResponseHistory?.length > 0
                              ? item.employeeResponseHistory[item.employeeResponseHistory.length - 1]?.reason || "—"
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-bold text-sky-800">
                            {item.efficiency == null ? "—" : `${item.efficiency}%`}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex min-w-[120px] flex-col gap-2">
                              <motion.button
                                type="button"
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={busy}
                                onClick={(e) => handleApprove(item, e.currentTarget)}
                                className="relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_-6px_rgba(16,185,129,0.9)] disabled:opacity-60"
                              >
                                <span className="ts-anim pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/40 blur-md [animation:tsShimmer_2.4s_ease-in-out_infinite]" />
                                {busy ? (
                                  <RefreshCw size={13} className="relative animate-spin" />
                                ) : (
                                  <CheckCircle2 size={14} className="relative" />
                                )}
                                <span className="relative">Approve</span>
                              </motion.button>

                              <motion.button
                                type="button"
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={busy}
                                onClick={() => openRejectModal(item)}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-300 hover:bg-rose-200 disabled:opacity-60"
                              >
                                <XCircle size={14} />
                                Reject
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ================= REJECT MODAL ================= */}
        <AnimatePresence>
          {showRejectModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a28]/70 p-4 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
                className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <div className="relative border-b border-slate-200 bg-gradient-to-r from-[#0b2f45] to-[#14506f] p-5 text-white">
                  <h2 className="font-serif text-xl font-bold">Reject Timesheet</h2>
                  <p className="mt-1 text-sm text-sky-100">
                    Employee: {selectedTimesheet?.employeeId?.name || "Unknown"}
                  </p>
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                </div>

                <form onSubmit={handleReject}>
                  <div className="p-5">
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Rejection Reason <span className="text-rose-600">*</span>
                    </label>

                    <textarea
                      rows={4}
                      autoFocus
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this timesheet is being rejected..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-5">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      disabled={Boolean(actionId)}
                      onClick={closeRejectModal}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Cancel
                    </motion.button>

                    <motion.button
                      type="submit"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={Boolean(actionId) || !rejectionReason.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-700 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                    >
                      {actionId ? <RefreshCw size={15} className="animate-spin" /> : <XCircle size={15} />}
                      Confirm Rejection
                    </motion.button>
                  </div>
                </form>
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
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_-12px_rgba(15,42,67,0.3)]"
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