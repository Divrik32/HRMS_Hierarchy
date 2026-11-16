import { useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Search, RefreshCw, Pencil, Trash2, Eye, FolderKanban,
  Building2, Users, Layers, X, Check, ChevronDown, AlertCircle,
  UserPlus, UserMinus, RotateCcw, ShieldCheck, BriefcaseBusiness,
  Filter, Save, Loader2, Archive, Settings2, FileText
} from "lucide-react";
import api from "../../api/axios.js";
import { toast } from "react-toastify";

const STATUSES = ["Not Assigned", "Assigned", "In Progress", "Completed"];

const EMPTY_PROJECT = {
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

const getError = (error) =>
  error.response?.data?.message || error.message || "Something went wrong.";

const getArray = (response, key) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  return [];
};

const getId = (value) => {
  if (!value) return "";
  return typeof value === "object"
    ? String(value._id || value.id || "")
    : String(value);
};

const getName = (employee) =>
  employee?.name ||
  employee?.employeeName ||
  employee?.fullName ||
  employee?.email ||
  "Unnamed Employee";

const getEmpCode = (employee) =>
  employee?.empId || employee?.employeeId || "";

const getCompanyName = (project, companies = []) => {
  if (project?.companyId && typeof project.companyId === "object") {
    return project.companyId.companyName || "Unknown company";
  }

  return (
    companies.find((company) => getId(company) === getId(project?.companyId))
      ?.companyName || "Unknown company"
  );
};

const getEmployeeRoleId = (employee) =>
  getId(employee?.roleId || employee?.role);

const getEmployeesFromProject = (project) =>
  (project?.employeeAccess || []).filter(
    (employee) => employee && typeof employee === "object"
  );

const getAssignmentEmployee = (assignment) => {
  if (
    assignment?.employeeId &&
    typeof assignment.employeeId === "object"
  ) {
    return assignment.employeeId;
  }

  return null;
};

