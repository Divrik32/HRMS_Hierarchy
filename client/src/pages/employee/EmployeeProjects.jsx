
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FolderKanban,
  RefreshCw,
  Layers3,
  Building2,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Archive,
  Users,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Clock3,
  Search,
  X,
  Save,
  BriefcaseBusiness,
  ClipboardList,
  History,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import {
  getEmployeeProfile,
  verifyEmployeeRoute,
} from "./employeeApi";

const MY_STATUSES = ["Assigned", "In Progress", "Completed"];

const getId = (value) => {
  if (!value) return "";
  return String(
    typeof value === "object" ? value._id || value.id || "" : value
  );
};

const getArray = (data, ...keys) => {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const getEmployeeName = (employee) => {
  if (!employee) return "Unknown employee";
  if (typeof employee === "string") return "Employee";
  return (
    employee.name ||
    employee.employeeName ||
    employee.fullName ||
    employee.empId ||
    "Employee"
  );
};

const getEmployeeCode = (employee) =>
  employee?.empId || employee?.employeeId || "";

const getRoleName = (employee) =>
  employee?.roleId?.roleName ||
  employee?.role?.roleName ||
  "";

const getDepartmentName = (employee) =>
  employee?.departmentId?.departmentName ||
  employee?.department?.departmentName ||
  "";

const formatDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClass = (status) => {
  const styles = {
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
    Assigned: "bg-indigo-50 text-indigo-700 border-indigo-200",
    "Not Assigned": "bg-slate-100 text-slate-600 border-slate-200",
  };

  return styles[status] || styles["Not Assigned"];
};

const EmployeeProjects = () => {
  const { employeeId: routeEmployeeId } = useParams();

  const [employee, setEmployee] = useState(null);
  const [employeeId, setEmployeeId] = useState("");

  const [projects, setProjects] = useState([]);
  const [createdProjects, setCreatedProjects] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);

  const [selectedId, setSelectedId] = useState("");
  const [projectDetails, setProjectDetails] = useState(null);
  const [modules, setModules] = useState([]);

  const [assignableEmployees, setAssignableEmployees] = useState([]);
  const [grantedEmployees, setGrantedEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [busy, setBusy] = useState("");

  const [activeTab, setActiveTab] = useState("projects");
  const [search, setSearch] = useState("");
  const [expandedModules, setExpandedModules] = useState({});

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    projectName: "",
    clientName: "",
    projectDescription: "",
    projectDetails: "",
    remarks: "",
    status: "active",
  });

  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState("");
  const [moduleName, setModuleName] = useState("");

  const [assignmentForms, setAssignmentForms] = useState({});
  const [accessEmployeeId, setAccessEmployeeId] = useState("");
  const [showAccessPanel, setShowAccessPanel] = useState(false);

  const isOwnCreatedProject = useCallback(
    (project) =>
      Boolean(
        employeeId &&
        getId(project?.createdByEmployee) === employeeId
      ),
    [employeeId]
  );

  const createdProjectIds = useMemo(
    () => new Set(createdProjects.map((project) => getId(project))),
    [createdProjects]
  );

  const canManageProject = useCallback(
    (project) =>
      isOwnCreatedProject(project) ||
      createdProjectIds.has(getId(project)),
    [isOwnCreatedProject, createdProjectIds]
  );

  const selectedProject =
    projectDetails ||
    projects.find((project) => getId(project) === selectedId) ||
    null;
  
    const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const departmentName = normalizeText(getDepartmentName(employee));
const roleName = normalizeText(getRoleName(employee));

const allowedDepartments = [
  "it",
  "information technology",
  "accessibility",
  "functional testing",
];

