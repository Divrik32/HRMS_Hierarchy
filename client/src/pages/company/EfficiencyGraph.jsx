import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Activity,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

import api from "../../api/axios";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#ca8a04",
  "#4f46e5",
  "#0d9488",
  "#e11d48",
];

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDefaultDates = () => {
  const end = new Date();
  const start = new Date();

  start.setDate(start.getDate() - 6);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
};

const EfficiencyGraph = () => {
  const { companyId } = useParams();

  const [dateRange, setDateRange] = useState(getDefaultDates);
  const [graphData, setGraphData] = useState([]);
  const [dates, setDates] = useState([]);
  const [searchEmployee, setSearchEmployee] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadEfficiency = useCallback(async () => {
    if (!companyId) {
      setError("Company ID is missing.");
      return;
    }

    if (
      !dateRange.startDate ||
      !dateRange.endDate ||
      dateRange.startDate > dateRange.endDate
    ) {
      setError("End date must be after start date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/timesheets/company/${companyId}/daily-efficiency`,
        {
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        }
      );

      setGraphData(response.data?.graphData || []);
      setDates(response.data?.dates || []);
    } catch (err) {
      setGraphData([]);
      setDates([]);

      setError(
        err.response?.data?.message ||
          "Failed to load daily efficiency graph."
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, dateRange]);

  useEffect(() => {
    loadEfficiency();
  }, [loadEfficiency]);

  const handleDateChange = (field, value) => {
    setDateRange((previous) => ({
      ...previous,
      [field]: value,
    }));
  };
  const filteredGraphData = useMemo(() => {
  const search = searchEmployee.trim().toLowerCase();

  if (!search) return graphData;

  return graphData.filter((employee) => {
    const name = employee.employeeName || "";
    const email = employee.email || employee.employeeEmail || "";
    const empId = employee.empId || "";

    return (
      name.toLowerCase().includes(search) ||
      email.toLowerCase().includes(search) ||
      empId.toLowerCase().includes(search)
    );
  });
}, [graphData, searchEmployee]);

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <Activity size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Daily Efficiency
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track daily efficiency of all company employees.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadEfficiency}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} />
          Refresh
        </button>

      </div>

      {/* Date Filter */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-4 flex items-center gap-2">
          <CalendarDays size={19} className="text-blue-600" />

          <h2 className="font-semibold text-slate-800">
            Select Date Range
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              Start Date
            </label>

            <input
              type="date"
              value={dateRange.startDate}
              max={dateRange.endDate}
              onChange={(e) =>
                handleDateChange("startDate", e.target.value)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              End Date
            </label>

            <input
              type="date"
              value={dateRange.endDate}
              min={dateRange.startDate}
              max={formatDate(new Date())}
              onChange={(e) =>
                handleDateChange("endDate", e.target.value)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={loadEfficiency}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Apply Filter
            </button>
          </div>

        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Employee Search */}
<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <label
    htmlFor="employee-search"
    className="mb-2 block text-sm font-semibold text-slate-700"
  >
    Search Employee
  </label>

  <input
    id="employee-search"
    type="text"
    value={searchEmployee}
    onChange={(e) => setSearchEmployee(e.target.value)}
    placeholder="Search by employee name, email or employee ID..."
    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
  />

  {searchEmployee.trim() && (
    <p className="mt-2 text-xs text-slate-500">
      Showing {filteredGraphData.length} of {graphData.length} Employees
    </p>
  )}
</section>

{/* Employee Efficiency Analytics */}
<section className="space-y-6">

  {/* Overall Pie Chart */}
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

    <div className="mb-5">
      <h2 className="text-lg font-bold text-slate-800">
        Overall Employee Efficiency
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Average efficiency distribution across all employees.
      </p>
    </div>

    {loading ? (
      <div className="flex h-80 items-center justify-center gap-2 text-sm text-slate-500">
        <LoaderCircle size={20} className="animate-spin" />
        Loading efficiency data...
      </div>
    ) : graphData.length === 0 ? (
      <div className="flex h-80 flex-col items-center justify-center text-center">
        <Activity size={36} className="text-slate-300" />

        <p className="mt-3 font-semibold text-slate-700">
          No efficiency data available
        </p>

        <p className="mt-1 text-sm text-slate-500">
          No employee records found for this date range.
        </p>
      </div>
    ) : (
      (() => {
        const employeeAverages = graphData
          .map((employee) => {
            const validValues = employee.dailyEfficiency
              ?.map((item) => item.efficiency)
              .filter(
                (value) =>
                  value !== null &&
                  value !== undefined &&
                  Number.isFinite(Number(value))
              ) || [];

            const average = validValues.length
              ? validValues.reduce(
                  (total, value) => total + Number(value),
                  0
                ) / validValues.length
              : 0;

            return {
              employeeId: employee.employeeId,
              employeeName: employee.employeeName,
              empId: employee.empId,
              averageEfficiency: Number(average.toFixed(2)),
              hasData: validValues.length > 0,
            };
          })
          .filter((employee) => employee.hasData);

        return employeeAverages.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            No efficiency records available for the selected dates.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Pie Chart */}
            <div className="min-w-0">
              <h3 className="mb-3 text-center font-semibold text-slate-700">
                Employee Average Efficiency
              </h3>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={employeeAverages}
                      dataKey="averageEfficiency"
                      nameKey="employeeName"
                      cx="50%"
                      cy="50%"
                      outerRadius={115}
                      innerRadius={55}
                      paddingAngle={2}
                      label={({ name, value }) =>
                        `${name}: ${value}%`
                      }
                    >
                      {employeeAverages.map((employee, index) => (
                        <Cell
                          key={employee.employeeId}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) => [
                        `${value}%`,
                        "Average Efficiency",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Employee Average List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700">
                Employee Average Summary
              </h3>

              <div className="max-h-[350px] space-y-3 overflow-y-auto pr-2">
                {employeeAverages.map((employee, index) => (
                  <div
                    key={employee.employeeId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            COLORS[index % COLORS.length],
                        }}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {employee.employeeName}
                        </p>

                        <p className="text-xs text-slate-500">
                          {employee.empId || "N/A"}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-sm font-bold text-slate-800">
                      {employee.averageEfficiency}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        );
      })()
    )}
  </div>

  {/* Individual Employee Bar Charts */}
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

    <div className="mb-5">
      <h2 className="text-lg font-bold text-slate-800">
        Employee Daily Efficiency
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Individual daily average efficiency of each employee.
      </p>

      <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
        {filteredGraphData.length} Employees
      </span>
    </div>

    {loading ? (
      <div className="flex h-80 items-center justify-center gap-2 text-sm text-slate-500">
        <LoaderCircle size={20} className="animate-spin" />
        Loading efficiency data...
      </div>
    ) : filteredGraphData.length === 0 || dates.length === 0 ? (
      <div className="flex h-80 flex-col items-center justify-center text-center">
        <Activity size={36} className="text-slate-300" />

        <p className="mt-3 font-semibold text-slate-700">
          No efficiency data available
        </p>

        <p className="mt-1 text-sm text-slate-500">
          No employee records found for this date range.
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

        {filteredGraphData.map((employee, index) => {
          const employeeChartData = dates.map((date) => {
            const dailyItem = employee.dailyEfficiency?.find(
              (item) => item.date === date
            );

            return {
              date,
              efficiency: dailyItem?.efficiency ?? null,
            };
          });

          return (
            <div
              key={employee.employeeId}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
            >

              {/* Employee Details */}
              <div className="mb-4">
                <h3 className="font-semibold text-slate-800">
                  {employee.employeeName}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Employee ID: {employee.empId || "N/A"}
                </p>
              </div>

              {/* Bar Chart */}
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={employeeChartData}
                    margin={{
                      top: 10,
                      right: 15,
                      left: 0,
                      bottom: 15,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                    />

                    <YAxis
                      domain={[0, "auto"]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />

                    <Tooltip
                      formatter={(value) => [
                        `${value}%`,
                        "Efficiency",
                      ]}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                      }}
                    />

                    <Bar
                      dataKey="efficiency"
                      name="Efficiency"
                      fill={COLORS[index % COLORS.length]}
                      radius={[5, 5, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
          );
        })}

      </div>
    )}
  </div>

</section>

    </div>
  );
};

export default EfficiencyGraph;