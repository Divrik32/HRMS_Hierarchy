
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Send,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
  BriefcaseBusiness,
} from "lucide-react";

import api from "../../api/axios";
import { toast } from "react-toastify";

const initialForm = {
  employeeId: "",
  task: "",
  description: "",
  projectId: "",
  projectName: "",
  trainingTime: "0",
  workingTime: "0",
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

const toDateTimeLocal = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
};

const InlineEditableCell = ({
  field,
  value,
  type = "text",
  options = [],
  onSave,
  disabled = false,
  displayValue,
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const startEditing = () => {
    if (disabled) return;

    if (type === "datetime-local") {
      setEditValue(toDateTimeLocal(value));
    } else if (value == null) {
      setEditValue("");
    } else {
      setEditValue(String(value));
    }

    setEditing(true);
  };

  const handleSave = async () => {
    let valueToSave = editValue;

    if (type === "number") {
      if (editValue.trim() === "") {
        toast.error("Please enter a value.");
        return;
      }

      valueToSave = Number(editValue);

      if (!Number.isFinite(valueToSave) || valueToSave < 0) {
        toast.error("Enter a valid non-negative number.");
        return;
      }
    }

    if (type === "datetime-local") {
      valueToSave = editValue
        ? new Date(editValue).toISOString()
        : null;
    }

    const success = await onSave(field, valueToSave);

    if (success) {
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex min-w-32 items-center gap-2">
        <span className="min-w-0 flex-1 break-words text-slate-700">
          {displayValue ?? value ?? "—"}
        </span>

        {!disabled && (
          <button
            type="button"
            onClick={startEditing}
            title={`Edit ${field}`}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-40 space-y-2">
      {type === "select" ? (
        <select
          autoFocus
          value={editValue}
          onChange={(event) => setEditValue(event.target.value)}
          className="w-full rounded-lg border border-blue-300 bg-white px-2 py-2 text-xs outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          autoFocus
          rows={3}
          value={editValue}
          onChange={(event) => setEditValue(event.target.value)}
          className="w-full rounded-lg border border-blue-300 px-2 py-2 text-xs outline-none"
        />
      ) : (
        <input
          autoFocus
          type={type}
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "any" : undefined}
          value={editValue}
          onChange={(event) => setEditValue(event.target.value)}
          className="w-full rounded-lg border border-blue-300 px-2 py-2 text-xs outline-none"
        />
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Save
        </button>

        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const getStatusStyle = (status) => {
  switch (status) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Rejected":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200";
  }
};

const Timesheet = () => {
  const [employee, setEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Logged-in employee profile.
      const profileResponse = await api.get("/employees/profile/me");
      const currentEmployee = profileResponse.data?.employee;

      if (!currentEmployee?._id) {
        throw new Error("Employee profile could not be loaded.");
      }

      setEmployee(currentEmployee);
      // Load all employees belonging to the logged-in employee's company.
      const employeesResponse = await api.get(
        "/timesheets/company-employees"
      );
      
      setEmployees(employeesResponse.data?.employees || []);

// Load all timesheets belonging to the logged-in employee's company.
const timesheetResponse = await api.get("/timesheets");

const allTimesheets =
  timesheetResponse.data?.timesheets || [];

setTimesheets(allTimesheets);

      // Optional: load projects accessible to this employee.
      try {
        const projectResponse = await api.get(
          "/projects/my-accessible-projects"
        );

        const projectData =
          projectResponse.data?.projects ||
          projectResponse.data?.accessibleProjects ||
          [];

        setProjects(Array.isArray(projectData) ? projectData : []);
      } catch (projectError) {
        console.warn(
          "Projects could not be loaded:",
          projectError.response?.data?.message ||
            projectError.message
        );

        setProjects([]);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Failed to load timesheet data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const companyName =
    typeof employee?.companyId === "object"
      ? employee.companyId?.companyName || ""
      : employee?.companyName || "";

  const companyId =
    typeof employee?.companyId === "object"
      ? employee.companyId?._id
      : employee?.companyId;

  const departmentName =
    typeof employee?.departmentId === "object"
      ? employee.departmentId?.departmentName || ""
      : "";

  const roleName =
    typeof employee?.roleId === "object"
      ? employee.roleId?.roleName || ""
      : "";

  const setField = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

const openCreateForm = () => {
  setForm({
    ...initialForm,
    employeeId: "",
  });
  setError("");
  setSuccess("");
  setShowForm(true);
};

const handleProjectChange = (projectId) => {
  setForm((previous) => ({
    ...previous,
    projectId,
  }));
};

const handleInlineUpdate = async (timesheet, field, value) => {
  try {
    await api.patch(`/timesheets/${timesheet._id}`, {
      field,
      value,
    });

    toast.success("Field updated successfully.");

    await loadData();

    return true;
  } catch (requestError) {
    toast.error(
      requestError.response?.data?.message ||
        "Failed to update this field."
    );

    return false;
  }
};

const handleSubmit = async (event) => {
  event.preventDefault();

  setError("");
  setSuccess("");

  if (!employee?._id || !companyId) {
    setError("Employee or company details are unavailable.");
    return;
  }

  if (!form.employeeId) {
    setError("Please select an employee.");
    return;
  }

  const selectedEmployee = employees.find(
    (item) => String(item._id) === String(form.employeeId)
  );

  if (!selectedEmployee) {
    setError("Selected employee is not available in your company.");
    return;
  }

  if (!form.task.trim()) {
    setError("Please enter a task.");
    return;
  }

  const trainingTime = Number(form.trainingTime);
  const workingTime = Number(form.workingTime);

  if (
    form.trainingTime === "" ||
    form.workingTime === "" ||
    !Number.isFinite(trainingTime) ||
    trainingTime < 0 ||
    !Number.isFinite(workingTime) ||
    workingTime < 0
  ) {
    setError("Training time and working time are required and must be non-negative numbers.");
    return;
  }

const payload = {
  employeeId: form.employeeId,
  task: form.task.trim(),
  description: form.description.trim(),
  projectId: form.projectId || null,
  projectName: form.projectName.trim(),

  allocatedTime: {
    trainingTime,
    workingTime,
  },
};

  setSaving(true);

try {
  await api.post("/timesheets", payload);

  toast.success("Timesheet created successfully.");

  setShowForm(false);
  setForm({ ...initialForm });

  await loadData();
} catch (requestError) {
    const message =
      requestError.response?.data?.message ||
      "Failed to save timesheet. Please check the API response.";

    toast.error(message);
  } finally {
    setSaving(false);
  }
};

const handleAudit = async (timesheet, approvalStatus) => {
  const confirmed = window.confirm(
    `Are you sure you want to ${approvalStatus.toLowerCase()} this timesheet?`
  );

  if (!confirmed) return;

  try {
    await api.patch(`/timesheets/${timesheet._id}/audit`, {
      approvalStatus,
    });

    toast.success(
      `Timesheet ${approvalStatus.toLowerCase()} successfully.`
    );

    await loadData();
  } catch (requestError) {
    toast.error(
      requestError.response?.data?.message ||
        "You may not have permission to audit this timesheet."
    );
  }
};

  const filteredTimesheets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return timesheets.filter((item) => {
      const matchesStatus =
        statusFilter === "All" ||
        (item.approvalStatus || "Pending") === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        [
          item.task,
          item.description,
          item.projectName,
          item.empId,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch)
          );

      return matchesStatus && matchesSearch;
    });
  }, [timesheets, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: timesheets.length,
      pending: timesheets.filter(
        (item) => (item.approvalStatus || "Pending") === "Pending"
      ).length,
      approved: timesheets.filter(
        (item) => item.approvalStatus === "Approved"
      ).length,
      rejected: timesheets.filter(
        (item) => item.approvalStatus === "Rejected"
      ).length,
    };
  }, [timesheets]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600">
          <RefreshCw className="animate-spin" size={20} />
          <span>Loading timesheets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Employee Workspace
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              My Timesheets
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create, manage and track your daily work records.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={18} />
              New Timesheet
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Automatically populated employee and company details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <BriefcaseBusiness size={21} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Employee Information
              </h2>
              <p className="text-sm text-slate-500">
                Automatically loaded from your account
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField label="Employee Name" value={employee?.name} />
            <InfoField label="Employee ID" value={employee?.empId} />
            <InfoField label="Company Name" value={companyName} />
            <InfoField label="Department" value={departmentName} />
            <InfoField label="Role" value={roleName} />
            <InfoField label="Email" value={employee?.email} />
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Total Timesheets"
            value={stats.total}
            icon={<FileText size={20} />}
            iconClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            label="Pending"
            value={stats.pending}
            icon={<Clock size={20} />}
            iconClass="bg-amber-50 text-amber-600"
          />

          <StatCard
            label="Approved"
            value={stats.approved}
            icon={<CheckCircle2 size={20} />}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={<XCircle size={20} />}
            iconClass="bg-red-50 text-red-600"
          />
        </section>
{/* Timesheet table */}
<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h2 className="text-lg font-bold text-slate-900">
        Timesheet Records
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {filteredTimesheets.length} record(s)
      </p>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search timesheets..."
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-56"
        />
      </div>

      <select
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      >
        <option value="All">All statuses</option>
        <option value="Pending">Pending</option>
        <option value="Approved">Approved</option>
        <option value="Rejected">Rejected</option>
      </select>
    </div>
  </div>

  {filteredTimesheets.length === 0 ? (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <CalendarDays size={25} />
      </div>

      <h3 className="font-semibold text-slate-800">
        No timesheets found
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Create a timesheet or change your search filters.
      </p>

      <button
        type="button"
        onClick={openCreateForm}
        className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Create Timesheet
      </button>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[2800px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-4">Employee</th>
            <th className="px-4 py-4">Task</th>
            <th className="px-4 py-4">Description</th>
            <th className="px-4 py-4">Project</th>
            <th className="px-4 py-4">Project Name</th>
            <th className="px-4 py-4">Training Time</th>
            <th className="px-4 py-4">Working Time</th>
            <th className="px-4 py-4">Idle Time</th>
            <th className="px-4 py-4">Start Time</th>
            <th className="px-4 py-4">End Time</th>
            <th className="px-4 py-4">Total Completion Time</th>
            <th className="px-4 py-4">Efficiency</th>
            <th className="px-4 py-4">Delay / Fast</th>
            <th className="px-4 py-4">Reason</th>
            <th className="px-4 py-4">Approval Status</th>
            <th className="px-4 py-4">Audited By</th>
            <th className="px-4 py-4">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {filteredTimesheets.map((item) => {
            const isApproved = item.approvalStatus === "Approved";

            const employeeName =
              typeof item.employeeId === "object"
                ? `${item.employeeId?.name || ""}${
                    item.employeeId?.empId
                      ? ` (${item.employeeId.empId})`
                      : ""
                  }`
                : "—";

const projectId =
  typeof item.projectId === "object"
    ? item.projectId?._id || ""
    : item.projectId || "";

const projectDisplay =
  typeof item.projectId === "object"
    ? item.projectId?.projectName || "—"
    : projects.find(
        (project) => String(project._id) === String(item.projectId)
      )?.projectName || "—";

            const auditedBy =
              typeof item.auditedBy === "object"
                ? item.auditedBy?.name || "—"
                : "—";

            return (
              <tr
                key={item._id}
                className="align-top hover:bg-slate-50/70"
              >
{/* Employee */}
<td className="min-w-48 px-4 py-4">
  <InlineEditableCell
    field="employeeId"
    value={
      typeof item.employeeId === "object"
        ? item.employeeId?._id || ""
        : item.employeeId || ""
    }
    type="select"
    displayValue={employeeName}
    options={[
      { value: "", label: "Select Employee" },
      ...employees.map((emp) => ({
        value: String(emp._id),
        label: `${emp.name} (${emp.empId})`,
      })),
    ]}
    onSave={(field, value) =>
      handleInlineUpdate(item, field, value)
    }
    disabled={isApproved}
  />
</td>

                {/* Task */}
                <td className="min-w-48 px-4 py-4">
                  <InlineEditableCell
                    field="task"
                    value={item.task}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* Description */}
                <td className="min-w-56 px-4 py-4">
                  <InlineEditableCell
                    field="description"
                    value={item.description}
                    type="textarea"
                    displayValue={item.description || "—"}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* Project */}
                <td className="min-w-56 px-4 py-4">
                  <InlineEditableCell
                    field="projectId"
                    value={projectId}
                    type="select"
                    displayValue={projectDisplay}
options={[
  {
    value: "",
    label: "No Project / External Task",
  },
  ...projects.map((project) => ({
    value: String(project._id),
    label: `${project.projectName}${
      project.projectCode
        ? ` (${project.projectCode})`
        : ""
    }`,
  })),
]}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* Project Name */}
                <td className="min-w-48 px-4 py-4">
                  <InlineEditableCell
                    field="projectName"
                    value={item.projectName}
                    displayValue={item.projectName || "—"}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* Training Time */}
                <td className="min-w-36 px-4 py-4">
                  <InlineEditableCell
                    field="allocatedTime.trainingTime"
                    value={item.allocatedTime?.trainingTime ?? 0}
                    type="number"
                    displayValue={`${item.allocatedTime?.trainingTime ?? 0} min`}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* Working Time */}
                <td className="min-w-36 px-4 py-4">
                  <InlineEditableCell
                    field="allocatedTime.workingTime"
                    value={item.allocatedTime?.workingTime ?? 0}
                    type="number"
                    displayValue={`${item.allocatedTime?.workingTime ?? 0} min`}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* Idle Time */}
                <td className="min-w-36 px-4 py-4">
                  <InlineEditableCell
                    field="allocatedTime.idleTime"
                    value={item.allocatedTime?.idleTime ?? 0}
                    type="number"
                    displayValue={`${item.allocatedTime?.idleTime ?? 0} min`}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* Start Time */}
                <td className="min-w-56 px-4 py-4">
                  <InlineEditableCell
                    field="startTime"
                    value={item.startTime}
                    type="datetime-local"
                    displayValue={formatDateTime(item.startTime)}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* End Time */}
                <td className="min-w-56 px-4 py-4">
                  <InlineEditableCell
                    field="endTime"
                    value={item.endTime}
                    type="datetime-local"
                    displayValue={formatDateTime(item.endTime)}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* Total Completion Time - calculated/read only */}
                <td className="min-w-40 px-4 py-4 text-slate-700">
                  {item.totalCompletionTime == null
                    ? "—"
                    : `${item.totalCompletionTime} min`}
                </td>

                {/* Efficiency - calculated/read only */}
                <td className="min-w-32 px-4 py-4">
                  {item.efficiency == null ? (
                    "—"
                  ) : (
                    <span className="font-semibold text-blue-700">
                      {item.efficiency}%
                    </span>
                  )}
                </td>

                {/* Delay / Fast */}
                <td className="min-w-40 px-4 py-4">
                  <InlineEditableCell
                    field="remarks.delayFast"
                    value={item.remarks?.delayFast || ""}
                    type="select"
                    displayValue={item.remarks?.delayFast || "—"}
                    options={[
                      { value: "", label: "Select" },
                      { value: "Delay", label: "Delay" },
                      { value: "Fast", label: "Fast" },
                    ]}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* Reason */}
                <td className="min-w-56 px-4 py-4">
                  <InlineEditableCell
                    field="remarks.reason"
                    value={item.remarks?.reason || ""}
                    type="textarea"
                    displayValue={item.remarks?.reason || "—"}
                    onSave={(field, value) =>
                      handleInlineUpdate(item, field, value)
                    }
                    disabled={isApproved}
                  />
                </td>

                {/* Approval Status - audit action controls this */}
                <td className="min-w-36 px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(
                      item.approvalStatus || "Pending"
                    )}`}
                  >
                    {item.approvalStatus || "Pending"}
                  </span>
                </td>

                {/* Audited By - read only */}
                <td className="min-w-40 px-4 py-4 text-slate-600">
                  {auditedBy}
                </td>

                {/* Actions */}
                <td className="min-w-44 px-4 py-4">
                  {(item.approvalStatus || "Pending") === "Pending" && (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleAudit(item, "Approved")}
                        className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAudit(item, "Rejected")}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
</section>

        {/* Create / edit modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-6 backdrop-blur-sm sm:p-6">
            <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Create Timesheet
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select an employee from your company and enter their timesheet details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close form"
                >
                  <X size={21} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
                  <FormField label="Company Name">
                    <input
                      value={companyName || "Loading company name..."}
                      readOnly
                      className="form-input-custom cursor-not-allowed bg-slate-100 text-slate-600"
                    />
                  </FormField>
<FormField label="Employee" required>
  <select
    value={form.employeeId}
    onChange={(event) =>
      setField("employeeId", event.target.value)
    }
    required
    className="form-input-custom disabled:cursor-not-allowed disabled:bg-slate-100"
  >
    <option value="">Select Employee</option>

    {employees.map((item) => (
      <option key={item._id} value={item._id}>
        {item.name} ({item.empId})
      </option>
    ))}
  </select>
</FormField>

                  <FormField label="Task" required>
                    <input
                      value={form.task}
                      onChange={(event) =>
                        setField("task", event.target.value)
                      }
                      required
                      placeholder="e.g. Develop employee dashboard"
                      className="form-input-custom"
                    />
                  </FormField>
<FormField label="Project (Optional)">
  <select
    value={form.projectId}
    onChange={(event) =>
      handleProjectChange(event.target.value)
    }
    className="form-input-custom"
  >
    <option value="">No Project / External Task</option>

    {projects.map((project) => (
      <option key={project._id} value={project._id}>
        {project.projectName}
        {project.projectCode ? ` (${project.projectCode})` : ""}
      </option>
    ))}
  </select>
</FormField>

<FormField label="Project Name / Activity Name (Optional)">
  <input
    value={form.projectName}
    onChange={(event) =>
      setField("projectName", event.target.value)
    }
    placeholder="Enter project or activity name"
    className="form-input-custom"
  />
</FormField>

                  <FormField label="Description">
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setField("description", event.target.value)
                      }
                      rows={2}
                      placeholder="Describe the work..."
                      className="form-input-custom"
                    />
                  </FormField>

<div className="sm:col-span-2">
  <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
    <Clock3 size={17} className="text-blue-600" />
    Time Allocation (minutes)
  </h3>

  <div className="grid gap-4 sm:grid-cols-2">
    <FormField label="Training Time" required>
      <input
        type="number"
        min="0"
        step="any"
        value={form.trainingTime}
        onChange={(event) =>
          setField("trainingTime", event.target.value)
        }
        required
        className="form-input-custom"
      />
    </FormField>

    <FormField label="Working Time" required>
      <input
        type="number"
        min="0"
        step="any"
        value={form.workingTime}
        onChange={(event) =>
          setField("workingTime", event.target.value)
        }
        required
        className="form-input-custom"
      />
    </FormField>
  </div>
</div>
                </div>

                <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:px-7">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <RefreshCw size={17} className="animate-spin" />
                    ) : (
                      <Send size={17} />
                    )}

                    {saving ? "Saving..." : "Create Timesheet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .form-input-custom {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          background-color: white;
          padding: 0.7rem 0.8rem;
          font-size: 0.875rem;
          color: #1e293b;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
        }

        .form-input-custom:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgb(59 130 246 / 12%);
        }

        .form-input-custom::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

const InfoField = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold text-slate-800">
      {value || "—"}
    </p>
  </div>
);

const StatCard = ({ label, value, icon, iconClass }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-slate-500">{label}</p>
      <div className={`rounded-xl p-2.5 ${iconClass}`}>{icon}</div>
    </div>
    <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const FormField = ({ label, required = false, children }) => (
  <div className="min-w-0">
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    {children}
  </div>
);

export default Timesheet;
