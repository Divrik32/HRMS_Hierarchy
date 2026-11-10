
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CalendarDays,
  RefreshCw,
  Search,
  AlertCircle,
  Users,
  Clock3,
  CheckCircle2,
  XCircle,
  ClipboardList,
} from "lucide-react";

import api from "../../api/axios";

// =====================================================
// HELPERS
// =====================================================


const getISOWeekValue = (dateString) => {
  if (!dateString) return "";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  // ISO week-year নির্ধারণ করতে Thursday ব্যবহার হয়।
  const thursday = new Date(date);
  const day = thursday.getDay() || 7;

  thursday.setDate(thursday.getDate() + 4 - day);

  const isoYear = thursday.getFullYear();

  const january4 = new Date(isoYear, 0, 4);
  const january4Day = january4.getDay() || 7;

  const firstMonday = new Date(january4);
  firstMonday.setDate(january4.getDate() - january4Day + 1);

  const monday = new Date(date);
  const currentDay = monday.getDay() || 7;
  monday.setDate(monday.getDate() - currentDay + 1);

  const weekNumber =
    Math.round(
      (monday.getTime() - firstMonday.getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    ) + 1;

  return `${isoYear}-W${String(weekNumber).padStart(2, "0")}`;
};

const getWeekDateRange = (weekValue) => {
  if (!/^\d{4}-W\d{2}$/.test(weekValue || "")) {
    return {};
  }

  const year = Number(weekValue.slice(0, 4));
  const week = Number(weekValue.slice(6, 8));

  if (week < 1 || week > 53) return {};

  const january4 = new Date(year, 0, 4);
  const january4Day = january4.getDay() || 7;

  const monday = new Date(january4);

  monday.setDate(
    january4.getDate() - january4Day + 1 + (week - 1) * 7
  );

  // ISO week-year validation
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);

  if (thursday.getFullYear() !== year) {
    return {};
  }

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: getLocalDateString(monday),
    endDate: getLocalDateString(sunday),
  };
};


const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMinutes = (value) => {
  if (value == null || value === "") return "—";

  const minutes = Number(value);

  if (!Number.isFinite(minutes)) return "—";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;

  return `${hours} hr ${remainingMinutes} min`;
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getEmployeeName = (employee) => {
  if (!employee || typeof employee !== "object") return "—";

  return employee.name || "—";
};

const getEmployeeId = (employee) => {
  if (!employee || typeof employee !== "object") return "";

  return employee.empId || "";
};

const getEmployeeRole = (employee) => {
  if (!employee || typeof employee !== "object") return "—";

  return employee.roleId?.roleName || "—";
};

const getProjectName = (project) => {
  if (!project || typeof project !== "object") return "—";

  return project.projectName || "—";
};

const getStatusStyle = (status) => {
  switch (status) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700";

    case "Rejected":
      return "bg-red-50 text-red-700";

    default:
      return "bg-amber-50 text-amber-700";
  }
};

