import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  FolderKanban,
  Building2,
  Users,
  Layers,
  X,
  Check,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { useParams } from "react-router-dom";
import api from "../../api/axios.js";
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
  roleAccess: [],
  modules: [],
  status: "active",
};

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message || "Something went wrong.";

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

const Projects = () => {
  const { companyId } = useParams();

  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  const [modal, setModal] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    companyId: companyId || "",
  });

  const [newModuleName, setNewModuleName] = useState("");
  const [editingModuleId, setEditingModuleId] = useState("");
  const [editModuleName, setEditModuleName] = useState("");
  const [editModuleStatus, setEditModuleStatus] =
    useState("Not Assigned");

  const [roleSearch, setRoleSearch] = useState("");

  // =====================================================
  // FETCH PROJECTS
  // =====================================================
  const fetchProjects = useCallback(async () => {
    if (!companyId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await api.get("/projects", {
        params: { companyId },
      });

      setProjects(getList(response, "projects"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // =====================================================
  // FETCH COMPANIES
  // =====================================================
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await api.get("/companies");
      setCompanies(getList(response, "companies"));
    } catch (error) {
toast.error(
  `Could not load companies: ${getErrorMessage(error)}`
);
    }
  }, []);

  // =====================================================
  // FETCH ROOT ROLES
  // =====================================================
  const fetchRoles = useCallback(async (selectedCompanyId) => {
    if (!selectedCompanyId) {
      setRoles([]);
      return;
    }

    try {
      const response = await api.get(
        `/roles/company/${selectedCompanyId}/root`
      );

      setRoles(getList(response, "roles"));
    } catch (error) {
      setRoles([]);

      toast.error(
        `Could not load root roles: ${getErrorMessage(error)}`
      );
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (form.companyId) {
      fetchRoles(form.companyId);
    } else {
      setRoles([]);
    }
  }, [form.companyId, fetchRoles]);

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
  // SEARCH AND COMPANY FILTER
  // =====================================================
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const projectCompanyId = idOf(project.companyId);

      if (
        companyFilter &&
        projectCompanyId !== companyFilter
      ) {
        return false;
      }

      if (!query) return true;

      const companyName =
        typeof project.companyId === "object"
          ? project.companyId?.companyName
          : companies.find(
              (company) => idOf(company) === projectCompanyId
            )?.companyName;

      return [
        project.projectName,
        project.projectCode,
        project.clientName,
        companyName,
        project.projectDetails,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [projects, search, companies, companyFilter]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // =====================================================
  // OPEN CREATE MODAL
  // =====================================================
  const openCreate = () => {
    setSelectedProject(null);

    setForm({
      ...EMPTY_FORM,
      companyId: companyId || "",
    });

    setRoleSearch("");
    setModal("create");
  };

  // =====================================================
  // OPEN EDIT PROJECT MODAL
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
      companyId: idOf(project.companyId),
      roleAccess: (project.roleAccess || []).map(idOf),
      modules: project.modules || [],
      status: project.status || "active",
    });

    setRoleSearch("");
    setModal("edit");
  };

  // =====================================================
  // OPEN PROJECT DETAILS AND FETCH MODULES
  // GET /projects/:projectId/modules
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
      toast.error(
        `Could not load project modules: ${getErrorMessage(error)}`
      );
    }
  };

  // =====================================================
  // ROOT ROLE SELECTION
  // =====================================================

const toggleRole = (roleId) => {
  if (saving) return;

  setForm((previous) => ({
    ...previous,
    roleAccess: previous.roleAccess.includes(roleId)
      ? previous.roleAccess.filter((id) => id !== roleId)
      : [...previous.roleAccess, roleId],
  }));
};


  const toggleAllRoles = () => {
    const visibleIds = roles
      .filter((role) =>
        role.roleName
          ?.toLowerCase()
          .includes(roleSearch.toLowerCase())
      )
      .map(idOf);

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => form.roleAccess.includes(id));

    setForm((previous) => ({
      ...previous,
      roleAccess: allSelected
        ? previous.roleAccess.filter(
            (id) => !visibleIds.includes(id)
          )
        : [...new Set([...previous.roleAccess, ...visibleIds])],
    }));
  };

  // =====================================================
  // CREATE / UPDATE PROJECT
  // =====================================================
