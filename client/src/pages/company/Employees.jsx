
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Users,
  X,
  Upload,
  RefreshCw,
  Building2,
  BriefcaseBusiness,
  Mail,
  Phone,
  MapPin,
  UserRound,
  UserCheck,
  UserX,
  Filter,
} from "lucide-react";
import api from "../../api/axios";

const initialForm = {
  name: "",
  empId: "",
  phone: "",
  presentAddress: "",
  gender: "Male",
  email: "",
  password: "",
  companyId: "",
  departmentId: "",
  roleId: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-black-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1.5 block text-sm font-medium text-black-700";

const getError = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error;
  }

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors
      .map((item) =>
        typeof item === "string" ? item : item.message || item.msg
      )
      .filter(Boolean)
      .join("\n");
  }

  if (error?.message === "Network Error") {
    return "Network error. Please check your connection and backend server.";
  }

  return error?.message || "Something went wrong. Please try again.";
};

const notifyError = (error, options = {}) =>
  toast.error(getError(error), {
    autoClose: 5000,
    ...options,
  });

const getId = (value) =>
  typeof value === "object" && value !== null ? value._id : value;

const getName = (value, field) =>
  typeof value === "object" && value !== null
    ? value[field] || "—"
    : "—";

const getImageUrl = (profilePic) => {
  if (!profilePic) return "";
  if (profilePic.startsWith("http")) return profilePic;

  const origin =
    import.meta.env.MODE === "production"
      ? "https://api.hrms.wsdstech.com"
      : "http://localhost:5003";

  return `${origin}/uploads/${profilePic}`;
};

