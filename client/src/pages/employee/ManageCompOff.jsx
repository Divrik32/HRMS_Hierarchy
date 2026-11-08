
import { useState } from "react";
import { CalendarPlus, Send, Info } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

const ManageCompOff = () => {
  const [form, setForm] = useState({
    employeeId: "",
    workDate: "",
    description: "",
    creditedDays: "1",
  });

  const [submitting, setSubmitting] = useState(false);

  const fieldClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    if (!form.employeeId.trim()) {
      toast.error("Please enter the Employee ID.");
      return;
    }

    if (!form.workDate || !form.description.trim()) {
      toast.error("Please complete all required fields.");
      return;
    }

    if (Number(form.creditedDays) <= 0) {
      toast.error("Credited days must be greater than zero.");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Creating Comp-Off credit...");

    try {
      const response = await api.post(
        "/leaves/comp-off/credit",
        {
          employeeId: form.employeeId.trim(),
          workDate: form.workDate,
          description: form.description.trim(),
          creditedDays: Number(form.creditedDays),
        },
        { withCredentials: true }
      );

      toast.update(toastId, {
        render: response.data?.message || "Comp-Off credit created successfully.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setForm({
        employeeId: "",
        workDate: "",
        description: "",
        creditedDays: "1",
      });
    } catch (error) {
      toast.update(toastId, {
        render: error.response?.data?.message || "Failed to create Comp-Off credit.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage Comp-Off</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create Comp-Off credits for employees who worked on Sundays or company holidays.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <Info size={20} className="mt-0.5 shrink-0 text-blue-600" />
        <div>
          <p className="text-sm font-semibold text-blue-900">HR Verification</p>
          <p className="mt-1 text-sm text-blue-800">
            Comp-Off can only be credited for a Sunday or a declared company holiday.
            The server validates the work date before creating the credit.
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <CalendarPlus size={21} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Create Comp-Off Credit
            </h2>
            <p className="text-sm text-slate-500">
              Enter the employee and work details.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Employee ID
            </label>
            <input
              name="employeeId"
              value={form.employeeId}
              onChange={handleChange}
              placeholder="Enter employee ID"
              required
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Work Date
              </label>
              <input
                type="date"
                name="workDate"
                value={form.workDate}
                onChange={handleChange}
                max={new Date().toLocaleDateString("en-CA")}
                required
                className={fieldClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Credited Days
              </label>
              <input
                type="number"
                name="creditedDays"
                value={form.creditedDays}
                onChange={handleChange}
                min="0.5"
                step="0.5"
                required
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Work Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              required
              placeholder="Describe the work completed on that Sunday or holiday..."
              className={fieldClass}
            />
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={17} />
              {submitting ? "Creating..." : "Create Comp-Off Credit"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ManageCompOff;
