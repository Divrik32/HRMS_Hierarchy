import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Holiday from "../company/Holiday";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";

import api from "../../api/axios";

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getCompanyId = (employee) => {
  const company = employee?.companyId;

  if (!company) return "";

  if (typeof company === "object") {
    return String(company._id || company.id || "");
  }

  return String(company);
};

const formatDate = (dateKey) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const EmployeeHolidayCalendar = () => {
  const { employee } = useOutletContext() || {};

  const companyId = getCompanyId(employee);

  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHolidays = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setError("Company information is not available.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/holidays/employee`, {
        params: { year },
        withCredentials: true,
      });

      setHolidays(response.data?.holidays || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load holiday calendar."
      );
      setHolidays([]);
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
      const dateKey = new Date(holiday.date).toISOString().slice(0, 10);
      map.set(dateKey, holiday);
    });

    return map;
  }, [holidays]);

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
            const dateKey = toDateKey(new Date(year, monthIndex, day));
            const holiday = holidayMap.get(dateKey);
            const isToday = dateKey === toDateKey(new Date());

            return (
              <div
                key={dateKey}
                title={holiday?.holidayName || (isToday ? "Today" : dateKey)}
                className={[
                  "relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium",
                  holiday
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                    : "text-slate-600",
                  isToday && !holiday
                    ? "bg-blue-50 font-bold text-blue-700 ring-1 ring-blue-300"
                    : "",
                ].join(" ")}
              >
                {day}

                {holiday && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-600" />
                )}
              </div>
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
              My Holidays
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View all upcoming company holidays in the yearly calendar.
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

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <XCircle size={17} />
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-emerald-200" />
          Company Holidays
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-blue-100 ring-1 ring-blue-300" />
          Today
        </div>

        <span className="text-slate-400">
          Green dates indicate company holidays.
        </span>
      </div>

      {/* Yearly Calendar */}
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

      {/* Holiday List */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Company Holiday List — {year}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Holidays applicable to all employees in your company.
            </p>
          </div>

          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            {holidays.length} holidays
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
            <LoaderCircle size={17} className="animate-spin" />
            Loading holidays...
          </div>
        ) : holidays.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarDays size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">
              No holidays marked
            </p>
            <p className="mt-1 text-sm text-slate-500">
              No company holidays have been marked for {year}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {holidays
              .slice()
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((holiday) => {
                const dateKey = new Date(holiday.date)
                  .toISOString()
                  .slice(0, 10);

                return (
                  <div
                    key={holiday._id}
                    className="flex items-start gap-3 p-4"
                  >
                    <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                      <CalendarDays size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
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

                    <CheckCircle2
                      size={18}
                      className="mt-1 shrink-0 text-emerald-600"
                    />
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
};

const EmployeeHolidays = () => {
  const { employee } = useOutletContext() || {};

  const roleName = employee?.roleId?.roleName?.trim();

  if (["HR", "Head Recruiter"].includes(roleName)) {
    return <Holiday />;
  }

  return <EmployeeHolidayCalendar />;
};

export default EmployeeHolidays;