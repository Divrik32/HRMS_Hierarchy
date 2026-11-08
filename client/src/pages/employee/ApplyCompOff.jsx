
import { useCallback, useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  Clock,
  FileText,
  RefreshCw,
  Send,
  User,
  CalendarDays,
} from "lucide-react";

import api from "../../api/axios";
import { toast } from "react-toastify";

// =====================================================
// DATE HELPERS
// =====================================================

const formatDate = (date) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDate = (value) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
};

// =====================================================
// APPLY COMP-OFF
// =====================================================

const ApplyCompOff = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [holidayDatesByYear, setHolidayDatesByYear] = useState({});
  const [holidayLoadingByYear, setHolidayLoadingByYear] = useState({});

  const [formData, setFormData] = useState({
    employeeId: "",
    workDate: "",
    leaveDate: "",
    workDescription: "",
    creditedDays: 1,
  });

  // =====================================================
  // FETCH EMPLOYEES
  // =====================================================

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/leaves/comp-off/employees");

      setEmployees(data.employees || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load employees"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FETCH HOLIDAYS
  // =====================================================

  const fetchHolidayCalendar = useCallback(async (year) => {
    if (
      holidayDatesByYear[year] ||
      holidayLoadingByYear[year]
    ) {
      return;
    }

    setHolidayLoadingByYear((prev) => ({
      ...prev,
      [year]: true,
    }));

    try {
      const { data } = await api.get(
        `/leaves/comp-off/calendar?year=${year}`
      );

      const dates = (data.holidays || []).map((holiday) =>
        String(holiday.date).slice(0, 10)
      );

      setHolidayDatesByYear((prev) => ({
        ...prev,
        [year]: dates,
      }));
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load company holidays"
      );
    } finally {
      setHolidayLoadingByYear((prev) => ({
        ...prev,
        [year]: false,
      }));
    }
  }, [holidayDatesByYear, holidayLoadingByYear]);

  useEffect(() => {
    fetchEmployees();
    fetchHolidayCalendar(new Date().getFullYear());
  }, []);

  // =====================================================
  // FETCH HOLIDAYS WHEN CALENDAR MONTH CHANGES
  // =====================================================

  const handleCalendarMonthChange = (date) => {
    fetchHolidayCalendar(date.getFullYear());
  };

  // =====================================================
  // DATE SELECTION RULES
  // =====================================================

  const isSunday = (date) => date.getDay() === 0;

  const isHoliday = (date) => {
    const dateString = formatDate(date);
    const year = date.getFullYear();

    return (holidayDatesByYear[year] || []).includes(dateString);
  };

  // Work Date: Only Sunday or Company Holiday
  const isValidWorkDate = (date) => {
    const year = date.getFullYear();

    if (!holidayDatesByYear[year]) return false;

    return isSunday(date) || isHoliday(date);
  };

  // Leave Date: Only normal working days
  const isValidLeaveDate = (date) => {
    const year = date.getFullYear();

    if (!holidayDatesByYear[year]) return false;

    return !isSunday(date) && !isHoliday(date);
  };

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      workDate: "",
      leaveDate: "",
      workDescription: "",
      creditedDays: 1,
    });
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId) {
      return toast.error("Please select an employee");
    }

    if (!formData.workDate) {
      return toast.error("Please select Work Date");
    }

    if (!formData.leaveDate) {
      return toast.error("Please select Leave Date");
    }

    if (formData.workDate === formData.leaveDate) {
      return toast.error("Work Date and Leave Date cannot be the same");
    }

    if (!formData.workDescription.trim()) {
      return toast.error("Please enter work description");
    }

    const days = Number(formData.creditedDays);

    if (
      !Number.isFinite(days) ||
      days < 0.5 ||
      !Number.isInteger(days * 2)
    ) {
      return toast.error("Comp-Off days must be in multiples of 0.5");
    }

    try {
      setSubmitting(true);

      await api.post("/leaves/comp-off/credit", {
        ...formData,
        creditedDays: days,
      });

      toast.success("Comp-Off request submitted successfully");

      resetForm();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to submit Comp-Off request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // CALENDAR VALUES
  // =====================================================

  const workDate = parseDate(formData.workDate);
  const leaveDate = parseDate(formData.leaveDate);

  const workYear = workDate?.getFullYear() || new Date().getFullYear();
  const leaveYear = leaveDate?.getFullYear() || new Date().getFullYear();

  const workCalendarLoading =
    !!holidayLoadingByYear[workYear] || !holidayDatesByYear[workYear];

  const leaveCalendarLoading =
    !!holidayLoadingByYear[leaveYear] || !holidayDatesByYear[leaveYear];

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Apply Comp-Off
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Select the Sunday or company holiday on which the employee
            worked, and select the working day on which the employee
            will use the Comp-Off.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"
        >

          {/* EMPLOYEE */}

          <div className="mb-6">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <User size={16} />
              Select Employee
            </label>

            <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">
                {loading ? "Loading employees..." : "Select employee"}
              </option>

              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name} ({employee.empId})
                </option>
              ))}
            </select>
          </div>

          {/* DATE PICKERS */}

          <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* WORK DATE */}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                <CalendarDays size={17} className="text-indigo-600" />
                Work Date
              </label>

              <DatePicker
                selected={workDate}
                onChange={(date) =>
                  setFormData((prev) => ({
                    ...prev,
                    workDate: formatDate(date),
                  }))
                }
                onMonthChange={handleCalendarMonthChange}
                onYearChange={handleCalendarMonthChange}
                filterDate={(date) =>
                  isValidWorkDate(date) &&
                  formatDate(date) !== formData.leaveDate
                }
                dateFormat="dd MMMM yyyy"
                placeholderText="Select Sunday / Holiday"
                showPopperArrow={false}
                isClearable
                disabled={workCalendarLoading}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500"
                wrapperClassName="w-full"
                calendarClassName="comp-off-calendar"
              />

              <p className="mt-2 text-xs text-slate-500">
                Only Sundays and company holidays are selectable.
              </p>

              {workCalendarLoading && (
                <p className="mt-2 text-xs text-indigo-600">
                  Loading holidays...
                </p>
              )}
            </div>

            {/* LEAVE DATE */}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                <CalendarDays size={17} className="text-indigo-600" />
                Leave Date
              </label>

              <DatePicker
                selected={leaveDate}
                onChange={(date) =>
                  setFormData((prev) => ({
                    ...prev,
                    leaveDate: formatDate(date),
                  }))
                }
                onMonthChange={handleCalendarMonthChange}
                onYearChange={handleCalendarMonthChange}
                filterDate={(date) =>
                  isValidLeaveDate(date) &&
                  formatDate(date) !== formData.workDate
                }
                dateFormat="dd MMMM yyyy"
                placeholderText="Select working day"
                showPopperArrow={false}
                isClearable
                disabled={leaveCalendarLoading}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500"
                wrapperClassName="w-full"
                calendarClassName="comp-off-calendar"
              />

              <p className="mt-2 text-xs text-slate-500">
                Sundays and company holidays are not selectable.
              </p>

              {leaveCalendarLoading && (
                <p className="mt-2 text-xs text-indigo-600">
                  Loading holidays...
                </p>
              )}
            </div>

          </div>

          {/* COMP-OFF DAYS */}

          <div className="mb-5">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Clock size={16} />
              Comp-Off Days
            </label>

            <input
              type="number"
              name="creditedDays"
              min="0.5"
              step="0.5"
              value={formData.creditedDays}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 md:max-w-xs"
            />
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={16} />
              Work Description
            </label>

            <textarea
              name="workDescription"
              value={formData.workDescription}
              onChange={handleChange}
              rows={4}
              placeholder="Describe the work completed on Sunday or company holiday..."
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          {/* ACTIONS */}

          <div className="mt-6 flex flex-wrap justify-end gap-3">

            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Reset
            </button>

            <button
              type="submit"
              disabled={submitting || loading || workCalendarLoading || leaveCalendarLoading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Send size={16} />
              {submitting ? "Submitting..." : "Submit Request"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
};

export default ApplyCompOff;
