import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import {
  getEmployeeProfile,
  verifyEmployeeRoute,
} from "./employeeApi";

const EmployeeRoleAccess = () => {
  const { employeeId } = useParams();

  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [roleAccess, setRoleAccess] = useState([]);
  const [grantedAccess, setGrantedAccess] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const handleArrowKeyNavigation = (e) => {
  if (
    !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.key
    )
  ) {
    return;
  }

  const current = e.target;

  if (!current.matches("input, select, textarea")) return;

  // Text input-এর মধ্যে cursor সরানো স্বাভাবিকভাবে কাজ করবে।
  if (
    current.tagName === "INPUT" &&
    current.type !== "file" &&
    current.type !== "checkbox" &&
    current.type !== "radio"
  ) {
    const start = current.selectionStart;
    const end = current.selectionEnd;

    if (
      (e.key === "ArrowLeft" &&
        start !== null &&
        (start !== end || start > 0)) ||
      (e.key === "ArrowRight" &&
        end !== null &&
        (start !== end || end < current.value.length))
    ) {
      return;
    }
  }

  const form = current.closest("form");
  if (!form) return;

  const fields = Array.from(
    form.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )
  ).filter((field) => field.tabIndex !== -1);

  const index = fields.indexOf(current);
  if (index === -1) return;

  const nextIndex =
    e.key === "ArrowRight" || e.key === "ArrowDown"
      ? index + 1
      : index - 1;

  if (nextIndex < 0 || nextIndex >= fields.length) return;

  e.preventDefault();
  fields[nextIndex].focus();
};

  const loadProjects = useCallback(async () => {
    setLoading(true);

    try {
      const employee = await getEmployeeProfile();

      if (!verifyEmployeeRoute(employeeId, employee)) {
        throw new Error(
          "You are not authorized to view role access."
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

const loadAccess = useCallback(async (clearFeedback = true) => {
  if (!selectedId) {
    setRoleAccess([]);
    setGrantedAccess([]);
    setSelectedRoleId("");
    return;
  }

  setAccessLoading(true);

  try {
    const [rolesResponse, grantedResponse] = await Promise.all([
      api.get(`/projects/${selectedId}/role-access`, {
        withCredentials: true,
      }),
      api.get(`/projects/${selectedId}/my-granted-access`, {
        withCredentials: true,
      }),
    ]);

    const roles = rolesResponse.data.roleAccess ?? [];
    const granted = grantedResponse.data.grantedAccess ?? [];

    setRoleAccess(roles);
    setGrantedAccess(granted);

    setSelectedRoleId((previous) => {
      const stillAvailable = roles.some((item) => {
        const role = item.role ?? item;
        const id = role._id ?? item.roleId;

        return id === previous && !item.hasAccess;
      });

      if (stillAvailable) return previous;

      const firstAvailable = roles.find(
        (item) => !item.hasAccess
      );
      const firstRole = firstAvailable?.role ?? firstAvailable;

      return firstRole?._id ?? firstAvailable?.roleId ?? "";
    });
  } catch (err) {
  setRoleAccess([]);
  setGrantedAccess([]);

  toast.error(
    err.response?.data?.message ||
      "Failed to load role access information."
  );
} finally {
  setAccessLoading(false);
}
}, [selectedId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

const grantAccess = async (event) => {
  event.preventDefault();

  if (!selectedId || !selectedRoleId) {
    toast.error("Please select a role first.");
    return;
  }

  if (saving) return;

  setSaving(true);

  const toastId = toast.loading("Granting role access...");

  try {
    const response = await api.post(
      `/projects/${selectedId}/access`,
      { roleId: selectedRoleId },
      { withCredentials: true }
    );

    await loadAccess();

    toast.update(toastId, {
      render:
        response.data.message ||
        "Role access granted successfully.",
      type: "success",
      isLoading: false,
      autoClose: 3000,
    });
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        "Failed to grant role access.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setSaving(false);
  }
};

const revokeAccess = async (roleId) => {
  if (!selectedId || !roleId || saving) return;

  const confirmed = window.confirm(
    "Are you sure you want to revoke this role access?"
  );

  if (!confirmed) return;

  setSaving(true);

  const toastId = toast.loading("Revoking role access...");

  try {
    const response = await api.delete(
      `/projects/${selectedId}/access/${roleId}`,
      { withCredentials: true }
    );

    await loadAccess();

    toast.update(toastId, {
      render:
        response.data.message ||
        "Role access revoked successfully.",
      type: "success",
      isLoading: false,
      autoClose: 3000,
    });
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        "Failed to revoke role access.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setSaving(false);
  }
};

  const selectedProject = projects.find(
    (project) => project._id === selectedId
  );

  const availableRoles = roleAccess.filter(
    (item) => !item.hasAccess
  );

  if (loading) {
    return (
      <div className="p-6 text-black-500">
        Loading role access...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black-900">
            Role Access
          </h1>
          <p className="mt-1 text-sm text-black-500">
            Review project role access and manage permissions available to you.
          </p>
        </div>

        <button
          onClick={loadAccess}
          disabled={!selectedId || accessLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-black-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-medium text-black-700">
          Select project
        </label>

        <select
          value={selectedId}
          onChange={(event) => {
            setSelectedId(event.target.value);
          }}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 md:max-w-xl"
        >
          {projects.length === 0 && (
            <option value="">No accessible projects</option>
          )}

          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.projectName}
            </option>
          ))}
        </select>

        {selectedProject && (
          <p className="mt-2 text-sm text-black-500">
            Selected project:{" "}
            <span className="font-medium text-black-700">
              {selectedProject.projectName}
            </span>
          </p>
        )}
      </section>

      {!selectedId ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <ShieldCheck
            size={36}
            className="mx-auto text-black-400"
          />
          <p className="mt-3 font-semibold text-black-800">
            No project selected
          </p>
          <p className="mt-1 text-sm text-black-500">
            You need an accessible project to view its role access.
          </p>
        </div>
      ) : accessLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-black-500">
          Loading access information...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard
              label="Available Roles"
              value={roleAccess.length}
              icon={Users}
            />
            <SummaryCard
              label="Granted Roles"
              value={roleAccess.filter((item) => item.hasAccess).length}
              icon={ShieldCheck}
            />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-black-900">
                Grant Role Access
              </h2>
              <p className="mt-1 text-sm text-black-500">
                Select a role that does not currently have access.
              </p>
            </div>

            {availableRoles.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-black-500">
                No additional roles are available to grant access to.
              </p>
            ) : (
              <form
                onSubmit={grantAccess}
                onKeyDown={handleArrowKeyNavigation}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <select
                  value={selectedRoleId}
                  onChange={(event) =>
                    setSelectedRoleId(event.target.value)
                  }
                  required
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">Choose a role</option>

                  {availableRoles.map((item) => {
                    const role = item.role ?? item;
                    const roleId = role._id ?? item.roleId;

                    return (
                      <option key={roleId} value={roleId}>
                        {role.roleName ?? item.roleName ?? "Unnamed role"}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="submit"
                  disabled={saving || !selectedRoleId}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Plus size={17} />
                  {saving ? "Processing..." : "Grant Access"}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-black-900">
                Project Role Access
              </h2>
              <p className="mt-1 text-sm text-black-500">
                Current access information returned by the server.
              </p>
            </div>

            {roleAccess.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-5 text-sm text-black-500">
                No role access information found for this project.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-black-500">
                      <th className="px-3 py-3 font-medium">Role</th>
                      <th className="px-3 py-3 font-medium">Access</th>
                      <th className="px-3 py-3 font-medium">Access Type</th>
                      <th className="px-3 py-3 font-medium">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {roleAccess.map((item) => {
                      const role = item.role ?? item;
                      const roleId = role._id ?? item.roleId;

                      return (
                        <tr
                          key={roleId}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-3 py-4 font-medium text-black-800">
                            {role.roleName ??
                              item.roleName ??
                              "Unnamed role"}
                          </td>

                          <td className="px-3 py-4">
                            <AccessBadge
                              hasAccess={item.hasAccess}
                            />
                          </td>

                          <td className="px-3 py-4 text-black-600">
                            {item.accessType || "—"}
                          </td>

                          <td className="px-3 py-4">
                            {item.hasAccess ? (
                              <button
                                onClick={() => revokeAccess(roleId)}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                                Revoke
                              </button>
                            ) : (
                              <span className="text-xs text-black-400">
                                Not granted
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-black-900">
              My Granted Access
            </h2>

            {grantedAccess.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-black-500">
                No granted access details were returned for this project.
              </p>
            ) : (
              <div className="space-y-3">
                {grantedAccess.map((item, index) => {
                  const role = item.role ?? item.roleId ?? {};
                  const key =
                    item._id ??
                    role._id ??
                    item.roleId ??
                    `${selectedId}-${index}`;

                  return (
                    <div
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"
                    >
                      <div>
                        <p className="font-medium text-black-800">
                          {role.roleName ??
                            item.roleName ??
                            "Granted role"}
                        </p>
                        <p className="mt-1 text-xs text-black-500">
                          {item.accessType || "Access granted"}
                        </p>
                      </div>

                      <AccessBadge hasAccess />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-black-500">{label}</p>
      <Icon size={20} className="text-indigo-600" />
    </div>
    <p className="mt-3 text-2xl font-bold text-black-900">
      {value}
    </p>
  </div>
);

const AccessBadge = ({ hasAccess }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
      hasAccess
        ? "bg-green-50 text-green-700"
        : "bg-slate-100 text-black-600"
    }`}
  >
    {hasAccess ? "Granted" : "Not granted"}
  </span>
);

export default EmployeeRoleAccess;