import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import api from "../../api/axios";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getTomorrowKey = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateKey(tomorrow);
};

const formatDate = (dateString) => {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

const getCompanyId = (employee) => {
  const company = employee?.companyId;

  if (!company) return "";

  if (typeof company === "object") {
    return String(company._id || company.id || "");
  }

  return String(company);
};

const Holiday = () => {
  const { companyId: routeCompanyId } = useParams();
  const outletContext = useOutletContext() || {};
  const employee = outletContext.employee;

  const companyId = routeCompanyId || getCompanyId(employee);

  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [holidayName, setHolidayName] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const tomorrowKey = useMemo(() => getTomorrowKey(), []);

  const loadHolidays = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setError("Company information is not available.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/holidays/company/${companyId}`, {
        params: { year },
        withCredentials: true,
      });

      setHolidays(response.data?.holidays || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load holidays."
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, year]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const holidayMap = useMemo(() => {
    const map = new Map();

    holidays.forEach((holiday) => {
      const key = new Date(holiday.date).toISOString().slice(0, 10);
      map.set(key, holiday);
    });

    return map;
  }, [holidays]);

  const toggleDate = (dateKey) => {
    if (dateKey < tomorrowKey || holidayMap.has(dateKey)) return;

    setSelectedDates((previous) =>
      previous.includes(dateKey)
        ? previous.filter((date) => date !== dateKey)
        : [...previous, dateKey].sort()
    );

    setError("");
    setNotice("");
  };

  const handleCreateHolidays = async (event) => {
    event.preventDefault();

    if (!holidayName.trim()) {
      setError("Please enter a holiday name.");
      return;
    }

    if (selectedDates.length === 0) {
      setError("Please select at least one future date.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await api.post(
        `/holidays/${companyId}`,
        {
          holidays: selectedDates.map((date) => ({
            holidayName: holidayName.trim(),
            date,
            description: description.trim(),
          })),
        },
        { withCredentials: true }
      );

      setNotice(
        response.data?.message || "Holidays created successfully."
      );

      setSelectedDates([]);
      setHolidayName("");
      setDescription("");

      await loadHolidays();
    } catch (err) {
      const existingDates = err.response?.data?.existingDates;

      if (existingDates?.length) {
        setError(
          `Already marked as holiday: ${existingDates.join(", ")}`
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Failed to create holidays."
        );
      }

      await loadHolidays();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this holiday?"
    );

    if (!confirmed) return;

    setDeletingId(holidayId);
    setError("");
    setNotice("");

    try {
      const response = await api.delete(
        `/holidays/${companyId}/holiday/${holidayId}`,
        { withCredentials: true }
      );

      setNotice(
        response.data?.message || "Holiday deleted successfully."
      );

      await loadHolidays();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete holiday."
      );
    } finally {
      setDeletingId("");
    }
  };

  const renderMonth = (monthIndex) => {
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();

    return (
      <div
        key={`${year}-${monthIndex}`}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h3 className="mb-4 font-semibold text-slate-800">
          {MONTHS[monthIndex]}
        </h3>

        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-1 text-center text-[11px] font-semibold text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}

          {Array.from({ length: totalDays }).map((_, index) => {
            const day = index + 1;
            const date = new Date(year, monthIndex, day);
            const dateKey = toDateKey(date);

            const holiday = holidayMap.get(dateKey);
            const isSelected = selectedDates.includes(dateKey);
            const isPast = dateKey < tomorrowKey;
            const isDisabled = isPast || Boolean(holiday);

            return (
              <button
                key={dateKey}
                type="button"
                disabled={isDisabled}
                onClick={() => toggleDate(dateKey)}
                title={
                  holiday
                    ? holiday.holidayName
                    : isPast
                      ? "Past dates cannot be selected"
                      : "Select date"
                }
                className={[
                  "relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition",
                  holiday
                    ? "cursor-not-allowed bg-emerald-100 text-emerald-800"
                    : isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : isPast
                        ? "cursor-not-allowed bg-slate-50 text-slate-300"
                        : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                ].join(" ")}
              >
                {day}

                {holiday && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!companyId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Company information could not be found. Please reload the page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <CalendarDays size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Mark Holidays
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Select future dates to mark holidays for the entire company.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setYear((previous) => previous - 1)}
            disabled={year <= new Date().getFullYear()}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous year"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="min-w-16 text-center text-lg font-bold text-slate-800">
            {year}
          </span>

          <button
            type="button"
            onClick={() => setYear((previous) => previous + 1)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Next year"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            onClick={loadHolidays}
            disabled={loading}
            className="ml-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <X size={17} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          {notice}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-blue-600" />
          Selected dates
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-emerald-200" />
          Marked holidays
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-slate-100" />
          Past dates (unavailable)
        </div>

        <span className="text-slate-400">
          Selection starts from tomorrow.
        </span>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
          <LoaderCircle size={19} className="animate-spin" />
          Loading holiday calendar...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MONTHS.map((_, index) => renderMonth(index))}
        </div>
      )}

      {/* Create holiday form */}
      <form
        onSubmit={handleCreateHolidays}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Create Holidays
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Selected dates will apply to every employee in this company.
            </p>
          </div>

          <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
            {selectedDates.length} selected
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Holiday Name
            </label>

            <input
              type="text"
              value={holidayName}
              onChange={(event) => setHolidayName(event.target.value)}
              placeholder="e.g. Independence Day"
              maxLength={100}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Description (Optional)
            </label>

            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Enter holiday description"
              maxLength={300}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {selectedDates.length > 0 && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">
              Selected dates
            </p>

            <div className="flex flex-wrap gap-2">
              {selectedDates.map((date) => (
                <span
                  key={date}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700"
                >
                  {formatDate(date)}

                  <button
                    type="button"
                    onClick={() => toggleDate(date)}
                    className="text-blue-400 hover:text-red-600"
                    aria-label={`Remove ${date}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setSelectedDates([])}
            disabled={selectedDates.length === 0 || saving}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Clear Selection
          </button>

          <button
            type="submit"
            disabled={
              saving ||
              loading ||
              selectedDates.length === 0 ||
              !holidayName.trim()
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Saving Holidays...
              </>
            ) : (
              <>
                <Plus size={17} />
                Mark {selectedDates.length || ""} Holidays
              </>
            )}
          </button>
        </div>
      </form>

      {/* Existing holidays */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Holiday List — {year}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              All holidays marked for this company.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            {holidays.length} holidays
          </span>
        </div>

        {holidays.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarDays
              size={32}
              className="mx-auto text-slate-300"
            />
            <p className="mt-3 font-medium text-slate-700">
              No holidays marked
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Select dates from the calendar to create holidays.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {holidays.map((holiday) => {
              const dateKey = new Date(holiday.date)
                .toISOString()
                .slice(0, 10);

              return (
                <div
                  key={holiday._id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                      <CalendarDays size={20} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {holiday.holidayName}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(dateKey)}
                      </p>

                      {holiday.description && (
                        <p className="mt-1 text-xs text-slate-500">
                          {holiday.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteHoliday(holiday._id)}
                    disabled={deletingId === holiday._id}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === holiday._id ? (
                      <LoaderCircle
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={15} />
                    )}
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Holiday;