const getTaskStatusStyle = (status) => {
  switch (status) {
    case "Completed":
      return "bg-emerald-50 text-emerald-700";

    case "In Progress":
      return "bg-blue-50 text-blue-700";

    case "On Break":
      return "bg-orange-50 text-orange-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
};

// =====================================================
// DATE FILTER BUILDER
// Backend supports startDate and endDate.
// We calculate the selected period here.
// =====================================================


const getDateRange = ({ period, selectedDate, startDate, endDate }) => {
  if (period === "all") return {};

  if (period === "custom") {
    if (!startDate || !endDate) return {};

    return { startDate, endDate };
  }

if (period === "week") {
  const isoWeek = getISOWeekValue(selectedDate);
  return getWeekDateRange(isoWeek);
}

  if (!selectedDate) return {};

  const date = new Date(`${selectedDate}T12:00:00`);

  if (Number.isNaN(date.getTime())) return {};

  let start;
  let end;

  if (period === "day") {
    start = new Date(date);
    end = new Date(date);
  } else if (period === "month") {
    start = new Date(date.getFullYear(), date.getMonth(), 1);
    end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  } else {
    return {};
  }

  return {
    startDate: getLocalDateString(start),
    endDate: getLocalDateString(end),
  };
};


// =====================================================
// MAIN COMPONENT
// =====================================================

const Timesheets = () => {
  const { companyId } = useParams();

  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and dropdown filters
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [approvalFilter, setApprovalFilter] = useState("All");
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");

  // Date filters
  const [period, setPeriod] = useState("month");
  const [selectedDate, setSelectedDate] = useState(
    getLocalDateString()
  );

  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Table scroll helpers
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const tableRef = useRef(null);

  const [tableWidth, setTableWidth] = useState(2600);

  // ===================================================
  // FETCH COMPANY TIMESHEETS
  // ===================================================

  const loadTimesheets = useCallback(async () => {
    if (!companyId) {
      setError("Company ID is missing from the URL.");
      setTimesheets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const dateRange = getDateRange({
        period,
        selectedDate,
        startDate: customStartDate,
        endDate: customEndDate,
      });

      const response = await api.get(
        `/timesheets/company/${companyId}`,
        {
          params: dateRange,
        }
      );

      setTimesheets(response.data?.timesheets || []);
    } catch (err) {
      setTimesheets([]);

      setError(
        err.response?.data?.message ||
          "Failed to load company timesheets."
      );
    } finally {
      setLoading(false);
    }
  }, [
    companyId,
    period,
    selectedDate,
    customStartDate,
    customEndDate,
  ]);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  // ===================================================
  // EMPLOYEE DROPDOWN OPTIONS
  // ===================================================

  const employees = useMemo(() => {
    const employeeMap = new Map();

    timesheets.forEach((item) => {
      const employee = item.employeeId;

      if (!employee || typeof employee !== "object") return;

      const id = employee._id;

      if (!id) return;

      employeeMap.set(id, employee);
    });

    return Array.from(employeeMap.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [timesheets]);

  // ===================================================
  // FRONTEND FILTERS
  // ===================================================

  const filteredTimesheets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return timesheets.filter((item) => {
      const employee = item.employeeId;
      const employeeName = getEmployeeName(employee);
      const employeeCode = getEmployeeId(employee);
      const employeeRole = getEmployeeRole(employee);
      const projectName = getProjectName(item.projectId);

      const matchesSearch =
        !normalizedSearch ||
        [
          employeeName,
          employeeCode,
          employeeRole,
          item.task,
          item.taskType,
          item.description,
          projectName,
          item.remarks?.reason,
          item.remarks?.delayFast,
          item.rejectionReason,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch)
          );

      const matchesEmployee =
        employeeFilter === "All" ||
        employee?._id === employeeFilter;

      const matchesApproval =
        approvalFilter === "All" ||
        (item.approvalStatus || "Pending") === approvalFilter;

      const matchesTaskStatus =
        taskStatusFilter === "All" ||
        item.taskStatus === taskStatusFilter;

      return (
        matchesSearch &&
        matchesEmployee &&
        matchesApproval &&
        matchesTaskStatus
      );
    });
  }, [
    timesheets,
    search,
    employeeFilter,
    approvalFilter,
    taskStatusFilter,
  ]);

  // ===================================================
  // SUMMARY
  // ===================================================

  const stats = useMemo(
    () => ({
      total: filteredTimesheets.length,

      pending: filteredTimesheets.filter(
        (item) => (item.approvalStatus || "Pending") === "Pending"
      ).length,

      approved: filteredTimesheets.filter(
        (item) => item.approvalStatus === "Approved"
      ).length,

      rejected: filteredTimesheets.filter(
        (item) => item.approvalStatus === "Rejected"
      ).length,
    }),
    [filteredTimesheets]
  );

  // ===================================================
  // TABLE WIDTH
  // ===================================================

  useEffect(() => {
    const updateTableWidth = () => {
      if (tableRef.current) {
        setTableWidth(tableRef.current.scrollWidth);
      }
    };

    updateTableWidth();

    const resizeObserver = tableRef.current
      ? new ResizeObserver(updateTableWidth)
      : null;

    if (resizeObserver && tableRef.current) {
      resizeObserver.observe(tableRef.current);
    }

    window.addEventListener("resize", updateTableWidth);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateTableWidth);
    };
  }, [loading, filteredTimesheets.length]);

  // ===================================================
  // HORIZONTAL SCROLL SYNC
  // ===================================================

  const handleTopScroll = () => {
    const top = topScrollRef.current;
    const table = tableScrollRef.current;

    if (top && table && table.scrollLeft !== top.scrollLeft) {
      table.scrollLeft = top.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    const top = topScrollRef.current;
    const table = tableScrollRef.current;

    if (top && table && top.scrollLeft !== table.scrollLeft) {
      top.scrollLeft = table.scrollLeft;
    }
  };

  // ===================================================
  // RESET FILTERS
  // ===================================================

  const resetFilters = () => {
    setSearch("");
    setEmployeeFilter("All");
    setApprovalFilter("All");
    setTaskStatusFilter("All");

    setPeriod("month");
    setSelectedDate(getLocalDateString());

    setCustomStartDate("");
    setCustomEndDate("");
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <CalendarDays size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Company Timesheets
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View and monitor all employee timesheet records.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadTimesheets}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            label: "Total Timesheets",
            value: stats.total,
            icon: ClipboardList,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
          {
            label: "Pending",
            value: stats.pending,
            icon: Clock3,
            color: "text-amber-700",
            bg: "bg-amber-50",
          },
          {
            label: "Approved",
            value: stats.approved,
            icon: CheckCircle2,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
          },
          {
            label: "Rejected",
            value: stats.rejected,
            icon: XCircle,
            color: "text-red-700",
            bg: "bg-red-50",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {stat.label}
                </p>

                <div className={`rounded-lg p-2 ${stat.bg} ${stat.color}`}>
                  <Icon size={19} />
                </div>
              </div>

              <p className={`mt-3 text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* =================================================
          FILTER SECTION
      ================================================= */}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Filter Timesheets
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Filter records by employee, date and status.
            </p>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

          {/* Employee / Controller */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Employee / Controller
            </label>

            <select
              value={employeeFilter}
              onChange={(event) =>
                setEmployeeFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Employees</option>

              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                  {employee.empId ? ` (${employee.empId})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Period */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Date Filter
            </label>

            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All Dates</option>
              <option value="day">Specific Date</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Date / Month / Week reference date */}

          {period !== "all" && period !== "custom" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {period === "month"
                  ? "Select Month"
                  : period === "week"
                  ? "Select Any Date in Week"
                  : "Select Date"}
              </label>


<input
  type={
    period === "month"
      ? "month"
      : period === "week"
      ? "week"
      : "date"
  }
  value={
    period === "month"
      ? selectedDate.slice(0, 7)
      : period === "week"
      ? getISOWeekValue(selectedDate)
      : selectedDate
  }
  onChange={(event) => {
    const value = event.target.value;

    if (period === "month") {
      setSelectedDate(`${value}-01`);
    } else if (period === "week") {
      const range = getWeekDateRange(value);

      if (range.startDate) {
        // Selected week's Monday
        setSelectedDate(range.startDate);
      }
    } else {
      setSelectedDate(value);
    }
  }}
  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
/>

            </div>
          )}

          {/* Approval Status */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Approval Status
            </label>

            <select
              value={approvalFilter}
              onChange={(event) =>
                setApprovalFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Custom date range */}

          {period === "custom" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Start Date
                </label>

                <input
                  type="date"
                  value={customStartDate}
                  max={customEndDate || undefined}
                  onChange={(event) =>
                    setCustomStartDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  End Date
                </label>

                <input
                  type="date"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  onChange={(event) =>
                    setCustomEndDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Task Status */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Task Status
            </label>

            <select
              value={taskStatusFilter}
              onChange={(event) =>
                setTaskStatusFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Task Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="On Break">On Break</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Search */}

        <div className="relative">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, role, task, project, description..."
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </section>

      {/* =================================================
          TIMESHEET TABLE
      ================================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Timesheet Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredTimesheets.length} record(s) found
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={16} />
            {employees.length} employee(s)
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
            <RefreshCw size={19} className="animate-spin" />
            Loading company timesheets...
          </div>
        ) : filteredTimesheets.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays
              size={35}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 font-semibold text-slate-700">
              No timesheets found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              No records match your selected filters.
            </p>
          </div>
        ) : (
          <>
            {/* Top horizontal scrollbar */}

            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="ts-top-scroll overflow-x-auto overflow-y-hidden border-b border-slate-100 bg-slate-50"
            >
              <div style={{ width: tableWidth, height: 1 }} />
            </div>

            {/* Main table */}

            <div
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="ts-table-scroll max-h-[70vh] overflow-auto"
            >
              <table
                ref={tableRef}
                className="ts-table w-full min-w-[3000px] text-left text-sm"
              >
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Employee</th>
                    <th className="px-4 py-4">Employee ID</th>
                    <th className="px-4 py-4">Role</th>
                    <th className="px-4 py-4">Task Type</th>
                    <th className="px-4 py-4">Task / Module</th>
                    <th className="px-4 py-4">Description</th>
                    <th className="px-4 py-4">Project</th>
                    <th className="px-4 py-4">Estimated Time</th>
                    <th className="px-4 py-4">Start Time</th>
                    <th className="px-4 py-4">End Time</th>
                    <th className="px-4 py-4">Completion Time</th>
                    <th className="px-4 py-4">Idle Time</th>
                    <th className="px-4 py-4">Estimated Error</th>
                    <th className="px-4 py-4">Break Duration</th>
                    <th className="px-4 py-4">Task Status</th>
                    <th className="px-4 py-4">Efficiency</th>
                    <th className="px-4 py-4">Delay / Fast</th>
                    <th className="px-4 py-4">Reason</th>
                    <th className="px-4 py-4">Approval Status</th>
                    <th className="px-4 py-4">Audited By</th>
                    <th className="px-4 py-4">Rejection Reason</th>
                    <th className="px-4 py-4">Created At</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredTimesheets.map((item) => {
                    const employee = item.employeeId;

                    return (
                      <tr
                        key={item._id}
                        className="align-top hover:bg-slate-50"
                      >
                        <td className="min-w-36 px-4 py-4 text-slate-600">
                          {formatDate(item.date)}
                        </td>

                        <td className="min-w-44 px-4 py-4 font-semibold text-slate-700">
                          {getEmployeeName(employee)}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {getEmployeeId(employee) || "—"}
                        </td>

                        <td className="min-w-40 px-4 py-4 text-slate-600">
                          {getEmployeeRole(employee)}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {item.taskType || "Project"}
                        </td>

                        <td className="min-w-48 px-4 py-4 font-medium text-slate-700">
                          {item.task || "—"}
                        </td>

                        <td className="min-w-56 whitespace-pre-wrap px-4 py-4 text-slate-600">
                          {item.description || "—"}
                        </td>

                        <td className="min-w-48 px-4 py-4 text-slate-700">
                          {getProjectName(item.projectId)}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatMinutes(item.estimatedTime)}
                        </td>

                        <td className="min-w-48 px-4 py-4 text-slate-600">
                          {formatDateTime(item.startTime)}
                        </td>

                        <td className="min-w-48 px-4 py-4 text-slate-600">
                          {formatDateTime(item.endTime)}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatMinutes(item.totalCompletionTime)}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatMinutes(item.idleTime)}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatMinutes(item.estimatedError)}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatMinutes(item.breakTime?.duration)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getTaskStatusStyle(
                              item.taskStatus
                            )}`}
                          >
                            {item.taskStatus || "Not Started"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {item.efficiency == null ? (
                            "—"
                          ) : (
                            <span className="font-semibold text-blue-700">
                              {Number(item.efficiency).toFixed(2)}%
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {item.remarks?.delayFast || "—"}
                        </td>

                        <td className="min-w-48 whitespace-pre-wrap px-4 py-4 text-slate-600">
                          {item.remarks?.reason || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                              item.approvalStatus || "Pending"
                            )}`}
                          >
                            {item.approvalStatus || "Pending"}
                          </span>
                        </td>

                        <td className="min-w-40 px-4 py-4 text-slate-600">
                          {item.auditedBy &&
                          typeof item.auditedBy === "object"
                            ? item.auditedBy.name || "—"
                            : "—"}
                        </td>

                        <td className="min-w-48 whitespace-pre-wrap px-4 py-4 text-red-600">
                          {item.rejectionReason || "—"}
                        </td>

                        <td className="min-w-48 px-4 py-4 text-slate-600">
                          {formatDateTime(item.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* =================================================
          INTERNAL CSS
      ================================================= */}

      <style>{`
        .ts-table thead th {
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: #f8fafc;
          white-space: nowrap;
        }

        .ts-top-scroll::-webkit-scrollbar,
        .ts-table-scroll::-webkit-scrollbar {
          height: 12px;
          width: 12px;
        }

        .ts-top-scroll::-webkit-scrollbar-track,
        .ts-table-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .ts-top-scroll::-webkit-scrollbar-thumb,
        .ts-table-scroll::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 9999px;
          border: 3px solid #f1f5f9;
        }

        .ts-top-scroll::-webkit-scrollbar-thumb:hover,
        .ts-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }

        .ts-table-scroll::-webkit-scrollbar:horizontal {
          display: none;
          height: 0;
        }
      `}</style>
    </div>
  );
};

export default Timesheets;
