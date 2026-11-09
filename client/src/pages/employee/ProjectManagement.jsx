
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Search, RefreshCw, Pencil, Trash2, Eye, FolderKanban,
  Building2, Users, Layers, X, Check, ChevronDown, AlertCircle,
} from "lucide-react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import { toast } from "react-toastify";

const MODULE_STATUSES = [
  "Not Assigned",
  "Assigned",
  "In Progress",
  "Completed",
];

const EMPTY_FORM = {
  projectName: "",
  projectCode: "",
  clientName: "",
  projectDetails: "",
  projectDescription: "",
  remarks: "",
  companyId: "",
  employeeAccess: [],
  modules: [],
  status: "active",
};

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  "Something went wrong.";

const getList = (response, key) => {
  const data = response.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];

  return [];
};

const idOf = (value) =>
  typeof value === "object" && value !== null
    ? String(value._id || value.id || "")
    : String(value || "");

const getEmployeeRoleId = (employee) =>
  idOf(employee.roleId || employee.role);

const getEmployeeName = (employee) =>
  employee.employeeName ||
  employee.name ||
  employee.fullName ||
  employee.firstName ||
  employee.email ||
  employee.employeeId ||
  "Unnamed Employee";

const getEmployeeLabel = (employee) => {
  const name = getEmployeeName(employee);
  const details = [
    employee.employeeId && employee.employeeId !== name
      ? employee.employeeId
      : null,
    employee.email && employee.email !== name
      ? employee.email
      : null,
  ].filter(Boolean);

  return details.length
    ? `${name} (${details.join(" · ")})`
    : name;
};