const Projects = () => {
  // --------------------------------------------------
  // STATE
  // --------------------------------------------------
const { companyId } = useParams();
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modal, setModal] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);

  const [form, setForm] = useState(EMPTY_PROJECT);

  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [moduleName, setModuleName] = useState("");
  const [editingModuleId, setEditingModuleId] = useState("");
  const [editingModuleName, setEditingModuleName] = useState("");
  const [editingModuleStatus, setEditingModuleStatus] =
    useState("Not Assigned");

  const [moduleEmployees, setModuleEmployees] = useState([]);
  const [moduleEmployeeSearch, setModuleEmployeeSearch] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [moduleAssignmentDescription, setModuleAssignmentDescription] =
    useState("");

  const [accessEmployees, setAccessEmployees] = useState([]);
  const [accessSearch, setAccessSearch] = useState("");

  // --------------------------------------------------
  // FETCH PROJECTS
  // --------------------------------------------------

  const fetchProjects = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/projects/super-admin/overview");
      setProjects(getArray(response, "projects"));
    } catch (error) {
      setProjects([]);
      toast.error(`Projects: ${getError(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await api.get("/companies");
      setCompanies(getArray(response, "companies"));
    } catch (error) {
      setCompanies([]);
      toast.error(`Companies: ${getError(error)}`);
    }
  }, []);

  const fetchDeletedProjects = useCallback(async () => {
    setDeletedLoading(true);

    try {
      // Existing backend endpoint retained.
      const response = await api.get("/projects/deleted");
      setDeletedProjects(getArray(response, "projects"));
    } catch (error) {
      setDeletedProjects([]);
      toast.error(`Deleted projects: ${getError(error)}`);
    } finally {
      setDeletedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchCompanies();
  }, [fetchProjects, fetchCompanies]);

  // --------------------------------------------------
  // COMPANY EMPLOYEES AND ROLES
  // --------------------------------------------------

  const fetchCompanyData = useCallback(async (companyId) => {
    if (!companyId) {
      setRoles([]);
      setEmployees([]);
      return;
    }

    setEmployeeLoading(true);

    try {
      const [roleResponse, employeeResponse] = await Promise.all([
        api.get(`/roles/company/${companyId}`),
        api.get(`/employees/company/${companyId}`),
      ]);

      setRoles(getArray(roleResponse, "roles"));
      setEmployees(getArray(employeeResponse, "employees"));
    } catch (error) {
      setRoles([]);
      setEmployees([]);
      toast.error(`Company employees: ${getError(error)}`);
    } finally {
      setEmployeeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (modal === "create" || modal === "edit") {
      fetchCompanyData(form.companyId);
    }
  }, [form.companyId, modal, fetchCompanyData]);

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const stats = useMemo(() => {
    const employeeIds = new Set();

    projects.forEach((project) => {
      (project.employeeAccess || []).forEach((employee) => {
        const id = getId(employee);
        if (id) employeeIds.add(id);
      });
    });

    return {
      total: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      inactive: projects.filter((p) => p.status === "inactive").length,
      modules: projects.reduce(
        (sum, p) => sum + (p.modules?.length || 0),
        0
      ),
      employees: employeeIds.size,
    };
  }, [projects]);

  // --------------------------------------------------
  // FILTER PROJECTS
  // --------------------------------------------------

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      if (statusFilter && project.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      return [
        project.projectName,
        project.projectCode,
        project.clientName,
        project.projectDetails,
        project.projectDescription,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [projects, search, statusFilter]);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const closeModal = () => {
    if (saving) return;

    setModal("");
    setSelectedProject(null);
    setEditingModuleId("");
    setSelectedModuleId("");
    setModuleAssignmentDescription("");
  };

  const refreshSelectedProject = async (projectId) => {
    const response = await api.get(`/projects/${projectId}/modules`);
    const modules = getArray(response, "modules");

    setSelectedProject((prev) =>
      prev && getId(prev) === projectId
        ? { ...prev, modules }
        : prev
    );

    await fetchProjects();
  };

  const loadProjectDetails = async (project) => {
    setSelectedProject(project);
    setModal("details");
    setEditingModuleId("");

    try {
      const response = await api.get(
        `/projects/${getId(project)}/modules`
      );

      const modules = getArray(response, "modules");

      setSelectedProject((prev) =>
        prev && getId(prev) === getId(project)
          ? { ...prev, modules }
          : prev
      );
    } catch (error) {
      toast.error(getError(error));
    }
  };

  // --------------------------------------------------
  // CREATE PROJECT
  // --------------------------------------------------

const openCreate = () => {
  setForm({
    ...EMPTY_PROJECT,
    companyId: companyId || "",
  });

  setRoles([]);
  setEmployees([]);
  setSelectedProject(null);
  setRoleSearch("");
  setEmployeeSearch("");
  setModal("create");
};

  // --------------------------------------------------
  // EDIT PROJECT
  // --------------------------------------------------

  const openEdit = (project) => {
    setSelectedProject(project);

    setForm({
      projectName: project.projectName || "",
      projectCode: project.projectCode || "",
      clientName: project.clientName || "",
      projectDetails: project.projectDetails || "",
      projectDescription: project.projectDescription || "",
      remarks: project.remarks || "",
      companyId: getId(project.companyId),
      employeeAccess: (project.employeeAccess || [])
        .map(getId)
        .filter(Boolean),
      modules: project.modules || [],
      status: project.status || "active",
    });

    setRoleSearch("");
    setEmployeeSearch("");
    setModal("edit");
  };

  // --------------------------------------------------
  // EMPLOYEE ACCESS FORM SELECTION
  // --------------------------------------------------

  const toggleFormEmployee = (employeeId) => {
    setForm((prev) => ({
      ...prev,
      employeeAccess: prev.employeeAccess.includes(employeeId)
        ? prev.employeeAccess.filter((id) => id !== employeeId)
        : [...prev.employeeAccess, employeeId],
    }));
  };

  const filteredFormEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    const roleQuery = roleSearch.trim().toLowerCase();

    return roles
      .filter((role) =>
        (role.roleName || "").toLowerCase().includes(roleQuery)
      )
      .map((role) => ({
        ...role,
        employees: employees.filter((employee) => {
          if (getEmployeeRoleId(employee) !== getId(role)) return false;
          if (!query) return true;

          return [
            getName(employee),
            getEmpCode(employee),
            employee.email,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(query)
            );
        }),
      }));
  }, [roles, employees, employeeSearch, roleSearch]);

  // --------------------------------------------------
  // SAVE PROJECT
  // --------------------------------------------------

  const saveProject = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!form.companyId) {
      toast.error("Please select a company.");
      return;
    }

    if (!form.projectName.trim() || !form.clientName.trim()) {
      toast.error("Project name and client name are required.");
      return;
    }

    setSaving(true);

    try {
      if (modal === "create") {
        const modules = (form.modules || [])
          .map((module) => ({
            moduleName:
              typeof module === "string"
                ? module.trim()
                : (module.moduleName || "").trim(),
          }))
          .filter((module) => module.moduleName);

        await api.post("/projects", {
          ...form,
          projectName: form.projectName.trim(),
          projectCode: form.projectCode.trim(),
          clientName: form.clientName.trim(),
          modules,
        });

        toast.success("Project created successfully.");
      } else if (modal === "edit" && selectedProject) {
        const projectId = getId(selectedProject);

        await api.put(`/projects/${projectId}`, {
          projectName: form.projectName.trim(),
          clientName: form.clientName.trim(),
          projectDetails: form.projectDetails,
          projectDescription: form.projectDescription,
          remarks: form.remarks,
          status: form.status,
        });

        const originalIds = [
          ...new Set(
            (selectedProject.employeeAccess || []).map(getId)
          ),
        ].filter(Boolean);

        const selectedIds = [
          ...new Set(form.employeeAccess),
        ].filter(Boolean);

        const toGrant = selectedIds.filter(
          (id) => !originalIds.includes(id)
        );

        const toRevoke = originalIds.filter(
          (id) => !selectedIds.includes(id)
        );

        if (toGrant.length) {
          await api.post(
            `/projects/${projectId}/access/super-admin`,
            { employeeIds: toGrant }
          );
        }

        for (const employeeId of toRevoke) {
          await api.delete(
            `/projects/${projectId}/access/${employeeId}/super-admin`
          );
        }

        toast.success("Project updated successfully.");
      }

      setModal("");
      setSelectedProject(null);
      await fetchProjects();
    } catch (error) {
      toast.error(getError(error));
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // PROJECT ARCHIVE / DELETE
  // --------------------------------------------------

  const archiveProject = async (project) => {
    if (
      !window.confirm(
        `Move "${project.projectName}" to Deleted Projects?`
      )
    ) return;

    try {
      await api.delete(`/projects/${getId(project)}`);
      toast.success("Project archived successfully.");

      if (getId(selectedProject) === getId(project)) {
        setModal("");
        setSelectedProject(null);
      }

      await fetchProjects();
    } catch (error) {
      toast.error(getError(error));
    }
  };

  const restoreProject = async (project) => {
    if (!window.confirm(`Restore "${project.projectName}"?`)) return;

    try {
      await api.post(`/projects/deleted/${getId(project)}/restore`);
      toast.success("Project restored.");

      await Promise.all([
        fetchProjects(),
        fetchDeletedProjects(),
      ]);
    } catch (error) {
      toast.error(getError(error));
    }
  };

  const permanentlyDelete = async (project) => {
    if (
      !window.confirm(
        `Permanently delete "${project.projectName}"? This cannot be undone.`
      )
    ) return;

    try {
      await api.delete(
        `/projects/deleted/${getId(project)}/permanent`
      );

      toast.success("Project permanently deleted.");
      await fetchDeletedProjects();
    } catch (error) {
      toast.error(getError(error));
    }
  };

  // --------------------------------------------------
  // SUPER ADMIN PROJECT ACCESS
  // --------------------------------------------------

  const openAccessManager = async (project) => {
    setSelectedProject(project);
    setAccessEmployees([]);
    setAccessSearch("");
    setModal("access");

    try {
      const [projectResponse, employeeResponse] = await Promise.all([
        api.get(
          `/projects/${getId(project)}/role-access/super-admin`
        ),
        api.get(`/employees/company/${getId(project.companyId)}`),
      ]);

      const data = projectResponse.data;

      const accessList =
        data.employees ||
        data.access ||
        data.roles ||
        data.data?.employees ||
        [];

      setAccessEmployees(
        Array.isArray(accessList) ? accessList : []
      );

      if (!accessList.length) {
        setAccessEmployees(
          getArray(employeeResponse, "employees")
        );
      }
    } catch (error) {
      try {
        const response = await api.get(
          `/employees/company/${getId(project.companyId)}`
        );

        setAccessEmployees(getArray(response, "employees"));
      } catch {
        setAccessEmployees([]);
        toast.error(getError(error));
      }
    }
  };

  const grantAccess = async (employeeId) => {
    if (!selectedProject || !employeeId) return;

    try {
      await api.post(
        `/projects/${getId(selectedProject)}/access/super-admin`,
        { employeeIds: [employeeId] }
      );

      toast.success("Project access granted.");
      await fetchProjects();

      await openAccessManager({
        ...selectedProject,
        employeeAccess: [
          ...(selectedProject.employeeAccess || []),
          employeeId,
        ],
      });
    } catch (error) {
      toast.error(getError(error));
    }
  };

  const revokeAccess = async (employeeId) => {
    if (!selectedProject || !employeeId) return;

    if (
      !window.confirm(
        "Revoke this employee's project access? Their module assignments will also be removed."
      )
    ) return;

    try {
      await api.delete(
        `/projects/${getId(selectedProject)}/access/${employeeId}/super-admin`
      );

      toast.success("Project access revoked.");
      await fetchProjects();

      setSelectedProject((prev) => ({
        ...prev,
        employeeAccess: (prev.employeeAccess || []).filter(
          (employee) => getId(employee) !== employeeId
        ),
      }));

      setAccessEmployees((prev) =>
        prev.map((employee) =>
          getId(employee) === employeeId
            ? { ...employee, hasAccess: false }
            : employee
        )
      );
    } catch (error) {
      toast.error(getError(error));
    }
  };

  // --------------------------------------------------
  // MODULE CRUD
  // --------------------------------------------------

  const addModule = async (project) => {
    if (!moduleName.trim()) {
      toast.error("Enter module name.");
      return;
    }

    setSaving(true);

    try {
      await api.post(`/projects/${getId(project)}/modules`, {
        moduleName: moduleName.trim(),
      });

      setModuleName("");
      await refreshSelectedProject(getId(project));
      toast.success("Module added.");
    } catch (error) {
      toast.error(getError(error));
    } finally {
      setSaving(false);
    }
  };

  const startEditModule = (module) => {
    setEditingModuleId(getId(module));
    setEditingModuleName(module.moduleName || "");
    setEditingModuleStatus(module.status || "Not Assigned");
  };

  const saveModule = async (project, module) => {
    if (!editingModuleName.trim()) {
      toast.error("Module name is required.");
      return;
    }

    if (!STATUSES.includes(editingModuleStatus)) {
      toast.error("Invalid module status.");
      return;
    }

    setSaving(true);

    try {
      await api.put(
        `/projects/${getId(project)}/modules/${getId(module)}`,
        {
          moduleName: editingModuleName.trim(),
          status: editingModuleStatus,
        }
      );

      setEditingModuleId("");
      await refreshSelectedProject(getId(project));
      toast.success("Module updated.");
    } catch (error) {
      toast.error(getError(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (project, module) => {
    if (!window.confirm(`Delete module "${module.moduleName}"?`)) return;

    setSaving(true);

    try {
      await api.delete(
        `/projects/${getId(project)}/modules/${getId(module)}`
      );

      await refreshSelectedProject(getId(project));
      toast.success("Module deleted.");
    } catch (error) {
      toast.error(getError(error));
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // MODULE EMPLOYEE ASSIGNMENTS
  // --------------------------------------------------

  const openModuleAssignment = async (project, module) => {
    setSelectedProject(project);
    setSelectedModuleId(getId(module));
    setModuleEmployees([]);
    setModuleEmployeeSearch("");
    setModuleAssignmentDescription("");
    setModal("moduleEmployees");

    try {
      const response = await api.get(
        `/projects/${getId(project)}/modules/eligible-employees/super-admin`
      );

      setModuleEmployees(getArray(response, "employees"));
    } catch (error) {
      toast.error(getError(error));
    }
  };

  const assignModuleEmployee = async (employeeId) => {
    if (!selectedProject || !selectedModuleId || !employeeId) return;

    try {
      await api.patch(
        `/projects/${getId(selectedProject)}/modules/${selectedModuleId}/assign/super-admin`,
        {
          employeeId,
          description: moduleAssignmentDescription.trim(),
        }
      );

      toast.success("Employee assigned to module.");

      setModuleAssignmentDescription("");

      await refreshSelectedProject(getId(selectedProject));

      await openModuleAssignment(selectedProject, {
        _id: selectedModuleId,
      });
    } catch (error) {
      toast.error(getError(error));
    }
  };

  const removeModuleEmployee = async (employeeId) => {
    if (!selectedProject || !selectedModuleId || !employeeId) return;

    if (!window.confirm("Remove this employee from the module?")) return;

    try {
      await api.delete(
        `/projects/${getId(selectedProject)}/modules/${selectedModuleId}/employees/${employeeId}/super-admin`
      );

      toast.success("Employee removed from module.");

      await refreshSelectedProject(getId(selectedProject));

      await openModuleAssignment(selectedProject, {
        _id: selectedModuleId,
      });
    } catch (error) {
      toast.error(getError(error));
    }
  };

  const updateEmployeeModuleStatus = async (
    project,
    module,
    employeeId,
    status
  ) => {
    try {
      await api.patch(
        `/projects/${getId(project)}/modules/${getId(module)}/status/super-admin`,
        {
          employeeId,
          status,
        }
      );

      toast.success("Employee module status updated.");
      await refreshSelectedProject(getId(project));
    } catch (error) {
      toast.error(getError(error));
    }
  };

  // --------------------------------------------------
  // STYLES
  // --------------------------------------------------

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  const labelClass =
    "mb-1.5 block text-sm font-semibold text-slate-700";

  const buttonPrimary =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

  const buttonSecondary =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-600">
              <ShieldCheck size={17} />
              Super Admin / Company Management
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Project Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage company projects, employee access, module assignments and descriptions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                fetchProjects();
                fetchCompanies();

                if (modal === "deleted") {
                  fetchDeletedProjects();
                }
              }}
              className={buttonSecondary}
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
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100"
            >
              <Archive size={16} />
              Deleted Projects
            </button>

            <button
              type="button"
              onClick={openCreate}
              className={buttonPrimary}
            >
              <Plus size={17} />
              Create Project
            </button>
          </div>
        </div>

        {/* STATS */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              title: "Total Projects",
              value: stats.total,
              icon: FolderKanban,
              color: "bg-indigo-50 text-indigo-600",
            },
            {
              title: "Active Projects",
              value: stats.active,
              icon: Check,
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              title: "Inactive Projects",
              value: stats.inactive,
              icon: AlertCircle,
              color: "bg-amber-50 text-amber-600",
            },
            {
              title: "Total Modules",
              value: stats.modules,
              icon: Layers,
              color: "bg-violet-50 text-violet-600",
            },
            {
              title: "Employees With Access",
              value: stats.employees,
              icon: Users,
              color: "bg-sky-50 text-sky-600",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {item.title}
                  </span>

                  <span className={`rounded-xl p-2.5 ${item.color}`}>
                    <Icon size={19} />
                  </span>
                </div>

                <p className="mt-4 text-3xl font-bold tracking-tight">
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* FILTERS */}

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-10`}
              placeholder="Search project, code or client..."
            />
          </div>

          <div className="relative">
            <Filter
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputClass} appearance-none pl-10`}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* PROJECT TABLE */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold">Company Project Directory</h2>
              <p className="mt-1 text-xs text-slate-500">
                {filteredProjects.length} project(s) found
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
              Current Company
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-sm text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Loading projects...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-20 text-center">
              <FolderKanban
                size={42}
                className="mx-auto mb-3 text-slate-300"
              />
              <h3 className="font-bold">No projects found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Change filters or create a new project.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Project</th>
                    <th className="px-5 py-4">Company</th>
                    <th className="px-5 py-4">Client</th>
                    <th className="px-5 py-4">Employees</th>
                    <th className="px-5 py-4">Modules</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((project) => (
                    <tr
                      key={getId(project)}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold">{project.projectName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {project.projectCode || "No project code"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={15} className="text-slate-400" />
                          {getCompanyName(project, companies)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {project.clientName || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openAccessManager(project)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                        >
                          <Users size={14} />
                          {project.employeeAccess?.length || 0}
                          <Settings2 size={12} />
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                          <Layers size={14} />
                          {project.modules?.length || 0}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
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
                            title="View project"
                            onClick={() => loadProjectDetails(project)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            title="Employee access"
                            onClick={() => openAccessManager(project)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                          >
                            <Users size={17} />
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
                            title="Archive project"
                            onClick={() => archiveProject(project)}
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

      {/* ==================================================
          CREATE / EDIT PROJECT MODAL
      ================================================== */}

      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">
                  {modal === "create" ? "Create New Project" : "Edit Project"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Configure project information and individual employee access.
                </p>
              </div>

              <button
                onClick={closeModal}
                type="button"
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveProject} className="space-y-6 p-5 sm:p-6">
              <section>
                <h3 className="mb-4 flex items-center gap-2 font-bold">
                  <BriefcaseBusiness
                    size={17}
                    className="text-indigo-600"
                  />
                  Project Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
<div>
  <label className={labelClass}>Company *</label>

  <div
    className={`${inputClass} flex cursor-not-allowed items-center bg-slate-100 text-slate-600`}
  >
    {companies.find(
      (company) => getId(company) === form.companyId
    )?.companyName || "Loading company..."}
  </div>
</div>

                  <div>
                    <label className={labelClass}>Project Name *</label>
                    <input
                      required
                      value={form.projectName}
                      onChange={(e) =>
                        updateForm("projectName", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Project name"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Project Code</label>
                    <input
                      disabled={modal === "edit"}
                      value={form.projectCode}
                      onChange={(e) =>
                        updateForm("projectCode", e.target.value)
                      }
                      className={`${inputClass} disabled:bg-slate-100`}
                      placeholder="Auto generated or enter code"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Client Name *</label>
                    <input
                      required
                      value={form.clientName}
                      onChange={(e) =>
                        updateForm("clientName", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Client name"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Project Details</label>
                    <textarea
                      rows={2}
                      value={form.projectDetails}
                      onChange={(e) =>
                        updateForm("projectDetails", e.target.value)
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
                        updateForm("projectDescription", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Enter the overall project description..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Remarks</label>
                    <textarea
                      rows={2}
                      value={form.remarks}
                      onChange={(e) =>
                        updateForm("remarks", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>

                  {modal === "edit" && (
                    <div>
                      <label className={labelClass}>Status</label>

                      <select
                        value={form.status}
                        onChange={(e) =>
                          updateForm("status", e.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold">Employee Project Access</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Select employees individually. Access is company-specific.
                    </p>
                  </div>

                  <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                    {form.employeeAccess.length} selected
                  </span>
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-2">
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
                    placeholder="Search employee..."
                  />
                </div>

                {!form.companyId ? (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                    Select a company first.
                  </p>
                ) : employeeLoading ? (
                  <p className="flex items-center gap-2 py-6 text-sm text-slate-500">
                    <Loader2 size={17} className="animate-spin" />
                    Loading employees...
                  </p>
                ) : filteredFormEmployees.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No employees found.
                  </p>
                ) : (
                  <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                    {filteredFormEmployees.map((role) => (
                      <details
                        key={getId(role)}
                        className="rounded-xl border border-slate-200"
                      >
                        <summary className="flex cursor-pointer items-center justify-between p-3 font-semibold">
                          <span className="flex items-center gap-2">
                            <ChevronDown size={16} />
                            {role.roleName}
                          </span>

                          <span className="text-xs text-slate-500">
                            {role.employees.filter((e) =>
                              form.employeeAccess.includes(getId(e))
                            ).length} selected
                          </span>
                        </summary>

                        <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
                          {role.employees.map((employee) => {
                            const employeeId = getId(employee);

                            return (
                              <label
                                key={employeeId}
                                className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 hover:bg-slate-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.employeeAccess.includes(employeeId)}
                                  onChange={() =>
                                    toggleFormEmployee(employeeId)
                                  }
                                  className="mt-1 accent-indigo-600"
                                />

                                <span className="min-w-0 text-sm">
                                  <span className="block font-semibold">
                                    {getName(employee)}
                                  </span>

                                  <span className="text-xs text-slate-500">
                                    {[
                                      getEmpCode(employee),
                                      employee.email,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                </span>
                              </label>
                            );
                          })}

                          {role.employees.length === 0 && (
                            <p className="text-sm text-slate-500">
                              No matching employees in this role.
                            </p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </section>

              {modal === "create" && (
                <section className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-1 font-bold">Initial Project Modules</h3>

                  <p className="mb-3 text-xs text-slate-500">
                    Add one module name per line.
                  </p>

                  <textarea
                    rows={4}
                    value={form.modules
                      .map((m) =>
                        typeof m === "string"
                          ? m
                          : m.moduleName || ""
                      )
                      .join("\n")}
                    onChange={(e) =>
                      updateForm(
                        "modules",
                        e.target.value.split("\n").map((name) => ({
                          moduleName: name,
                        }))
                      )
                    }
                    className={inputClass}
                    placeholder={"Frontend Development\nBackend Development\nTesting"}
                  />
                </section>
              )}

              <div className="flex flex-col-reverse justify-end gap-2 border-t pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className={buttonSecondary}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className={buttonPrimary}
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}

                  {modal === "create" ? "Create Project" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          PROJECT DETAILS AND MODULES
      ================================================== */}

      {modal === "details" && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedProject.projectName}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedProject.projectCode || "No code"} ·{" "}
                  {getCompanyName(selectedProject, companies)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Client</p>
                  <p className="mt-1 font-bold">
                    {selectedProject.clientName || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Project Status</p>
                  <p className="mt-1 font-bold capitalize">
                    {selectedProject.status}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Project Access</p>
                  <p className="mt-1 font-bold">
                    {selectedProject.employeeAccess?.length || 0} employees
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-bold">Project Details</h3>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {selectedProject.projectDetails || "No details provided."}
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-bold">Project Description</h3>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {selectedProject.projectDescription || "No description provided."}
                  </p>
                </div>
              </div>

              {/* PROJECT MODULES */}

              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">Project Modules</h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Each assigned employee's module description and status are displayed below.
                    </p>
                  </div>

                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                    {selectedProject.modules?.length || 0} modules
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addModule(selectedProject);
                  }}
                  className="mb-4 flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    className={inputClass}
                    placeholder="New module name..."
                  />

                  <button
                    type="submit"
                    disabled={saving}
                    className={buttonPrimary}
                  >
                    <Plus size={16} />
                    Add Module
                  </button>
                </form>

                <div className="space-y-3">
                  {(selectedProject.modules || []).map((module) => {
                    const moduleId = getId(module);
                    const isEditing = editingModuleId === moduleId;
                    const assignments = module.employees || [];

                    return (
                      <div
                        key={moduleId}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        {isEditing ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className={labelClass}>
                                Module Name
                              </label>

                              <input
                                value={editingModuleName}
                                onChange={(e) =>
                                  setEditingModuleName(e.target.value)
                                }
                                className={inputClass}
                              />
                            </div>

                            <div>
                              <label className={labelClass}>
                                Module Status
                              </label>

                              <select
                                value={editingModuleStatus}
                                onChange={(e) =>
                                  setEditingModuleStatus(e.target.value)
                                }
                                className={inputClass}
                              >
                                {STATUSES.map((status) => (
                                  <option key={status}>{status}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex justify-end gap-2 sm:col-span-2">
                              <button
                                type="button"
                                onClick={() => setEditingModuleId("")}
                                className={buttonSecondary}
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  saveModule(selectedProject, module)
                                }
                                disabled={saving}
                                className={buttonPrimary}
                              >
                                <Save size={15} />
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                              <div>
                                <h4 className="font-bold">
                                  {module.moduleName}
                                </h4>

                                <p className="mt-1 text-xs text-slate-500">
                                  Module status:{" "}
                                  <span className="font-semibold">
                                    {module.status || "Not Assigned"}
                                  </span>
                                  {" · "}
                                  {assignments.length} assigned
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openModuleAssignment(selectedProject, module)
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                                >
                                  <Users size={14} className="mr-1 inline" />
                                  Employees
                                </button>

                                <button
                                  type="button"
                                  onClick={() => startEditModule(module)}
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                                >
                                  <Pencil size={14} className="mr-1 inline" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteModule(selectedProject, module)
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 size={14} className="mr-1 inline" />
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* INDIVIDUAL EMPLOYEE MODULE ASSIGNMENTS */}

                            {assignments.length > 0 && (
                              <div className="mt-4 border-t pt-4">
                                <h5 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                                  <Users size={15} />
                                  Employee Assignments ({assignments.length})
                                </h5>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  {assignments.map((assignment, index) => {
                                    const employee =
                                      getAssignmentEmployee(assignment);

                                    const employeeId = getId(
                                      assignment.employeeId
                                    );

                                    return (
                                      <div
                                        key={
                                          employeeId ||
                                          getId(assignment) ||
                                          `${moduleId}-${index}`
                                        }
                                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="font-semibold text-slate-800">
                                              {employee
                                                ? getName(employee)
                                                : "Assigned employee"}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                              {employee?.email || ""}
                                            </p>

                                            {employee && getEmpCode(employee) && (
                                              <p className="mt-1 text-xs text-slate-500">
                                                Employee ID: {getEmpCode(employee)}
                                              </p>
                                            )}
                                          </div>

                                          <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                                            Assigned
                                          </span>
                                        </div>

                                        {/* DESCRIPTION */}

                                        <div className="mt-3 rounded-lg border border-indigo-100 bg-white p-3">
                                          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                                            <FileText size={13} />
                                            Assigned Task Description
                                          </p>

                                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                            {assignment.description?.trim()
                                              ? assignment.description
                                              : "No description provided for this module assignment."}
                                          </p>
                                        </div>

                                        {/* INDIVIDUAL STATUS */}

                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                          <label className="text-xs font-semibold text-slate-600">
                                            Employee Status
                                          </label>

                                          <select
                                            value={
                                              assignment.status || "Not Assigned"
                                            }
                                            onChange={(e) =>
                                              updateEmployeeModuleStatus(
                                                selectedProject,
                                                module,
                                                employeeId,
                                                e.target.value
                                              )
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                                          >
                                            {STATUSES.map((status) => (
                                              <option key={status}>
                                                {status}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

                  {!selectedProject.modules?.length && (
                    <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                      No modules added yet.
                    </p>
                  )}
                </div>
              </section>

              {/* PROJECT EMPLOYEE ACCESS */}

              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">
                    Employees With Project Access
                  </h3>

                  <span className="text-xs font-bold text-indigo-700">
                    {selectedProject.employeeAccess?.length || 0} employees
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {getEmployeesFromProject(selectedProject).map((employee) => (
                    <div
                      key={getId(employee)}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-semibold">
                        {getName(employee)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {employee.email || ""}
                      </p>

                      {getEmpCode(employee) && (
                        <p className="mt-1 text-xs text-slate-500">
                          Employee ID: {getEmpCode(employee)}
                        </p>
                      )}

                      {/* Project-level description is shared by the project.
                          The current backend does not store employee-specific
                          descriptions in employeeAccess. */}

                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <FileText size={13} />
                          Project Description
                        </p>

                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {selectedProject.projectDescription?.trim()
                            ? selectedProject.projectDescription
                            : "No project description provided."}
                        </p>
                      </div>
                    </div>
                  ))}

                  {!selectedProject.employeeAccess?.length && (
                    <p className="text-sm text-slate-500">
                      No employees assigned.
                    </p>
                  )}
                </div>
              </section>

              <div className="flex justify-end border-t pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className={buttonSecondary}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          PROJECT ACCESS MANAGER
      ================================================== */}

      {modal === "access" && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6">
          <div className="my-auto max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">
                  Project Employee Access
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedProject.projectName} ·{" "}
                  {getCompanyName(selectedProject, companies)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={accessSearch}
                  onChange={(e) => setAccessSearch(e.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="Search employee..."
                />
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Access</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {accessEmployees
                      .filter((employee) => {
                        const query = accessSearch.toLowerCase();

                        return [
                          getName(employee),
                          getEmpCode(employee),
                          employee.email,
                          employee.roleName,
                          employee.roleId?.roleName,
                        ]
                          .filter(Boolean)
                          .some((value) =>
                            String(value).toLowerCase().includes(query)
                          );
                      })
                      .map((employee) => {
                        const employeeId = getId(employee);

                        const hasAccess =
                          employee.hasAccess === true ||
                          (selectedProject.employeeAccess || []).some(
                            (item) => getId(item) === employeeId
                          );

                        return (
                          <tr key={employeeId}>
                            <td className="px-4 py-3">
                              <p className="font-semibold">
                                {getName(employee)}
                              </p>

                              <p className="text-xs text-slate-500">
                                {employee.email || ""}
                              </p>
                            </td>

                            <td className="px-4 py-3">
                              {getEmpCode(employee) || "—"}
                            </td>

                            <td className="px-4 py-3">
                              {employee.roleId?.roleName ||
                                employee.roleName ||
                                "—"}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  hasAccess
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {hasAccess ? "Granted" : "Not Granted"}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              {hasAccess ? (
                                <button
                                  type="button"
                                  onClick={() => revokeAccess(employeeId)}
                                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                                >
                                  <UserMinus
                                    size={14}
                                    className="mr-1 inline"
                                  />
                                  Revoke
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => grantAccess(employeeId)}
                                  className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                                >
                                  <UserPlus
                                    size={14}
                                    className="mr-1 inline"
                                  />
                                  Grant
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {accessEmployees.length === 0 && (
                <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                  No employee data returned by the access endpoint.
                </p>
              )}

              <div className="flex justify-end border-t pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className={buttonSecondary}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          MODULE EMPLOYEE ASSIGNMENT
      ================================================== */}

      {modal === "moduleEmployees" && selectedProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6">
          <div className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <h2 className="font-bold">
                  Module Employee Assignment
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedProject.projectName}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={moduleEmployeeSearch}
                  onChange={(e) =>
                    setModuleEmployeeSearch(e.target.value)
                  }
                  className={`${inputClass} pl-10`}
                  placeholder="Search project employees..."
                />
              </div>

              <p className="text-xs text-slate-500">
                Only employees who already have access to this project can be assigned to its modules.
              </p>

              {/* DESCRIPTION INPUT FOR NEW MODULE ASSIGNMENT */}

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <label className={labelClass}>
                  Module Assignment Description
                </label>

                <textarea
                  rows={3}
                  value={moduleAssignmentDescription}
                  onChange={(e) =>
                    setModuleAssignmentDescription(e.target.value)
                  }
                  className={inputClass}
                  placeholder="Write the specific task or responsibility for the employee before clicking Assign..."
                />

                <p className="mt-2 text-xs text-slate-500">
                  This description will be saved with the employee's module assignment.
                </p>
              </div>

              <div className="space-y-3">
                {moduleEmployees
                  .filter((employee) =>
                    [
                      getName(employee),
                      getEmpCode(employee),
                      employee.email,
                    ]
                      .filter(Boolean)
                      .some((value) =>
                        String(value).toLowerCase().includes(
                          moduleEmployeeSearch.toLowerCase()
                        )
                      )
                  )
                  .map((employee) => {
                    const employeeId = getId(employee);

                    const module = (
                      selectedProject.modules || []
                    ).find(
                      (item) => getId(item) === selectedModuleId
                    );

                    const assignment = module?.employees?.find(
                      (item) =>
                        getId(item.employeeId) === employeeId
                    );

                    return (
                      <div
                        key={employeeId}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {getName(employee)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {[
                                getEmpCode(employee),
                                employee.email,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>

                          {assignment ? (
                            <button
                              type="button"
                              onClick={() =>
                                removeModuleEmployee(employeeId)
                              }
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                            >
                              <UserMinus
                                size={14}
                                className="mr-1 inline"
                              />
                              Remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                assignModuleEmployee(employeeId)
                              }
                              className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                            >
                              <UserPlus
                                size={14}
                                className="mr-1 inline"
                              />
                              Assign
                            </button>
                          )}
                        </div>

                        {/* SHOW EXISTING ASSIGNMENT DESCRIPTION */}

                        {assignment && (
                          <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                              <FileText size={13} />
                              Assigned Task Description
                            </p>

                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {assignment.description?.trim()
                                ? assignment.description
                                : "No description provided for this module assignment."}
                            </p>

                            <div className="mt-2">
                              <span className="text-xs font-semibold text-slate-600">
                                Status:{" "}
                              </span>

                              <span className="text-xs font-bold text-slate-800">
                                {assignment.status || "Not Assigned"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {!moduleEmployees.length && (
                  <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                    No eligible employees returned.
                  </p>
                )}
              </div>

              <div className="flex justify-end border-t pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className={buttonSecondary}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          DELETED PROJECTS
      ================================================== */}

      {modal === "deleted" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6">
          <div className="my-auto max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">
                  Deleted Projects
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Restore archived projects or permanently delete them.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fetchDeletedProjects}
                  disabled={deletedLoading}
                  className={buttonSecondary}
                >
                  <RefreshCw
                    size={15}
                    className={deletedLoading ? "animate-spin" : ""}
                  />
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl p-2 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(95vh-85px)] overflow-y-auto p-5">
              {deletedLoading ? (
                <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                  Loading deleted projects...
                </div>
              ) : deletedProjects.length === 0 ? (
                <div className="py-16 text-center">
                  <Archive
                    size={40}
                    className="mx-auto mb-3 text-slate-300"
                  />
                  <h3 className="font-bold">
                    No deleted projects
                  </h3>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Modules</th>
                        <th className="px-4 py-3">Deleted At</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {deletedProjects.map((project) => (
                        <tr key={getId(project)}>
                          <td className="px-4 py-4">
                            <p className="font-bold">
                              {project.projectName}
                            </p>

                            <p className="text-xs text-slate-500">
                              {project.projectCode || "—"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            {getCompanyName(project, companies)}
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
                                className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                              >
                                <RotateCcw
                                  size={14}
                                  className="mr-1 inline"
                                />
                                Restore
                              </button>

                              <button
                                type="button"
                                onClick={() => permanentlyDelete(project)}
                                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                              >
                                <Trash2
                                  size={14}
                                  className="mr-1 inline"
                                />
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
