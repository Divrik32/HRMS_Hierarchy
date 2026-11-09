import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  Users,
  User,
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

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [loading, setLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // =====================================================
  // ARROW KEY NAVIGATION
  // =====================================================

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

  // =====================================================
  // LOAD ACCESSIBLE PROJECTS
  // =====================================================

  const loadProjects = useCallback(async () => {
    setLoading(true);

    try {
      const employee = await getEmployeeProfile();

      if (!verifyEmployeeRoute(employeeId, employee)) {
        throw new Error(
          "You are not authorized to view project access."
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

  // =====================================================
  // LOAD ROLE-WISE EMPLOYEE ACCESS
  // =====================================================

  const loadAccess = useCallback(async () => {
    if (!selectedId) {
      setRoleAccess([]);
      setGrantedAccess([]);
      setSelectedEmployeeId("");
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

      const granted =
        grantedResponse.data.employees ??
        grantedResponse.data.grantedAccess ??
        [];

      setRoleAccess(roles);
      setGrantedAccess(granted);
    } catch (err) {
      setRoleAccess([]);
      setGrantedAccess([]);
      setSelectedEmployeeId("");

      toast.error(
        err.response?.data?.message ||
          "Failed to load employee access information."
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

  // =====================================================
  // FLATTEN EMPLOYEES FROM ROLE-WISE RESPONSE
  // =====================================================

  const allEmployees = useMemo(() => {
    return roleAccess.flatMap((item) => {
      const role = item.role ?? item;

      return (item.employees ?? []).map((entry) => ({
        ...entry.employee,
        hasAccess: entry.hasAccess,
        roleName: role.roleName ?? "Unnamed role",
      }));
    });
  }, [roleAccess]);

  // =====================================================
  // EMPLOYEES WITHOUT PROJECT ACCESS
  // =====================================================

  const availableEmployees = useMemo(
    () => allEmployees.filter((employee) => !employee.hasAccess),
    [allEmployees]
  );

  // =====================================================
  // KEEP VALID EMPLOYEE SELECTION
  // =====================================================

  useEffect(() => {
    setSelectedEmployeeId((previous) =>
      availableEmployees.some(
        (employee) => String(employee._id) === previous
      )
        ? previous
        : String(availableEmployees[0]?._id ?? "")
    );
  }, [availableEmployees]);

  const selectedProject = projects.find(
    (project) => project._id === selectedId
  );

  // =====================================================
  // GRANT INDIVIDUAL EMPLOYEE ACCESS
  // =====================================================

  const grantAccess = async (event) => {
    event.preventDefault();

    if (!selectedId || !selectedEmployeeId) {
      toast.error("Please select an employee first.");
      return;
    }

    if (saving) return;

    setSaving(true);

    const toastId = toast.loading(
      "Granting employee project access..."
    );

    try {
      const response = await api.post(
        `/projects/${selectedId}/access`,
        {
          employeeId: selectedEmployeeId,
        },
        {
          withCredentials: true,
        }
      );

      await loadAccess();

      toast.update(toastId, {
        render:
          response.data.message ||
          "Employee access granted successfully.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      toast.update(toastId, {
        render:
          err.response?.data?.message ||
          "Failed to grant employee access.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // REVOKE INDIVIDUAL EMPLOYEE ACCESS
  // =====================================================

  const revokeAccess = async (targetEmployeeId) => {
    if (!selectedId || !targetEmployeeId || saving) return;

    const confirmed = window.confirm(
      "Are you sure you want to revoke this employee's project access?"
    );

    if (!confirmed) return;

    setSaving(true);

    const toastId = toast.loading(
      "Revoking employee project access..."
    );

    try {
      const response = await api.delete(
        `/projects/${selectedId}/access/${targetEmployeeId}`,
        {
          withCredentials: true,
        }
      );

      await loadAccess();

      toast.update(toastId, {
        render:
          response.data.message ||
          "Employee access revoked successfully.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      toast.update(toastId, {
        render:
          err.response?.data?.message ||
          "Failed to revoke employee access.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="p-6 text-black-500">
        Loading project access...
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black-900">
            Employee Project Access
          </h1>

          <p className="mt-1 text-sm text-black-500">
            Manage individual employee access to your projects.
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

      {/* PROJECT SELECTION */}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-medium text-black-700">
          Select project
        </label>

        <select
          value={selectedId}
          onChange={(event) => {
            setSelectedId(event.target.value);
          }}
          className="mt-2 ml-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 md:max-w-xl"
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

      {/* NO PROJECT */}

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
            You need an accessible project to manage employee access.
          </p>
        </div>
      ) : accessLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-black-500">
          Loading employee access information...
        </div>
      ) : (
        <>
          {/* SUMMARY */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard
              label="Employees in Your Hierarchy"
              value={allEmployees.length}
              icon={Users}
            />

            <SummaryCard
              label="Granted Employees"
              value={grantedAccess.length}
              icon={ShieldCheck}
            />
          </div>

          {/* GRANT ACCESS */}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-black-900">
                Grant Employee Access
              </h2>

              <p className="mt-1 text-sm text-black-500">
                Select an individual employee to grant project access.
              </p>
            </div>

            {availableEmployees.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-black-500">
                No additional employees are available to grant access to.
              </p>
            ) : (
              <form
                onSubmit={grantAccess}
                onKeyDown={handleArrowKeyNavigation}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <select
                  value={selectedEmployeeId}
                  onChange={(event) =>
                    setSelectedEmployeeId(event.target.value)
                  }
                  required
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">Choose an employee</option>

                  {availableEmployees.map((employee) => (
                    <option
                      key={employee._id}
                      value={employee._id}
                    >
                      {employee.name || "Unnamed employee"}
                      {employee.empId
                        ? ` (${employee.empId})`
                        : ""}
                      {employee.roleName
                        ? ` — ${employee.roleName}`
                        : ""}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={saving || !selectedEmployeeId}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Plus size={17} />
                  {saving ? "Processing..." : "Grant Access"}
                </button>
              </form>
            )}
          </section>

          {/* ROLE-WISE EMPLOYEE ACCESS */}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-black-900">
                Employee Access by Role
              </h2>

              <p className="mt-1 text-sm text-black-500">
                View individual employee access under each role.
              </p>
            </div>

            {roleAccess.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-5 text-sm text-black-500">
                No employee access information found for this project.
              </p>
            ) : (
              <div className="space-y-5">
                {roleAccess.map((item, index) => {
                  const role = item.role ?? item;

                  const roleId =
                    role._id ??
                    item.roleId ??
                    `role-${index}`;

                  // API structure: { employee, hasAccess }
                  const employees = item.employees ?? [];

                  return (
                    <div
                      key={roleId}
                      className="overflow-hidden rounded-lg border border-slate-200"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users
                            size={17}
                            className="text-indigo-600"
                          />

                          <h3 className="font-semibold text-black-800">
                            {role.roleName ?? "Unnamed role"}
                          </h3>
                        </div>

                        <span className="text-xs text-black-500">
                          {employees.filter(
                            (entry) => entry.hasAccess
                          ).length}{" "}
                          / {employees.length} employees granted
                        </span>
                      </div>

                      {employees.length === 0 ? (
                        <p className="p-4 text-sm text-black-500">
                          No employees found under this role.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {employees.map((entry) => {
                            const employee = entry.employee;

                            return (
                              <div
                                key={employee._id}
                                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                                    <User
                                      size={17}
                                      className="text-slate-500"
                                    />
                                  </div>

                                  <div>
                                    <p className="text-sm font-medium text-black-800">
                                      {employee.name ||
                                        "Unnamed employee"}
                                    </p>

                                    <p className="mt-0.5 text-xs text-black-500">
                                      {employee.empId || ""}
                                      {employee.email
                                        ? ` • ${employee.email}`
                                        : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <AccessBadge
                                    hasAccess={entry.hasAccess}
                                  />

                                  {entry.hasAccess ? (
                                    <button
                                      onClick={() =>
                                        revokeAccess(employee._id)
                                      }
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
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* MY GRANTED ACCESS */}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-black-900">
              My Granted Employee Access
            </h2>

            {grantedAccess.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-black-500">
                You have not granted project access to any employee in your hierarchy.
              </p>
            ) : (
              <div className="space-y-3">
                {grantedAccess.map((employee) => {
                  const role = employee.roleId ?? {};

                  return (
                    <div
                      key={employee._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"
                    >
                      <div>
                        <p className="font-medium text-black-800">
                          {employee.name || "Unnamed employee"}
                        </p>

                        <p className="mt-1 text-xs text-black-500">
                          {employee.empId || ""}
                          {employee.email
                            ? ` • ${employee.email}`
                            : ""}
                          {role.roleName
                            ? ` • ${role.roleName}`
                            : ""}
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

// =====================================================
// SUMMARY CARD
// =====================================================

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

// =====================================================
// ACCESS BADGE
// =====================================================

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