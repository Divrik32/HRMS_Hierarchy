import { useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Search, RefreshCw, Pencil, Trash2, FolderKanban,
  Building2, Users, Layers, X, ChevronDown,
  UserPlus, UserMinus, RotateCcw, BriefcaseBusiness,
  Filter, Save, Loader2, Archive, Settings2, FileText,
} from "lucide-react";
import api from "../../api/axios.js";
import { toast } from "react-toastify";

// ==================================================
// CONSTANTS
// ==================================================

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

// ==================================================
// DESIGN TOKENS (soft white cards, calm green accent)
// ==================================================

const BRAND = "#2d7f6b";

const MODULE_COLORS = {
  "Not Assigned": "#cbd5e1",
  Assigned: "#3b82f6",
  "In Progress": "#a855f7",
  Completed: BRAND,
};

const MODULE_PILL = {
  "Not Assigned": "border-slate-200 bg-slate-100 text-slate-600",
  Assigned: "border-sky-200 bg-sky-50 text-sky-700",
  "In Progress": "border-violet-200 bg-violet-50 text-violet-700",
  Completed: "border-[#2d7f6b]/30 bg-[#e8f3f0] text-[#2d7f6b]",
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
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2d7f6b] focus:ring-4 focus:ring-[#2d7f6b]/15 disabled:bg-slate-100";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#2d7f6b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#256a59] disabled:cursor-not-allowed disabled:opacity-50";

const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const iconButton =
  "rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900";

// ==================================================
// DATA HELPERS
// ==================================================

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

const getEmployeeRoleName = (employee) =>
  employee?.roleId?.roleName || employee?.roleName || "Member";

const getEmployeesFromProject = (project) =>
  (project?.employeeAccess || []).filter(
    (employee) => employee && typeof employee === "object"
  );

const getAssignmentEmployee = (assignment) => {
  if (assignment?.employeeId && typeof assignment.employeeId === "object") {
    return assignment.employeeId;
  }
  return null;
};

const toPercent = (part, total) =>
  total ? Math.round((part / total) * 100) : 0;

const getInitials = (text = "") =>
  text
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "?";

const toneFor = (text = "") =>
  AVATAR_TONES[
    [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      AVATAR_TONES.length
  ];

const getModuleStatusCounts = (projectList) => {
  const counts = {};
  STATUSES.forEach((status) => (counts[status] = 0));

  projectList.forEach((project) =>
    (project.modules || []).forEach((module) => {
      const status = STATUSES.includes(module.status)
        ? module.status
        : "Not Assigned";
      counts[status] += 1;
    })
  );

  return counts;
};

// ==================================================
// SMALL UI PIECES (defined outside so inputs keep focus)
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
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

const CardAction = ({ icon: Icon, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
  >
    {Icon && <Icon size={15} />}
    {children}
  </button>
);

const InfoRow = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm last:border-0">
    <span className="text-slate-500">{label}</span>
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

const ModulePill = ({ status }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
      MODULE_PILL[status] || MODULE_PILL["Not Assigned"]
    }`}
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

const ModalShell = ({
  title,
  subtitle,
  onClose,
  size = "max-w-4xl",
  z = "z-50",
  actions,
  children,
}) => (
  <div
    className={`fixed inset-0 ${z} flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 sm:p-6`}
  >
    <div
      className={`my-auto max-h-[94vh] w-full ${size} overflow-y-auto rounded-2xl bg-white shadow-2xl`}
    >
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <button type="button" onClick={onClose} className={iconButton}>
            <X size={20} />
          </button>
        </div>
      </div>

      {children}
    </div>
  </div>
);

// ==================================================
// PAGE
// ==================================================

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

  const fetchCompanyData = useCallback(async (targetCompanyId) => {
    if (!targetCompanyId) {
      setRoles([]);
      setEmployees([]);
      return;
    }

    setEmployeeLoading(true);

    try {
      const [roleResponse, employeeResponse] = await Promise.all([
        api.get(`/roles/company/${targetCompanyId}`),
        api.get(`/employees/company/${targetCompanyId}`),
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

    const moduleCounts = getModuleStatusCounts(projects);
    const totalModules = projects.reduce(
      (sum, p) => sum + (p.modules?.length || 0),
      0
    );

    return {
      total: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      inactive: projects.filter((p) => p.status === "inactive").length,
      modules: totalModules,
      employees: employeeIds.size,
      moduleCounts,
      completedPercent: toPercent(moduleCounts.Completed, totalModules),
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
        .some((value) => String(value).toLowerCase().includes(query));
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
      prev && getId(prev) === projectId ? { ...prev, modules } : prev
    );

    await fetchProjects();
  };

  const loadProjectDetails = async (project) => {
    setSelectedProject(project);
    setModal("details");
    setEditingModuleId("");

    try {
      const response = await api.get(`/projects/${getId(project)}/modules`);

      const modules = getArray(response, "modules");

      setSelectedProject((prev) =>
        prev && getId(prev) === getId(project) ? { ...prev, modules } : prev
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
      employeeAccess: (project.employeeAccess || []).map(getId).filter(Boolean),
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
      .filter((role) => (role.roleName || "").toLowerCase().includes(roleQuery))
      .map((role) => ({
        ...role,
        employees: employees.filter((employee) => {
          if (getEmployeeRoleId(employee) !== getId(role)) return false;
          if (!query) return true;

          return [getName(employee), getEmpCode(employee), employee.email]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
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
          ...new Set((selectedProject.employeeAccess || []).map(getId)),
        ].filter(Boolean);

        const selectedIds = [...new Set(form.employeeAccess)].filter(Boolean);

        const toGrant = selectedIds.filter((id) => !originalIds.includes(id));
        const toRevoke = originalIds.filter((id) => !selectedIds.includes(id));

        if (toGrant.length) {
          await api.post(`/projects/${projectId}/access/super-admin`, {
            employeeIds: toGrant,
          });
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
    if (!window.confirm(`Move "${project.projectName}" to Deleted Projects?`))
      return;

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

      await Promise.all([fetchProjects(), fetchDeletedProjects()]);
    } catch (error) {
      toast.error(getError(error));
    }
  };

  const permanentlyDelete = async (project) => {
    if (
      !window.confirm(
        `Permanently delete "${project.projectName}"? This cannot be undone.`
      )
    )
      return;

    try {
      await api.delete(`/projects/deleted/${getId(project)}/permanent`);

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
        api.get(`/projects/${getId(project)}/role-access/super-admin`),
        api.get(`/employees/company/${getId(project.companyId)}`),
      ]);

      const data = projectResponse.data;

      const accessList =
        data.employees ||
        data.access ||
        data.roles ||
        data.data?.employees ||
        [];

      setAccessEmployees(Array.isArray(accessList) ? accessList : []);

      if (!accessList.length) {
        setAccessEmployees(getArray(employeeResponse, "employees"));
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
      await api.post(`/projects/${getId(selectedProject)}/access/super-admin`, {
        employeeIds: [employeeId],
      });

      toast.success("Project access granted.");
      await fetchProjects();

      await openAccessManager({
        ...selectedProject,
        employeeAccess: [...(selectedProject.employeeAccess || []), employeeId],
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
    )
      return;

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
      await api.put(`/projects/${getId(project)}/modules/${getId(module)}`, {
        moduleName: editingModuleName.trim(),
        status: editingModuleStatus,
      });

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
      await api.delete(`/projects/${getId(project)}/modules/${getId(module)}`);

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
  // DERIVED DATA FOR THE SELECTED PROJECT
  // --------------------------------------------------

  const selectedModuleCounts = useMemo(
    () => getModuleStatusCounts(selectedProject ? [selectedProject] : []),
    [selectedProject]
  );

  const selectedModuleTotal = selectedProject?.modules?.length || 0;

  const stop = (handler) => (event) => {
    event.stopPropagation();
    handler();
  };

  const moduleLegend = (counts) =>
    STATUSES.map((status) => ({
      label: status,
      value: counts[status] || 0,
      color: MODULE_COLORS[status],
    }));

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-white p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        {/* ================= HEADER ================= */}

        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Projects List
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage company projects, team access, modules and assignments.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                fetchProjects();
                fetchCompanies();
                if (modal === "deleted") fetchDeletedProjects();
              }}
              className={buttonSecondary}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={async () => {
                setModal("deleted");
                await fetchDeletedProjects();
              }}
              className={buttonSecondary}
            >
              <Archive size={16} />
              Deleted
            </button>

            <button type="button" onClick={openCreate} className={buttonPrimary}>
              <Plus size={17} />
              Create Project
            </button>
          </div>
        </div>

        {/* ================= BODY ================= */}

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* ---------- LEFT COLUMN ---------- */}

          <div className="min-w-0 space-y-5">
            {/* PROJECT CARDS */}

            <Card
              title="Company Projects"
              action={
                <span className="text-xs text-slate-500">
                  {filteredProjects.length} project(s)
                </span>
              }
            >
              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_200px]">
                <div className="relative">
                  <Search
                    size={17}
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

              {loading ? (
                <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
                  <Loader2 size={20} className="animate-spin" />
                  Loading projects...
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="py-16 text-center">
                  <FolderKanban
                    size={40}
                    className="mx-auto mb-3 text-slate-300"
                  />
                  <h3 className="font-semibold text-slate-900">
                    No projects found
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Change filters or create a new project.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredProjects.map((project) => {
                    const modules = project.modules || [];
                    const done = modules.filter(
                      (m) => m.status === "Completed"
                    ).length;
                    const pct = toPercent(done, modules.length);

                    return (
                      <div
                        key={getId(project)}
                        role="button"
                        tabIndex={0}
                        onClick={() => loadProjectDetails(project)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") loadProjectDetails(project);
                        }}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#2d7f6b]/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d7f6b]"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar
                            text={project.projectName}
                            rounded="rounded-lg"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900">
                              {project.projectName}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {project.projectCode || "No project code"} ·{" "}
                              {project.clientName || "No client"}
                            </p>
                          </div>

                          <ProjectStatusPill status={project.status} />
                        </div>

                        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                          <Building2 size={13} />
                          <span className="truncate">
                            {getCompanyName(project, companies)}
                          </span>
                        </div>

                        <div className="mt-3">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                              Modules completed
                            </span>
                            <span className="font-semibold text-slate-800">
                              {done}/{modules.length} · {pct}%
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#2d7f6b]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={stop(() => openAccessManager(project))}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <Users size={13} />
                              {project.employeeAccess?.length || 0}
                              <Settings2 size={11} className="text-slate-400" />
                            </button>

                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                              <Layers size={13} />
                              {modules.length}
                            </span>
                          </div>

                          <div className="flex items-center">
                            <button
                              type="button"
                              title="Edit project"
                              onClick={stop(() => openEdit(project))}
                              className={iconButton}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              title="Archive project"
                              onClick={stop(() => archiveProject(project))}
                              className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* PROGRESS */}

            <Card title="Progress">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col items-center gap-5 rounded-xl border border-slate-200 p-5 sm:flex-row">
                  <div className="w-full sm:w-auto">
                    <p className="mb-3 text-sm text-slate-600 sm:hidden">
                      Completed modules
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-3">
                      <p className="hidden text-sm text-slate-600 sm:block">
                        Completed modules
                      </p>
                      <DonutChart value={stats.completedPercent} />
                    </div>

                    <Legend
                      items={[
                        {
                          label: "Completed",
                          value: stats.moduleCounts.Completed,
                          color: BRAND,
                        },
                        {
                          label: "Incomplete",
                          value: stats.modules - stats.moduleCounts.Completed,
                          color: "#e5e7eb",
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-5 sm:flex-row sm:items-center">
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Module status</p>
                    <PieChart
                      data={moduleLegend(stats.moduleCounts)}
                    />
                  </div>

                  <Legend items={moduleLegend(stats.moduleCounts)} />
                </div>
              </div>
            </Card>
          </div>

          {/* ---------- RIGHT COLUMN ---------- */}

          <div className="space-y-5">
            <Card title="About Projects">
              <InfoRow label="Total Projects">{stats.total}</InfoRow>
              <InfoRow label="Active">
                <ProjectStatusPill status="active" />
              </InfoRow>
              <InfoRow label="Active Count">{stats.active}</InfoRow>
              <InfoRow label="Inactive Count">{stats.inactive}</InfoRow>
              <InfoRow label="Total Modules">{stats.modules}</InfoRow>
              <InfoRow label="Employees With Access">
                {stats.employees}
              </InfoRow>
            </Card>

            <Card title="Project Status">
              <div className="flex items-center gap-5">
                <PieChart
                  size={120}
                  data={[
                    { label: "Active", value: stats.active, color: BRAND },
                    {
                      label: "Inactive",
                      value: stats.inactive,
                      color: "#cbd5e1",
                    },
                  ]}
                />

                <div className="min-w-0 flex-1">
                  <Legend
                    items={[
                      { label: "Active", value: stats.active, color: BRAND },
                      {
                        label: "Inactive",
                        value: stats.inactive,
                        color: "#cbd5e1",
                      },
                    ]}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ==================================================
          CREATE / EDIT PROJECT MODAL
      ================================================== */}

      {(modal === "create" || modal === "edit") && (
        <ModalShell
          title={modal === "create" ? "Create New Project" : "Edit Project"}
          subtitle="Configure project information and individual employee access."
          onClose={closeModal}
        >
          <form onSubmit={saveProject} className="space-y-5 p-5">
            <Card
              title="Project Information"
              action={<BriefcaseBusiness size={17} className="text-[#2d7f6b]" />}
            >
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
                    onChange={(e) => updateForm("projectName", e.target.value)}
                    className={inputClass}
                    placeholder="Project name"
                  />
                </div>

                <div>
                  <label className={labelClass}>Project Code</label>
                  <input
                    disabled={modal === "edit"}
                    value={form.projectCode}
                    onChange={(e) => updateForm("projectCode", e.target.value)}
                    className={inputClass}
                    placeholder="Auto generated or enter code"
                  />
                </div>

                <div>
                  <label className={labelClass}>Client Name *</label>
                  <input
                    required
                    value={form.clientName}
                    onChange={(e) => updateForm("clientName", e.target.value)}
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
                    onChange={(e) => updateForm("remarks", e.target.value)}
                    className={inputClass}
                  />
                </div>

                {modal === "edit" && (
                  <div>
                    <label className={labelClass}>Status</label>

                    <select
                      value={form.status}
                      onChange={(e) => updateForm("status", e.target.value)}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>
            </Card>

            <Card
              title="Team Members"
              action={
                <span className="rounded-full border border-[#2d7f6b]/30 bg-[#e8f3f0] px-3 py-1 text-xs font-medium text-[#2d7f6b]">
                  {form.employeeAccess.length} selected
                </span>
              }
            >
              <p className="mb-3 text-xs text-slate-500">
                Select employees individually. Access is company-specific.
              </p>

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
                      <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-semibold text-slate-800">
                        <span className="flex items-center gap-2">
                          <ChevronDown size={16} className="text-slate-500" />
                          {role.roleName}
                        </span>

                        <span className="text-xs font-normal text-slate-500">
                          {
                            role.employees.filter((e) =>
                              form.employeeAccess.includes(getId(e))
                            ).length
                          }{" "}
                          selected
                        </span>
                      </summary>

                      <div className="grid gap-2 border-t border-slate-200 p-3 sm:grid-cols-2">
                        {role.employees.map((employee) => {
                          const employeeId = getId(employee);
                          const checked =
                            form.employeeAccess.includes(employeeId);

                          return (
                            <label
                              key={employeeId}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                                checked
                                  ? "border-[#2d7f6b]/50 bg-[#e8f3f0]/60"
                                  : "border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFormEmployee(employeeId)}
                                className="accent-[#2d7f6b]"
                              />

                              <Avatar text={getName(employee)} size="h-9 w-9" />

                              <span className="min-w-0 text-sm">
                                <span className="block truncate font-medium text-slate-900">
                                  {getName(employee)}
                                </span>

                                <span className="block truncate text-xs text-slate-500">
                                  {[getEmpCode(employee), employee.email]
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
            </Card>

            {modal === "create" && (
              <Card title="Initial Project Modules">
                <p className="mb-3 text-xs text-slate-500">
                  Add one module name per line.
                </p>

                <textarea
                  rows={4}
                  value={form.modules
                    .map((m) => (typeof m === "string" ? m : m.moduleName || ""))
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
              </Card>
            )}

            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className={buttonSecondary}
              >
                Cancel
              </button>

              <button type="submit" disabled={saving} className={buttonPrimary}>
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}

                {modal === "create" ? "Create Project" : "Save Changes"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ==================================================
          PROJECT DETAILS (About / Team / Modules / Progress)
      ================================================== */}

      {modal === "details" && selectedProject && (
        <ModalShell
          title={selectedProject.projectName}
          subtitle={`${selectedProject.projectCode || "No code"} · ${getCompanyName(
            selectedProject,
            companies
          )}`}
          onClose={closeModal}
          size="max-w-6xl"
          actions={
            <>
              <button
                type="button"
                onClick={() => openEdit(selectedProject)}
                className={buttonSecondary}
              >
                <Pencil size={15} />
                Edit
              </button>
            </>
          }
        >
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_310px]">
            {/* ---------- LEFT ---------- */}

            <div className="min-w-0 space-y-5">
              <Card title="About Project">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedProject.projectDescription?.trim() ||
                    "No description provided."}
                </p>

                {selectedProject.projectDetails?.trim() && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Details
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {selectedProject.projectDetails}
                    </p>
                  </div>
                )}

                {selectedProject.remarks?.trim() && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Remarks
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {selectedProject.remarks}
                    </p>
                  </div>
                )}
              </Card>

              {/* TEAM MEMBERS */}

              <Card
                title="Team Members"
                action={
                  <CardAction
                    icon={Settings2}
                    onClick={() => openAccessManager(selectedProject)}
                  >
                    Manage
                  </CardAction>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {getEmployeesFromProject(selectedProject).map((employee) => (
                    <div
                      key={getId(employee)}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <Avatar text={getName(employee)} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {getName(employee)}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {employee.email || getEmpCode(employee) || ""}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {getEmployeeRoleName(employee)}
                      </span>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => openAccessManager(selectedProject)}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-left text-sm font-medium text-slate-700 transition hover:border-[#2d7f6b] hover:bg-[#e8f3f0]/50"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <Plus size={17} />
                    </span>
                    Add team member
                  </button>
                </div>
              </Card>

              {/* MODULES */}

              <Card
                title="Modules"
                action={
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                    {selectedModuleTotal} modules
                  </span>
                }
              >
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
                              <label className={labelClass}>Module Name</label>

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
                              <div className="min-w-0">
                                <h4 className="truncate font-semibold text-slate-900">
                                  {module.moduleName}
                                </h4>

                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <ModulePill status={module.status} />
                                  <span>{assignments.length} assigned</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                <CardAction
                                  icon={Users}
                                  onClick={() =>
                                    openModuleAssignment(
                                      selectedProject,
                                      module
                                    )
                                  }
                                >
                                  Employees
                                </CardAction>

                                <span className="mx-1 w-px bg-slate-200" />

                                <CardAction
                                  icon={Pencil}
                                  onClick={() => startEditModule(module)}
                                >
                                  Edit
                                </CardAction>

                                <span className="mx-1 w-px bg-slate-200" />

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteModule(selectedProject, module)
                                  }
                                  className="inline-flex items-center gap-1.5 text-sm text-red-600 transition hover:text-red-800"
                                >
                                  <Trash2 size={15} />
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* INDIVIDUAL EMPLOYEE MODULE ASSIGNMENTS */}

                            {assignments.length > 0 && (
                              <div className="mt-4 border-t border-slate-100 pt-4">
                                <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                  <Users size={15} />
                                  Employee Assignments ({assignments.length})
                                </h5>

                                <div className="grid gap-3 md:grid-cols-2">
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
                                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Avatar
                                            text={
                                              employee
                                                ? getName(employee)
                                                : "Assigned"
                                            }
                                            size="h-9 w-9"
                                          />

                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                              {employee
                                                ? getName(employee)
                                                : "Assigned employee"}
                                            </p>

                                            <p className="truncate text-xs text-slate-500">
                                              {[
                                                employee &&
                                                  getEmpCode(employee),
                                                employee?.email,
                                              ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                                          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#2d7f6b]">
                                            <FileText size={13} />
                                            Assigned Task Description
                                          </p>

                                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                            {assignment.description?.trim()
                                              ? assignment.description
                                              : "No description provided for this module assignment."}
                                          </p>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                          <label className="text-xs font-medium text-slate-600">
                                            Employee Status
                                          </label>

                                          <select
                                            value={
                                              assignment.status ||
                                              "Not Assigned"
                                            }
                                            onChange={(e) =>
                                              updateEmployeeModuleStatus(
                                                selectedProject,
                                                module,
                                                employeeId,
                                                e.target.value
                                              )
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-[#2d7f6b]"
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
              </Card>
            </div>

            {/* ---------- RIGHT ---------- */}

            <div className="space-y-5">
              <Card title="Project Info">
                <InfoRow label="Project Status">
                  <ProjectStatusPill status={selectedProject.status} />
                </InfoRow>
                <InfoRow label="Client">
                  {selectedProject.clientName || "—"}
                </InfoRow>
                <InfoRow label="Company">
                  {getCompanyName(selectedProject, companies)}
                </InfoRow>
                <InfoRow label="Project Code">
                  {selectedProject.projectCode || "—"}
                </InfoRow>
                <InfoRow label="Team Members">
                  {selectedProject.employeeAccess?.length || 0}
                </InfoRow>
                <InfoRow label="Modules">{selectedModuleTotal}</InfoRow>
              </Card>

              <Card title="Progress">
                <div className="flex flex-col items-center gap-5">
                  <DonutChart
                    value={toPercent(
                      selectedModuleCounts.Completed,
                      selectedModuleTotal
                    )}
                  />

                  <div className="w-full">
                    <Legend items={moduleLegend(selectedModuleCounts)} />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={closeModal}
              className={buttonSecondary}
            >
              Close
            </button>
          </div>
        </ModalShell>
      )}

      {/* ==================================================
          PROJECT ACCESS MANAGER
      ================================================== */}

      {modal === "access" && selectedProject && (
        <ModalShell
          title="Project Team Access"
          subtitle={`${selectedProject.projectName} · ${getCompanyName(
            selectedProject,
            companies
          )}`}
          onClose={closeModal}
        >
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

            <div className="grid gap-3 sm:grid-cols-2">
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
                    .some((value) => String(value).toLowerCase().includes(query));
                })
                .map((employee) => {
                  const employeeId = getId(employee);

                  const hasAccess =
                    employee.hasAccess === true ||
                    (selectedProject.employeeAccess || []).some(
                      (item) => getId(item) === employeeId
                    );

                  return (
                    <div
                      key={employeeId}
                      className={`flex items-center gap-3 rounded-xl border p-3 ${
                        hasAccess
                          ? "border-[#2d7f6b]/40 bg-[#e8f3f0]/50"
                          : "border-slate-200"
                      }`}
                    >
                      <Avatar text={getName(employee)} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {getName(employee)}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {[
                            getEmpCode(employee),
                            employee.roleId?.roleName || employee.roleName,
                            employee.email,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      {hasAccess ? (
                        <button
                          type="button"
                          onClick={() => revokeAccess(employeeId)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <UserMinus size={14} />
                          Revoke
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => grantAccess(employeeId)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#e8f3f0] px-3 py-1.5 text-xs font-semibold text-[#2d7f6b] hover:bg-[#d6ebe5]"
                        >
                          <UserPlus size={14} />
                          Grant
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {accessEmployees.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                No employee data returned by the access endpoint.
              </p>
            )}

            <div className="flex justify-end border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className={buttonSecondary}
              >
                Close
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ==================================================
          MODULE EMPLOYEE ASSIGNMENT
      ================================================== */}

      {modal === "moduleEmployees" && selectedProject && (
        <ModalShell
          title="Module Employee Assignment"
          subtitle={selectedProject.projectName}
          onClose={closeModal}
          size="max-w-3xl"
          z="z-[60]"
        >
          <div className="space-y-4 p-5">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={moduleEmployeeSearch}
                onChange={(e) => setModuleEmployeeSearch(e.target.value)}
                className={`${inputClass} pl-10`}
                placeholder="Search project employees..."
              />
            </div>

            <p className="text-xs text-slate-500">
              Only employees who already have access to this project can be
              assigned to its modules.
            </p>

            <div className="rounded-xl border border-[#2d7f6b]/20 bg-[#e8f3f0]/40 p-4">
              <label className={labelClass}>Module Assignment Description</label>

              <textarea
                rows={3}
                value={moduleAssignmentDescription}
                onChange={(e) => setModuleAssignmentDescription(e.target.value)}
                className={inputClass}
                placeholder="Write the specific task or responsibility for the employee before clicking Assign..."
              />

              <p className="mt-2 text-xs text-slate-500">
                This description will be saved with the employee's module
                assignment.
              </p>
            </div>

            <div className="space-y-3">
              {moduleEmployees
                .filter((employee) =>
                  [getName(employee), getEmpCode(employee), employee.email]
                    .filter(Boolean)
                    .some((value) =>
                      String(value)
                        .toLowerCase()
                        .includes(moduleEmployeeSearch.toLowerCase())
                    )
                )
                .map((employee) => {
                  const employeeId = getId(employee);

                  const module = (selectedProject.modules || []).find(
                    (item) => getId(item) === selectedModuleId
                  );

                  const assignment = module?.employees?.find(
                    (item) => getId(item.employeeId) === employeeId
                  );

                  return (
                    <div
                      key={employeeId}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar text={getName(employee)} />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {getName(employee)}
                          </p>

                          <p className="truncate text-xs text-slate-500">
                            {[getEmpCode(employee), employee.email]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>

                        {assignment ? (
                          <button
                            type="button"
                            onClick={() => removeModuleEmployee(employeeId)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            <UserMinus size={14} />
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => assignModuleEmployee(employeeId)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#e8f3f0] px-3 py-1.5 text-xs font-semibold text-[#2d7f6b] hover:bg-[#d6ebe5]"
                          >
                            <UserPlus size={14} />
                            Assign
                          </button>
                        )}
                      </div>

                      {assignment && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#2d7f6b]">
                            <FileText size={13} />
                            Assigned Task Description
                          </p>

                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {assignment.description?.trim()
                              ? assignment.description
                              : "No description provided for this module assignment."}
                          </p>

                          <div className="mt-2">
                            <ModulePill status={assignment.status} />
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

            <div className="flex justify-end border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className={buttonSecondary}
              >
                Close
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ==================================================
          DELETED PROJECTS
      ================================================== */}

      {modal === "deleted" && (
        <ModalShell
          title="Deleted Projects"
          subtitle="Restore archived projects or permanently delete them."
          onClose={closeModal}
          size="max-w-5xl"
          z="z-[60]"
          actions={
            <button
              type="button"
              onClick={fetchDeletedProjects}
              disabled={deletedLoading}
              className={iconButton}
              title="Refresh"
            >
              <RefreshCw
                size={17}
                className={deletedLoading ? "animate-spin" : ""}
              />
            </button>
          }
        >
          <div className="p-5">
            {deletedLoading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Loading deleted projects...
              </div>
            ) : deletedProjects.length === 0 ? (
              <div className="py-16 text-center">
                <Archive size={40} className="mx-auto mb-3 text-slate-300" />
                <h3 className="font-semibold text-slate-900">
                  No deleted projects
                </h3>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {deletedProjects.map((project) => (
                  <div
                    key={getId(project)}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar text={project.projectName} rounded="rounded-lg" />

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">
                          {project.projectName}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {project.projectCode || "—"} ·{" "}
                          {project.clientName || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5">
                        <Building2 size={13} />
                        {getCompanyName(project, companies)}
                      </p>

                      <p className="flex items-center gap-1.5">
                        <Layers size={13} />
                        {project.modules?.length || 0} modules
                      </p>

                      <p>
                        Deleted:{" "}
                        {project.deletedAt
                          ? new Date(project.deletedAt).toLocaleString()
                          : "—"}
                      </p>
                    </div>

                    <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => restoreProject(project)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#e8f3f0] px-3 py-1.5 text-xs font-semibold text-[#2d7f6b] hover:bg-[#d6ebe5]"
                      >
                        <RotateCcw size={14} />
                        Restore
                      </button>

                      <button
                        type="button"
                        onClick={() => permanentlyDelete(project)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                        Delete Forever
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default Projects;