const EmployeeAvatar = ({ employee, size = "h-11 w-11" }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getImageUrl(employee?.profilePic);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  if (imageUrl && !imageError) {
    return (
      <img
        src={imageUrl}
        alt={employee?.name || "Employee"}
        className={`${size} shrink-0 rounded-full object-cover ring-1 ring-slate-200`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700`}
    >
      {employee?.name?.charAt(0)?.toUpperCase() || "E"}
    </div>
  );
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      status === "active"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-rose-50 text-rose-700"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        status === "active" ? "bg-emerald-500" : "bg-rose-500"
      }`}
    />
    {status || "unknown"}
  </span>
);

const Modal = ({ title, onClose, children, wide = false }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div
      className={`my-auto max-h-[92vh] w-full ${
        wide ? "max-w-3xl" : "max-w-xl"
      } overflow-y-auto rounded-2xl bg-white shadow-2xl`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
        <h2 className="text-lg font-semibold text-black-800">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-black-500 hover:bg-slate-100"
          aria-label="Close modal"
        >
          <X size={19} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

export default function Employees() {
  const { companyId } = useParams();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const [listScope, setListScope] = useState("company");
  const [scopeId, setScopeId] = useState("");

  const [modal, setModal] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [profilePic, setProfilePic] = useState(null);
  const [preview, setPreview] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loadEmployees = useCallback(
    async (showToast = false) => {
      setLoading(true);

      try {
        let url;

        if (listScope === "all") {
          url = "/employees";
        } else if (listScope === "company") {
          if (!companyId) {
            throw new Error("Company ID is missing from the URL.");
          }

          url = `/employees/company/${companyId}`;
        } else if (listScope === "department") {
          if (!scopeId) {
            setEmployees([]);
            return;
          }

          url = `/employees/department/${scopeId}`;
        } else if (listScope === "role") {
          if (!scopeId) {
            setEmployees([]);
            return;
          }

          url = `/employees/role/${scopeId}`;
        } else {
          throw new Error("Invalid employee list selection.");
        }

        const response = await api.get(url);
        const data = response.data;

        const list =
          data.employees ||
          data.data?.employees ||
          data.data ||
          [];

        if (!Array.isArray(list)) {
          throw new Error("Invalid employee list received from server.");
        }

        setEmployees(list);

        if (showToast) {
          toast.success("Employee list refreshed.", {
            autoClose: 1800,
          });
        }
      } catch (err) {
        setEmployees([]);
        notifyError(err, { toastId: "employees-load-error" });
      } finally {
        setLoading(false);
      }
    },
    [companyId, listScope, scopeId]
  );

  const loadOptions = useCallback(async () => {
    if (!companyId) return;

    try {
      const [departmentResponse, roleResponse] = await Promise.all([
        api.get(`/departments/company/${companyId}`),
        api.get(`/roles/company/${companyId}`),
      ]);

      const departmentList =
        departmentResponse.data.departments ||
        departmentResponse.data.data ||
        [];

      const roleList =
        roleResponse.data.roles ||
        roleResponse.data.data ||
        [];

      setDepartments(
        Array.isArray(departmentList) ? departmentList : []
      );

      setRoles(Array.isArray(roleList) ? roleList : []);
    } catch (err) {
      notifyError(err, {
        toastId: "employee-options-error",
      });
    }
  }, [companyId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);

    try {
      await Promise.all([loadEmployees(true), loadOptions()]);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const searchableValues = [
        employee.name,
        employee.empId,
        employee.email,
        employee.phone,
        getName(employee.companyId, "companyName"),
        getName(employee.departmentId, "departmentName"),
        getName(employee.roleId, "roleName"),
      ];

      const matchesSearch = searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchesStatus =
        statusFilter === "all" || employee.status === statusFilter;

      const matchesDepartment =
        departmentFilter === "all" ||
        String(getId(employee.departmentId)) === departmentFilter;

      const matchesRole =
        roleFilter === "all" ||
        String(getId(employee.roleId)) === roleFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDepartment &&
        matchesRole
      );
    });
  }, [employees, search, statusFilter, departmentFilter, roleFilter]);

  const activeCount = employees.filter(
    (employee) => employee.status === "active"
  ).length;

  const inactiveCount = employees.length - activeCount;

  const openCreate = () => {
    setSelectedEmployee(null);
    setForm({
      ...initialForm,
      companyId: companyId || "",
    });
    setProfilePic(null);
    setPreview("");
    setModal("form");
  };

  const openEdit = (employee) => {
    setSelectedEmployee(employee);

    setForm({
      name: employee.name || "",
      empId: employee.empId || "",
      phone: employee.phone || "",
      presentAddress: employee.presentAddress || "",
      gender: employee.gender || "Male",
      email: employee.email || "",
      password: "",
      companyId: String(getId(employee.companyId) || companyId || ""),
      departmentId: String(getId(employee.departmentId) || ""),
      roleId: String(getId(employee.roleId) || ""),
    });

    setProfilePic(null);
    setPreview(employee.profilePic ? getImageUrl(employee.profilePic) : "");
    setModal("form");
  };

  const openDetails = async (employee) => {
    setSelectedEmployee(employee);
    setModal("details");

    const toastId = toast.loading("Loading employee details...");

    try {
      const response = await api.get(`/employees/${employee._id}`);

      const detail =
        response.data.employee ||
        response.data.data ||
        response.data;

      setSelectedEmployee(detail);

      toast.update(toastId, {
        render: "Employee details loaded.",
        type: "success",
        isLoading: false,
        autoClose: 1500,
      });
    } catch (err) {
      toast.update(toastId, {
        render: getError(err),
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  const handleInput = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "phone"
        ? value.replace(/\D/g, "").slice(0, 10)
        : value,
    }));
  };

  const handlePicture = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be 5 MB or less.");
      event.target.value = "";
      return;
    }

    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setProfilePic(file);
    setPreview(URL.createObjectURL(file));

    toast.success("Profile picture selected.", {
      autoClose: 1500,
    });
  };

  const saveEmployee = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!companyId && !form.companyId) {
      toast.error("Company ID is required.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      toast.error("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!form.departmentId || !form.roleId) {
      toast.error("Please select a department and role.");
      return;
    }

    setSaving(true);

    const toastId = toast.loading(
      selectedEmployee ? "Updating employee..." : "Creating employee..."
    );

    try {
      const body = new FormData();

      body.append("name", form.name.trim());
      body.append("phone", form.phone.trim());
      body.append("presentAddress", form.presentAddress.trim());
      body.append("gender", form.gender);
      body.append("email", form.email.trim());
      body.append("companyId", form.companyId || companyId);
      body.append("departmentId", form.departmentId);
      body.append("roleId", form.roleId);

      if (profilePic) {
        body.append("profilePic", profilePic);
      }

      if (selectedEmployee) {
        await api.put(`/employees/${selectedEmployee._id}`, body);
      } else {
        body.append("empId", form.empId.trim());
        body.append("password", form.password);

        await api.post("/employees", body);
      }

      toast.update(toastId, {
        render: selectedEmployee
          ? "Employee updated successfully."
          : "Employee created successfully.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setModal("");
      setSelectedEmployee(null);

      await loadEmployees();
    } catch (err) {
      toast.update(toastId, {
        render: getError(err),
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (employee) => {
    const nextStatus =
      employee.status === "active" ? "inactive" : "active";

    const confirmed = window.confirm(
      `Are you sure you want to mark ${employee.name} as ${nextStatus}?`
    );

    if (!confirmed) return;

    const toastId = toast.loading(
      nextStatus === "active"
        ? "Activating employee..."
        : "Deactivating employee..."
    );

    try {
      await api.patch(`/employees/${employee._id}/status`, {
        status: nextStatus,
      });

      toast.update(toastId, {
        render: `Employee marked ${nextStatus} successfully.`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      await loadEmployees();
    } catch (err) {
      toast.update(toastId, {
        render: getError(err),
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  const handleDelete = async (employee) => {
    const confirmed = window.confirm(
      `Delete employee "${employee.name}" permanently? This cannot be undone.`
    );

    if (!confirmed) return;

    const toastId = toast.loading("Deleting employee...");

    try {
      await api.delete(`/employees/${employee._id}`);

      toast.update(toastId, {
        render: "Employee deleted successfully.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      if (selectedEmployee?._id === employee._id) {
        setModal("");
        setSelectedEmployee(null);
      }

      await loadEmployees();
    } catch (err) {
      toast.update(toastId, {
        render: getError(err),
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  const closeModal = () => {
    setModal("");
    setSelectedEmployee(null);
    setProfilePic(null);

    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setPreview("");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-black-500">
              <Building2 size={16} />
              Company Workspace
              <span>/</span>
              Employees
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-black-900 sm:text-3xl">
              Employee Management
            </h1>

            <p className="mt-1 text-sm text-black-500">
              Create, view, edit, activate, deactivate and delete employee
              accounts.
            </p>
          </div>

<div className="flex flex-wrap gap-2">
  <button
    type="button"
    onClick={handleRefresh}
    disabled={refreshing}
    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-black hover:bg-slate-100 disabled:opacity-60"
  >
    <RefreshCw
      size={16}
      className={refreshing ? "animate-spin" : ""}
    />
    {refreshing ? "Refreshing..." : "Refresh"}
  </button>

  <button
    type="button"
    onClick={openCreate}
    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700"
  >
    <Plus size={16} />
    Add Employee
  </button>
</div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black-500">
                  Employees in Current Results
                </p>
                <p className="mt-2 text-3xl font-bold text-black-900">
                  {employees.length}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Users size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black-500">
                  Active Employees
                </p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">
                  {activeCount}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <UserCheck size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black-500">
                  Inactive Employees
                </p>
                <p className="mt-2 text-3xl font-bold text-rose-600">
                  {inactiveCount}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
                <UserX size={23} />
              </div>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-black-900">
                  Employee Directory
                </h2>
                <p className="mt-1 text-sm text-black-500">
                  {filteredEmployees.length} employee(s) found
                </p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <Filter size={15} />
                    Load Employees By
                  </span>
                </label>

                <select
                  className={inputClass}
                  value={listScope}
                  onChange={(event) => {
                    setListScope(event.target.value);
                    setScopeId("");
                  }}
                >
                  <option value="company">Current Company</option>
                  <option value="all">All Companies (Super Admin)</option>
                  <option value="department">Specific Department</option>
                  <option value="role">Specific Role</option>
                </select>
              </div>

              {(listScope === "department" || listScope === "role") && (
                <div>
                  <label className={labelClass}>
                    {listScope === "department" ? "Department" : "Role"}
                  </label>

                  <select
                    className={inputClass}
                    value={scopeId}
                    onChange={(event) => setScopeId(event.target.value)}
                  >
                    <option value="">
                      Select{" "}
                      {listScope === "department" ? "department" : "role"}
                    </option>

                    {listScope === "department" &&
                      departments.map((department) => (
                        <option
                          key={department._id}
                          value={department._id}
                        >
                          {department.departmentName}
                        </option>
                      ))}

                    {listScope === "role" &&
                      roles.map((role) => (
                        <option key={role._id} value={role._id}>
                          {role.roleName}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="relative sm:col-span-2 xl:col-span-1">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-black-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, ID, email..."
                  className={`${inputClass} pl-9`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">All departments</option>
                {departments.map((department) => (
                  <option key={department._id} value={department._id}>
                    {department.departmentName}
                  </option>
                ))}
              </select>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">All roles</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.roleName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-black-500">
              <RefreshCw size={19} className="animate-spin" />
              Loading employees...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-4 text-black-400">
                <Users size={27} />
              </div>
              <h3 className="font-semibold text-black-800">
                No employees found
              </h3>
              <p className="mt-1 text-sm text-black-500">
                Select another scope, add an employee, or change your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-black-500">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Employee</th>
                    <th className="px-5 py-3.5 font-semibold">Contact</th>
                    <th className="px-5 py-3.5 font-semibold">Company</th>
                    <th className="px-5 py-3.5 font-semibold">Department</th>
                    <th className="px-5 py-3.5 font-semibold">Role</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((employee) => (
                    <tr
                      key={employee._id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar employee={employee} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-black-800">
                              {employee.name}
                            </p>
                            <p className="mt-0.5 text-xs text-black-500">
                              ID: {employee.empId}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-black-700">
                          {employee.email}
                        </p>
                        <p className="mt-1 text-xs text-black-500">
                          {employee.phone || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-black-600">
                        {getName(employee.companyId, "companyName")}
                      </td>

                      <td className="px-5 py-4 text-sm text-black-600">
                        {getName(employee.departmentId, "departmentName")}
                      </td>

                      <td className="px-5 py-4 text-sm text-black-600">
                        {getName(employee.roleId, "roleName")}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={employee.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            title="View employee"
                            onClick={() => openDetails(employee)}
                            className="rounded-lg p-2 text-black-500 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            title="Edit employee"
                            onClick={() => openEdit(employee)}
                            className="rounded-lg p-2 text-black-500 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            title={
                              employee.status === "active"
                                ? "Deactivate employee"
                                : "Activate employee"
                            }
                            onClick={() => changeStatus(employee)}
                            className={`rounded-lg p-2 ${
                              employee.status === "active"
                                ? "text-black-500 hover:bg-rose-50 hover:text-rose-600"
                                : "text-black-500 hover:bg-emerald-50 hover:text-emerald-600"
                            }`}
                          >
                            {employee.status === "active" ? (
                              <UserX size={17} />
                            ) : (
                              <UserCheck size={17} />
                            )}
                          </button>

                          <button
                            type="button"
                            title="Delete employee"
                            onClick={() => handleDelete(employee)}
                            className="rounded-lg p-2 text-black-500 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modal === "form" && (
        <Modal
          title={selectedEmployee ? "Edit Employee" : "Create Employee"}
          onClose={closeModal}
          wide
        >
          <form onSubmit={saveEmployee} className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
              {preview ? (
                <img
                  src={preview}
                  alt="Profile preview"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <UserRound size={30} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-black-800">
                  Profile Picture
                </p>
                <p className="mt-1 text-xs text-black-500">
                  Image file only. Maximum size 5 MB.
                </p>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-black-700 hover:bg-slate-100">
                  <Upload size={15} />
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePicture}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  required
                  name="name"
                  value={form.name}
                  onChange={handleInput}
                  className={inputClass}
                  placeholder="Employee full name"
                />
              </div>

              {!selectedEmployee && (
                <div>
                  <label className={labelClass}>Employee ID *</label>
                  <input
                    required
                    name="empId"
                    value={form.empId}
                    onChange={handleInput}
                    className={inputClass}
                    placeholder="EMP001"
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>Email *</label>
                <input
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInput}
                  className={inputClass}
                  placeholder="employee@example.com"
                />
              </div>

{!selectedEmployee && (
  <div>
    <label className={labelClass}>Initial Password *</label>

    <div className="relative">
      <input
        required
        minLength={6}
        type={showPassword ? "text" : "password"}
        name="password"
        value={form.password}
        onChange={handleInput}
        className={`${inputClass} pr-11`}
        placeholder="At least 6 characters"
      />

      <button
        type="button"
        onClick={() => setShowPassword((previous) => !previous)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-black-500 hover:text-blue-600"
        aria-label={showPassword ? "Hide password" : "Show password"}
        title={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
)}

              <div>
                <label className={labelClass}>Phone *</label>
                <input
                  required
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleInput}
                  inputMode="numeric"
                  maxLength={10}
                  minLength={10}
                  pattern="[6-9][0-9]{9}"
                  title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
                  className={inputClass}
                  placeholder="10-digit mobile number"
                />
              </div>

              <div>
                <label className={labelClass}>Gender *</label>
                <select
                  required
                  name="gender"
                  value={form.gender}
                  onChange={handleInput}
                  className={inputClass}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Present Address *</label>
                <textarea
                  required
                  name="presentAddress"
                  value={form.presentAddress}
                  onChange={handleInput}
                  className={inputClass}
                  rows={2}
                  placeholder="Enter present address"
                />
              </div>

              <div>
                <label className={labelClass}>Department *</label>
                <select
                  required
                  name="departmentId"
                  value={form.departmentId}
                  onChange={handleInput}
                  className={inputClass}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Role *</label>
                <select
                  required
                  name="roleId"
                  value={form.roleId}
                  onChange={handleInput}
                  className={inputClass}
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.roleName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              Company ID is taken from the current company URL. Department
              and role should belong to that company.
            </p>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-black-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : selectedEmployee
                    ? "Save Changes"
                    : "Create Employee"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "details" && selectedEmployee && (
        <Modal
          title="Employee Details"
          onClose={closeModal}
          wide
        >
          <div className="mb-6 flex flex-col items-center gap-3 rounded-xl bg-slate-50 p-5 sm:flex-row">
            <EmployeeAvatar employee={selectedEmployee} size="h-20 w-20" />
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-black-900">
                {selectedEmployee.name}
              </h3>
              <p className="mt-1 text-sm text-black-500">
                Employee ID: {selectedEmployee.empId || "—"}
              </p>
              <div className="mt-2">
                <StatusBadge status={selectedEmployee.status} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                label: "Email",
                value: selectedEmployee.email,
                icon: Mail,
              },
              {
                label: "Phone",
                value: selectedEmployee.phone,
                icon: Phone,
              },
              {
                label: "Company",
                value: getName(selectedEmployee.companyId, "companyName"),
                icon: Building2,
              },
              {
                label: "Department",
                value: getName(
                  selectedEmployee.departmentId,
                  "departmentName"
                ),
                icon: BriefcaseBusiness,
              },
              {
                label: "Role",
                value: getName(selectedEmployee.roleId, "roleName"),
                icon: UserRound,
              },
              {
                label: "Gender",
                value: selectedEmployee.gender,
                icon: UserRound,
              },
              {
                label: "Present Address",
                value: selectedEmployee.presentAddress,
                icon: MapPin,
              },
              {
                label: "Created At",
                value: selectedEmployee.createdAt
                  ? new Date(selectedEmployee.createdAt).toLocaleString()
                  : "—",
                icon: Users,
              },
              {
                label: "Updated At",
                value: selectedEmployee.updatedAt
                  ? new Date(selectedEmployee.updatedAt).toLocaleString()
                  : "—",
                icon: RefreshCw,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-black-500">
                  <Icon size={15} />
                  {label}
                </div>
                <p className="break-words text-sm font-medium text-black-800">
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => openEdit(selectedEmployee)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Pencil size={15} />
              Edit Employee
            </button>

            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-black-700"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
