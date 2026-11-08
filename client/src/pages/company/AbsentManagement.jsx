
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Search,
  RefreshCw,
  Users,
  UserX,
  AlertCircle,
} from "lucide-react";
import api from "../../api/axios";

// =====================================================
// DATE HELPERS
// =====================================================

const getToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;

  return `${year}-${month}-${day}`;
};

const getISOWeekValue = (dateString) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  const day = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() + 4 - day);

  const yearStart = new Date(
    Date.UTC(date.getUTCFullYear(), 0, 1)
  );

  const week = Math.ceil(
    ((date - yearStart) / 86400000 + 1) / 7
  );

  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

const getISOWeekRange = (weekValue) => {
  if (!weekValue) return null;

  const [yearPart, weekPart] = weekValue.split("-W");
  const year = Number(yearPart);
  const week = Number(weekPart);

  if (!year || !week) return null;

  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const day = januaryFourth.getUTCDay() || 7;

  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - day + 1);
  monday.setUTCDate(monday.getUTCDate() + (week - 1) * 7);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
};

const formatDate = (dateString) => {
  if (!dateString) return "-";

  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

// =====================================================
// ABSENT MANAGEMENT
// =====================================================

const AbsentManagement = () => {
  const today = getToday();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterType, setFilterType] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(
    today.slice(0, 7)
  );
  const [selectedWeek, setSelectedWeek] = useState(
    getISOWeekValue(today)
  );
  const [search, setSearch] = useState("");

  // =====================================================
  // FETCH ALL EMPLOYEE ABSENT DATES
  // =====================================================

  const fetchAbsentDates = async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get(
        "/absent/all-employees-dates"
      );

      if (data.success) {
        setEmployees(data.employees || []);
      } else {
        setError(data.message || "Failed to fetch absent dates.");
      }
    } catch (err) {
      console.error("Absent Management API Error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load absent records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsentDates();
  }, []);

  // =====================================================
  // FILTER EMPLOYEES AND ABSENT DATES
  // =====================================================

  const filteredEmployees = useMemo(() => {
    let startDate = "";
    let endDate = "";

    if (filterType === "month" && selectedMonth) {
      startDate = `${selectedMonth}-01`;

      const [year, month] = selectedMonth.split("-").map(Number);

      const lastDay = new Date(
        Date.UTC(year, month, 0)
      )
        .toISOString()
        .slice(0, 10);

      endDate = lastDay;
    }

    if (filterType === "week") {
      const range = getISOWeekRange(selectedWeek);

      if (range) {
        startDate = range.start;
        endDate = range.end;
      }
    }
    if (filterType === "date" && selectedDate) {
  startDate = selectedDate;
  endDate = selectedDate;
}

    const searchValue = search.trim().toLowerCase();

    return employees
      .map((employee) => {
const absentDates = (employee.absentDates || []).filter(
  (date) => {
    if (
      filterType === "month" ||
      filterType === "week" ||
      filterType === "date"
    ) {
      return date >= startDate && date <= endDate;
    }

    return true;
  }
);

        return {
          ...employee,
          filteredAbsentDates: absentDates,
          filteredAbsentDays: absentDates.length,
        };
      })
      .filter((employee) => {
        const matchesSearch =
          !searchValue ||
          employee.empId?.toLowerCase().includes(searchValue) ||
          employee.name?.toLowerCase().includes(searchValue);

        return matchesSearch;
      })
      .sort(
        (a, b) =>
          b.filteredAbsentDays - a.filteredAbsentDays
      );
  }, [
    employees,
    filterType,
    selectedMonth,
    selectedWeek,
    selectedDate,
    search,
  ]);

  const totalAbsentDays = filteredEmployees.reduce(
    (total, employee) => total + employee.filteredAbsentDays,
    0
  );

  const employeesWithAbsence = filteredEmployees.filter(
    (employee) => employee.filteredAbsentDays > 0
  ).length;

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Absent Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View and filter employee-wise absent records.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAbsentDates}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Total Employees
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-800">
                  {loading ? "..." : employees.length}
                </h2>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Users size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Employees Absent
                </p>

                <h2 className="mt-2 text-3xl font-bold text-amber-600">
                  {loading ? "..." : employeesWithAbsence}
                </h2>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <UserX size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Total Absent Days
                </p>

                <h2 className="mt-2 text-3xl font-bold text-red-600">
                  {loading ? "..." : totalAbsentDays}
                </h2>
              </div>

              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <CalendarDays size={24} />
              </div>
            </div>
          </div>

        </div>

        {/* FILTERS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarRange size={19} className="text-blue-600" />

            <h2 className="font-semibold text-slate-800">
              Filter Absent Records
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* FILTER TYPE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Filter Basis
              </label>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="month">Month Wise</option>
                <option value="week">Week Wise</option>
                <option value="date">Date Wise</option>
                <option value="all">All Dates</option>
              </select>
            </div>

            {/* MONTH FILTER */}
            {filterType === "month" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Select Month
                </label>

                <input
                  type="month"
                  value={selectedMonth}
                  max={today.slice(0, 7)}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            {/* WEEK FILTER */}
            {filterType === "week" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Select Week
                </label>

                <input
                  type="week"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            {/* DATE FILTER */}
{filterType === "date" && (
  <div>
    <label className="mb-2 block text-sm font-medium text-slate-600">
      Select Date
    </label>

    <input
      type="date"
      value={selectedDate}
      max={today}
      onChange={(e) => setSelectedDate(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  </div>
)}

            {/* EMPLOYEE SEARCH */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Search Employee
              </label>

              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Employee ID or name"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

          </div>

          {filterType === "week" && selectedWeek && (
            <p className="mt-3 text-xs text-slate-500">
              Week: {getISOWeekRange(selectedWeek)?.start} to{" "}
              {getISOWeekRange(selectedWeek)?.end}
            </p>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} />
            {error}
          </div>
        )}

        {/* EMPLOYEE ABSENT LIST */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-slate-800">
                Employee Absent Records
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredEmployees.length} employee(s) found
              </p>
            </div>

            <span className="w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
              {totalAbsentDays} Absent Days
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading absent records...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-12 text-center">
              <Users
                size={36}
                className="mx-auto mb-3 text-slate-300"
              />

              <p className="font-medium text-slate-700">
                No employees found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your filters or search.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.employeeId}
                  className="p-5 transition hover:bg-slate-50/70"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {employee.name || employee.empId}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Employee ID: {employee.empId}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                        {employee.filteredAbsentDays}{" "}
                        {employee.filteredAbsentDays === 1
                          ? "Absent Day"
                          : "Absent Days"}
                      </span>
                    </div>

                  </div>

                  {employee.filteredAbsentDates.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {employee.filteredAbsentDates.map((date) => (
                        <span
                          key={date}
                          className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700"
                        >
                          {formatDate(date)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-medium text-emerald-600">
                      No absent records in this period.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AbsentManagement;