const isITVicePresident =
  roleName === "vice president" &&
  allowedDepartments.includes(departmentName);

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  const loadProjects = useCallback(async () => {
    setLoading(true);

    try {
      const profile = await getEmployeeProfile();

      if (!verifyEmployeeRoute(routeEmployeeId, profile)) {
        throw new Error("You are not authorized to view these projects.");
      }

      const currentEmployeeId = getId(profile);

      setEmployee(profile);
      setEmployeeId(currentEmployeeId);

      const [accessibleResponse, createdResponse] = await Promise.all([
        api.get("/projects/my-accessible-projects", {
          withCredentials: true,
        }),
        api.get("/projects/my-created-projects", {
          withCredentials: true,
        }),
      ]);

      const accessible = getArray(accessibleResponse.data, "projects");
      const created = getArray(createdResponse.data, "projects");

      setProjects(accessible);
      setCreatedProjects(created);

      setSelectedId((previous) => {
        if (accessible.some((project) => getId(project) === previous)) {
          return previous;
        }
        return getId(accessible[0]);
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load projects."
      );

      setProjects([]);
      setCreatedProjects([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }, [routeEmployeeId]);

  const loadMyAssignments = useCallback(async () => {
    setAssignmentsLoading(true);

    try {
      const response = await api.get(
        "/projects/my-assigned-modules",
        { withCredentials: true }
      );

      setMyAssignments(
        getArray(response.data, "modules", "assignments")
      );
    } catch (error) {
      setMyAssignments([]);

      toast.error(
        error.response?.data?.message ||
          "Failed to load your assignments."
      );
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  const loadDeletedProjects = useCallback(async () => {
    if (!employeeId) return;

    setDeletedLoading(true);

    try {
      const response = await api.get(
        "/projects/deleted/employee",
        { withCredentials: true }
      );

      const deleted = getArray(
        response.data,
        "deletedProjects",
        "projects"
      );

      setDeletedProjects(
        deleted.filter(
          (project) =>
            getId(project.createdByEmployee) === employeeId
        )
      );
    } catch (error) {
      setDeletedProjects([]);

      toast.error(
        error.response?.data?.message ||
          "Failed to load deleted projects."
      );
    } finally {
      setDeletedLoading(false);
    }
  }, [employeeId]);

  const loadProjectDetails = useCallback(async (projectId) => {
    if (!projectId) {
      setProjectDetails(null);
      setModules([]);
      return;
    }

    setDetailsLoading(true);

    try {
      const [projectResponse, modulesResponse] = await Promise.all([
        api.get(`/projects/${projectId}`, {
          withCredentials: true,
        }),
        api.get(`/projects/${projectId}/modules`, {
          withCredentials: true,
        }),
      ]);

      setProjectDetails(projectResponse.data.project || null);
      setModules(getArray(modulesResponse.data, "modules"));
    } catch (error) {
      setProjectDetails(null);
      setModules([]);

      toast.error(
        error.response?.data?.message ||
          "Failed to load project details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const loadProjectEmployees = useCallback(async (projectId) => {
    if (!projectId) {
      setAssignableEmployees([]);
      setGrantedEmployees([]);
      return;
    }

    setEmployeesLoading(true);

    try {
      const [eligibleResponse, grantedResponse] = await Promise.all([
        api.get(
          `/projects/${projectId}/assignable-employees`,
          { withCredentials: true }
        ),
        api.get(
          `/projects/${projectId}/my-granted-access`,
          { withCredentials: true }
        ),
      ]);

      setAssignableEmployees(
        getArray(eligibleResponse.data, "employees")
      );

      setGrantedEmployees(
        getArray(grantedResponse.data, "employees")
      );
    } catch (error) {
      setAssignableEmployees([]);
      setGrantedEmployees([]);

      toast.error(
        error.response?.data?.message ||
          "Failed to load project employees."
      );
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const refreshSelectedProject = useCallback(async () => {
    if (!selectedId) return;

    await Promise.all([
      loadProjectDetails(selectedId),
      loadProjectEmployees(selectedId),
    ]);
  }, [selectedId, loadProjectDetails, loadProjectEmployees]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedId) {
      loadProjectDetails(selectedId);
      loadProjectEmployees(selectedId);
    } else {
      setProjectDetails(null);
      setModules([]);
      setAssignableEmployees([]);
      setGrantedEmployees([]);
    }
  }, [selectedId, loadProjectDetails, loadProjectEmployees]);

  useEffect(() => {
    if (employeeId) {
      loadDeletedProjects();
      loadMyAssignments();
    }
  }, [employeeId, loadDeletedProjects, loadMyAssignments]);

  // --------------------------------------------------
  // PROJECT CREATE / UPDATE / DELETE
  // --------------------------------------------------

  const openCreateProject = () => {
    setEditingProject(false);

    setProjectForm({
      projectName: "",
      clientName: "",
      projectDescription: "",
      projectDetails: "",
      remarks: "",
      status: "active",
    });

    setShowProjectForm(true);
  };

  const openEditProject = () => {
    if (!selectedProject) return;

    setEditingProject(true);

    setProjectForm({
      projectName: selectedProject.projectName || "",
      clientName: selectedProject.clientName || "",
      projectDescription: selectedProject.projectDescription || "",
      projectDetails: selectedProject.projectDetails || "",
      remarks: selectedProject.remarks || "",
      status: selectedProject.status || "active",
    });

    setShowProjectForm(true);
  };

  const saveProject = async (event) => {
    event.preventDefault();

    if (
      !projectForm.projectName.trim() ||
      !projectForm.clientName.trim()
    ) {
      toast.error("Project name and client name are required.");
      return;
    }

    setBusy("project-save");

    try {
      if (editingProject && selectedId) {
        const response = await api.put(
          `/projects/${selectedId}/employee`,
          projectForm,
          { withCredentials: true }
        );

        toast.success(
          response.data.message || "Project updated successfully."
        );
      } else {
        const response = await api.post(
          "/projects/employee",
          projectForm,
          { withCredentials: true }
        );

        toast.success(
          response.data.message || "Project created successfully."
        );

        const newProjectId = getId(response.data.project);
        if (newProjectId) setSelectedId(newProjectId);
      }

      setShowProjectForm(false);
      await loadProjects();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to save project."
      );
    } finally {
      setBusy("");
    }
  };

  const archiveProject = async () => {
    if (!selectedId || !selectedProject) return;

    if (
      !window.confirm(
        `Archive "${selectedProject.projectName}"?`
      )
    ) {
      return;
    }

    setBusy("project-delete");

    try {
      const response = await api.delete(
        `/projects/${selectedId}/employee`,
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Project archived successfully."
      );

      setSelectedId("");

      await Promise.all([
        loadProjects(),
        loadDeletedProjects(),
      ]);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to archive project."
      );
    } finally {
      setBusy("");
    }
  };

  // --------------------------------------------------
  // MODULE CREATE / UPDATE / DELETE
  // --------------------------------------------------

  const openAddModule = () => {
    setEditingModuleId("");
    setModuleName("");
    setShowModuleForm(true);
  };

  const openEditModule = (module) => {
    setEditingModuleId(getId(module));
    setModuleName(module.moduleName || "");
    setShowModuleForm(true);
  };

  const saveModule = async (event) => {
    event.preventDefault();

    if (!selectedId || !moduleName.trim()) {
      toast.error("Module name is required.");
      return;
    }

    setBusy("module-save");

    try {
      if (editingModuleId) {
        const response = await api.put(
          `/projects/${selectedId}/modules/${editingModuleId}/employee`,
          { moduleName: moduleName.trim() },
          { withCredentials: true }
        );

        toast.success(
          response.data.message || "Module updated successfully."
        );
      } else {
        const response = await api.post(
          `/projects/${selectedId}/modules/employee`,
          { moduleName: moduleName.trim() },
          { withCredentials: true }
        );

        toast.success(
          response.data.message || "Module added successfully."
        );
      }

      setShowModuleForm(false);
      setEditingModuleId("");
      setModuleName("");

      await refreshSelectedProject();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to save module."
      );
    } finally {
      setBusy("");
    }
  };

  const deleteModule = async (module) => {
    if (!selectedId) return;

    if (
      !window.confirm(
        `Delete "${module.moduleName}" and all its employee assignments?`
      )
    ) {
      return;
    }

    setBusy(`module-${getId(module)}`);

    try {
      const response = await api.delete(
        `/projects/${selectedId}/modules/${getId(module)}/employee`,
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Module deleted successfully."
      );

      await refreshSelectedProject();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to delete module."
      );
    } finally {
      setBusy("");
    }
  };

  // --------------------------------------------------
  // MODULE EMPLOYEE ASSIGNMENTS
  // --------------------------------------------------

  const updateAssignmentForm = (moduleId, field, value) => {
    setAssignmentForms((previous) => ({
      ...previous,
      [moduleId]: {
        ...previous[moduleId],
        [field]: value,
      },
    }));
  };

  const assignEmployeeToModule = async (moduleId) => {
    const form = assignmentForms[moduleId] || {};

    if (!selectedId || !form.employeeId) {
      toast.error("Please select an employee.");
      return;
    }

    setBusy(`assign-${moduleId}`);

    try {
      const response = await api.patch(
        `/projects/${selectedId}/modules/${moduleId}/assign`,
        {
          employeeId: form.employeeId,
          description: form.description || "",
        },
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Employee assigned successfully."
      );

      setAssignmentForms((previous) => ({
        ...previous,
        [moduleId]: {
          employeeId: "",
          description: "",
        },
      }));

      await refreshSelectedProject();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to assign employee."
      );
    } finally {
      setBusy("");
    }
  };

  const myAssignmentForModule = (module) =>
    (module.employees || []).find(
      (assignment) =>
        getId(assignment.employeeId) === employeeId
    );

  const updateAssignmentStatus = async (moduleId, status) => {
    if (!selectedId) return;

    setBusy(`status-${moduleId}`);

    try {
      const response = await api.patch(
        `/projects/${selectedId}/modules/${moduleId}/status`,
        { status },
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Your status has been updated."
      );

      await Promise.all([
        loadProjectDetails(selectedId),
        loadMyAssignments(),
      ]);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update your status."
      );
    } finally {
      setBusy("");
    }
  };

  const removeModuleEmployee = async (module, assignment) => {
    const targetEmployeeId = getId(assignment.employeeId);

    if (!selectedId || !targetEmployeeId) return;

    const targetName = getEmployeeName(assignment.employeeId);

    if (
      !window.confirm(
        `Remove ${targetName} from "${module.moduleName}"?`
      )
    ) {
      return;
    }

    setBusy(`remove-${module._id}-${targetEmployeeId}`);

    try {
      const response = await api.delete(
        `/projects/${selectedId}/modules/${module._id}/employees/${targetEmployeeId}/employee`,
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Employee removed from module."
      );

      await refreshSelectedProject();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to remove employee."
      );
    } finally {
      setBusy("");
    }
  };

  // --------------------------------------------------
  // PROJECT EMPLOYEE ACCESS
  // --------------------------------------------------

  const grantProjectAccess = async () => {
    if (!selectedId || !accessEmployeeId) {
      toast.error("Select an employee first.");
      return;
    }

    setBusy("grant-access");

    try {
      const response = await api.post(
        `/projects/${selectedId}/access`,
        { employeeId: accessEmployeeId },
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Project access granted."
      );

      setAccessEmployeeId("");

      await loadProjectEmployees(selectedId);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to grant project access."
      );
    } finally {
      setBusy("");
    }
  };

  const revokeProjectAccess = async (targetEmployee) => {
    const targetId = getId(targetEmployee);

    if (!selectedId || !targetId) return;

    const name = getEmployeeName(targetEmployee);

    if (
      !window.confirm(
        `Revoke project access from ${name}?\n\nAll of this employee's module assignments in this project will also be removed.`
      )
    ) {
      return;
    }

    setBusy(`revoke-${targetId}`);

    try {
      const response = await api.delete(
        `/projects/${selectedId}/access/${targetId}`,
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Project access revoked."
      );

      await refreshSelectedProject();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to revoke project access."
      );
    } finally {
      setBusy("");
    }
  };

  // --------------------------------------------------
  // DELETED PROJECTS
  // --------------------------------------------------

  const restoreProject = async (deletedProject) => {
    const deletedId = getId(deletedProject);

    if (!deletedId) return;

    if (
      !window.confirm(
        `Restore "${deletedProject.projectName}"?`
      )
    ) {
      return;
    }

    setBusy(`restore-${deletedId}`);

    try {
      const response = await api.post(
        `/projects/deleted/${deletedId}/restore/employee`,
        {},
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Project restored successfully."
      );

      await Promise.all([
        loadProjects(),
        loadDeletedProjects(),
      ]);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to restore project."
      );
    } finally {
      setBusy("");
    }
  };

  const permanentlyDeleteProject = async (deletedProject) => {
    const deletedId = getId(deletedProject);

    if (!deletedId) return;

    if (
      !window.confirm(
        `Permanently delete "${deletedProject.projectName}"?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(`permanent-${deletedId}`);

    try {
      const response = await api.delete(
        `/projects/deleted/${deletedId}/permanent/employee`,
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Project permanently deleted."
      );

      await loadDeletedProjects();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to permanently delete project."
      );
    } finally {
      setBusy("");
    }
  };

  // --------------------------------------------------
  // HELPERS / COUNTS
  // --------------------------------------------------

  const toggleModule = (moduleId) => {
    setExpandedModules((previous) => ({
      ...previous,
      [moduleId]: !previous[moduleId],
    }));
  };

  const filteredProjects = projects.filter((project) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      project.projectName?.toLowerCase().includes(query) ||
      project.clientName?.toLowerCase().includes(query) ||
      project.projectCode?.toLowerCase().includes(query)
    );
  });

  const totalModuleAssignments = modules.reduce(
    (total, module) => total + (module.employees?.length || 0),
    0
  );

  const completedAssignments = modules.reduce(
    (total, module) =>
      total +
      (module.employees || []).filter(
        (assignment) => assignment.status === "Completed"
      ).length,
    0
  );

  const inProgressAssignments = modules.reduce(
    (total, module) =>
      total +
      (module.employees || []).filter(
        (assignment) => assignment.status === "In Progress"
      ).length,
    0
  );

  const projectAccessIds = new Set(
    (selectedProject?.employeeAccess || []).map(getId)
  );

  const employeesWithoutAccess = assignableEmployees.filter(
    (person) => !projectAccessIds.has(getId(person))
  );

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <RefreshCw size={18} className="animate-spin" />
          Loading your projects...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
            <BriefcaseBusiness size={16} />
            Employee Workspace
          </div>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Project Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage projects, modules, employee assignments and progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadProjects();
              loadMyAssignments();
              loadDeletedProjects();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

{isITVicePresident && (
  <button
    type="button"
    onClick={openCreateProject}
    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
  >
    <Plus size={17} />
    Create Project
  </button>
)}
        </div>
      </div>

      {/* TABS */}

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {[
          { id: "projects", label: "My Projects", icon: FolderKanban },
          { id: "assignments", label: "My Assignments", icon: ClipboardList },
          { id: "deleted", label: "Deleted Projects", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon size={16} />
              {tab.label}

              {tab.id === "assignments" && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {myAssignments.length}
                </span>
              )}

              {tab.id === "deleted" && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {deletedProjects.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==============================================
          MY PROJECTS TAB
      ============================================== */}

      {activeTab === "projects" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Accessible Projects"
              value={projects.length}
              icon={FolderKanban}
              color="indigo"
            />

            <SummaryCard
              label="Modules"
              value={modules.length}
              icon={Layers3}
              color="blue"
            />

            <SummaryCard
              label="Employee Assignments"
              value={totalModuleAssignments}
              icon={Users}
              color="violet"
            />

            <SummaryCard
              label="Completed Assignments"
              value={completedAssignments}
              icon={CheckCircle2}
              color="emerald"
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">

            {/* PROJECT LIST */}

            <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-slate-900">
                    Project List
                  </h2>

                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                    {projects.length}
                  </span>
                </div>

                <div className="relative mt-3">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search projects..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="max-h-[650px] space-y-2 overflow-y-auto p-3">
                {filteredProjects.map((project) => {
                  const isSelected = getId(project) === selectedId;
                  const isOwner = canManageProject(project);

                  return (
                    <button
                      type="button"
                      key={project._id}
                      onClick={() => setSelectedId(getId(project))}
                      className={`w-full rounded-xl border p-3.5 text-left transition ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50/80 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {project.projectName}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {project.clientName || "No client specified"}
                          </p>
                        </div>

                        {isOwner && (
                          <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                            OWNER
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-slate-400">
                          {project.projectCode || "No project code"}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            project.status === "inactive"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {project.status || "active"}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {filteredProjects.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <FolderKanban
                      size={30}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm font-semibold text-slate-600">
                      No projects found
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Create a project or try another search.
                    </p>
                  </div>
                )}
              </div>
            </aside>

            {/* SELECTED PROJECT */}

            <section className="min-w-0 space-y-5">
              {!selectedId ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                  <FolderKanban
                    size={42}
                    className="mx-auto text-slate-300"
                  />

                  <h2 className="mt-4 font-bold text-slate-800">
                    No accessible project selected
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create a project or get access to an existing project.
                  </p>

{isITVicePresident && (
  <button
    type="button"
    onClick={openCreateProject}
    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
  >
    <Plus size={16} />
    Create Project
  </button>
)}
                </div>
              ) : detailsLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
                  <RefreshCw
                    size={20}
                    className="mx-auto mb-3 animate-spin"
                  />
                  Loading project details...
                </div>
              ) : (
                <>
                  {/* PROJECT OVERVIEW */}

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-slate-900 md:text-2xl">
                            {selectedProject?.projectName || "Project"}
                          </h2>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              selectedProject?.status === "inactive"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {selectedProject?.status || "active"}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 size={14} />
                            {selectedProject?.clientName || "No client"}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <BriefcaseBusiness size={14} />
                            {selectedProject?.projectCode || "No project code"}
                          </span>
                        </div>
                      </div>

                      {canManageProject(selectedProject) && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={openEditProject}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil size={14} />
                            Edit Project
                          </button>

                          <button
                            type="button"
                            onClick={archiveProject}
                            disabled={busy === "project-delete"}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Archive size={14} />
                            {busy === "project-delete" ? "Archiving..." : "Archive"}
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {selectedProject?.projectDescription ||
                        selectedProject?.projectDetails ||
                        "No project description available."}
                    </p>

                    {selectedProject?.remarks && (
                      <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                        <strong>Remarks:</strong>{" "}
                        {selectedProject.remarks}
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <MiniStat label="Modules" value={modules.length} />
                      <MiniStat
                        label="Assignments"
                        value={totalModuleAssignments}
                      />
                      <MiniStat
                        label="In Progress"
                        value={inProgressAssignments}
                      />
                      <MiniStat
                        label="Completed"
                        value={completedAssignments}
                      />
                    </div>
                  </div>

                  {/* MODULES */}

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Project Modules
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Each employee has an independent assignment and status.
                        </p>
                      </div>

                      {canManageProject(selectedProject) && (
                        <button
                          type="button"
                          onClick={openAddModule}
                          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                          <Plus size={15} />
                          Add Module
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 p-4 md:p-5">
                      {modules.map((module, index) => {
                        const moduleId = getId(module);
                        const assignments = module.employees || [];
                        const myAssignment = myAssignmentForModule(module);
                        const expanded =
                          expandedModules[moduleId] !== false;

                        return (
                          <div
                            key={moduleId}
                            className="overflow-hidden rounded-xl border border-slate-200"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-4">
                              <button
                                type="button"
                                onClick={() => toggleModule(moduleId)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                                  {index + 1}
                                </span>

                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-bold text-slate-900">
                                    {module.moduleName}
                                  </span>

                                  <span className="mt-1 block text-xs text-slate-500">
                                    {assignments.length} employee assignment
                                    {assignments.length !== 1 ? "s" : ""}
                                  </span>
                                </span>

                                {expanded ? (
                                  <ChevronUp
                                    size={17}
                                    className="ml-auto shrink-0 text-slate-400"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={17}
                                    className="ml-auto shrink-0 text-slate-400"
                                  />
                                )}
                              </button>

                              {canManageProject(selectedProject) && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModule(module)}
                                    title="Edit module"
                                    className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600"
                                  >
                                    <Pencil size={15} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteModule(module)}
                                    disabled={busy === `module-${moduleId}`}
                                    title="Delete module"
                                    className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {expanded && (
                              <div className="space-y-4 p-4">
                                {/* MY OWN ASSIGNMENT */}

                                {myAssignment && (
                                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                                          Your Assignment
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-900">
                                          {module.moduleName}
                                        </p>
                                      </div>

                                      <span
                                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                          myAssignment.status
                                        )}`}
                                      >
                                        {myAssignment.status}
                                      </span>
                                    </div>

                                    {myAssignment.description && (
                                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                                        {myAssignment.description}
                                      </p>
                                    )}

                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                      <label className="text-xs font-semibold text-slate-600">
                                        Update your status
                                      </label>

                                      <select
                                        value={myAssignment.status || "Assigned"}
                                        disabled={busy === `status-${moduleId}`}
                                        onChange={(event) =>
                                          updateAssignmentStatus(
                                            moduleId,
                                            event.target.value
                                          )
                                        }
                                        className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 disabled:opacity-50"
                                      >
                                        {MY_STATUSES.map((status) => (
                                          <option key={status} value={status}>
                                            {status}
                                          </option>
                                        ))}
                                      </select>

                                      {busy === `status-${moduleId}` && (
                                        <RefreshCw
                                          size={14}
                                          className="animate-spin text-indigo-600"
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* ALL EMPLOYEE ASSIGNMENTS */}

                                <div>
                                  <div className="mb-3 flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-800">
                                      Employee Assignments
                                    </h4>

                                    <span className="text-xs text-slate-400">
                                      {assignments.length} assigned
                                    </span>
                                  </div>

                                  {assignments.length > 0 ? (
                                    <div className="space-y-2">
                                      {assignments.map((assignment) => {
                                        const assignedEmployee =
                                          assignment.employeeId;

                                        const assignedId =
                                          getId(assignedEmployee);

                                        const isMe =
                                          assignedId === employeeId;

                                        return (
                                          <div
                                            key={
                                              assignment._id ||
                                              assignedId
                                            }
                                            className={`rounded-xl border p-3 ${
                                              isMe
                                                ? "border-indigo-200 bg-indigo-50/30"
                                                : "border-slate-200 bg-white"
                                            }`}
                                          >
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                              <div className="flex min-w-0 items-start gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                                                  {getEmployeeName(
                                                    assignedEmployee
                                                  )
                                                    .charAt(0)
                                                    .toUpperCase()}
                                                </div>

                                                <div className="min-w-0">
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-semibold text-slate-900">
                                                      {getEmployeeName(
                                                        assignedEmployee
                                                      )}
                                                    </p>

                                                    {isMe && (
                                                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                                        YOU
                                                      </span>
                                                    )}
                                                  </div>

                                                  <p className="mt-1 text-xs text-slate-500">
                                                    {getEmployeeCode(
                                                      assignedEmployee
                                                    )}
                                                    {getRoleName(
                                                      assignedEmployee
                                                    )
                                                      ? ` • ${getRoleName(
                                                          assignedEmployee
                                                        )}`
                                                      : ""}
                                                    {getDepartmentName(
                                                      assignedEmployee
                                                    )
                                                      ? ` • ${getDepartmentName(
                                                          assignedEmployee
                                                        )}`
                                                      : ""}
                                                  </p>

                                                  {assignment.description && (
                                                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                                                      {assignment.description}
                                                    </p>
                                                  )}

                                                  <p className="mt-2 text-[11px] text-slate-400">
                                                    Assigned:{" "}
                                                    {formatDate(
                                                      assignment.createdAt
                                                    )}
                                                  </p>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2">
                                                <span
                                                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                                    assignment.status
                                                  )}`}
                                                >
                                                  {assignment.status}
                                                </span>

                                                {canManageProject(
                                                  selectedProject
                                                ) && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      removeModuleEmployee(
                                                        module,
                                                        assignment
                                                      )
                                                    }
                                                    disabled={
                                                      busy ===
                                                      `remove-${moduleId}-${assignedId}`
                                                    }
                                                    title="Remove employee from module"
                                                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                                  >
                                                    <UserMinus size={15} />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center">
                                      <Users
                                        size={25}
                                        className="mx-auto text-slate-300"
                                      />

                                      <p className="mt-2 text-sm font-medium text-slate-600">
                                        No employees assigned yet
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* ASSIGN EMPLOYEE */}

                                {canManageProject(selectedProject) && (
                                  <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                      <UserPlus
                                        size={17}
                                        className="text-indigo-600"
                                      />

                                      <h4 className="text-sm font-bold text-slate-800">
                                        Assign Employee
                                      </h4>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
                                      <select
                                        value={
                                          assignmentForms[moduleId]
                                            ?.employeeId || ""
                                        }
                                        disabled={employeesLoading}
                                        onChange={(event) =>
                                          updateAssignmentForm(
                                            moduleId,
                                            "employeeId",
                                            event.target.value
                                          )
                                        }
                                        className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
                                      >
                                        <option value="">
                                          {employeesLoading
                                            ? "Loading employees..."
                                            : "Select employee"}
                                        </option>

                                        {assignableEmployees
                                          .filter(
                                            (person) =>
                                              !(assignments || []).some(
                                                (assignment) =>
                                                  getId(
                                                    assignment.employeeId
                                                  ) === getId(person)
                                              )
                                          )
                                          .map((person) => (
                                            <option
                                              key={getId(person)}
                                              value={getId(person)}
                                            >
                                              {getEmployeeName(person)}
                                              {getEmployeeCode(person)
                                                ? ` (${getEmployeeCode(
                                                    person
                                                  )})`
                                                : ""}
                                            </option>
                                          ))}
                                      </select>

                                      <input
                                        type="text"
                                        value={
                                          assignmentForms[moduleId]
                                            ?.description || ""
                                        }
                                        onChange={(event) =>
                                          updateAssignmentForm(
                                            moduleId,
                                            "description",
                                            event.target.value
                                          )
                                        }
                                        placeholder="Assignment description (optional)"
                                        className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                                      />

                                      <button
                                        type="button"
                                        onClick={() =>
                                          assignEmployeeToModule(moduleId)
                                        }
                                        disabled={
                                          !assignmentForms[moduleId]
                                            ?.employeeId ||
                                          busy === `assign-${moduleId}`
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {busy === `assign-${moduleId}` ? (
                                          <RefreshCw
                                            size={14}
                                            className="animate-spin"
                                          />
                                        ) : (
                                          <UserPlus size={14} />
                                        )}
                                        Assign
                                      </button>
                                    </div>

                                    <p className="mt-2 text-[11px] text-slate-500">
                                      Only employees who already have access
                                      to this project can be assigned.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {modules.length === 0 && (
                        <div className="py-12 text-center">
                          <Layers3
                            size={34}
                            className="mx-auto text-slate-300"
                          />

                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            No modules found
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Add modules to start assigning employees.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PROJECT ACCESS MANAGEMENT */}

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setShowAccessPanel((previous) => !previous)
                      }
                      className="flex w-full items-center justify-between gap-3 p-5 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                          <ShieldCheck size={19} />
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900">
                            Project Access Management
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            Manage employees who can access this project.
                          </p>
                        </div>
                      </div>

                      {showAccessPanel ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>

                    {showAccessPanel && (
                      <div className="space-y-4 border-t border-slate-100 p-5">
                        {!canManageProject(selectedProject) ? (
                          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                            Only the employee who created this project can
                            manage project access from this page.
                          </p>
                        ) : (
                          <>
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">
                                Grant Project Access
                              </h4>

                              <p className="mt-1 text-xs text-slate-500">
                                You can grant access to eligible employees
                                within your role hierarchy.
                              </p>

                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <select
                                  value={accessEmployeeId}
                                  onChange={(event) =>
                                    setAccessEmployeeId(event.target.value)
                                  }
                                  disabled={employeesLoading}
                                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                                >
                                  <option value="">
                                    Select employee
                                  </option>

                                  {employeesWithoutAccess.map((person) => (
                                    <option
                                      key={getId(person)}
                                      value={getId(person)}
                                    >
                                      {getEmployeeName(person)}
                                      {getEmployeeCode(person)
                                        ? ` (${getEmployeeCode(person)})`
                                        : ""}
                                      {getRoleName(person)
                                        ? ` — ${getRoleName(person)}`
                                        : ""}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={grantProjectAccess}
                                  disabled={
                                    !accessEmployeeId ||
                                    busy === "grant-access"
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  <UserPlus size={15} />
                                  Grant Access
                                </button>
                              </div>
                            </div>

                            <div>
                              <h4 className="mb-3 text-sm font-bold text-slate-800">
                                Employees with Project Access
                              </h4>

                              {employeesLoading ? (
                                <p className="text-sm text-slate-500">
                                  Loading employees...
                                </p>
                              ) : grantedEmployees.length > 0 ? (
                                <div className="space-y-2">
                                  {grantedEmployees.map((item) => {
                                    const person =
                                      item.employee || item;

                                    return (
                                      <div
                                        key={getId(person)}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                                      >
                                        <div>
                                          <p className="text-sm font-semibold text-slate-800">
                                            {getEmployeeName(person)}
                                          </p>

                                          <p className="mt-1 text-xs text-slate-500">
                                            {getEmployeeCode(person)}
                                            {getRoleName(person)
                                              ? ` • ${getRoleName(person)}`
                                              : ""}
                                            {getDepartmentName(person)
                                              ? ` • ${getDepartmentName(person)}`
                                              : ""}
                                          </p>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            revokeProjectAccess(person)
                                          }
                                          disabled={
                                            busy ===
                                            `revoke-${getId(person)}`
                                          }
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                        >
                                          <UserMinus size={14} />
                                          Revoke Access
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                                  No employees have been granted access by you.
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}

      {/* ==============================================
          MY ASSIGNMENTS TAB
      ============================================== */}

      {activeTab === "assignments" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              label="My Assignments"
              value={myAssignments.length}
              icon={ClipboardList}
              color="indigo"
            />

            <SummaryCard
              label="In Progress"
              value={
                myAssignments.filter(
                  (item) => item.status === "In Progress"
                ).length
              }
              icon={Clock3}
              color="blue"
            />

            <SummaryCard
              label="Completed"
              value={
                myAssignments.filter(
                  (item) => item.status === "Completed"
                ).length
              }
              icon={CheckCircle2}
              color="emerald"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  My Assigned Modules
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  All module assignments assigned to your employee account.
                </p>
              </div>

              <button
                type="button"
                onClick={loadMyAssignments}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw
                  size={14}
                  className={
                    assignmentsLoading ? "animate-spin" : ""
                  }
                />
                Refresh
              </button>
            </div>

            {assignmentsLoading ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Loading assignments...
              </div>
            ) : myAssignments.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {myAssignments.map((assignment) => (
                  <div
                    key={
                      assignment.assignmentId ||
                      assignment._id
                    }
                    className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {assignment.moduleName}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            assignment.status
                          )}`}
                        >
                          {assignment.status}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-600">
                        {assignment.projectName || "Project"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Project Code: {assignment.projectCode || "—"}
                      </p>

                      {assignment.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">
                          {assignment.description}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-slate-400">
                        Assigned: {formatDate(assignment.assignedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={assignment.status || "Assigned"}
                        disabled={busy === `my-status-${assignment._id}`}
                        onChange={async (event) => {
                          const nextStatus = event.target.value;
                          const projectId = getId(assignment.projectId);

                          if (!projectId) {
                            toast.error(
                              "Project ID is missing for this assignment."
                            );
                            return;
                          }

                          setBusy(`my-status-${assignment._id}`);

                          try {
                            const response = await api.patch(
                              `/projects/${projectId}/modules/${assignment._id}/status`,
                              { status: nextStatus },
                              { withCredentials: true }
                            );

                            toast.success(
                              response.data.message ||
                                "Assignment status updated."
                            );

                            await loadMyAssignments();

                            if (selectedId === projectId) {
                              await loadProjectDetails(projectId);
                            }
                          } catch (error) {
                            toast.error(
                              error.response?.data?.message ||
                                "Failed to update status."
                            );
                          } finally {
                            setBusy("");
                          }
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
                      >
                        {MY_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          const projectId = getId(assignment.projectId);

                          if (projectId) {
                            setSelectedId(projectId);
                            setActiveTab("projects");
                          }
                        }}
                        className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        View Project
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <ClipboardList
                  size={36}
                  className="mx-auto text-slate-300"
                />

                <h3 className="mt-3 font-semibold text-slate-800">
                  No assignments yet
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Your assigned project modules will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================
          DELETED PROJECTS TAB
      ============================================== */}

      {activeTab === "deleted" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Deleted Projects
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Restore or permanently delete projects created by you.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDeletedProjects}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw
                size={14}
                className={deletedLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {deletedLoading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading deleted projects...
            </div>
          ) : deletedProjects.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {deletedProjects.map((project) => (
                <div
                  key={getId(project)}
                  className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900">
                      {project.projectName}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {project.clientName || "No client"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {project.projectCode || "—"}
                    </p>

                    <p className="mt-2 text-xs text-red-500">
                      Deleted: {formatDate(project.deletedAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => restoreProject(project)}
                      disabled={busy === `restore-${getId(project)}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      {busy === `restore-${getId(project)}`
                        ? "Restoring..."
                        : "Restore"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        permanentlyDeleteProject(project)
                      }
                      disabled={
                        busy === `permanent-${getId(project)}`
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      {busy === `permanent-${getId(project)}`
                        ? "Deleting..."
                        : "Delete Permanently"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <Archive
                size={36}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-3 font-semibold text-slate-800">
                No deleted projects
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Projects archived by you will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==============================================
          PROJECT FORM MODAL
      ============================================== */}

      {showProjectForm && (
        <Modal
          title={editingProject ? "Edit Project" : "Create New Project"}
          onClose={() => setShowProjectForm(false)}
        >
          <form onSubmit={saveProject} className="space-y-4">
            <FormField label="Project Name" required>
              <input
                required
                value={projectForm.projectName}
                onChange={(event) =>
                  setProjectForm((previous) => ({
                    ...previous,
                    projectName: event.target.value,
                  }))
                }
                placeholder="Enter project name"
                className="form-input"
              />
            </FormField>

            <FormField label="Client Name" required>
              <input
                required
                value={projectForm.clientName}
                onChange={(event) =>
                  setProjectForm((previous) => ({
                    ...previous,
                    clientName: event.target.value,
                  }))
                }
                placeholder="Enter client name"
                className="form-input"
              />
            </FormField>

            <FormField label="Project Description">
              <textarea
                rows={3}
                value={projectForm.projectDescription}
                onChange={(event) =>
                  setProjectForm((previous) => ({
                    ...previous,
                    projectDescription: event.target.value,
                  }))
                }
                placeholder="Write project description..."
                className="form-input resize-y"
              />
            </FormField>

            <FormField label="Project Details">
              <textarea
                rows={3}
                value={projectForm.projectDetails}
                onChange={(event) =>
                  setProjectForm((previous) => ({
                    ...previous,
                    projectDetails: event.target.value,
                  }))
                }
                placeholder="Additional project details..."
                className="form-input resize-y"
              />
            </FormField>

            <FormField label="Remarks">
              <textarea
                rows={2}
                value={projectForm.remarks}
                onChange={(event) =>
                  setProjectForm((previous) => ({
                    ...previous,
                    remarks: event.target.value,
                  }))
                }
                placeholder="Optional remarks..."
                className="form-input resize-y"
              />
            </FormField>

            {editingProject && (
              <FormField label="Project Status">
                <select
                  value={projectForm.status}
                  onChange={(event) =>
                    setProjectForm((previous) => ({
                      ...previous,
                      status: event.target.value,
                    }))
                  }
                  className="form-input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy === "project-save"}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={15} />
                {busy === "project-save"
                  ? "Saving..."
                  : editingProject
                    ? "Save Changes"
                    : "Create Project"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ==============================================
          MODULE FORM MODAL
      ============================================== */}

      {showModuleForm && (
        <Modal
          title={editingModuleId ? "Edit Module" : "Add New Module"}
          onClose={() => {
            setShowModuleForm(false);
            setEditingModuleId("");
          }}
        >
          <form onSubmit={saveModule} className="space-y-4">
            <FormField label="Module Name" required>
              <input
                required
                autoFocus
                value={moduleName}
                onChange={(event) => setModuleName(event.target.value)}
                placeholder="Enter module name"
                className="form-input"
              />
            </FormField>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowModuleForm(false);
                  setEditingModuleId("");
                }}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy === "module-save"}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={15} />
                {busy === "module-save"
                  ? "Saving..."
                  : editingModuleId
                    ? "Update Module"
                    : "Add Module"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

const SummaryCard = ({ label, value, icon: Icon, color = "indigo" }) => {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            colors[color] || colors.indigo
          }`}
        >
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
};

const MiniStat = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={18} />
        </button>
      </div>

      <div className="max-h-[80vh] overflow-y-auto p-5">
        {children}
      </div>
    </div>
  </div>
);

const FormField = ({ label, required, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>

    {children}
  </div>
);

export default EmployeeProjects;
