import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FolderKanban, RefreshCw, Layers3, Building2, Plus, Pencil, Trash2,
  RotateCcw, Archive, Users, UserPlus, UserMinus, CheckCircle2, Clock3,
  Search, X, Save, BriefcaseBusiness, ClipboardList, ChevronDown,
  ChevronUp, Settings2,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { getEmployeeProfile, verifyEmployeeRoute } from "./employeeApi";

// ==================================================
// CONSTANTS + DESIGN TOKENS
// ==================================================

const MY_STATUSES = ["Assigned", "In Progress", "Completed"];
const BRAND = "#2d7f6b";

const STATUS_COLORS = {
  "Not Assigned": "#cbd5e1",
  Assigned: "#3b82f6",
  "In Progress": "#a855f7",
  Completed: BRAND,
};

const AVATAR_TONES = [
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
];

const cardClass = "rounded-2xl border border-slate-200 bg-white";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2d7f6b] focus:ring-4 focus:ring-[#2d7f6b]/15 disabled:bg-slate-100 disabled:opacity-60";

const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#2d7f6b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#256a59] disabled:cursor-not-allowed disabled:opacity-50";

const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const iconButton =
  "rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50";

// ==================================================
// DATA HELPERS
// ==================================================

const getId = (value) => {
  if (!value) return "";
  return String(
    typeof value === "object" ? value._id || value.id || "" : value
  );
};

// Supports: data.projects | data.data.projects | data.data | raw array
const getArray = (data, ...keys) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  if (Array.isArray(data?.data)) return data.data;
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
  employee?.roleId?.roleName || employee?.role?.roleName || "";

const getDepartmentName = (employee) =>
  employee?.departmentId?.departmentName ||
  employee?.department?.departmentName ||
  "";

const getEmployeeRoleId = (employee) =>
  getId(employee?.roleId || employee?.role);

const getRoleId = (role) => getId(role);

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ALLOWED_DEPARTMENTS = [
  "it",
  "information technology",
  "accessibility",
  "functional testing",
];

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

const toPercent = (part, total) =>
  total ? Math.round((part / total) * 100) : 0;

const getInitials = (text = "") =>
  String(text)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "?";

const toneFor = (text = "") =>
  AVATAR_TONES[
    [...String(text)].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      AVATAR_TONES.length
  ];

const statusClass = (status) => {
  const styles = {
    Completed: "border-[#2d7f6b]/30 bg-[#e8f3f0] text-[#2d7f6b]",
    "In Progress": "border-violet-200 bg-violet-50 text-violet-700",
    Assigned: "border-sky-200 bg-sky-50 text-sky-700",
    "Not Assigned": "border-slate-200 bg-slate-100 text-slate-600",
  };
  return styles[status] || styles["Not Assigned"];
};

const countByStatus = (items) => {
  const counts = { Assigned: 0, "In Progress": 0, Completed: 0 };
  items.forEach((item) => {
    if (counts[item.status] !== undefined) counts[item.status] += 1;
  });
  return counts;
};

const legendFromCounts = (counts) =>
  MY_STATUSES.map((status) => ({
    label: status,
    value: counts[status] || 0,
    color: STATUS_COLORS[status],
  }));

// ==================================================
// REUSABLE UI
// ==================================================

const Avatar = ({ text, size = "h-10 w-10", rounded = "rounded-full" }) => (
  <span
    className={`flex ${size} shrink-0 items-center justify-center ${rounded} text-sm font-semibold ${toneFor(
      text
    )}`}
  >
    {getInitials(text)}
  </span>
);

const Card = ({ title, action, children, className = "" }) => (
  <section className={`${cardClass} ${className}`}>
    {(title || action) && (
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

const CardAction = ({ icon: Icon, onClick, disabled, danger, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-1.5 text-sm transition disabled:opacity-50 ${
      danger
        ? "text-red-600 hover:text-red-800"
        : "text-slate-500 hover:text-slate-900"
    }`}
  >
    {Icon && <Icon size={15} />}
    {children}
  </button>
);

const InfoRow = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm last:border-0">
    <span className="shrink-0 text-slate-500">{label}</span>
    <span className="min-w-0 truncate text-right font-medium text-slate-900">
      {children}
    </span>
  </div>
);

const ProjectStatusPill = ({ status }) => (
  <span
    className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-medium capitalize ${
      status === "inactive"
        ? "border-slate-200 bg-slate-100 text-slate-600"
        : "border-[#2d7f6b]/40 bg-[#e8f3f0] text-[#2d7f6b]"
    }`}
  >
    {status || "active"}
  </span>
);

const StatusPill = ({ status }) => (
  <span
    className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(
      status
    )}`}
  >
    {status || "Not Assigned"}
  </span>
);

const Legend = ({ items }) => (
  <ul className="space-y-2.5">
    {items.map((item) => (
      <li
        key={item.label}
        className="flex items-center gap-2 text-sm text-slate-600"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <span>{item.label}</span>
        <span className="ml-auto font-semibold text-slate-900">
          {item.value}
        </span>
      </li>
    ))}
  </ul>
);

const DonutChart = ({ value, size = 140, stroke = 18, color = BRAND }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-slate-900">
        {safe}%
      </span>
    </div>
  );
};

const PieChart = ({ data, size = 140 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2;
  const visible = data.filter((item) => item.value > 0);

  if (!total || visible.length === 0) {
    return (
      <svg width={size} height={size} className="shrink-0">
        <circle cx={radius} cy={radius} r={radius} fill="#f1f5f9" />
      </svg>
    );
  }

  if (visible.length === 1) {
    return (
      <svg width={size} height={size} className="shrink-0">
        <circle cx={radius} cy={radius} r={radius} fill={visible[0].color} />
      </svg>
    );
  }

  let angle = -Math.PI / 2;

  const slices = visible.map((item) => {
    const slice = (item.value / total) * Math.PI * 2;
    const x1 = radius + radius * Math.cos(angle);
    const y1 = radius + radius * Math.sin(angle);
    angle += slice;
    const x2 = radius + radius * Math.cos(angle);
    const y2 = radius + radius * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;

    return {
      key: item.label,
      color: item.color,
      path: `M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2} Z`,
    };
  });

  return (
    <svg width={size} height={size} className="shrink-0">
      {slices.map((slice) => (
        <path
          key={slice.key}
          d={slice.path}
          fill={slice.color}
          stroke="#fff"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <button type="button" onClick={onClose} className={iconButton}>
          <X size={18} />
        </button>
      </div>
      <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
    </div>
  </div>
);

const FormField = ({ label, required, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    {children}
  </div>
);

// ==================================================
// PAGE
// ==================================================

const EmployeeProjects = () => {
  const { employeeId: routeEmployeeId } = useParams();

  const [employee, setEmployee] = useState(null);
  const [employeeId, setEmployeeId] = useState("");

  const [projects, setProjects] = useState([]);
  const [createdProjects, setCreatedProjects] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [projectDetails, setProjectDetails] = useState(null);
  const [modules, setModules] = useState([]);

  const [assignableEmployees, setAssignableEmployees] = useState([]);
  const [grantedEmployees, setGrantedEmployees] = useState([]);

  // Company data
  const [companyRoles, setCompanyRoles] = useState([]);
  const [companyEmployees, setCompanyEmployees] = useState([]);

  const grantableHierarchyEmployees = useMemo(() => {
    const currentRoleId = getEmployeeRoleId(employee);

    if (!currentRoleId || !companyRoles.length || !companyEmployees.length) {
      return [];
    }

    const visited = new Set([String(currentRoleId)]);
    const descendantRoleIds = new Set();
    let currentLevel = [String(currentRoleId)];

    while (currentLevel.length > 0) {
      const nextLevel = [];

      companyRoles.forEach((role) => {
        const roleId = getRoleId(role);
        const parentRoleId = getId(role.parentRoleId || role.parentRole);

        if (
          roleId &&
          parentRoleId &&
          currentLevel.includes(parentRoleId) &&
          !visited.has(String(roleId))
        ) {
          visited.add(String(roleId));
          descendantRoleIds.add(String(roleId));
          nextLevel.push(String(roleId));
        }
      });

      currentLevel = nextLevel;
    }

    return companyEmployees.filter((person) =>
      descendantRoleIds.has(String(getEmployeeRoleId(person)))
    );
  }, [employee, companyRoles, companyEmployees]);

  // Role access API data
  const [roleAccessData, setRoleAccessData] = useState([]);

  // Project form employee access
  const [selectedAccessEmployeeIds, setSelectedAccessEmployeeIds] = useState(
    []
  );
  const [accessSearch, setAccessSearch] = useState("");

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

  const openProjectAccess = async (project) => {
    const projectId = getId(project);
    if (!projectId) return;

    setSelectedId(projectId);
    setShowAccessPanel(true);

    await Promise.all([
      loadProjectDetails(projectId),
      loadProjectEmployees(projectId),
    ]);
  };

  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState("");
  const [moduleName, setModuleName] = useState("");
  // Modules created together with a new project
  const [newProjectModules, setNewProjectModules] = useState([""]);
  const [assignmentForms, setAssignmentForms] = useState({});
  const [accessEmployeeId, setAccessEmployeeId] = useState("");
  const [showAccessPanel, setShowAccessPanel] = useState(false);
  const [selectedGrantEmployeeIds, setSelectedGrantEmployeeIds] = useState([]);
  const [grantSearch, setGrantSearch] = useState("");

  // --------------------------------------------------
  // PERMISSIONS
  // --------------------------------------------------

  const isOwnCreatedProject = useCallback(
    (project) =>
      Boolean(employeeId && getId(project?.createdByEmployee) === employeeId),
    [employeeId]
  );

  const createdProjectIds = useMemo(
    () => new Set(createdProjects.map((project) => getId(project))),
    [createdProjects]
  );

  const canManageProject = useCallback(
    (project) =>
      isOwnCreatedProject(project) || createdProjectIds.has(getId(project)),
    [isOwnCreatedProject, createdProjectIds]
  );

  const selectedProject =
    projectDetails ||
    projects.find((project) => getId(project) === selectedId) ||
    null;

  const departmentName = normalizeText(getDepartmentName(employee));
  const roleName = normalizeText(getRoleName(employee));

  const isITVicePresident =
    roleName === "vice president" &&
    ALLOWED_DEPARTMENTS.includes(departmentName);

  // Only Vice Presidents can see the Project Modules section
  const isVicePresident = roleName === "vice president";

  // --------------------------------------------------
  // ROLE-WISE EMPLOYEE HELPERS
  // --------------------------------------------------

  const getRoleEmployees = useCallback(
    (role) => {
      const roleId = getRoleId(role);
      return companyEmployees.filter(
        (person) => getEmployeeRoleId(person) === roleId
      );
    },
    [companyEmployees]
  );

  const toggleProjectEmployeeAccess = (id) => {
    setSelectedAccessEmployeeIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const toggleRoleEmployees = (role, visibleEmployees = null) => {
    const roleEmployees = visibleEmployees || getRoleEmployees(role);
    const roleEmployeeIds = roleEmployees.map(getId).filter(Boolean);

    setSelectedAccessEmployeeIds((previous) => {
      const allSelected = roleEmployeeIds.every((id) => previous.includes(id));

      if (allSelected) {
        return previous.filter((id) => !roleEmployeeIds.includes(id));
      }

      return [...new Set([...previous, ...roleEmployeeIds])];
    });
  };

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
      const companyId = getId(profile.companyId);

      setEmployee(profile);
      setEmployeeId(currentEmployeeId);

      const [
        accessibleResponse,
        createdResponse,
        rolesResponse,
        employeesResponse,
      ] = await Promise.all([
        api.get("/projects/my-accessible-projects", { withCredentials: true }),
        api.get("/projects/my-created-projects", { withCredentials: true }),
        api.get(`/roles/company/${companyId}/employee`, {
          withCredentials: true,
        }),
        api.get(`/employees/company/${companyId}/employee`, {
          withCredentials: true,
        }),
      ]);

      const accessible = getArray(accessibleResponse.data, "projects");
      const created = getArray(createdResponse.data, "projects");
      const roles = getArray(rolesResponse.data, "roles");
      const employees = getArray(employeesResponse.data, "employees");

      setProjects(accessible);
      setCreatedProjects(created);
      setCompanyRoles(roles);
      setCompanyEmployees(employees);

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
      setCompanyRoles([]);
      setCompanyEmployees([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }, [routeEmployeeId]);

  const loadMyAssignments = useCallback(async () => {
    setAssignmentsLoading(true);

    try {
      const response = await api.get("/projects/my-assigned-modules", {
        withCredentials: true,
      });

      setMyAssignments(getArray(response.data, "modules", "assignments"));
    } catch (error) {
      setMyAssignments([]);
      toast.error(
        error.response?.data?.message || "Failed to load your assignments."
      );
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  const loadDeletedProjects = useCallback(async () => {
    if (!employeeId) return;

    setDeletedLoading(true);

    try {
      const response = await api.get("/projects/deleted/employee", {
        withCredentials: true,
      });

      const deleted = getArray(response.data, "deletedProjects", "projects");

      setDeletedProjects(
        deleted.filter(
          (project) => getId(project.createdByEmployee) === employeeId
        )
      );
    } catch (error) {
      setDeletedProjects([]);
      toast.error(
        error.response?.data?.message || "Failed to load deleted projects."
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
        api.get(`/projects/${projectId}`, { withCredentials: true }),
        api.get(`/projects/${projectId}/modules`, { withCredentials: true }),
      ]);

      setProjectDetails(projectResponse.data.project || null);
      setModules(getArray(modulesResponse.data, "modules"));
    } catch (error) {
      setProjectDetails(null);
      setModules([]);
      toast.error(
        error.response?.data?.message || "Failed to load project details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // PROJECT EMPLOYEES + ROLE ACCESS
  // --------------------------------------------------

  const loadProjectEmployees = useCallback(async (projectId) => {
    if (!projectId) {
      setAssignableEmployees([]);
      setGrantedEmployees([]);
      setRoleAccessData([]);
      return;
    }

    setEmployeesLoading(true);

    try {
      const [eligibleResponse, grantedResponse, roleAccessResponse] =
        await Promise.all([
          api.get(`/projects/${projectId}/assignable-employees`, {
            withCredentials: true,
          }),
          api.get(`/projects/${projectId}/my-granted-access`, {
            withCredentials: true,
          }),
          api.get(`/projects/${projectId}/role-access`, {
            withCredentials: true,
          }),
        ]);

      setAssignableEmployees(getArray(eligibleResponse.data, "employees"));
      setGrantedEmployees(getArray(grantedResponse.data, "employees"));
      setRoleAccessData(
        getArray(roleAccessResponse.data, "roles", "roleAccess")
      );
    } catch (error) {
      setAssignableEmployees([]);
      setGrantedEmployees([]);
      setRoleAccessData([]);
      toast.error(
        error.response?.data?.message || "Failed to load project employees."
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
      setRoleAccessData([]);
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

  const addProjectModuleField = () => {
    setNewProjectModules((previous) => [...previous, ""]);
  };

  const updateProjectModuleField = (index, value) => {
    setNewProjectModules((previous) =>
      previous.map((item, i) => (i === index ? value : item))
    );
  };

  const removeProjectModuleField = (index) => {
    setNewProjectModules((previous) => previous.filter((_, i) => i !== index));
  };

  const openCreateProject = () => {
    if (roleName !== "vice president") {
      toast.error("Only Vice Presidents can create projects.");
      return;
    }

    setEditingProject(false);

    setProjectForm({
      projectName: "",
      clientName: "",
      projectDescription: "",
      projectDetails: "",
      remarks: "",
      status: "active",
    });

    setSelectedAccessEmployeeIds([]);
    setAccessSearch("");

    // Reset module fields whenever a new project is created
    setNewProjectModules([""]);

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

    setSelectedAccessEmployeeIds(
      (selectedProject.employeeAccess || []).map(getId).filter(Boolean)
    );

    setAccessSearch("");
    setShowProjectForm(true);
  };

  const saveProject = async (event) => {
    event.preventDefault();

    if (!projectForm.projectName.trim() || !projectForm.clientName.trim()) {
      toast.error("Project name and client name are required.");
      return;
    }

    if (!editingProject && roleName !== "vice president") {
      toast.error("Only Vice Presidents can create projects.");
      return;
    }

    setBusy("project-save");

    try {
      let projectId = selectedId;

      if (editingProject && selectedId) {
        const existingAccessIds = (selectedProject?.employeeAccess || [])
          .map(getId)
          .filter(Boolean);

        const newAccessIds = selectedAccessEmployeeIds;

        const employeesToAdd = newAccessIds.filter(
          (id) => !existingAccessIds.includes(id)
        );

        const employeesToRemove = existingAccessIds.filter(
          (id) => !newAccessIds.includes(id)
        );

        const response = await api.put(
          `/projects/${selectedId}/employee`,
          projectForm,
          { withCredentials: true }
        );

        toast.success(response.data.message || "Project updated successfully.");

        const accessRequests = [
          ...employeesToAdd.map((id) =>
            api.post(
              `/projects/${selectedId}/access`,
              { employeeId: id },
              { withCredentials: true }
            )
          ),
          ...employeesToRemove.map((id) =>
            api.delete(`/projects/${selectedId}/access/${id}`, {
              withCredentials: true,
            })
          ),
        ];

        if (accessRequests.length > 0) {
          const results = await Promise.allSettled(accessRequests);
          const failed = results.filter((result) => result.status === "rejected");

          if (failed.length > 0) {
            toast.warning(
              "Project updated, but some employee access changes failed."
            );
          }
        }
      } else {
        const response = await api.post("/projects/employee", projectForm, {
          withCredentials: true,
        });

        toast.success(response.data.message || "Project created successfully.");

        projectId = getId(response.data.project);

        if (projectId) {
          setSelectedId(projectId);

          // CREATE ALL PROJECT MODULES
          const moduleNames = newProjectModules
            .map((name) => name.trim())
            .filter(Boolean);

          let createdModuleCount = 0;
          let failedModuleCount = 0;

          for (const name of moduleNames) {
            try {
              await api.post(
                `/projects/${projectId}/modules/employee`,
                { moduleName: name },
                { withCredentials: true }
              );
              createdModuleCount++;
            } catch (error) {
              failedModuleCount++;
              console.error(`Failed to create module "${name}":`, error);
            }
          }

          if (failedModuleCount > 0) {
            toast.warning(
              `${createdModuleCount} module(s) created, ${failedModuleCount} module(s) failed.`
            );
          }

          // GRANT PROJECT EMPLOYEE ACCESS
          if (selectedAccessEmployeeIds.length > 0) {
            const accessResults = await Promise.allSettled(
              selectedAccessEmployeeIds.map((id) =>
                api.post(
                  `/projects/${projectId}/access`,
                  { employeeId: id },
                  { withCredentials: true }
                )
              )
            );

            const failed = accessResults.filter(
              (result) => result.status === "rejected"
            );

            if (failed.length > 0) {
              toast.warning(
                "Project created, but some employee access could not be granted."
              );
            }
          }
        }
      }

      setShowProjectForm(false);
      setSelectedAccessEmployeeIds([]);

      await loadProjects();

      if (projectId) {
        await loadProjectEmployees(projectId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save project.");
    } finally {
      setBusy("");
    }
  };

  const archiveProject = async () => {
    if (!selectedId || !selectedProject) return;

    if (!window.confirm(`Archive "${selectedProject.projectName}"?`)) return;

    setBusy("project-delete");

    try {
      const response = await api.delete(`/projects/${selectedId}/employee`, {
        withCredentials: true,
      });

      toast.success(response.data.message || "Project archived successfully.");

      setSelectedId("");

      await Promise.all([loadProjects(), loadDeletedProjects()]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to archive project.");
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

        toast.success(response.data.message || "Module updated successfully.");
      } else {
        const response = await api.post(
          `/projects/${selectedId}/modules/employee`,
          { moduleName: moduleName.trim() },
          { withCredentials: true }
        );

        toast.success(response.data.message || "Module added successfully.");
      }

      setShowModuleForm(false);
      setEditingModuleId("");
      setModuleName("");

      await refreshSelectedProject();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save module.");
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

      toast.success(response.data.message || "Module deleted successfully.");

      await refreshSelectedProject();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete module.");
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
      [moduleId]: { ...previous[moduleId], [field]: value },
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

      toast.success(response.data.message || "Employee assigned successfully.");

      setAssignmentForms((previous) => ({
        ...previous,
        [moduleId]: { employeeId: "", description: "" },
      }));

      await refreshSelectedProject();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign employee.");
    } finally {
      setBusy("");
    }
  };

  const myAssignmentForModule = (module) =>
    (module.employees || []).find(
      (assignment) => getId(assignment.employeeId) === employeeId
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

      toast.success(response.data.message || "Your status has been updated.");

      await Promise.all([loadProjectDetails(selectedId), loadMyAssignments()]);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update your status."
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
      !window.confirm(`Remove ${targetName} from "${module.moduleName}"?`)
    ) {
      return;
    }

    setBusy(`remove-${module._id}-${targetEmployeeId}`);

    try {
      const response = await api.delete(
        `/projects/${selectedId}/modules/${module._id}/employees/${targetEmployeeId}/employee`,
        { withCredentials: true }
      );

      toast.success(response.data.message || "Employee removed from module.");

      await refreshSelectedProject();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove employee.");
    } finally {
      setBusy("");
    }
  };

  // --------------------------------------------------
  // PROJECT EMPLOYEE ACCESS
  // --------------------------------------------------

  const grantProjectAccess = async () => {
    if (!selectedProject?._id && !selectedId) {
      toast.error("Please select a project.");
      return;
    }

    if (selectedGrantEmployeeIds.length === 0) {
      toast.error("Please select at least one employee.");
      return;
    }

    const projectId = selectedId || getId(selectedProject);

    setBusy("grant-access");

    try {
      const response = await api.post(
        `/projects/${projectId}/access`,
        { employeeIds: selectedGrantEmployeeIds },
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Project access granted successfully."
      );

      setSelectedGrantEmployeeIds([]);
      setGrantSearch("");

      await loadProjectDetails(projectId);

      // Existing access list refresh
      if (typeof loadProjectRoleAccess === "function") {
        // eslint-disable-next-line no-undef
        await loadProjectRoleAccess(projectId);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to grant project access."
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

      toast.success(response.data.message || "Project access revoked.");

      await refreshSelectedProject();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to revoke project access."
      );
    } finally {
      setBusy("");
    }
  };

  const toggleGrantEmployee = (id) => {
    setSelectedGrantEmployeeIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const toggleAllGrantEmployees = (employeeIds) => {
    setSelectedGrantEmployeeIds((previous) => {
      const allSelected = employeeIds.every((id) => previous.includes(id));

      if (allSelected) {
        return previous.filter((id) => !employeeIds.includes(id));
      }

      return [...new Set([...previous, ...employeeIds])];
    });
  };

  // --------------------------------------------------
  // DELETED PROJECTS
  // --------------------------------------------------

  const restoreProject = async (deletedProject) => {
    const deletedId = getId(deletedProject);

    if (!deletedId) return;

    if (!window.confirm(`Restore "${deletedProject.projectName}"?`)) return;

    setBusy(`restore-${deletedId}`);

    try {
      const response = await api.post(
        `/projects/deleted/${deletedId}/restore/employee`,
        {},
        { withCredentials: true }
      );

      toast.success(response.data.message || "Project restored successfully.");

      await Promise.all([loadProjects(), loadDeletedProjects()]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to restore project.");
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

      toast.success(response.data.message || "Project permanently deleted.");

      await loadDeletedProjects();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to permanently delete project."
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

  const allModuleAssignments = useMemo(
    () => modules.flatMap((module) => module.employees || []),
    [modules]
  );

  const projectAssignmentCounts = useMemo(
    () => countByStatus(allModuleAssignments),
    [allModuleAssignments]
  );

  const myAssignmentCounts = useMemo(
    () => countByStatus(myAssignments),
    [myAssignments]
  );

  const totalModuleAssignments = allModuleAssignments.length;
  const completedAssignments = projectAssignmentCounts.Completed;
  const inProgressAssignments = projectAssignmentCounts["In Progress"];

 const teamMembers = useMemo(() => {
  const fromAccess = (selectedProject?.employeeAccess || [])
    .filter((item) => item && typeof item === "object")
    .map((item) => item.employee || item);

  const source = fromAccess.length
    ? fromAccess
    : grantedEmployees.map((item) => item.employee || item);

  // Same employee যেন একবারই থাকে
  return [
    ...new Map(
      source
        .filter((person) => getId(person))
        .map((person) => [String(getId(person)), person])
    ).values(),
  ];
}, [selectedProject, grantedEmployees]);

  const groupedTeamMembers = useMemo(() => {
  return teamMembers.reduce((groups, person) => {
    const role = getRoleName(person) || "Other";

    if (!groups[role]) {
      groups[role] = [];
    }

    groups[role].push(person);

    return groups;
  }, {});
}, [teamMembers]);

  const projectAccessIds = new Set(
    (selectedProject?.employeeAccess || []).map(getId)
  );

  const employeesWithoutAccess = grantableHierarchyEmployees.filter(
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

  const isOwner = canManageProject(selectedProject);

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-white p-4 text-slate-800 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        {/* ================= HEADER ================= */}

        <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              My Projects
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage projects, modules, employee assignments and progress.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowDeletedModal(true);
                loadDeletedProjects();
              }}
              className={buttonSecondary}
            >
              <Archive size={16} />
              Deleted Projects
              {deletedProjects.length > 0 && (
                <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {deletedProjects.length}
                </span>
              )}
            </button>

            {roleName === "vice president" && (
              <button
                type="button"
                onClick={openCreateProject}
                className={buttonPrimary}
              >
                <Plus size={16} />
                Create Project
              </button>
            )}
          </div>
        </div>

        {/* ================= TABS ================= */}

        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {[
            { id: "projects", label: "My Projects", icon: FolderKanban },
            { id: "assignments", label: "My Assignments", icon: ClipboardList },
          ].map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "border-[#2d7f6b] text-[#2d7f6b]"
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
              </button>
            );
          })}
        </div>

        {/* ==============================================
            MY PROJECTS TAB
        ============================================== */}

        {activeTab === "projects" && (
          <div className="mt-6 grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
            {/* ---------- PROJECT LIST (LEFT) ---------- */}

            <Card
              title="Projects"
              action={
                <span className="rounded-full bg-[#e8f3f0] px-2.5 py-0.5 text-xs font-semibold text-[#2d7f6b]">
                  {projects.length}
                </span>
              }
            >
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search projects..."
                  className={`${inputClass} pl-10`}
                />
              </div>

              <div className="mt-3 max-h-[640px] space-y-1.5 overflow-y-auto">
                {filteredProjects.map((project) => {
                  const isSelected = getId(project) === selectedId;
                  const owner = canManageProject(project);

                  return (
                    <button
                      type="button"
                      key={project._id}
                      onClick={() => setSelectedId(getId(project))}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-[#2d7f6b]/40 bg-[#e8f3f0]/70"
                          : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <Avatar
                        text={project.projectName}
                        size="h-9 w-9"
                        rounded="rounded-lg"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {project.projectName}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {project.clientName || "No client specified"}
                        </span>
                      </span>

                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {owner && (
                          <span className="rounded-md bg-[#e8f3f0] px-1.5 py-0.5 text-[10px] font-bold text-[#2d7f6b]">
                            OWNER
                          </span>
                        )}
                        <span
                          className={`h-2 w-2 rounded-full ${
                            project.status === "inactive"
                              ? "bg-slate-300"
                              : "bg-[#2d7f6b]"
                          }`}
                          title={project.status || "active"}
                        />
                      </span>
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
            </Card>

            {/* ---------- SELECTED PROJECT (RIGHT) ---------- */}

            <section className="min-w-0">
              {!selectedId ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                  <FolderKanban
                    size={42}
                    className="mx-auto text-slate-300"
                  />
                  <h2 className="mt-4 font-semibold text-slate-800">
                    No accessible project selected
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a project or get access to an existing project.
                  </p>
                </div>
              ) : detailsLoading ? (
                <div
                  className={`${cardClass} p-12 text-center text-sm text-slate-500`}
                >
                  <RefreshCw
                    size={20}
                    className="mx-auto mb-3 animate-spin"
                  />
                  Loading project details...
                </div>
              ) : (
                <div
                  className={`grid items-start gap-5 ${
                    isVicePresident
                      ? "2xl:grid-cols-[minmax(0,1fr)_340px]"
                      : ""
                  }`}
                >
                  {/* ========== MAIN COLUMN ========== */}
                  {/* About + Project Info  →  Progress  →  Team Members */}

                  <div className="min-w-0 space-y-5">
                    {/* ABOUT PROJECT + PROJECT INFO (merged) */}

                    <Card
                      title={selectedProject?.projectName || "Project"}
                      action={
                        isOwner && (
                          <div className="flex items-center gap-4">
                            <CardAction icon={Pencil} onClick={openEditProject}>
                              Edit
                            </CardAction>

                            <CardAction
                              icon={Archive}
                              danger
                              onClick={archiveProject}
                              disabled={busy === "project-delete"}
                            >
                              {busy === "project-delete"
                                ? "Archiving..."
                                : "Archive"}
                            </CardAction>
                          </div>
                        )
                      }
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 size={14} />
                          {selectedProject?.clientName || "No client"}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <BriefcaseBusiness size={14} />
                          {selectedProject?.projectCode || "No project code"}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {selectedProject?.projectDescription ||
                          selectedProject?.projectDetails ||
                          "No project description available."}
                      </p>

                      {selectedProject?.remarks && (
                        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                          <strong>Remarks:</strong> {selectedProject.remarks}
                        </div>
                      )}

                      {/* PROJECT INFO */}

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <h3 className="mb-1 text-sm font-semibold text-slate-900">
                          Project Info
                        </h3>

                        <div className={`grid gap-x-10 ${isVicePresident ? "grid-cols-1 min-[1900px]:grid-cols-2" : "sm:grid-cols-2"}`}>
                          <InfoRow label="Project Status">
                            <ProjectStatusPill
                              status={selectedProject?.status}
                            />
                          </InfoRow>

                          <InfoRow label="Client">
                            {selectedProject?.clientName || "—"}
                          </InfoRow>

                          <InfoRow label="Project Code">
                            {selectedProject?.projectCode || "—"}
                          </InfoRow>

                          <InfoRow label="Role">
                            {isOwner ? "Owner" : "Member"}
                          </InfoRow>

                          <InfoRow label="Modules">{modules.length}</InfoRow>

                          <InfoRow label="Assignments">
                            {totalModuleAssignments}
                          </InfoRow>

                          <InfoRow label="In Progress">
                            {inProgressAssignments}
                          </InfoRow>

                          <InfoRow label="Completed">
                            {completedAssignments}
                          </InfoRow>
                        </div>
                      </div>
                    </Card>

                    {/* PROGRESS */}

                    <Card title="Progress">
                      <div className="flex flex-wrap items-center justify-center gap-8 sm:justify-start">
                        <DonutChart
                          value={toPercent(
                            completedAssignments,
                            totalModuleAssignments
                          )}
                        />

                        <div className="w-full max-w-xs flex-1">
                          <Legend
                            items={legendFromCounts(projectAssignmentCounts)}
                          />
                        </div>
                      </div>
                    </Card>

                    {/* TEAM MEMBERS + ACCESS */}

<Card
  title="Team Members"
  action={
    ["vice president", "project manager","team lead"].includes(roleName) && (
      <CardAction
        icon={Settings2}
        onClick={() =>
          setShowAccessPanel((previous) => !previous)
        }
      >
        {showAccessPanel ? "Hide access" : "Manage access"}
      </CardAction>
    )
  }
>
                      {employeesLoading && teamMembers.length === 0 ? (
  <p className="text-sm text-slate-500">
    Loading employees...
  </p>
) : (
  <div className="space-y-5">
    {Object.entries(groupedTeamMembers).map(
      ([roleName, employees]) => (
        <div key={roleName}>
          {/* ROLE HEADING */}

          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800">
              {roleName}
            </h3>

            <span className="rounded-full bg-[#e8f3f0] px-2.5 py-1 text-xs font-semibold text-[#2d7f6b]">
              {employees.length}{" "}
              {employees.length === 1 ? "Employee" : "Employees"}
            </span>
          </div>

          {/* ROLE EMPLOYEES */}

          <div className="grid gap-3 sm:grid-cols-2">
            {employees.map((person) => (
              <div
                key={getId(person)}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
              >
                <Avatar text={getEmployeeName(person)} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {getEmployeeName(person)}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {[
                      getEmployeeCode(person),
                      getDepartmentName(person),
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                      person.email ||
                      ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    )}

    {teamMembers.length === 0 && !isOwner && (
      <p className="text-sm text-slate-500">
        No team members to show.
      </p>
    )}
  </div>
)}

                      {/* MANAGE ACCESS PANEL */}

                      {showAccessPanel && (
                        <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
                          {!isOwner && !projectAccessIds.has(employeeId) ? (
                            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                              Only the employee who created this project can
                              manage project access from this page.
                            </p>
                          ) : (
                            <>
                              <div className="rounded-xl border border-dashed border-[#2d7f6b]/40 bg-[#e8f3f0]/30 p-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <UserPlus
                                        size={17}
                                        className="text-[#2d7f6b]"
                                      />
                                      <h4 className="text-sm font-semibold text-slate-800">
                                        Grant Project Access
                                      </h4>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                      Select multiple employees under your
                                      hierarchy.
                                    </p>
                                  </div>

                                  <span className="rounded-full bg-[#e8f3f0] px-3 py-1 text-xs font-semibold text-[#2d7f6b]">
                                    {selectedGrantEmployeeIds.length} Selected
                                  </span>
                                </div>

                                <input
                                  type="text"
                                  value={grantSearch}
                                  onChange={(event) =>
                                    setGrantSearch(event.target.value)
                                  }
                                  placeholder="Search employee..."
                                  className={`${inputClass} mb-3`}
                                />

                                <div className="max-h-80 space-y-3 overflow-y-auto">
                                  {companyRoles.map((role) => {
                                    const roleId = getRoleId(role);

                                    const roleEmployees =
                                      grantableHierarchyEmployees.filter(
                                        (person) => {
                                          const employeeRoleId =
                                            getEmployeeRoleId(person);
                                          const alreadyHasAccess =
                                            projectAccessIds.has(getId(person));
                                          const query = grantSearch
                                            .trim()
                                            .toLowerCase();
                                          const matchesSearch =
                                            !query ||
                                            getEmployeeName(person)
                                              .toLowerCase()
                                              .includes(query) ||
                                            getEmployeeCode(person)
                                              .toLowerCase()
                                              .includes(query);

                                          return (
                                            String(employeeRoleId) ===
                                              String(roleId) &&
                                            !alreadyHasAccess &&
                                            matchesSearch
                                          );
                                        }
                                      );

                                    if (roleEmployees.length === 0) return null;

                                    const roleEmployeeIds =
                                      roleEmployees.map(getId);

                                    const allSelected = roleEmployeeIds.every(
                                      (id) =>
                                        selectedGrantEmployeeIds.includes(id)
                                    );

                                    return (
                                      <div
                                        key={roleId}
                                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                      >
                                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 p-3">
                                          <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                              {role.roleName || "Unnamed Role"}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                              {roleEmployees.length} available
                                              employees
                                            </p>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              toggleAllGrantEmployees(
                                                roleEmployeeIds
                                              )
                                            }
                                            className="text-xs font-semibold text-[#2d7f6b]"
                                          >
                                            {allSelected
                                              ? "Deselect All"
                                              : "Select All"}
                                          </button>
                                        </div>

                                        <div className="divide-y divide-slate-100">
                                          {roleEmployees.map((person) => {
                                            const personId = getId(person);

                                            return (
                                              <label
                                                key={personId}
                                                className="flex cursor-pointer items-center gap-3 p-3 hover:bg-slate-50"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={selectedGrantEmployeeIds.includes(
                                                    personId
                                                  )}
                                                  onChange={() =>
                                                    toggleGrantEmployee(
                                                      personId
                                                    )
                                                  }
                                                  className="h-4 w-4 accent-[#2d7f6b]"
                                                />

                                                <Avatar
                                                  text={getEmployeeName(person)}
                                                  size="h-8 w-8"
                                                />

                                                <div className="min-w-0 flex-1">
                                                  <p className="truncate text-sm font-medium text-slate-800">
                                                    {getEmployeeName(person)}
                                                  </p>
                                                  <p className="truncate text-xs text-slate-500">
                                                    {getEmployeeCode(person)}
                                                  </p>
                                                </div>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {grantableHierarchyEmployees.filter(
                                    (person) =>
                                      !projectAccessIds.has(getId(person))
                                  ).length === 0 && (
                                    <p className="py-5 text-center text-sm text-slate-500">
                                      All eligible employees already have
                                      project access.
                                    </p>
                                  )}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#2d7f6b]/15 pt-3">
                                  <p className="text-xs text-slate-600">
                                    {selectedGrantEmployeeIds.length}{" "}
                                    employee(s) selected
                                  </p>

                                  <button
                                    type="button"
                                    onClick={grantProjectAccess}
                                    disabled={
                                      selectedGrantEmployeeIds.length === 0 ||
                                      busy === "grant-access"
                                    }
                                    className={buttonPrimary}
                                  >
                                    {busy === "grant-access" ? (
                                      <RefreshCw
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <UserPlus size={14} />
                                    )}

                                    {busy === "grant-access"
                                      ? "Granting Access..."
                                      : "Grant Access"}
                                  </button>
                                </div>
                              </div>

                              <div>
                                <h4 className="mb-3 text-sm font-semibold text-slate-800">
                                  Employees with Project Access
                                </h4>

                                {employeesLoading ? (
                                  <p className="text-sm text-slate-500">
                                    Loading employees...
                                  </p>
                                ) : grantedEmployees.length > 0 ? (
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    {grantedEmployees.map((item) => {
                                      const person = item.employee || item;

                                      return (
                                        <div
                                          key={getId(person)}
                                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                                        >
                                          <Avatar
                                            text={getEmployeeName(person)}
                                            size="h-9 w-9"
                                          />

                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                              {getEmployeeName(person)}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                              {[
                                                getEmployeeCode(person),
                                                getRoleName(person),
                                                getDepartmentName(person),
                                              ]
                                                .filter(Boolean)
                                                .join(" · ")}
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
                                            title="Revoke access"
                                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                          >
                                            <UserMinus size={14} />
                                            Revoke
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                                    No employees have been granted access by
                                    you.
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* ========== RIGHT COLUMN: PROJECT MODULES (VP ONLY) ========== */}

                  {isVicePresident && (
                    <div className="min-w-0 space-y-5">
                      <Card
                        title="Project Modules"
                        action={
                          <div className="flex items-center gap-3">
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                              {modules.length} modules
                            </span>

                            {isOwner && (
                              <button
                                type="button"
                                onClick={openAddModule}
                                className={`${buttonPrimary} !px-3.5 !py-2 !text-xs`}
                              >
                                <Plus size={15} />
                                Add Module
                              </button>
                            )}
                          </div>
                        }
                      >
                        <p className="-mt-1 mb-4 text-xs text-slate-500">
                          Each employee has an independent assignment and
                          status.
                        </p>

                        <div className="space-y-3">
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
                                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                                  <button
                                    type="button"
                                    onClick={() => toggleModule(moduleId)}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                  >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f3f0] text-sm font-semibold text-[#2d7f6b]">
                                      {index + 1}
                                    </span>

                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-semibold text-slate-900">
                                        {module.moduleName}
                                      </span>
                                      <span className="mt-0.5 block text-xs text-slate-500">
                                        {assignments.length} employee
                                        assignment
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

                                  {isOwner && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => openEditModule(module)}
                                        title="Edit module"
                                        className={iconButton}
                                      >
                                        <Pencil size={15} />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => deleteModule(module)}
                                        disabled={busy === `module-${moduleId}`}
                                        title="Delete module"
                                        className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {expanded && (
                                  <div className="space-y-4 border-t border-slate-100 p-4">
                                    {/* MY OWN ASSIGNMENT */}

                                    {myAssignment && (
                                      <div className="rounded-xl border border-[#2d7f6b]/25 bg-[#e8f3f0]/50 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-[#2d7f6b]">
                                              Your Assignment
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                              {module.moduleName}
                                            </p>
                                          </div>

                                          <StatusPill
                                            status={myAssignment.status}
                                          />
                                        </div>

                                        {myAssignment.description && (
                                          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                                            {myAssignment.description}
                                          </p>
                                        )}

                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                          <label className="text-xs font-medium text-slate-600">
                                            Update your status
                                          </label>

                                          <select
                                            value={
                                              myAssignment.status || "Assigned"
                                            }
                                            disabled={
                                              busy === `status-${moduleId}`
                                            }
                                            onChange={(event) =>
                                              updateAssignmentStatus(
                                                moduleId,
                                                event.target.value
                                              )
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#2d7f6b] disabled:opacity-50"
                                          >
                                            {MY_STATUSES.map((status) => (
                                              <option
                                                key={status}
                                                value={status}
                                              >
                                                {status}
                                              </option>
                                            ))}
                                          </select>

                                          {busy === `status-${moduleId}` && (
                                            <RefreshCw
                                              size={14}
                                              className="animate-spin text-[#2d7f6b]"
                                            />
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* ALL EMPLOYEE ASSIGNMENTS */}

                                    <div>
                                      <div className="mb-3 flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-slate-800">
                                          Employee Assignments
                                        </h4>
                                        <span className="text-xs text-slate-400">
                                          {assignments.length} assigned
                                        </span>
                                      </div>

                                      {assignments.length > 0 ? (
                                        <div className="grid gap-3">
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
                                                  assignment._id || assignedId
                                                }
                                                className={`rounded-xl border p-3 ${
                                                  isMe
                                                    ? "border-[#2d7f6b]/30 bg-[#e8f3f0]/40"
                                                    : "border-slate-200 bg-white"
                                                }`}
                                              >
                                                <div className="flex items-start gap-3">
                                                  <Avatar
                                                    text={getEmployeeName(
                                                      assignedEmployee
                                                    )}
                                                    size="h-9 w-9"
                                                  />

                                                  <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <p className="truncate text-sm font-semibold text-slate-900">
                                                        {getEmployeeName(
                                                          assignedEmployee
                                                        )}
                                                      </p>

                                                      {isMe && (
                                                        <span className="rounded-full bg-[#2d7f6b] px-2 py-0.5 text-[10px] font-bold text-white">
                                                          YOU
                                                        </span>
                                                      )}
                                                    </div>

                                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                                      {[
                                                        getEmployeeCode(
                                                          assignedEmployee
                                                        ),
                                                        getRoleName(
                                                          assignedEmployee
                                                        ),
                                                        getDepartmentName(
                                                          assignedEmployee
                                                        ),
                                                      ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                    </p>
                                                  </div>

                                                  {isOwner && (
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
                                                      className={`${iconButton} !p-1.5 hover:bg-red-50 hover:text-red-600`}
                                                    >
                                                      <UserMinus size={15} />
                                                    </button>
                                                  )}
                                                </div>

                                                {assignment.description && (
                                                  <p className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-600">
                                                    {assignment.description}
                                                  </p>
                                                )}

                                                <div className="mt-3 flex items-center justify-between gap-2">
                                                  <span className="text-[11px] text-slate-400">
                                                    Assigned:{" "}
                                                    {formatDate(
                                                      assignment.createdAt
                                                    )}
                                                  </span>

                                                  <StatusPill
                                                    status={assignment.status}
                                                  />
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

                                    {isOwner && (
                                      <div className="rounded-xl border border-dashed border-[#2d7f6b]/40 bg-[#e8f3f0]/30 p-4">
                                        <div className="mb-3 flex items-center gap-2">
                                          <UserPlus
                                            size={17}
                                            className="text-[#2d7f6b]"
                                          />
                                          <h4 className="text-sm font-semibold text-slate-800">
                                            Assign Employee
                                          </h4>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
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
                                            className={`${inputClass} min-w-0`}
                                          >
                                            <option value="">
                                              {employeesLoading
                                                ? "Loading employees..."
                                                : "Select employee"}
                                            </option>

                                            {assignableEmployees
                                              .filter(
                                                (person) =>
                                                  !assignments.some(
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
                                            className={`${inputClass} min-w-0`}
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
                                            className={buttonPrimary}
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
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ==============================================
            MY ASSIGNMENTS TAB
        ============================================== */}

        {activeTab === "assignments" && (
          <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card
              title="My Assigned Modules"
              action={
                <CardAction icon={RefreshCw} onClick={loadMyAssignments}>
                  Refresh
                </CardAction>
              }
            >
              <p className="-mt-1 mb-4 text-xs text-slate-500">
                All module assignments assigned to your employee account.
              </p>

              {assignmentsLoading ? (
                <div className="p-12 text-center text-sm text-slate-500">
                  <RefreshCw
                    size={18}
                    className="mx-auto mb-2 animate-spin"
                  />
                  Loading assignments...
                </div>
              ) : myAssignments.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {myAssignments.map((assignment) => (
                    <div
                      key={assignment.assignmentId || assignment._id}
                      className="flex flex-col rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          text={assignment.projectName || "Project"}
                          rounded="rounded-lg"
                        />

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-slate-900">
                            {assignment.moduleName}
                          </h3>
                          <p className="truncate text-xs text-slate-500">
                            {assignment.projectName || "Project"} ·{" "}
                            {assignment.projectCode || "—"}
                          </p>
                        </div>

                        <StatusPill status={assignment.status} />
                      </div>

                      {assignment.description && (
                        <p className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-sm text-slate-600">
                          {assignment.description}
                        </p>
                      )}

                      <p className="mt-3 text-xs text-slate-400">
                        Assigned: {formatDate(assignment.assignedAt)}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
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
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#2d7f6b] disabled:opacity-50"
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
                          className="rounded-lg bg-[#e8f3f0] px-3 py-1.5 text-xs font-semibold text-[#2d7f6b] hover:bg-[#d6ebe5]"
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
            </Card>

            <div className="space-y-5">
              <Card title="About My Work">
                <InfoRow label="My Assignments">{myAssignments.length}</InfoRow>
                <InfoRow label="Assigned">{myAssignmentCounts.Assigned}</InfoRow>

                <InfoRow label="In Progress">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={14} className="text-violet-600" />
                    {myAssignmentCounts["In Progress"]}
                  </span>
                </InfoRow>

                <InfoRow label="Completed">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[#2d7f6b]" />
                    {myAssignmentCounts.Completed}
                  </span>
                </InfoRow>
              </Card>

              <Card title="Progress">
                <div className="flex flex-col items-center gap-5">
                  <DonutChart
                    value={toPercent(
                      myAssignmentCounts.Completed,
                      myAssignments.length
                    )}
                  />

                  <div className="flex w-full items-center gap-4">
                    <PieChart
                      size={90}
                      data={legendFromCounts(myAssignmentCounts)}
                    />
                    <div className="min-w-0 flex-1">
                      <Legend items={legendFromCounts(myAssignmentCounts)} />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

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
                className={inputClass}
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
                className={inputClass}
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
                className={`${inputClass} resize-y`}
              />
            </FormField>

            {/* INITIAL PROJECT MODULES */}

            {!editingProject && (
              <FormField label="Project Modules">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Add Project Modules
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Add multiple modules while creating this project.
                      </p>
                    </div>

                    <span className="rounded-full bg-[#e8f3f0] px-3 py-1 text-xs font-semibold text-[#2d7f6b]">
                      {newProjectModules.filter((name) => name.trim()).length}{" "}
                      Modules
                    </span>
                  </div>

                  <div className="space-y-3">
                    {newProjectModules.map((name, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                          {index + 1}
                        </span>

                        <input
                          type="text"
                          value={name}
                          onChange={(event) =>
                            updateProjectModuleField(index, event.target.value)
                          }
                          placeholder={`Enter module ${index + 1} name`}
                          className={inputClass}
                        />

                        <button
                          type="button"
                          onClick={() => removeProjectModuleField(index)}
                          title="Remove module"
                          className={`${iconButton} shrink-0 hover:bg-red-50 hover:text-red-600`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addProjectModuleField}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-[#2d7f6b]/50 px-3 py-2 text-sm font-semibold text-[#2d7f6b] transition hover:bg-[#e8f3f0]"
                  >
                    <Plus size={16} />
                    Add Another Module
                  </button>
                </div>
              </FormField>
            )}

            {/* PROJECT EMPLOYEE ACCESS */}

            <FormField label="Project Employee Access">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Select Employees
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedAccessEmployeeIds.length} employee(s) selected
                    </p>
                  </div>

                  <input
                    type="text"
                    value={accessSearch}
                    onChange={(event) => setAccessSearch(event.target.value)}
                    placeholder="Search employee..."
                    className={`${inputClass} max-w-xs`}
                  />
                </div>

                <div className="max-h-80 space-y-4 overflow-y-auto">
                  {companyRoles.map((role) => {
                    const query = accessSearch.trim().toLowerCase();

                    const roleEmployees = getRoleEmployees(role).filter(
                      (person) => {
                        if (!query) return true;

                        return (
                          getEmployeeName(person)
                            .toLowerCase()
                            .includes(query) ||
                          getEmployeeCode(person).toLowerCase().includes(query)
                        );
                      }
                    );

                    if (roleEmployees.length === 0) return null;

                    const roleEmployeeIds = roleEmployees.map(getId);

                    const allSelected = roleEmployeeIds.every((id) =>
                      selectedAccessEmployeeIds.includes(id)
                    );

                    return (
                      <div
                        key={getRoleId(role)}
                        className="rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 p-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {role.roleName || "Unnamed Role"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {roleEmployees.length} employees
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              toggleRoleEmployees(role, roleEmployees)
                            }
                            className="text-xs font-semibold text-[#2d7f6b]"
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </button>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {roleEmployees.map((person) => {
                            const personId = getId(person);

                            return (
                              <label
                                key={personId}
                                className="flex cursor-pointer items-center gap-3 p-3 hover:bg-slate-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedAccessEmployeeIds.includes(
                                    personId
                                  )}
                                  onChange={() =>
                                    toggleProjectEmployeeAccess(personId)
                                  }
                                  className="h-4 w-4 accent-[#2d7f6b]"
                                />

                                <Avatar
                                  text={getEmployeeName(person)}
                                  size="h-8 w-8"
                                />

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-800">
                                    {getEmployeeName(person)}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">
                                    {getEmployeeCode(person)}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {companyRoles.length === 0 && (
                    <p className="py-5 text-center text-sm text-slate-500">
                      No company roles available.
                    </p>
                  )}

                  {companyRoles.length > 0 && companyEmployees.length === 0 && (
                    <p className="py-5 text-center text-sm text-slate-500">
                      No employees available.
                    </p>
                  )}
                </div>
              </div>
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
                className={`${inputClass} resize-y`}
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
                className={`${inputClass} resize-y`}
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
                  className={inputClass}
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
                className={buttonSecondary}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy === "project-save"}
                className={buttonPrimary}
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
                className={inputClass}
              />
            </FormField>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowModuleForm(false);
                  setEditingModuleId("");
                }}
                className={buttonSecondary}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy === "module-save"}
                className={buttonPrimary}
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

      {/* ==============================================
          DELETED PROJECTS MODAL
      ============================================== */}

      {showDeletedModal && (
        <Modal
          title="Deleted Projects"
          onClose={() => setShowDeletedModal(false)}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-500">
                View deleted project details, restore projects or permanently
                delete them.
              </p>

              <button
                type="button"
                onClick={loadDeletedProjects}
                disabled={deletedLoading}
                className={buttonSecondary}
              >
                <RefreshCw
                  size={14}
                  className={deletedLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {deletedLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                <RefreshCw size={20} className="mx-auto mb-2 animate-spin" />
                Loading deleted projects...
              </div>
            ) : deletedProjects.length > 0 ? (
              <div className="space-y-4">
                {deletedProjects.map((project) => {
                  const projectId = getId(project);
                  const projectModules = project.modules || [];
                  const projectEmployees = project.employeeAccess || [];

                  return (
                    <div
                      key={projectId}
                      className="overflow-hidden rounded-xl border border-slate-200"
                    >
                      {/* PROJECT HEADER */}

                      <div className="flex flex-wrap items-start justify-between gap-3 bg-slate-50 p-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <Avatar
                            text={project.projectName || "Project"}
                            rounded="rounded-lg"
                          />

                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900">
                              {project.projectName || "Unnamed Project"}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {project.projectCode || "No project code"}
                            </p>
                            <p className="mt-1 text-xs text-red-600">
                              Deleted: {formatDate(project.deletedAt)}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          Deleted
                        </span>
                      </div>

                      <div className="space-y-4 p-4">
                        {/* BASIC PROJECT DETAILS */}

                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-slate-800">
                            Project Details
                          </h4>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <InfoRow label="Project Name">
                              {project.projectName || "—"}
                            </InfoRow>
                            <InfoRow label="Project Code">
                              {project.projectCode || "—"}
                            </InfoRow>
                            <InfoRow label="Client Name">
                              {project.clientName || "—"}
                            </InfoRow>
                            <InfoRow label="Company">
                              {project.companyId?.companyName || "—"}
                            </InfoRow>
                            <InfoRow label="Original Status">
                              {project.status || "—"}
                            </InfoRow>
                            <InfoRow label="Original Created">
                              {formatDate(project.originalCreatedAt)}
                            </InfoRow>
                            <InfoRow label="Original Updated">
                              {formatDate(project.originalUpdatedAt)}
                            </InfoRow>
                            <InfoRow label="Deleted At">
                              {formatDate(project.deletedAt)}
                            </InfoRow>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                          <h4 className="mb-2 text-sm font-semibold text-slate-800">
                            Project Description
                          </h4>
                          <p className="whitespace-pre-wrap text-sm text-slate-600">
                            {project.projectDescription ||
                              "No description available."}
                          </p>
                        </div>

                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-slate-800">
                            Project Details
                          </h4>
                          <p className="whitespace-pre-wrap text-sm text-slate-600">
                            {project.projectDetails ||
                              "No additional details."}
                          </p>
                        </div>

                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-slate-800">
                            Remarks
                          </h4>
                          <p className="whitespace-pre-wrap text-sm text-slate-600">
                            {project.remarks || "No remarks."}
                          </p>
                        </div>

                        {/* CREATOR AND DELETION DETAILS */}

                        <div className="border-t border-slate-100 pt-4">
                          <h4 className="mb-3 text-sm font-semibold text-slate-800">
                            Created & Deleted By
                          </h4>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <InfoRow label="Created By">
                              {project.createdByEmployee
                                ? getEmployeeName(project.createdByEmployee)
                                : project.createdBy?.name || "—"}
                            </InfoRow>

                            <InfoRow label="Deleted By">
                              {project.deletedByEmployee
                                ? getEmployeeName(project.deletedByEmployee)
                                : project.deletedBy?.name || "—"}
                            </InfoRow>
                          </div>
                        </div>

                        {/* EMPLOYEE ACCESS */}

                        <div className="border-t border-slate-100 pt-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-800">
                              Project Employee Access
                            </h4>
                            <span className="text-xs text-slate-500">
                              {projectEmployees.length} employees
                            </span>
                          </div>

                          {projectEmployees.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {projectEmployees.map((person, index) => (
                                <div
                                  key={getId(person) || index}
                                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5"
                                >
                                  <Avatar
                                    text={getEmployeeName(person)}
                                    size="h-8 w-8"
                                  />

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                      {getEmployeeName(person)}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                      {[
                                        getEmployeeCode(person),
                                        getRoleName(person),
                                        getDepartmentName(person),
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              No employee access records.
                            </p>
                          )}
                        </div>

                        {/* MODULE DETAILS */}

                        <div className="border-t border-slate-100 pt-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-800">
                              Project Modules
                            </h4>
                            <span className="text-xs text-slate-500">
                              {projectModules.length} modules
                            </span>
                          </div>

                          {projectModules.length > 0 ? (
                            <div className="space-y-3">
                              {projectModules.map((module, index) => {
                                const moduleEmployees = module.employees || [];

                                return (
                                  <div
                                    key={module._id || index}
                                    className="rounded-lg border border-slate-200 p-3"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-semibold text-slate-800">
                                        {index + 1}.{" "}
                                        {module.moduleName || "Unnamed Module"}
                                      </p>
                                      <StatusPill status={module.status} />
                                    </div>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {moduleEmployees.length} employee
                                      assignments
                                    </p>

                                    {moduleEmployees.length > 0 && (
                                      <div className="mt-3 space-y-2">
                                        {moduleEmployees.map(
                                          (assignment, assignmentIndex) => {
                                            const person =
                                              assignment.employeeId;

                                            return (
                                              <div
                                                key={
                                                  assignment._id ||
                                                  assignmentIndex
                                                }
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2.5"
                                              >
                                                <div className="min-w-0">
                                                  <p className="text-sm font-medium text-slate-700">
                                                    {getEmployeeName(person)}
                                                  </p>
                                                  <p className="text-xs text-slate-500">
                                                    {getEmployeeCode(person) ||
                                                      "—"}
                                                  </p>

                                                  {assignment.description && (
                                                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                                                      {assignment.description}
                                                    </p>
                                                  )}
                                                </div>

                                                <div className="flex flex-col items-end gap-1">
                                                  <StatusPill
                                                    status={assignment.status}
                                                  />
                                                  <span className="text-[11px] text-slate-400">
                                                    {formatDate(
                                                      assignment.assignedAt ||
                                                        assignment.createdAt
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              No modules found.
                            </p>
                          )}
                        </div>

                        {/* ACTIONS */}

                        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            onClick={() => restoreProject(project)}
                            disabled={busy === `restore-${projectId}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8f3f0] px-3 py-2 text-xs font-semibold text-[#2d7f6b] hover:bg-[#d6ebe5] disabled:opacity-50"
                          >
                            <RotateCcw size={14} />
                            {busy === `restore-${projectId}`
                              ? "Restoring..."
                              : "Restore Project"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openProjectAccess(project)}
                            title="Manage Project Access"
                            className="rounded-lg p-2 text-indigo-600 transition hover:bg-indigo-50"
                          >
                            <Users size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => permanentlyDeleteProject(project)}
                            disabled={busy === `permanent-${projectId}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            {busy === `permanent-${projectId}`
                              ? "Deleting..."
                              : "Delete Permanently"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <Archive size={36} className="mx-auto text-slate-300" />
                <h3 className="mt-3 font-semibold text-slate-800">
                  No deleted projects
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Projects archived by you will appear here.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EmployeeProjects;