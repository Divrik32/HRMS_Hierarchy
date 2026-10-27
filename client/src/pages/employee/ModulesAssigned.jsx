import { useCallback, useEffect, useState } from "react";
import {
  Layers3,
  RefreshCw,
  FolderKanban,
  CalendarDays,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

const getStatusStyle = (status) => {
  switch (status) {
    case "Completed":
      return "bg-emerald-50 text-emerald-700";
    case "In Progress":
      return "bg-blue-50 text-blue-700";
    case "Assigned":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const ModulesAssigned = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingModuleId, setUpdatingModuleId] = useState(null);

  const loadAssignedModules = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // This endpoint must return modules assigned to the logged-in employee.
      const response = await api.get("/projects/my-assigned-modules");

      setModules(response.data?.modules ?? []);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Failed to load your assigned modules.";

      setError(message);
      setModules([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleModuleStatusChange = async (module, status) => {
  const projectId =
    typeof module.projectId === "object"
      ? module.projectId?._id
      : module.projectId;

  if (!projectId || !module._id) {
    toast.error("Project or module ID is missing.");
    return;
  }

  setUpdatingModuleId(module._id);

  try {
    await api.patch(
      `/projects/${projectId}/modules/${module._id}/status`,
      { status }
    );

    setModules((prevModules) =>
      prevModules.map((item) =>
        item._id === module._id &&
        String(
          typeof item.projectId === "object"
            ? item.projectId?._id
            : item.projectId
        ) === String(projectId)
          ? { ...item, status }
          : item
      )
    );

    toast.success("Module status updated successfully.");
  } catch (err) {
    toast.error(
      err.response?.data?.message ||
        "Failed to update module status."
    );
  } finally {
    setUpdatingModuleId(null);
  }
};

  useEffect(() => {
    loadAssignedModules();
  }, [loadAssignedModules]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <Layers3 size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Modules Assigned
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View the projects and modules assigned to you.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAssignedModules}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Assigned Modules</p>
            <Layers3 size={19} className="text-indigo-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {modules.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Completed Modules</p>
            <FolderKanban size={19} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {modules.filter((module) => module.status === "Completed").length}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">
            My Assigned Modules
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Each module is grouped under its project.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" />
            Loading assigned modules...
          </div>
        ) : modules.length === 0 ? (
          <div className="p-10 text-center">
            <Layers3 size={36} className="mx-auto text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-800">
              No modules assigned to you
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Modules assigned to your employee account will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {modules.map((module) => (
              <article
                key={`${module.projectId?._id || module.projectId}-${module._id}`}
                className="p-5"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <FolderKanban size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {module.projectName ||
                            module.projectId?.projectName ||
                            "Project"}
                        </p>

                        <h3 className="mt-1 break-words font-semibold text-slate-900">
                          {module.moduleName}
                        </h3>

                        {(module.projectCode ||
                          module.projectId?.projectCode) && (
                          <p className="mt-1 text-xs text-slate-500">
                            Project Code:{" "}
                            {module.projectCode ||
                              module.projectId?.projectCode}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                      <CalendarDays size={16} />
                      Assigned on:{" "}
                      {module.assignedAt
                        ? new Date(module.assignedAt).toLocaleDateString()
                        : "Date unavailable"}
                    </p>
                  </div>

<div className="flex w-fit shrink-0 items-center gap-2">
  <select
    value={module.status || "Assigned"}
    onChange={(e) =>
      handleModuleStatusChange(module, e.target.value)
    }
    disabled={
      updatingModuleId === module._id ||
      module.status === "Completed"
    }
    className={`rounded-full border-0 px-3 py-2 text-xs font-semibold outline-none ring-1 ring-inset ring-black/5 disabled:cursor-not-allowed disabled:opacity-70 ${getStatusStyle(
      module.status
    )}`}
  >
    <option value="Assigned">Assigned</option>
    <option value="In Progress">In Progress</option>
    <option value="Completed">Completed</option>
  </select>

  {updatingModuleId === module._id && (
    <LoaderCircle
      size={16}
      className="animate-spin text-indigo-600"
    />
  )}
</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ModulesAssigned;