
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  LoaderCircle,
  AlertCircle,
  CalendarDays,
} from "lucide-react";

import api from "../../api/axios";

const emptyForm = {
  departmentName: "",
  description: "",
};

const Departments = () => {
  const { companyId } = useParams();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [deletingId, setDeletingId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Get all departments belonging to this company.
  const loadDepartments = useCallback(async () => {
    if (!companyId) {
      setError("Company ID is missing from the URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/departments/company/${companyId}`
      );

      const result = response.data;

      if (!result.success) {
        throw new Error(
          result.message || "Failed to load departments."
        );
      }

      setDepartments(result.departments || []);
    } catch (err) {
      console.error(
        "Load Departments Error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load departments."
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Filter departments by search text and status.
  const filteredDepartments = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return departments.filter((department) => {
      const matchesSearch =
        department.departmentName
          ?.toLowerCase()
          .includes(searchText) ||
        department.description
          ?.toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        department.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [departments, search, statusFilter]);

  const activeCount = departments.filter(
    (department) => department.status === "active"
  ).length;

  const inactiveCount = departments.filter(
    (department) => department.status === "inactive"
  ).length;

  const openCreateModal = () => {
    setEditingDepartment(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (department) => {
    setEditingDepartment(department);

    setForm({
      departmentName: department.departmentName || "",
      description: department.description || "",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;

    setModalOpen(false);
    setEditingDepartment(null);
    setForm(emptyForm);
    setError("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Create or update a department.
  const handleSubmit = async (e) => {
    e.preventDefault();

    const departmentName = form.departmentName.trim();
    const description = form.description.trim();

    if (!departmentName) {
      setError("Department name is required.");
      return;
    }

    if (!companyId) {
      setError("Company ID is missing.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (editingDepartment) {
        const response = await api.put(
          `/departments/${editingDepartment._id}`,
          {
            departmentName,
            description,
          }
        );

        if (!response.data.success) {
          throw new Error(
            response.data.message || "Failed to update department."
          );
        }

        setSuccess("Department updated successfully.");
      } else {
        const response = await api.post("/departments", {
          departmentName,
          description,
          companyId,
        });

        if (!response.data.success) {
          throw new Error(
            response.data.message || "Failed to create department."
          );
        }

        setSuccess("Department created successfully.");
      }

      setModalOpen(false);
      setEditingDepartment(null);
      setForm(emptyForm);

      await loadDepartments();
    } catch (err) {
      console.error(
        "Save Department Error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save department."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active/inactive status.
  const handleStatusChange = async (department) => {
    const newStatus =
      department.status === "active" ? "inactive" : "active";

    const confirmed = window.confirm(
      `Are you sure you want to mark "${department.departmentName}" as ${newStatus}?`
    );

    if (!confirmed) return;

    setUpdatingStatusId(department._id);
    setError("");
    setSuccess("");

    try {
      const response = await api.patch(
        `/departments/${department._id}/status`,
        { status: newStatus }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to update department status."
        );
      }

      setSuccess(`Department marked ${newStatus} successfully.`);
      await loadDepartments();
    } catch (err) {
      console.error(
        "Department Status Error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update department status."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Delete department.
  const handleDelete = async (department) => {
    const confirmed = window.confirm(
      `Delete "${department.departmentName}" department? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(department._id);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(
        `/departments/${department._id}`
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to delete department."
        );
      }

      setDepartments((previous) =>
        previous.filter((item) => item._id !== department._id)
      );

      setSuccess("Department deleted successfully.");
    } catch (err) {
      console.error(
        "Delete Department Error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete department."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Building2 size={16} />
              <span>Company Workspace</span>
              <span>/</span>
              <span className="text-blue-600">Departments</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Departments
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create, organize and manage your company departments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadDepartments}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Department
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p className="min-w-0 flex-1">{error}</p>
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
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <p className="min-w-0 flex-1">{success}</p>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Departments
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {departments.length}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Building2 size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active Departments
                </p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">
                  {activeCount}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Inactive Departments
                </p>
                <p className="mt-2 text-3xl font-bold text-amber-600">
                  {inactiveCount}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <XCircle size={23} />
              </div>
            </div>
          </div>
        </div>

        {/* Department Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                All Departments
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredDepartments.length} department
                {filteredDepartments.length !== 1 ? "s" : ""} found
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search departments..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8">
              <LoaderCircle
                size={32}
                className="animate-spin text-blue-600"
              />
              <p className="text-sm text-slate-500">
                Loading departments...
              </p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-400">
                <Building2 size={32} />
              </div>

              <h3 className="text-base font-semibold text-slate-800">
                {departments.length === 0
                  ? "No departments yet"
                  : "No matching departments"}
              </h3>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                {departments.length === 0
                  ? "Create your first department to organize your company structure."
                  : "Try a different search term or change the status filter."}
              </p>

              {departments.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Create Department
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Department
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Description
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Created On
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.map((department) => (
                    <tr
                      key={department._id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Building2 size={20} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {department.departmentName}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              ID: {department._id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="max-w-xs px-6 py-4 text-sm text-slate-600">
                        <p className="line-clamp-2">
                          {department.description || "No description"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarDays
                            size={16}
                            className="text-slate-400"
                          />
                          {formatDate(department.createdAt)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            department.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              department.status === "active"
                                ? "bg-emerald-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {department.status === "active"
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(department)}
                            title="Edit department"
                            aria-label={`Edit ${department.departmentName}`}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(department)}
                            disabled={
                              updatingStatusId === department._id
                            }
                            title={
                              department.status === "active"
                                ? "Deactivate department"
                                : "Activate department"
                            }
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            {updatingStatusId === department._id ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : department.status === "active" ? (
                              <XCircle size={16} />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(department)}
                            disabled={deletingId === department._id}
                            title="Delete department"
                            aria-label={`Delete ${department.departmentName}`}
                            className="rounded-lg border border-slate-200 p-2 text-red-500 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === department._id ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && departments.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {filteredDepartments.length} of{" "}
                {departments.length} departments
              </span>
              <span>Department Management</span>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  {editingDepartment ? (
                    <Pencil size={21} />
                  ) : (
                    <Building2 size={21} />
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingDepartment
                      ? "Edit Department"
                      : "Create Department"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {editingDepartment
                      ? "Update department information."
                      : "Add a new department to your company."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5 px-6 py-6">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="departmentName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Department Name
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="departmentName"
                    name="departmentName"
                    type="text"
                    value={form.departmentName}
                    onChange={handleFormChange}
                    placeholder="e.g. Human Resources"
                    maxLength={100}
                    required
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Description
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      (Optional)
                    </span>
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Describe the responsibilities of this department..."
                    rows={4}
                    maxLength={1000}
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-right text-xs text-slate-400">
                    {form.description.length}/1000
                  </p>
                </div>

                {editingDepartment && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Current status
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                      {editingDepartment.status || "active"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Use the status action in the table to activate or
                      deactivate this department.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <LoaderCircle size={17} className="animate-spin" />
                  )}

                  {submitting
                    ? "Saving..."
                    : editingDepartment
                      ? "Save Changes"
                      : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
