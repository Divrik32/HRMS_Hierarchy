import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FolderKanban,
  RefreshCw,
  Layers3,
  Building2,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import {
  getEmployeeProfile,
  verifyEmployeeRoute,
} from "./employeeApi";

const STATUSES = [
  "Not Assigned",
  "Assigned",
  "In Progress",
  "Completed",
];

const EmployeeProjects = () => {
  const { employeeId } = useParams();

  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [projectDetails, setProjectDetails] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

const loadProjects = useCallback(async () => {
  setLoading(true);

  try {
    const employee = await getEmployeeProfile();

    if (!verifyEmployeeRoute(employeeId, employee)) {
      throw new Error(
        "You are not authorized to view these projects."
      );
    }

    const response = await api.get(
      "/projects/my-accessible-projects",
      { withCredentials: true }
    );

    const data = response.data.projects ?? [];

    setProjects(data);
    setSelectedId((previous) =>
      data.some((project) => project._id === previous)
        ? previous
        : data[0]?._id ?? ""
    );
  } catch (err) {
    toast.error(
      err.response?.data?.message ||
        err.message ||
        "Failed to load projects."
    );

    setProjects([]);
    setSelectedId("");
  } finally {
    setLoading(false);
  }
}, [employeeId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    let cancelled = false;

    const loadSelectedProject = async () => {
      if (!selectedId) {
        setProjectDetails(null);
        setModules([]);
        return;
      }

      setModulesLoading(true);

      try {
        const [projectResponse, modulesResponse] = await Promise.all([
          api.get(`/projects/${selectedId}`, {
            withCredentials: true,
          }),
          api.get(`/projects/${selectedId}/modules`, {
            withCredentials: true,
          }),
        ]);

        if (cancelled) return;

        setProjectDetails(projectResponse.data.project ?? null);
        setModules(modulesResponse.data.modules ?? []);
      } catch (err) {
  if (cancelled) return;

  setProjectDetails(null);
  setModules([]);

  toast.error(
    err.response?.data?.message ||
      "Failed to load project details or modules."
  );
} finally {
  if (!cancelled) setModulesLoading(false);
}
    };

    loadSelectedProject();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

const updateStatus = async (moduleId, status) => {
  if (!selectedId || updatingId) return;

  setUpdatingId(moduleId);

  const toastId = toast.loading("Updating module status...");

  try {
    const response = await api.patch(
      `/projects/${selectedId}/modules/${moduleId}/status`,
      { status },
      { withCredentials: true }
    );

    const updatedModule = response.data.module;

    if (updatedModule) {
      setModules((previous) =>
        previous.map((module) =>
          module._id === moduleId
            ? { ...module, ...updatedModule }
            : module
        )
      );

      setProjects((previous) =>
        previous.map((project) =>
          project._id === selectedId
            ? {
                ...project,
                modules: (project.modules ?? []).map((module) =>
                  module._id === moduleId
                    ? { ...module, ...updatedModule }
                    : module
                ),
              }
            : project
        )
      );
    }

    toast.update(toastId, {
      render: response.data.message || "Module status updated.",
      type: "success",
      isLoading: false,
      autoClose: 2500,
    });
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        "Failed to update module status.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setUpdatingId("");
  }
};

  const selectedProject =
    projectDetails ??
    projects.find((project) => project._id === selectedId);

  const completedCount = modules.filter(
    (module) => module.status === "Completed"
  ).length;

  const inProgressCount = modules.filter(
    (module) => module.status === "In Progress"
  ).length;

  if (loading) {
    return (
      <div className="p-6 text-slate-500">
        Loading projects...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            My Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View accessible projects and their module progress.
          </p>
        </div>

        <button
          onClick={loadProjects}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <FolderKanban
            size={36}
            className="mx-auto text-slate-400"
          />
          <h2 className="mt-3 font-semibold text-slate-800">
            No accessible projects
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Projects will appear here when access is assigned to your role.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              label="My Projects"
              value={projects.length}
              icon={FolderKanban}
            />
            <SummaryCard
              label="Completed Modules"
              value={completedCount}
              icon={Layers3}
            />
            <SummaryCard
              label="In Progress"
              value={inProgressCount}
              icon={RefreshCw}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 font-semibold text-slate-900">
                Project List
              </h2>

              <div className="space-y-2">
                {projects.map((project) => (
                  <button
                    key={project._id}
                    onClick={() => {
                      setSelectedId(project._id);
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedId === project._id
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block font-medium text-slate-800">
                      {project.projectName}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {project.clientName || "No client specified"}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
              {modulesLoading ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  Loading project details...
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {selectedProject?.projectName ??
                          "Project Modules"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedProject?.projectDescription ||
                          selectedProject?.projectDetails ||
                          "No project description available."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Building2 size={16} />
                      {selectedProject?.clientName || "No client"}
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[540px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-3 py-3 font-medium">
                            Module
                          </th>
                          <th className="px-3 py-3 font-medium">
                            Current Status
                          </th>
                          <th className="px-3 py-3 font-medium">
                            Update Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {modules.map((module) => (
                          <tr
                            key={module._id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-3 py-4 font-medium text-slate-800">
                              {module.moduleName}
                            </td>

                            <td className="px-3 py-4">
                              <StatusBadge status={module.status} />
                            </td>

                            <td className="px-3 py-4">
                              <select
                                value={module.status}
                                disabled={updatingId === module._id}
                                onChange={(event) =>
                                  updateStatus(
                                    module._id,
                                    event.target.value
                                  )
                                }
                                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
                              >
                                {STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              {updatingId === module._id && (
                                <p className="mt-1 text-xs text-slate-500">
                                  Updating...
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}

                        {modules.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-3 py-8 text-center text-slate-500"
                            >
                              No modules found in this project.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-500">{label}</p>
      <Icon size={19} className="text-indigo-600" />
    </div>
    <p className="mt-3 text-2xl font-bold text-slate-900">
      {value}
    </p>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    Completed: "bg-green-50 text-green-700",
    "In Progress": "bg-blue-50 text-blue-700",
    Assigned: "bg-indigo-50 text-indigo-700",
    "Not Assigned": "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
};

export default EmployeeProjects;