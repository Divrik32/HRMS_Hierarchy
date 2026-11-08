
import { useEffect, useState } from "react";
import {
  CalendarDays,
  FilePlus2,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Wallet,
} from "lucide-react";

import api from "../../api/axios";

const initialForm = {
  leaveCategory: "Paid Leave",
  leaveType: "Casual Leave",
  startDate: "",
  endDate: "",
  totalDays: "",
  reason: "",
};

const ApplyLeave = () => {
  const [form, setForm] = useState(initialForm);
  const [balance, setBalance] = useState({
    casualLeave: 0,
    sickLeave: 0,
    paidLeave: 0,
    extraLeaveTaken: 0,
  });

  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // GET EMPLOYEE LEAVE BALANCE
  // =====================================================

  const fetchLeaveBalance = async () => {
    try {
      setLoadingBalance(true);

      const response = await api.get("/leaves/my-balance");

      if (response.data.success) {
        setBalance({
          casualLeave: response.data.balance?.casualLeave ?? 0,
          sickLeave: response.data.balance?.sickLeave ?? 0,
          paidLeave: response.data.balance?.paidLeave ?? 0,
          extraLeaveTaken: response.data.balance?.extraLeaveTaken ?? 0,
        });
      }
    } catch (error) {
      console.error("Fetch Leave Balance Error:", error);
      setErrorMessage(
        error.response?.data?.message || "Unable to load leave balance."
      );
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchLeaveBalance();
  }, []);

  // =====================================================
  // BALANCE CARDS
  // =====================================================

  const leaveBalances = [
    {
      title: "Sick Leave",
      shortName: "SL",
      value: balance.sickLeave,
      description: "Available sick leave",
      color: "bg-rose-50",
      textColor: "text-rose-600",
      borderColor: "border-rose-100",
    },
    {
      title: "Casual Leave",
      shortName: "CL",
      value: balance.casualLeave,
      description: "Available casual leave",
      color: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-100",
    },
    {
      title: "Paid Leave",
      shortName: "PL",
      value: balance.paidLeave,
      description: "Available paid leave",
      color: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-100",
    },
  ];

  // =====================================================
  // SELECTED LEAVE BALANCE
  // =====================================================

  const getSelectedBalance = () => {
    const balanceMap = {
      "Casual Leave": balance.casualLeave,
      "Sick Leave": balance.sickLeave,
      "Paid Leave": balance.paidLeave,
    };

    return balanceMap[form.leaveType] ?? 0;
  };

  const selectedBalance = getSelectedBalance();
  const requestedDays = Number(form.totalDays);

  const isUnpaid = form.leaveCategory === "Unpaid Leave";

  const exceedsBalance =
    !isUnpaid &&
    form.totalDays !== "" &&
    Number.isFinite(requestedDays) &&
    requestedDays > selectedBalance;

  // =====================================================
  // HANDLE INPUT CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setSuccessMessage("");
    setErrorMessage("");
  };

  // =====================================================
  // RESET FORM
  // =====================================================

  const handleReset = () => {
    setForm(initialForm);
    setSuccessMessage("");
    setErrorMessage("");
  };

  // =====================================================
  // SUBMIT LEAVE REQUEST
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!form.startDate || !form.endDate) {
      setErrorMessage("Please select both start date and end date.");
      return;
    }

    if (form.startDate > form.endDate) {
      setErrorMessage("End date cannot be before start date.");
      return;
    }

    const days = Number(form.totalDays);

    if (
      !Number.isFinite(days) ||
      days <= 0 ||
      !Number.isInteger(days * 2)
    ) {
      setErrorMessage(
        "Leave duration must be greater than 0 and in multiples of 0.5 days."
      );
      return;
    }

    if (!form.reason.trim()) {
      setErrorMessage("Leave reason is required.");
      return;
    }

    // Frontend balance validation for Paid Leave
    if (!isUnpaid && days > selectedBalance) {
      setErrorMessage(
        `Insufficient ${form.leaveType} balance. Available balance: ${selectedBalance} days.`
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        leaveCategory: form.leaveCategory,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        totalDays: days,
        reason: form.reason.trim(),
      };

      const response = await api.post("/leaves", payload);

      if (response.data.success) {
        setSuccessMessage(
          response.data.message || "Leave request submitted successfully."
        );

        setForm(initialForm);

        // Refresh balance after successful application
        await fetchLeaveBalance();
      }
    } catch (error) {
      console.error("Apply Leave Error:", error);

      setErrorMessage(
        error.response?.data?.message || "Failed to submit leave request."
      );

      // Refresh balance in case backend rejected due to a changed balance
      if (error.response?.data?.message === "Insufficient leave balance.") {
        await fetchLeaveBalance();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* PAGE HEADER */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-indigo-100 p-2.5">
                <FilePlus2 className="h-6 w-6 text-indigo-600" />
              </div>

              <h1 className="text-2xl font-bold text-slate-800">
                Apply Leave
              </h1>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Submit your leave application and check your available leave balance.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchLeaveBalance}
            disabled={loadingBalance}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loadingBalance ? "animate-spin" : ""}
            />
            Refresh Balance
          </button>
        </div>

        {/* LEAVE BALANCE */}

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Wallet size={19} className="text-indigo-600" />

            <h2 className="text-lg font-semibold text-slate-800">
              My Leave Balance
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {leaveBalances.map((item) => (
              <div
                key={item.shortName}
                className={`rounded-xl border ${item.borderColor} bg-white p-5 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {item.title}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-800">
                      {loadingBalance ? (
                        <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-100" />
                      ) : (
                        Number(item.value).toFixed(1)
                      )}
                      <span className="ml-1 text-sm font-medium text-slate-400">
                        Days
                      </span>
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color} ${item.textColor} text-lg font-bold`}
                  >
                    {item.shortName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SUCCESS MESSAGE */}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-semibold">Success</p>
              <p className="mt-1 text-sm">{successMessage}</p>
            </div>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="ml-auto"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* ERROR MESSAGE */}

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-semibold">Unable to Apply Leave</p>
              <p className="mt-1 text-sm">{errorMessage}</p>
            </div>

            <button
              type="button"
              onClick={() => setErrorMessage("")}
              className="ml-auto"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* APPLICATION FORM */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-800">
              Leave Application Form
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Fill in the details below to submit your leave request.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">

            {/* LEAVE CATEGORY */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Leave Category <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {["Paid Leave", "Unpaid Leave"].map((category) => (
                  <label
                    key={category}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                      form.leaveCategory === category
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="leaveCategory"
                      value={category}
                      checked={form.leaveCategory === category}
                      onChange={handleChange}
                      className="h-4 w-4 accent-indigo-600"
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {category}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {category === "Paid Leave"
                          ? "Leave will be deducted from your balance."
                          : "Leave will not be deducted from your leave balance."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* LEAVE TYPE */}

            <div>
              <label
                htmlFor="leaveType"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Leave Type <span className="text-rose-500">*</span>
              </label>

              <select
                id="leaveType"
                name="leaveType"
                value={form.leaveType}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
              >
                <option value="Casual Leave">Casual Leave (CL)</option>
                <option value="Sick Leave">Sick Leave (SL)</option>
                <option value="Paid Leave">Paid Leave (PL)</option>
              </select>

              {isUnpaid ? (
                <p className="mt-2 text-xs text-amber-600">
                  Unpaid Leave selected. Your {form.leaveType} balance will not be deducted.
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Available {form.leaveType} balance:{" "}
                  <span className="font-semibold text-indigo-600">
                    {loadingBalance ? "Loading..." : `${selectedBalance} days`}
                  </span>
                </p>
              )}
            </div>

            {/* DATE FIELDS */}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Start Date <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <CalendarDays
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  End Date <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <CalendarDays
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={form.endDate}
                    min={form.startDate || undefined}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>
              </div>
            </div>

            {/* TOTAL DAYS */}

            <div>
              <label
                htmlFor="totalDays"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Total Leave Days <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <Clock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="number"
                  id="totalDays"
                  name="totalDays"
                  min="0.5"
                  step="0.5"
                  value={form.totalDays}
                  onChange={handleChange}
                  placeholder="Enter total days (e.g. 1, 1.5, 2)"
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Leave duration must be in multiples of 0.5 days.
              </p>

              {exceedsBalance && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-rose-600">
                  <AlertCircle size={15} />
                  Requested days exceed your available {form.leaveType} balance.
                </p>
              )}
            </div>

            {/* REASON */}

            <div>
              <label
                htmlFor="reason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Reason for Leave <span className="text-rose-500">*</span>
              </label>

              <textarea
                id="reason"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                rows={4}
                maxLength={1000}
                placeholder="Please explain the reason for your leave..."
                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {form.reason.length}/1000
              </p>
            </div>

            {/* BALANCE WARNING */}

            {!isUnpaid && exceedsBalance && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                You cannot submit this application because your requested leave
                exceeds your available balance.
              </div>
            )}

            {/* FORM ACTIONS */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={17} />
                Reset
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingBalance ||
                  (!isUnpaid && exceedsBalance)
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Submit Leave Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;