const ProjectManagement = () => {
  const { employeeId: routeEmployeeId } = useParams();

  const [employee, setEmployee] = useState(null);
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [roleSearch, setRoleSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [newModuleName, setNewModuleName] = useState("");
  const [editingModuleId, setEditingModuleId] = useState("");
  const [editModuleName, setEditModuleName] = useState("");
  const [editModuleStatus, setEditModuleStatus] =
    useState("Not Assigned");

  const employeeCompanyId = idOf(employee?.companyId);

  // =====================================================
  // FETCH LOGGED-IN EMPLOYEE PROFILE
  // =====================================================

  const fetchEmployee = useCallback(async () => {
    try {
      const response = await api.get("/employees/profile/me");
      setEmployee(response.data?.employee || response.data?.data || response.data);
    } catch (error) {
      toast.error(`Could not load employee profile: ${getErrorMessage(error)}`);
    }
  }, []);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

// =====================================================
// FETCH PROJECTS CREATED BY LOGGED-IN EMPLOYEE
// =====================================================

const fetchProjects = useCallback(async () => {
  if (!employeeCompanyId) {
    setProjects([]);
    setLoading(false);
    return;
  }

  setLoading(true);

  try {
    const response = await api.get("/projects/my-created-projects");

    setProjects(getList(response, "projects"));
  } catch (error) {
    toast.error(`Could not load projects: ${getErrorMessage(error)}`);
  } finally {
    setLoading(false);
  }
}, [employeeCompanyId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // =====================================================
  // FETCH COMPANY ROLES AND EMPLOYEES
  // =====================================================

  const fetchCompanyData = useCallback(async () => {
    if (!employeeCompanyId) return;

    try {
      const [roleResponse, employeeResponse] = await Promise.all([
        api.get(`/roles/company/${employeeCompanyId}`),
        api.get(`/employees/company/${employeeCompanyId}`),
      ]);

      setRoles(getList(roleResponse, "roles"));
      setEmployees(getList(employeeResponse, "employees"));
    } catch (error) {
      toast.error(
        `Could not load employees and roles: ${getErrorMessage(error)}`
      );
    }
  }, [employeeCompanyId]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  // =====================================================
  // FETCH DELETED PROJECTS
  // =====================================================

  const fetchDeletedProjects = useCallback(async () => {
    setDeletedLoading(true);

    try {
      const response = await api.get("/projects/deleted/employee");
      setDeletedProjects(getList(response, "projects"));
    } catch (error) {
      toast.error(
        `Could not load deleted projects: ${getErrorMessage(error)}`
      );
    } finally {
      setDeletedLoading(false);
    }
  }, []);

  // =====================================================
  // PROJECT STATISTICS
  // =====================================================

  const stats = useMemo(
    () => ({
      total: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      inactive: projects.filter((p) => p.status === "inactive").length,
      modules: projects.reduce(
        (total, p) => total + (p.modules?.length || 0),
        0
      ),
    }),
    [projects]
  );

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return projects;

    return projects.filter((project) =>
      [
        project.projectName,
        project.projectCode,
        project.clientName,
        project.projectDetails,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [projects, search]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // =====================================================
  // CREATE PROJECT
  // =====================================================

  const openCreate = () => {
    setSelectedProject(null);

    setForm({
      ...EMPTY_FORM,
      companyId: employeeCompanyId,
    });

    setRoleSearch("");
    setEmployeeSearch("");
    setModal("create");
  };

  // =====================================================
  // EDIT PROJECT
  // =====================================================

  const openEdit = (project) => {
    setSelectedProject(project);

    setForm({
      projectName: project.projectName || "",
      projectCode: project.projectCode || "",
      clientName: project.clientName || "",
      projectDetails: project.projectDetails || "",
      projectDescription: project.projectDescription || "",
      remarks: project.remarks || "",
      companyId: employeeCompanyId,
      employeeAccess: (project.employeeAccess || [])
        .map(idOf)
        .filter(Boolean),
      modules: project.modules || [],
      status: project.status || "active",
    });

    setRoleSearch("");
    setEmployeeSearch("");
    setModal("edit");
  };

  // =====================================================
  // EMPLOYEE ACCESS SELECTION
  // =====================================================

  const toggleEmployee = (targetEmployeeId) => {
    if (saving) return;

    setForm((previous) => ({
      ...previous,
      employeeAccess: previous.employeeAccess.includes(targetEmployeeId)
        ? previous.employeeAccess.filter(
            (id) => id !== targetEmployeeId
          )
        : [...previous.employeeAccess, targetEmployeeId],
    }));
  };

  const toggleAllEmployeesInRole = (roleId) => {
    if (saving) return;

    const roleEmployeeIds = employees
      .filter((item) => getEmployeeRoleId(item) === roleId)
      .map(idOf)
      .filter(Boolean);

    setForm((previous) => {
      const allSelected =
        roleEmployeeIds.length > 0 &&
        roleEmployeeIds.every((id) =>
          previous.employeeAccess.includes(id)
        );

      return {
        ...previous,
        employeeAccess: allSelected
          ? previous.employeeAccess.filter(
              (id) => !roleEmployeeIds.includes(id)
            )
          : [
              ...new Set([
                ...previous.employeeAccess,
                ...roleEmployeeIds,
              ]),
            ],
      };
    });
  };

  const toggleAllEmployees = () => {
    if (saving) return;

    const visibleEmployeeIds = visibleRoles
      .flatMap((role) =>
        employees
          .filter(
            (item) => getEmployeeRoleId(item) === idOf(role)
          )
          .filter((item) => {
            const query = employeeSearch.trim().toLowerCase();

            if (!query) return true;

            return [
              getEmployeeName(item),
              item.employeeId,
              item.email,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value).toLowerCase().includes(query)
              );
          })
          .map(idOf)
      )
      .filter(Boolean);

    setForm((previous) => {
      const allSelected =
        visibleEmployeeIds.length > 0 &&
        visibleEmployeeIds.every((id) =>
          previous.employeeAccess.includes(id)
        );

      return {
        ...previous,
        employeeAccess: allSelected
          ? previous.employeeAccess.filter(
              (id) => !visibleEmployeeIds.includes(id)
            )
          : [
              ...new Set([
                ...previous.employeeAccess,
                ...visibleEmployeeIds,
              ]),
            ],
      };
    });
  };

  // =====================================================
  // CREATE / UPDATE PROJECT
  // =====================================================

  const saveProject = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!form.projectName.trim() || !form.clientName.trim()) {
      toast.error("Project name and client name are required.");
      return;
    }

    try {
      setSaving(true);

      if (modal === "create") {
        await api.post("/projects/employee", {
          ...form,
          projectName: form.projectName.trim(),
          clientName: form.clientName.trim(),
          companyId: employeeCompanyId,
        });

        toast.success("Project created successfully.");
      } else if (modal === "edit" && selectedProject) {
        const projectId = idOf(selectedProject);

        // Update project details
        await api.put(`/projects/${projectId}/employee`, {
          projectName: form.projectName.trim(),
          clientName: form.clientName.trim(),
          projectDetails: form.projectDetails,
          projectDescription: form.projectDescription,
          remarks: form.remarks,
          status: form.status,
        });

        const originalIds = [
          ...new Set(
            (selectedProject.employeeAccess || [])
              .map(idOf)
              .filter(Boolean)
          ),
        ];

        const selectedIds = [
          ...new Set(
            form.employeeAccess.map(idOf).filter(Boolean)
          ),
        ];

        const toGrant = selectedIds.filter(
          (id) => !originalIds.includes(id)
        );

        const toRevoke = originalIds.filter(
          (id) => !selectedIds.includes(id)
        );

        // Grant individual employee access
        for (const targetEmployeeId of toGrant) {
          const targetEmployee = employees.find(
            (item) => idOf(item) === targetEmployeeId
          );

          if (!targetEmployee) continue;

          await api.post(`/projects/${projectId}/access`, {
            employeeId: targetEmployeeId,
            roleId: getEmployeeRoleId(targetEmployee),
            companyId: employeeCompanyId,
          });
        }

        // Revoke individual employee access
        for (const targetEmployeeId of toRevoke) {
          await api.delete(
            `/projects/${projectId}/access/${targetEmployeeId}`
          );
        }

        toast.success("Project updated successfully.");
      }

      setModal(null);
      await fetchProjects();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE PROJECT
  // =====================================================

  const deleteProject = async (project) => {
    const confirmed = window.confirm(
      `Move "${project.projectName}" to Deleted Projects?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/projects/${idOf(project)}/employee`);

      toast.success("Project moved to Deleted Projects.");

      if (
        selectedProject &&
        idOf(selectedProject) === idOf(project)
      ) {
        setSelectedProject(null);
        setModal(null);
      }

      await fetchProjects();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // =====================================================
  // RESTORE PROJECT
  // =====================================================

  const restoreProject = async (project) => {
    if (
      !window.confirm(
        `Restore project "${project.projectName}"?`
      )
    ) return;

    try {
      await api.post(
        `/projects/deleted/${idOf(project)}/restore/employee`
      );

      toast.success("Project restored successfully.");

      await Promise.all([
        fetchProjects(),
        fetchDeletedProjects(),
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // =====================================================
  // PERMANENTLY DELETE PROJECT
  // =====================================================

  const permanentlyDeleteProject = async (project) => {
    if (
      !window.confirm(
        `Permanently delete "${project.projectName}"? This cannot be undone.`
      )
    ) return;

    try {
      await api.delete(
        `/projects/deleted/${idOf(project)}/permanent/employee`
      );

      toast.success("Project permanently deleted.");
      await fetchDeletedProjects();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // =====================================================
  // PROJECT DETAILS
  // =====================================================

  const openDetails = async (project) => {
    setSelectedProject(project);
    setModal("details");

    setNewModuleName("");
    setEditingModuleId("");
    setEditModuleName("");
    setEditModuleStatus("Not Assigned");

    try {
      const response = await api.get(
        `/projects/${idOf(project)}/modules`
      );

      const modules = getList(response, "modules");

      setSelectedProject((current) =>
        current && idOf(current) === idOf(project)
          ? { ...current, modules }
          : current
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // =====================================================
  // REFRESH MODULES
  // =====================================================

  const refreshProjectModules = async (project) => {
    const response = await api.get(
      `/projects/${idOf(project)}/modules`
    );

    const modules = getList(response, "modules");

    setSelectedProject((current) =>
      current && idOf(current) === idOf(project)
        ? { ...current, modules }
        : current
    );

    await fetchProjects();
  };

  // =====================================================
  // ADD MODULE
  // =====================================================

  const addModule = async (project) => {
    const moduleName = newModuleName.trim();

    if (!moduleName) {
      toast.error("Enter a module name first.");
      return;
    }

    setSaving(true);

    try {
      await api.post(
        `/projects/${idOf(project)}/modules/employee`,
        { moduleName }
      );

      setNewModuleName("");
      await refreshProjectModules(project);

      toast.success("Module added successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT MODULE
  // =====================================================

  const startEditModule = (module) => {
    setEditingModuleId(idOf(module));
    setEditModuleName(module.moduleName || "");
    setEditModuleStatus(module.status || "Not Assigned");
  };

  const cancelEditModule = () => {
    setEditingModuleId("");
    setEditModuleName("");
    setEditModuleStatus("Not Assigned");
  };

  const saveModule = async (project, module) => {
    const moduleName = editModuleName.trim();

    if (!moduleName) {
      toast.error("Module name cannot be empty.");
      return;
    }

    if (!MODULE_STATUSES.includes(editModuleStatus)) {
      toast.error("Invalid module status.");
      return;
    }

    setSaving(true);

    try {
      await api.put(
        `/projects/${idOf(project)}/modules/${idOf(module)}/employee`,
        {
          moduleName,
          status: editModuleStatus,
        }
      );

      cancelEditModule();
      await refreshProjectModules(project);

      toast.success("Module updated successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE MODULE
  // =====================================================

  const deleteModule = async (project, module) => {
    if (!window.confirm(`Delete module "${module.moduleName}"?`)) {
      return;
    }

    setSaving(true);

    try {
      await api.delete(
        `/projects/${idOf(project)}/modules/${idOf(module)}/employee`
      );

      if (editingModuleId === idOf(module)) {
        cancelEditModule();
      }

      await refreshProjectModules(project);
      toast.success("Module deleted successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const getSelectedEmployees = (project) =>
    (project.employeeAccess || [])
      .map((employeeRef) => {
        if (
          typeof employeeRef === "object" &&
          employeeRef !== null
        ) {
          return employeeRef;
        }

        return employees.find(
          (item) => idOf(item) === idOf(employeeRef)
        );
      })
      .filter(Boolean);

  const visibleRoles = roles.filter((role) =>
    role.roleName
      ?.toLowerCase()
      .includes(roleSearch.toLowerCase())
  );

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-700";

  const closeModal = () => {
    if (!saving) {
      setModal(null);
      setEditingModuleId("");
    }
  };

  const companyName = (project) =>
    typeof project.companyId === "object"
      ? project.companyId?.companyName || "Unknown company"
      : employee?.companyId?.companyName || "Unknown company";

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-indigo-600">
              <FolderKanban size={18} />
              <span>Employee / Project Management</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Project Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage company projects, employee access and project modules.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchProjects}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-100"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={async () => {
                setModal("deleted");
                await fetchDeletedProjects();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100"
            >
              <Trash2 size={17} />
              Deleted Projects
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={17} />
              Create Project
            </button>
          </div>
        </div>

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Projects",
              value: stats.total,
              icon: FolderKanban,
              color: "bg-indigo-50 text-indigo-600",
            },
            {
              label: "Active Projects",
              value: stats.active,
              icon: Check,
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "Inactive Projects",
              value: stats.inactive,
              icon: AlertCircle,
              color: "bg-amber-50 text-amber-600",
            },
            {
              label: "Total Modules",
              value: stats.modules,
              icon: Layers,
              color: "bg-violet-50 text-violet-600",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {item.label}
                  </span>
                  <span className={`rounded-lg p-2 ${item.color}`}>
                    <Icon size={19} />
                  </span>
                </div>

                <p className="mt-3 text-3xl font-bold">
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* SEARCH */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search project, code, client..."
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        {/* PROJECT TABLE */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Project Directory</h2>
            <p className="mt-1 text-xs text-slate-500">
              {filteredProjects.length} project(s) found
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
              <RefreshCw className="animate-spin" size={18} />
              Loading projects...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <FolderKanban
                size={36}
                className="mx-auto mb-3 text-slate-300"
              />
              <h3 className="font-semibold">No projects found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Create a project or change your search.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Project</th>
                    <th className="px-5 py-3">Company</th>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Employees</th>
                    <th className="px-5 py-3">Modules</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((project) => (
                    <tr
                      key={idOf(project)}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {project.projectName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {project.projectCode || "No project code"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-slate-400" />
                          {companyName(project)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {project.clientName || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          <Users size={13} />
                          {project.employeeAccess?.length || 0}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                          <Layers size={13} />
                          {project.modules?.length || 0}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            project.status === "inactive"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {project.status || "active"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="View details"
                            onClick={() => openDetails(project)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            title="Edit project"
                            onClick={() => openEdit(project)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            title="Delete project"
                            onClick={() => deleteProject(project)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
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
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}

      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">
                  {modal === "create" ? "Create Project" : "Edit Project"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage project details and individual employee access.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveProject} className="space-y-5 p-5 sm:p-6">

              {/* PROJECT INFORMATION */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Project Name *</label>
                  <input
                    required
                    value={form.projectName}
                    onChange={(e) =>
                      updateField("projectName", e.target.value)
                    }
                    className={inputClass}
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className={labelClass}>Project Code</label>
                  <input
                    value={form.projectCode}
                    disabled={modal === "edit"}
                    onChange={(e) =>
                      updateField("projectCode", e.target.value)
                    }
                    className={`${inputClass} disabled:bg-slate-100`}
                    placeholder="e.g. PRJ-001"
                  />
                </div>

                <div>
                  <label className={labelClass}>Client Name *</label>
                  <input
                    required
                    value={form.clientName}
                    onChange={(e) =>
                      updateField("clientName", e.target.value)
                    }
                    className={inputClass}
                    placeholder="Enter client name"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Project Details</label>
                  <textarea
                    rows={2}
                    value={form.projectDetails}
                    onChange={(e) =>
                      updateField("projectDetails", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Project Description</label>
                  <textarea
                    rows={3}
                    value={form.projectDescription}
                    onChange={(e) =>
                      updateField("projectDescription", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Remarks</label>
                  <textarea
                    rows={2}
                    value={form.remarks}
                    onChange={(e) =>
                      updateField("remarks", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                {modal === "edit" && (
                  <div>
                    <label className={labelClass}>Project Status</label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        updateField("status", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              {/* EMPLOYEE ACCESS */}

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">
                      Employee Access Assignment
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Select individual employees. Roles are only used to group employees.
                    </p>
                  </div>

                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {form.employeeAccess.length} selected
                  </span>
                </div>

                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    className={inputClass}
                    placeholder="Search role..."
                  />
                  <input
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className={inputClass}
                    placeholder="Search employee name, ID or email..."
                  />
                </div>

                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={toggleAllEmployees}
                    disabled={saving || !visibleRoles.length}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Select / Deselect All Visible Employees
                  </button>
                </div>

                {!visibleRoles.length ? (
                  <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
                    No roles found for this company.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {visibleRoles.map((role) => {
                      const roleId = idOf(role);

                      const roleEmployees = employees.filter(
                        (item) => getEmployeeRoleId(item) === roleId
                      );

                      const filteredEmployees = roleEmployees.filter(
                        (item) => {
                          const query = employeeSearch.trim().toLowerCase();

                          if (!query) return true;

                          return [
                            getEmployeeName(item),
                            item.employeeId,
                            item.email,
                          ]
                            .filter(Boolean)
                            .some((value) =>
                              String(value).toLowerCase().includes(query)
                            );
                        }
                      );

                      const selectedCount = roleEmployees.filter(
                        (item) =>
                          form.employeeAccess.includes(idOf(item))
                      ).length;

                      const allSelected =
                        roleEmployees.length > 0 &&
                        selectedCount === roleEmployees.length;

                      return (
                        <details
                          key={roleId}
                          className="group rounded-lg border border-slate-200"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-3 hover:bg-slate-50">
                            <div className="flex min-w-0 items-center gap-3">
                              <ChevronDown
                                size={17}
                                className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                              />
                              <div>
                                <p className="font-medium">
                                  {role.roleName}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {roleEmployees.length} employee(s)
                                </p>
                              </div>
                            </div>

                            <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              {selectedCount} / {roleEmployees.length}
                            </span>
                          </summary>

                          <div className="border-t border-slate-100 p-3">
                            {roleEmployees.length > 0 && (
                              <div className="mb-3 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleAllEmployeesInRole(roleId)
                                  }
                                  disabled={saving}
                                  className="text-xs font-semibold text-indigo-600"
                                >
                                  {allSelected ? "Deselect All" : "Select All"}
                                </button>
                              </div>
                            )}

                            {!filteredEmployees.length ? (
                              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                                {roleEmployees.length === 0
                                  ? "No employees assigned to this role."
                                  : "No employees match your search."}
                              </p>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {filteredEmployees.map((item) => {
                                  const targetId = idOf(item);

                                  return (
                                    <label
                                      key={targetId}
                                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={form.employeeAccess.includes(
                                          targetId
                                        )}
                                        onChange={() =>
                                          toggleEmployee(targetId)
                                        }
                                        disabled={saving}
                                        className="mt-0.5 h-4 w-4 accent-indigo-600"
                                      />
                                      <span className="min-w-0 text-sm font-medium">
                                        {getEmployeeLabel(item)}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}

                {modal === "edit" && (
                  <p className="mt-3 text-xs leading-5 text-amber-700">
                    Selected employees will receive access. Unchecking an employee
                    will revoke only that employee's access when you save.
                  </p>
                )}
              </div>

              {/* INITIAL MODULES */}

              {modal === "create" && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-1 font-semibold">Project Modules</h3>
                  <p className="mb-3 text-xs text-slate-500">
                    Add one module per line.
                  </p>

                  <textarea
                    value={form.modules
                      .map((module) =>
                        typeof module === "string"
                          ? module
                          : module.moduleName || ""
                      )
                      .join("\n")}
                    onChange={(e) =>
                      updateField(
                        "modules",
                        e.target.value
                          .split("\n")
                          .map((moduleName) => ({ moduleName }))
                      )
                    }
                    className={inputClass}
                    rows={4}
                    placeholder={"Customer Portal\nInventory Tracking\nOrder Processing"}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    New modules default to Not Assigned.
                  </p>
                </div>
              )}

              {/* FORM ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && (
                    <RefreshCw className="animate-spin" size={16} />
                  )}
                  {modal === "create" ? "Create Project" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT DETAILS AND MODULE MANAGEMENT */}

      {modal === "details" && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">
                  {selectedProject.projectName}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedProject.projectCode || "No project code"} ·{" "}
                  {companyName(selectedProject)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-6">

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Client</p>
                  <p className="mt-1 font-semibold">
                    {selectedProject.clientName || "—"}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-1 font-semibold capitalize">
                    {selectedProject.status || "active"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Project Description</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedProject.projectDescription || "No description provided."}
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Project Details</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedProject.projectDetails || "No details provided."}
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Remarks</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedProject.remarks || "No remarks."}
                </p>
              </div>

              {/* MODULE MANAGEMENT */}

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Project Modules</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Add, edit, update status or delete modules.
                    </p>
                  </div>

                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {selectedProject.modules?.length || 0} modules
                  </span>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    addModule(selectedProject);
                  }}
                  className="mb-4 flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    className={`${inputClass} flex-1`}
                    placeholder="Enter new module name"
                    disabled={saving}
                  />

                  <button
                    type="submit"
                    disabled={saving || !newModuleName.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? (
                      <RefreshCw className="animate-spin" size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    Add Module
                  </button>
                </form>

                {!selectedProject.modules?.length ? (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    No modules have been added yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedProject.modules.map((module) => {
                      const isEditing =
                        editingModuleId === idOf(module);

                      return (
                        <div
                          key={idOf(module)}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div>
                                <label className={labelClass}>
                                  Module Name
                                </label>
                                <input
                                  value={editModuleName}
                                  onChange={(e) =>
                                    setEditModuleName(e.target.value)
                                  }
                                  className={inputClass}
                                  disabled={saving}
                                />
                              </div>

                              <div>
                                <label className={labelClass}>
                                  Module Status
                                </label>
                                <select
                                  value={editModuleStatus}
                                  onChange={(e) =>
                                    setEditModuleStatus(e.target.value)
                                  }
                                  className={inputClass}
                                  disabled={saving}
                                >
                                  {MODULE_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={cancelEditModule}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                >
                                  <X size={15} />
                                  Cancel
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    saveModule(selectedProject, module)
                                  }
                                  disabled={saving || !editModuleName.trim()}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                                >
                                  <Check size={15} />
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                              <div className="min-w-0">
                                <p className="break-words font-medium">
                                  {module.moduleName}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Status: {module.status || "Not Assigned"}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEditModule(module)}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Pencil size={15} />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteModule(selectedProject, module)
                                  }
                                  disabled={saving}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={15} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ASSIGNED EMPLOYEES */}

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">Assigned Employees</h3>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {selectedProject.employeeAccess?.length || 0} employees
                  </span>
                </div>

                {!selectedProject.employeeAccess?.length ? (
                  <p className="text-sm text-slate-500">
                    No employees assigned.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {getSelectedEmployees(selectedProject).map((item) => (
                      <div
                        key={idOf(item)}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="text-sm font-medium">
                          {getEmployeeName(item)}
                        </p>
                        {item.email && (
                          <p className="mt-1 text-xs text-slate-500">
                            {item.email}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETED PROJECTS */}

      {modal === "deleted" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">Deleted Projects</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Restore archived projects or permanently delete them.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchDeletedProjects}
                  disabled={deletedLoading}
                  className="rounded-lg border border-slate-300 p-2 hover:bg-slate-100"
                >
                  <RefreshCw
                    size={17}
                    className={deletedLoading ? "animate-spin" : ""}
                  />
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(95vh-85px)] overflow-y-auto p-4 sm:p-6">
              {deletedLoading ? (
                <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
                  <RefreshCw className="animate-spin" size={18} />
                  Loading deleted projects...
                </div>
              ) : deletedProjects.length === 0 ? (
                <div className="py-16 text-center">
                  <Trash2
                    size={36}
                    className="mx-auto mb-3 text-slate-300"
                  />
                  <h3 className="font-semibold">No deleted projects</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Deleted projects will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Modules</th>
                        <th className="px-4 py-3">Deleted At</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {deletedProjects.map((project) => (
                        <tr
                          key={idOf(project)}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <p className="font-semibold">
                              {project.projectName || "Unnamed project"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {project.projectCode || "No project code"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            {companyName(project)}
                          </td>

                          <td className="px-4 py-4">
                            {project.clientName || "—"}
                          </td>

                          <td className="px-4 py-4">
                            {project.modules?.length || 0}
                          </td>

                          <td className="px-4 py-4">
                            {project.deletedAt
                              ? new Date(project.deletedAt).toLocaleString()
                              : "—"}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => restoreProject(project)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                              >
                                <RefreshCw size={14} />
                                Restore
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  permanentlyDeleteProject(project)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                              >
                                <Trash2 size={14} />
                                Delete Forever
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
