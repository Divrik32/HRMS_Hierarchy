import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Search, RefreshCw, Pencil, Trash2, FolderKanban, Building2,
  Users, Layers, X, Check, ChevronDown, AlertCircle, Calendar, UserPlus,
} from "lucide-react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import { toast } from "react-toastify";

const MODULE_STATUSES = ["Not Assigned", "Assigned", "In Progress", "Completed"];

const STATUS_COLORS = {
  "Not Assigned": "#cbd5e1",
  Assigned: "#a855f7",
  "In Progress": "#3b82f6",
  Completed: "#1f8a6a",
};

const EMPTY_FORM = {
  projectName: "", projectCode: "", clientName: "", projectDetails: "",
  projectDescription: "", remarks: "", companyId: "", employeeAccess: [],
  modules: [], status: "active",
};

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong.";

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

const getEmployeeRoleId = (employee) => idOf(employee.roleId || employee.role);

const getEmployeeName = (employee) =>
  employee.employeeName || employee.name || employee.fullName ||
  employee.firstName || employee.email || employee.employeeId || "Unnamed Employee";

const getEmployeeLabel = (employee) => {
  const name = getEmployeeName(employee);
  const details = [
    employee.employeeId && employee.employeeId !== name ? employee.employeeId : null,
    employee.email && employee.email !== name ? employee.email : null,
  ].filter(Boolean);
  return details.length ? `${name} (${details.join(" · ")})` : name;
};

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const AVATAR_TONES = [
  "bg-emerald-100 text-emerald-700", "bg-indigo-100 text-indigo-700",
  "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700",
];
const toneFor = (text = "") =>
  AVATAR_TONES[[...text].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

const Avatar = ({ name, size = "h-10 w-10" }) => (
  <span className={`flex ${size} shrink-0 items-center justify-center rounded-full text-xs font-semibold ${toneFor(name)}`}>
    {initials(name)}
  </span>
);

const Card = ({ title, action, children, className = "" }) => (
  <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 ${className}`}>
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
        {action}
      </div>
    )}
    {children}
  </section>
);

const EditLink = ({ onClick, label = "Edit" }) => (
  <button type="button" onClick={onClick}
    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-emerald-700">
    <Pencil size={13} /> {label}
  </button>
);

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
  const [selectedProject, setSelectedProject] = useState(null); // used for edit
  const [activeId, setActiveId] = useState("");
  const [activeModules, setActiveModules] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [roleSearch, setRoleSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [newModuleName, setNewModuleName] = useState("");
  const [editingModuleId, setEditingModuleId] = useState("");
  const [editModuleName, setEditModuleName] = useState("");
  const [editModuleStatus, setEditModuleStatus] = useState("Not Assigned");

  const employeeCompanyId = idOf(employee?.companyId);

  // ---------------- FETCH ----------------

  const fetchEmployee = useCallback(async () => {
    try {
      const response = await api.get("/employees/profile/me");
      setEmployee(response.data?.employee || response.data?.data || response.data);
    } catch (error) {
      toast.error(`Could not load employee profile: ${getErrorMessage(error)}`);
    }
  }, []);

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

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

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const fetchCompanyData = useCallback(async () => {
    if (!employeeCompanyId) return;
    try {
      const [roleResponse, employeeResponse] = await Promise.all([
        api.get(`/roles/company/${employeeCompanyId}/employee`),
        api.get(`/employees/company/${employeeCompanyId}/employee`),
      ]);
      setRoles(getList(roleResponse, "roles"));
      setEmployees(getList(employeeResponse, "employees"));
    } catch (error) {
      toast.error(`Could not load employees and roles: ${getErrorMessage(error)}`);
    }
  }, [employeeCompanyId]);

  useEffect(() => { fetchCompanyData(); }, [fetchCompanyData]);

  const fetchDeletedProjects = useCallback(async () => {
    setDeletedLoading(true);
    try {
      const response = await api.get("/projects/deleted/employee");
      setDeletedProjects(getList(response, "projects"));
    } catch (error) {
      toast.error(`Could not load deleted projects: ${getErrorMessage(error)}`);
    } finally {
      setDeletedLoading(false);
    }
  }, []);

  // ---------------- DERIVED ----------------

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    inactive: projects.filter((p) => p.status === "inactive").length,
    modules: projects.reduce((t, p) => t + (p.modules?.length || 0), 0),
  }), [projects]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      [project.projectName, project.projectCode, project.clientName, project.projectDetails]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [projects, search]);

  const activeProject = useMemo(
    () => projects.find((p) => idOf(p) === activeId) || filteredProjects[0] || null,
    [projects, filteredProjects, activeId]
  );
  const activeProjectId = activeProject ? idOf(activeProject) : "";

  const loadModules = useCallback(async (projectId) => {
    if (!projectId) { setActiveModules([]); return; }
    try {
      const response = await api.get(`/projects/${projectId}/modules`);
      setActiveModules(getList(response, "modules"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    setNewModuleName("");
    setEditingModuleId("");
    loadModules(activeProjectId);
  }, [activeProjectId, loadModules]);

  const moduleCounts = useMemo(() => {
    const counts = Object.fromEntries(MODULE_STATUSES.map((s) => [s, 0]));
    activeModules.forEach((m) => {
      const key = MODULE_STATUSES.includes(m.status) ? m.status : "Not Assigned";
      counts[key] += 1;
    });
    return counts;
  }, [activeModules]);

  const totalModules = activeModules.length;
  const completedPct = totalModules
    ? Math.round((moduleCounts.Completed / totalModules) * 100)
    : 0;

  const pieBackground = useMemo(() => {
    if (!totalModules) return "#e2e8f0";
    let acc = 0;
    const parts = MODULE_STATUSES.filter((s) => moduleCounts[s] > 0).map((s) => {
      const start = acc;
      acc += (moduleCounts[s] / totalModules) * 100;
      return `${STATUS_COLORS[s]} ${start}% ${acc}%`;
    });
    return `conic-gradient(${parts.join(", ")})`;
  }, [moduleCounts, totalModules]);

  const visibleRoles = roles.filter((role) =>
    role.roleName?.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const roleNameOf = (item) => {
    const roleId = getEmployeeRoleId(item);
    return roles.find((r) => idOf(r) === roleId)?.roleName || "Member";
  };

  const getSelectedEmployees = (project) =>
    (project.employeeAccess || [])
      .map((ref) =>
        typeof ref === "object" && ref !== null
          ? ref
          : employees.find((item) => idOf(item) === idOf(ref))
      )
      .filter(Boolean);

  const companyName = (project) =>
    typeof project.companyId === "object"
      ? project.companyId?.companyName || "Unknown company"
      : employee?.companyId?.companyName || "Unknown company";

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

  const updateField = (field, value) =>
    setForm((previous) => ({ ...previous, [field]: value }));

  const closeModal = () => {
    if (!saving) { setModal(null); }
  };

  // ---------------- CREATE / EDIT OPEN ----------------

  const openCreate = () => {
    setSelectedProject(null);
    setForm({ ...EMPTY_FORM, companyId: employeeCompanyId });
    setRoleSearch(""); setEmployeeSearch("");
    setModal("create");
  };

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
      employeeAccess: (project.employeeAccess || []).map(idOf).filter(Boolean),
      modules: project.modules || [],
      status: project.status || "active",
    });
    setRoleSearch(""); setEmployeeSearch("");
    setModal("edit");
  };

  // ---------------- EMPLOYEE ACCESS ----------------

  const matchesEmployeeSearch = (item) => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return true;
    return [getEmployeeName(item), item.employeeId, item.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  };

  const toggleEmployee = (targetId) => {
    if (saving) return;
    setForm((previous) => ({
      ...previous,
      employeeAccess: previous.employeeAccess.includes(targetId)
        ? previous.employeeAccess.filter((id) => id !== targetId)
        : [...previous.employeeAccess, targetId],
    }));
  };

  const toggleIds = (ids) => {
    setForm((previous) => {
      const allSelected = ids.length > 0 && ids.every((id) => previous.employeeAccess.includes(id));
      return {
        ...previous,
        employeeAccess: allSelected
          ? previous.employeeAccess.filter((id) => !ids.includes(id))
          : [...new Set([...previous.employeeAccess, ...ids])],
      };
    });
  };

  const toggleAllEmployeesInRole = (roleId) => {
    if (saving) return;
    toggleIds(employees.filter((i) => getEmployeeRoleId(i) === roleId).map(idOf).filter(Boolean));
  };

  const toggleAllEmployees = () => {
    if (saving) return;
    toggleIds(
      visibleRoles
        .flatMap((role) =>
          employees
            .filter((i) => getEmployeeRoleId(i) === idOf(role))
            .filter(matchesEmployeeSearch)
            .map(idOf)
        )
        .filter(Boolean)
    );
  };

  // ---------------- SAVE PROJECT ----------------

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

        await api.put(`/projects/${projectId}/employee`, {
          projectName: form.projectName.trim(),
          clientName: form.clientName.trim(),
          projectDetails: form.projectDetails,
          projectDescription: form.projectDescription,
          remarks: form.remarks,
          status: form.status,
        });

        const originalIds = [...new Set((selectedProject.employeeAccess || []).map(idOf).filter(Boolean))];
        const selectedIds = [...new Set(form.employeeAccess.map(idOf).filter(Boolean))];
        const toGrant = selectedIds.filter((id) => !originalIds.includes(id));
        const toRevoke = originalIds.filter((id) => !selectedIds.includes(id));

        for (const targetId of toGrant) {
          const target = employees.find((item) => idOf(item) === targetId);
          if (!target) continue;
          await api.post(`/projects/${projectId}/access`, {
            employeeId: targetId,
            roleId: getEmployeeRoleId(target),
            companyId: employeeCompanyId,
          });
        }

        for (const targetId of toRevoke) {
          await api.delete(`/projects/${projectId}/access/${targetId}`);
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

  // ---------------- DELETE / RESTORE ----------------

  const deleteProject = async (project) => {
    if (!window.confirm(`Move "${project.projectName}" to Deleted Projects?`)) return;
    try {
      await api.delete(`/projects/${idOf(project)}/employee`);
      toast.success("Project moved to Deleted Projects.");
      if (activeId === idOf(project)) setActiveId("");
      await fetchProjects();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const restoreProject = async (project) => {
    if (!window.confirm(`Restore project "${project.projectName}"?`)) return;
    try {
      await api.post(`/projects/deleted/${idOf(project)}/restore/employee`);
      toast.success("Project restored successfully.");
      await Promise.all([fetchProjects(), fetchDeletedProjects()]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const permanentlyDeleteProject = async (project) => {
    if (!window.confirm(`Permanently delete "${project.projectName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/projects/deleted/${idOf(project)}/permanent/employee`);
      toast.success("Project permanently deleted.");
      await fetchDeletedProjects();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // ---------------- MODULES ----------------

  const refreshProjectModules = async (project) => {
    await loadModules(idOf(project));
    await fetchProjects();
  };

  const addModule = async (project) => {
    const moduleName = newModuleName.trim();
    if (!moduleName) { toast.error("Enter a module name first."); return; }
    setSaving(true);
    try {
      await api.post(`/projects/${idOf(project)}/modules/employee`, { moduleName });
      setNewModuleName("");
      await refreshProjectModules(project);
      toast.success("Module added successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

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
    if (!moduleName) { toast.error("Module name cannot be empty."); return; }
    if (!MODULE_STATUSES.includes(editModuleStatus)) { toast.error("Invalid module status."); return; }
    setSaving(true);
    try {
      await api.put(`/projects/${idOf(project)}/modules/${idOf(module)}/employee`, {
        moduleName, status: editModuleStatus,
      });
      cancelEditModule();
      await refreshProjectModules(project);
      toast.success("Module updated successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (project, module) => {
    if (!window.confirm(`Delete module "${module.moduleName}"?`)) return;
    setSaving(true);
    try {
      await api.delete(`/projects/${idOf(project)}/modules/${idOf(module)}/employee`);
      if (editingModuleId === idOf(module)) cancelEditModule();
      await refreshProjectModules(project);
      toast.success("Module deleted successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // ---------------- RENDER HELPERS ----------------

  const statCards = [
    { label: "Total projects", value: stats.total, icon: FolderKanban, color: "bg-emerald-50 text-emerald-700" },
    { label: "Active", value: stats.active, icon: Check, color: "bg-teal-50 text-teal-700" },
    { label: "Inactive", value: stats.inactive, icon: AlertCircle, color: "bg-amber-50 text-amber-600" },
    { label: "Total modules", value: stats.modules, icon: Layers, color: "bg-violet-50 text-violet-600" },
  ];

  const statusPill = (status) =>
    status === "inactive"
      ? "border-slate-200 bg-slate-100 text-slate-600"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const teamMembers = activeProject ? getSelectedEmployees(activeProject) : [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-5">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage company projects, team access and modules.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={fetchProjects}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-100">
              <RefreshCw size={16} /> Refresh
            </button>
            <button type="button"
              onClick={async () => { setModal("deleted"); await fetchDeletedProjects(); }}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100">
              <Trash2 size={16} /> Deleted projects
            </button>
            <button type="button" onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
              <Plus size={17} /> Create project
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4">
                <span className={`rounded-xl p-2.5 ${item.color}`}><Icon size={20} /></span>
                <div>
                  <p className="text-2xl font-bold leading-none">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* BODY */}
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_340px]">

          {/* PROJECT LIST */}
          <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <div className="relative">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search project, code, client..." className={`${inputClass} pl-10`} />
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-2">
              <p className="px-3 pb-2 pt-2 text-xs font-medium text-slate-500">
                {filteredProjects.length} project(s)
              </p>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <RefreshCw className="animate-spin" size={16} /> Loading projects...
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <FolderKanban size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">No projects found</p>
                  <p className="mt-1 text-xs text-slate-500">Create a project or change your search.</p>
                </div>
              ) : (
                <ul className="max-h-[560px] space-y-1 overflow-y-auto">
                  {filteredProjects.map((project) => {
                    const isActive = idOf(project) === activeProjectId;
                    return (
                      <li key={idOf(project)}>
                        <button type="button" onClick={() => setActiveId(idOf(project))}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                            isActive
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-transparent hover:bg-slate-50"
                          }`}>
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                            <FolderKanban size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{project.projectName}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {project.projectCode || "No project code"} · {project.clientName || "—"}
                            </span>
                          </span>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${project.status === "inactive" ? "bg-slate-300" : "bg-emerald-500"}`} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* MAIN */}
          {!activeProject ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 lg:col-span-1 2xl:col-span-2">
              Select or create a project to see its details.
            </div>
          ) : (
            <>
              <div className="min-w-0 space-y-5">

                {/* TITLE ROW */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold">{activeProject.projectName}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <Building2 size={14} /> {companyName(activeProject)}
                      <span>·</span> {activeProject.projectCode || "No project code"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEdit(activeProject)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium hover:bg-slate-50">
                      <Pencil size={15} /> Edit project
                    </button>
                    <button type="button" onClick={() => deleteProject(activeProject)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>

                {/* ABOUT */}
                <Card title="About project" action={<EditLink onClick={() => openEdit(activeProject)} />}>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {activeProject.projectDescription || "No description provided."}
                  </p>
                  {activeProject.projectDetails && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-1 text-xs font-medium text-slate-500">Project details</p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {activeProject.projectDetails}
                      </p>
                    </div>
                  )}
                </Card>

                {/* TEAM MEMBERS */}
                <Card title="Team members"
                  action={<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {activeProject.employeeAccess?.length || 0} employees
                  </span>}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {teamMembers.map((item) => (
                      <div key={idOf(item)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                        <Avatar name={getEmployeeName(item)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{getEmployeeName(item)}</p>
                          <p className="truncate text-xs text-slate-500">{item.email || item.employeeId || "—"}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {roleNameOf(item)}
                        </span>
                      </div>
                    ))}
                    <button type="button" onClick={() => openEdit(activeProject)}
                      className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-left text-sm font-medium text-slate-600 hover:border-emerald-600 hover:text-emerald-700">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><UserPlus size={17} /></span>
                      Add team member
                    </button>
                  </div>
                  {!teamMembers.length && (
                    <p className="mt-3 text-sm text-slate-500">No employees assigned yet.</p>
                  )}
                </Card>

                {/* PROGRESS */}
                <Card title="Progress">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-5 rounded-xl border border-slate-200 p-4">
                      <div className="relative h-32 w-32 shrink-0">
                        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f8a6a" strokeWidth="4"
                            strokeLinecap="round" strokeDasharray={`${completedPct} 100`} pathLength="100" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                          {completedPct}%
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-slate-500">Completed modules</p>
                        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-700" /> Completed ({moduleCounts.Completed})</p>
                        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-slate-200" /> Incomplete ({totalModules - moduleCounts.Completed})</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 rounded-xl border border-slate-200 p-4">
                      <div className="h-32 w-32 shrink-0 rounded-full" style={{ background: pieBackground }} />
                      <div className="space-y-1.5 text-sm">
                        <p className="font-medium text-slate-500">Module status</p>
                        {MODULE_STATUSES.map((s) => (
                          <p key={s} className="flex items-center gap-2 text-xs">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                            {s} ({moduleCounts[s]})
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* MODULES */}
                <Card title="Project modules"
                  action={<span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    {totalModules} modules
                  </span>}>
                  <form
                    onSubmit={(e) => { e.preventDefault(); addModule(activeProject); }}
                    className="mb-4 flex flex-col gap-2 sm:flex-row">
                    <input value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)}
                      className={`${inputClass} flex-1`} placeholder="Enter new module name" disabled={saving} />
                    <button type="submit" disabled={saving || !newModuleName.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                      {saving ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                      Add module
                    </button>
                  </form>

                  {!activeModules.length ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No modules have been added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeModules.map((module) => {
                        const isEditing = editingModuleId === idOf(module);
                        const status = module.status || "Not Assigned";
                        return (
                          <div key={idOf(module)} className="rounded-xl border border-slate-200 p-3">
                            {isEditing ? (
                              <div className="space-y-3">
                                <div>
                                  <label className={labelClass}>Module name</label>
                                  <input value={editModuleName} onChange={(e) => setEditModuleName(e.target.value)}
                                    className={inputClass} disabled={saving} />
                                </div>
                                <div>
                                  <label className={labelClass}>Module status</label>
                                  <select value={editModuleStatus} onChange={(e) => setEditModuleStatus(e.target.value)}
                                    className={inputClass} disabled={saving}>
                                    {MODULE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button type="button" onClick={cancelEditModule} disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                    <X size={15} /> Cancel
                                  </button>
                                  <button type="button" onClick={() => saveModule(activeProject, module)}
                                    disabled={saving || !editModuleName.trim()}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50">
                                    <Check size={15} /> Save changes
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[status] }} />
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-medium">{module.moduleName}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{status}</p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <button type="button" onClick={() => startEditModule(module)} disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                                    <Pencil size={14} /> Edit
                                  </button>
                                  <button type="button" onClick={() => deleteModule(activeProject, module)} disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                                    <Trash2 size={14} /> Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-5 lg:col-span-2 2xl:col-span-1">
                <Card title="Project info" action={<EditLink onClick={() => openEdit(activeProject)} />}>
                  <dl className="divide-y divide-slate-100 text-sm">
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-slate-500">Status</dt>
                      <dd className={`rounded-full border px-3 py-0.5 text-xs font-semibold capitalize ${statusPill(activeProject.status)}`}>
                        {activeProject.status || "active"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-3">
                      <dt className="text-slate-500">Client</dt>
                      <dd className="truncate font-medium">{activeProject.clientName || "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-3">
                      <dt className="text-slate-500">Project code</dt>
                      <dd className="truncate font-medium">{activeProject.projectCode || "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-3">
                      <dt className="text-slate-500">Company</dt>
                      <dd className="truncate font-medium">{companyName(activeProject)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-3">
                      <dt className="text-slate-500">Created date</dt>
                      <dd className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium">
                        {activeProject.createdAt
                          ? new Date(activeProject.createdAt).toLocaleDateString()
                          : "—"}
                        <Calendar size={13} className="text-slate-400" />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-slate-500">Employees</dt>
                      <dd className="inline-flex items-center gap-1.5 font-medium"><Users size={14} />{activeProject.employeeAccess?.length || 0}</dd>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-slate-500">Modules</dt>
                      <dd className="inline-flex items-center gap-1.5 font-medium"><Layers size={14} />{totalModules}</dd>
                    </div>
                  </dl>
                </Card>

                <Card title="Remarks" action={<EditLink onClick={() => openEdit(activeProject)} />}>
                  <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {activeProject.remarks || "No remarks."}
                  </p>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">{modal === "create" ? "Create project" : "Edit project"}</h2>
                <p className="mt-1 text-xs text-slate-500">Manage project details and individual employee access.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveProject} className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Project name *</label>
                  <input required value={form.projectName} onChange={(e) => updateField("projectName", e.target.value)}
                    className={inputClass} placeholder="Enter project name" />
                </div>
                <div>
                  <label className={labelClass}>Project code</label>
                  <input value={form.projectCode} disabled={modal === "edit"}
                    onChange={(e) => updateField("projectCode", e.target.value)}
                    className={`${inputClass} disabled:bg-slate-100`} placeholder="e.g. PRJ-001" />
                </div>
                <div>
                  <label className={labelClass}>Client name *</label>
                  <input required value={form.clientName} onChange={(e) => updateField("clientName", e.target.value)}
                    className={inputClass} placeholder="Enter client name" />
                </div>
                {modal === "edit" && (
                  <div>
                    <label className={labelClass}>Project status</label>
                    <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className={inputClass}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className={labelClass}>Project details</label>
                  <textarea rows={2} value={form.projectDetails}
                    onChange={(e) => updateField("projectDetails", e.target.value)} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Project description</label>
                  <textarea rows={3} value={form.projectDescription}
                    onChange={(e) => updateField("projectDescription", e.target.value)} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Remarks</label>
                  <textarea rows={2} value={form.remarks}
                    onChange={(e) => updateField("remarks", e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* EMPLOYEE ACCESS */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Employee access assignment</h3>
                    <p className="mt-1 text-xs text-slate-500">Select individual employees. Roles are only used to group employees.</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {form.employeeAccess.length} selected
                  </span>
                </div>

                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                  <input value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)}
                    className={inputClass} placeholder="Search role..." />
                  <input value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)}
                    className={inputClass} placeholder="Search employee name, ID or email..." />
                </div>

                <div className="mb-3 flex justify-end">
                  <button type="button" onClick={toggleAllEmployees} disabled={saving || !visibleRoles.length}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
                    Select / deselect all visible employees
                  </button>
                </div>

                {!visibleRoles.length ? (
                  <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">No roles found for this company.</p>
                ) : (
                  <div className="space-y-2">
                    {visibleRoles.map((role) => {
                      const roleId = idOf(role);
                      const roleEmployees = employees.filter((i) => getEmployeeRoleId(i) === roleId);
                      const filteredEmployees = roleEmployees.filter(matchesEmployeeSearch);
                      const selectedCount = roleEmployees.filter((i) => form.employeeAccess.includes(idOf(i))).length;
                      const allSelected = roleEmployees.length > 0 && selectedCount === roleEmployees.length;

                      return (
                        <details key={roleId} className="group rounded-xl border border-slate-200">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-3 hover:bg-slate-50">
                            <div className="flex min-w-0 items-center gap-3">
                              <ChevronDown size={17} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                              <div>
                                <p className="font-medium">{role.roleName}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{roleEmployees.length} employee(s)</p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              {selectedCount} / {roleEmployees.length}
                            </span>
                          </summary>

                          <div className="border-t border-slate-100 p-3">
                            {roleEmployees.length > 0 && (
                              <div className="mb-3 flex justify-end">
                                <button type="button" onClick={() => toggleAllEmployeesInRole(roleId)} disabled={saving}
                                  className="text-xs font-semibold text-emerald-700">
                                  {allSelected ? "Deselect all" : "Select all"}
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
                                    <label key={targetId}
                                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                                      <input type="checkbox" checked={form.employeeAccess.includes(targetId)}
                                        onChange={() => toggleEmployee(targetId)} disabled={saving}
                                        className="mt-0.5 h-4 w-4 accent-emerald-700" />
                                      <span className="min-w-0 text-sm font-medium">{getEmployeeLabel(item)}</span>
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
                    Selected employees will receive access. Unchecking an employee will revoke only that employee's access when you save.
                  </p>
                )}
              </div>

              {/* INITIAL MODULES */}
              {modal === "create" && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-1 font-semibold">Project modules</h3>
                  <p className="mb-3 text-xs text-slate-500">Add one module per line.</p>
                  <textarea
                    value={form.modules
                      .map((m) => (typeof m === "string" ? m : m.moduleName || ""))
                      .join("\n")}
                    onChange={(e) =>
                      updateField("modules", e.target.value.split("\n").map((moduleName) => ({ moduleName })))
                    }
                    className={inputClass} rows={4}
                    placeholder={"Customer Portal\nInventory Tracking\nOrder Processing"} />
                  <p className="mt-2 text-xs text-slate-500">New modules default to Not Assigned.</p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeModal} disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                  {saving && <RefreshCw className="animate-spin" size={16} />}
                  {modal === "create" ? "Create project" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETED PROJECTS */}
      {modal === "deleted" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">Deleted projects</h2>
                <p className="mt-1 text-sm text-slate-500">Restore archived projects or permanently delete them.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={fetchDeletedProjects} disabled={deletedLoading}
                  className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100">
                  <RefreshCw size={17} className={deletedLoading ? "animate-spin" : ""} />
                </button>
                <button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(95vh-85px)] overflow-y-auto p-4 sm:p-6">
              {deletedLoading ? (
                <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
                  <RefreshCw className="animate-spin" size={18} /> Loading deleted projects...
                </div>
              ) : deletedProjects.length === 0 ? (
                <div className="py-16 text-center">
                  <Trash2 size={36} className="mx-auto mb-3 text-slate-300" />
                  <h3 className="font-semibold">No deleted projects</h3>
                  <p className="mt-1 text-sm text-slate-500">Deleted projects will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Modules</th>
                        <th className="px-4 py-3">Deleted at</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deletedProjects.map((project) => (
                        <tr key={idOf(project)} className="hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <p className="font-semibold">{project.projectName || "Unnamed project"}</p>
                            <p className="mt-1 text-xs text-slate-500">{project.projectCode || "No project code"}</p>
                          </td>
                          <td className="px-4 py-4">{companyName(project)}</td>
                          <td className="px-4 py-4">{project.clientName || "—"}</td>
                          <td className="px-4 py-4">{project.modules?.length || 0}</td>
                          <td className="px-4 py-4">
                            {project.deletedAt ? new Date(project.deletedAt).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => restoreProject(project)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                                <RefreshCw size={14} /> Restore
                              </button>
                              <button type="button" onClick={() => permanentlyDeleteProject(project)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                                <Trash2 size={14} /> Delete forever
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
                <button type="button" onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-50">
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