const saveProject = async (event) => {
  event.preventDefault();

  if (saving) return;

  try {
    setSaving(true);

    if (!form.projectName.trim() || !form.clientName.trim()) {
      toast.error("Project name and client name are required");
      return;
    }

    // CREATE PROJECT
    if (modal === "create") {
      await api.post("/projects", {
        ...form,
        projectName: form.projectName.trim(),
        clientName: form.clientName.trim(),
        companyId: form.companyId,
        roleAccess: form.roleAccess,
        modules: form.modules,
      });

      toast.success("Project created successfully");
    }

    // UPDATE PROJECT
    else if (modal === "edit" && selectedProject) {
      const projectId = idOf(selectedProject);

      // Update project details
      await api.put(`/projects/${projectId}`, {
        projectName: form.projectName.trim(),
        clientName: form.clientName.trim(),
        projectDetails: form.projectDetails,
        projectDescription: form.projectDescription,
        remarks: form.remarks,
        status: form.status,
      });

      const originalRoleIds = [
        ...new Set(
          (selectedProject.roleAccess || [])
            .map(idOf)
            .filter(Boolean)
        ),
      ];

      const selectedRoleIds = [
        ...new Set(
          (form.roleAccess || [])
            .map(idOf)
            .filter(Boolean)
        ),
      ];

      // Newly selected roles
      const rolesToAssign = selectedRoleIds.filter(
        (roleId) => !originalRoleIds.includes(roleId)
      );

      // Previously assigned roles that were unchecked
      const rolesToRevoke = originalRoleIds.filter(
        (roleId) => !selectedRoleIds.includes(roleId)
      );

      // Add newly selected roles
      if (rolesToAssign.length > 0) {
        await api.put(`/projects/${projectId}/root-roles`, {
          roleIds: rolesToAssign,
        });
      }

      // Revoke unchecked roles
      for (const roleId of rolesToRevoke) {
        await api.delete(
          `/projects/${projectId}/access/${roleId}/super-admin`
        );
      }

      toast.success("Project updated successfully");
    }

    setModal(null);
    await fetchProjects();
  } catch (error) {
    console.error("Save Project Error:", error);
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
      `Delete project "${project.projectName}" permanently?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/projects/${idOf(project)}`);

      toast.success( "Project deleted successfully.");

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
  // REFRESH PROJECT MODULES
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
  // POST /projects/:projectId/modules
  // =====================================================
  const addModule = async (project) => {
    const moduleName = newModuleName.trim();

    if (!moduleName) {
      toast.error( "Enter a module name first.");
      return;
    }

    setSaving(true);

    try {
      await api.post(
        `/projects/${idOf(project)}/modules`,
        { moduleName }
      );

      setNewModuleName("");

      await refreshProjectModules(project);

      toast.success( "Module added successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // START EDIT MODULE
  // =====================================================
  const startEditModule = (module) => {
    setEditingModuleId(idOf(module));
    setEditModuleName(module.moduleName || "");
    setEditModuleStatus(
      module.status || "Not Assigned"
    );
  };

  const cancelEditModule = () => {
    setEditingModuleId("");
    setEditModuleName("");
    setEditModuleStatus("Not Assigned");
  };

  // =====================================================
  // UPDATE MODULE NAME AND STATUS
  // PUT /projects/:projectId/modules/:moduleId
  // =====================================================
  const saveModule = async (project, module) => {
    const moduleName = editModuleName.trim();

    if (!moduleName) {
      toast.error( "Module name cannot be empty.");
      return;
    }

    if (!MODULE_STATUSES.includes(editModuleStatus)) {
      toast.error( "Please select a valid module status.");
      return;
    }

    setSaving(true);

    try {
      await api.put(
        `/projects/${idOf(project)}/modules/${idOf(module)}`,
        {
          moduleName,
          status: editModuleStatus,
        }
      );

      cancelEditModule();

      await refreshProjectModules(project);

      toast.success( "Module updated successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE MODULE
  // DELETE /projects/:projectId/modules/:moduleId
  // =====================================================
  const deleteModule = async (project, module) => {
    const confirmed = window.confirm(
      `Delete module "${module.moduleName}"?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await api.delete(
        `/projects/${idOf(project)}/modules/${idOf(module)}`
      );

      if (editingModuleId === idOf(module)) {
        cancelEditModule();
      }

      await refreshProjectModules(project);

      toast.success( "Module deleted successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // COMPANY NAME
  // =====================================================
  const companyName = (project) => {
    if (
      project.companyId &&
      typeof project.companyId === "object"
    ) {
      return (
        project.companyId.companyName || "Unknown company"
      );
    }

    return (
      companies.find(
        (company) =>
          idOf(company) === idOf(project.companyId)
      )?.companyName || "Unknown company"
    );
  };

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

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-indigo-600">
              <FolderKanban size={18} />
              <span>Super Admin / Project Management</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Projects
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage projects, root-role assignments and project modules.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchProjects}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-100"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={17} />
              Create Project
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
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

        {/* SEARCH AND COMPANY FILTER */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search project, code, client or company..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="relative md:w-72">
            <Building2
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={companyFilter}
              onChange={(event) =>
                setCompanyFilter(event.target.value)
              }
              className={`${inputClass} appearance-none pl-10 pr-9`}
            >
              <option value="">All companies</option>

              {companies.map((company) => (
                <option key={idOf(company)} value={idOf(company)}>
                  {company.companyName}
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        {/* PROJECTS TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold">Project Directory</h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredProjects.length} project(s) found
              </p>
            </div>
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
                Create a project or change your search filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Project</th>
                    <th className="px-5 py-3 font-semibold">Company</th>
                    <th className="px-5 py-3 font-semibold">Client</th>
                    <th className="px-5 py-3 font-semibold">Root Roles</th>
                    <th className="px-5 py-3 font-semibold">Modules</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((project) => (
                    <tr
                      key={idOf(project)}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {project.projectName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {project.projectCode || "No project code"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Building2
                            size={16}
                            className="shrink-0 text-slate-400"
                          />
                          <span>{companyName(project)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {project.clientName || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          <Users size={13} />
                          {project.roleAccess?.length || 0}
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
                            title="View details and modules"
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

      {/* CREATE / EDIT PROJECT MODAL */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold">
                  {modal === "create" ? "Create Project" : "Edit Project"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Enter project information and assign root roles.
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Project Name *</label>

                  <input
                    required
                    value={form.projectName}
                    onChange={(event) =>
                      updateField("projectName", event.target.value)
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
                    onChange={(event) =>
                      updateField("projectCode", event.target.value)
                    }
                    className={`${inputClass} disabled:bg-slate-100`}
                    placeholder="e.g. PRJ-001"
                  />

                  {modal === "edit" && (
                    <p className="mt-1 text-xs text-slate-500">
                      Project code cannot be changed.
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Client Name *</label>

                  <input
                    required
                    value={form.clientName}
                    onChange={(event) =>
                      updateField("clientName", event.target.value)
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
                    onChange={(event) =>
                      updateField("projectDetails", event.target.value)
                    }
                    className={inputClass}
                    placeholder="Enter project details"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Project Description
                  </label>

                  <textarea
                    rows={3}
                    value={form.projectDescription}
                    onChange={(event) =>
                      updateField(
                        "projectDescription",
                        event.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="Describe the project"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Remarks</label>

                  <textarea
                    rows={2}
                    value={form.remarks}
                    onChange={(event) =>
                      updateField("remarks", event.target.value)
                    }
                    className={inputClass}
                    placeholder="Additional remarks"
                  />
                </div>

                {modal === "edit" && (
                  <div>
                    <label className={labelClass}>Project Status</label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateField("status", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              {/* ROOT ROLE ASSIGNMENT */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">
                      Root Role Assignment
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Only root roles belonging to this company are shown.
                    </p>
                  </div>

                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {form.roleAccess.length} selected
                  </span>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <input
                    value={roleSearch}
                    onChange={(event) => setRoleSearch(event.target.value)}
                    className={`${inputClass} min-w-[180px] flex-1`}
                    placeholder="Search root roles..."
                    disabled={!form.companyId}
                  />

                  <button
                    type="button"
                    onClick={toggleAllRoles}
                    disabled={!roles.length}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Select / Deselect All
                  </button>
                </div>

                {!form.companyId ? (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    Select a company to load its root roles.
                  </p>
                ) : roles.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
                    No root roles were found for this company.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {roles
                      .filter((role) =>
                        role.roleName
                          ?.toLowerCase()
                          .includes(roleSearch.toLowerCase())
                      )
                      .map((role) => (
                        <label
                          key={idOf(role)}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                        >
                          <input
  type="checkbox"
  checked={form.roleAccess.includes(idOf(role))}
  onChange={() => toggleRole(idOf(role))}
  disabled={saving}
  className="h-4 w-4 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
/>

                          <span className="text-sm font-medium">
                            {role.roleName}
                          </span>
                        </label>
                      ))}
                  </div>
                )}

                {modal === "edit" && (
                  <p className="mt-3 text-xs leading-5 text-amber-700">
                    Existing role assignments are preserved. Selecting
                    additional roles adds them to project access; this
                    screen does not remove previously assigned roles.
                  </p>
                )}
              </div>

              {/* INITIAL MODULES DURING PROJECT CREATION */}
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
                    onChange={(event) =>
                      updateField(
                        "modules",
                        event.target.value
                          .split("\n")
                          .map((moduleName) => ({ moduleName }))
                      )
                    }
                    className={inputClass}
                    placeholder={"Customer Portal\nInventory Tracking\nOrder Processing"}
                    rows={4}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    New modules default to “Not Assigned”.
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
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

                  {modal === "create"
                    ? "Create Project"
                    : "Save Changes"}
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
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold">
                  {selectedProject.projectName}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
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
                <h3 className="mb-2 font-semibold">
                  Project Description
                </h3>

                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedProject.projectDescription ||
                    "No description provided."}
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Project Details</h3>

                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedProject.projectDetails ||
                    "No details provided."}
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Remarks</h3>

                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedProject.remarks || "No remarks."}
                </p>
              </div>

              {/* PROJECT MODULES */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Project Modules</h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Add, edit, update status or delete project modules.
                    </p>
                  </div>

                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {selectedProject.modules?.length || 0} modules
                  </span>
                </div>

                {/* ADD MODULE */}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    addModule(selectedProject);
                  }}
                  className="mb-4 flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    value={newModuleName}
                    onChange={(event) =>
                      setNewModuleName(event.target.value)
                    }
                    className={`${inputClass} flex-1`}
                    placeholder="Enter new module name"
                    disabled={saving}
                  />

                  <button
                    type="submit"
                    disabled={saving || !newModuleName.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                            /* EDIT MODULE */
                            <div className="space-y-3">
                              <div>
                                <label className={labelClass}>
                                  Module Name
                                </label>

                                <input
                                  value={editModuleName}
                                  onChange={(event) =>
                                    setEditModuleName(event.target.value)
                                  }
                                  className={inputClass}
                                  placeholder="Enter module name"
                                  disabled={saving}
                                  autoFocus
                                />
                              </div>

                              <div>
                                <label className={labelClass}>
                                  Module Status
                                </label>

                                <select
                                  value={editModuleStatus}
                                  onChange={(event) =>
                                    setEditModuleStatus(event.target.value)
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
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <X size={15} />
                                  Cancel
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    saveModule(selectedProject, module)
                                  }
                                  disabled={
                                    saving ||
                                    !editModuleName.trim() ||
                                    !MODULE_STATUSES.includes(
                                      editModuleStatus
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  {saving ? (
                                    <RefreshCw
                                      className="animate-spin"
                                      size={15}
                                    />
                                  ) : (
                                    <Check size={15} />
                                  )}
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* MODULE DETAILS */
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                              <div className="min-w-0">
                                <p className="break-words font-medium text-slate-800">
                                  {module.moduleName}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Status:{" "}
                                  <span
                                    className={`font-medium ${
                                      module.status === "Completed"
                                        ? "text-emerald-600"
                                        : module.status === "In Progress"
                                          ? "text-indigo-600"
                                          : module.status === "Assigned"
                                            ? "text-blue-600"
                                            : "text-slate-500"
                                    }`}
                                  >
                                    {module.status || "Not Assigned"}
                                  </span>
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  title="Edit module name and status"
                                  onClick={() => startEditModule(module)}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                                >
                                  <Pencil size={15} />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  title="Delete module"
                                  disabled={saving}
                                  onClick={() =>
                                    deleteModule(selectedProject, module)
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
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

              {/* ASSIGNED ROOT ROLES */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 font-semibold">
                  Assigned Root Roles
                </h3>

                {!selectedProject.roleAccess?.length ? (
                  <p className="text-sm text-slate-500">
                    No roles assigned.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.roleAccess.map((role) => (
                      <span
                        key={idOf(role)}
                        className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700"
                      >
                        {typeof role === "object"
                          ? role.roleName || "Assigned role"
                          : roles.find(
                              (item) => idOf(item) === idOf(role)
                            )?.roleName || "Assigned role"}
                      </span>
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
    </div>
  );
};

export default Projects;