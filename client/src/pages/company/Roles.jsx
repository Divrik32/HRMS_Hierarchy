import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Tree from "react-d3-tree";
import {
  Network,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Users,
  GitBranch,
  ChevronRight,
  Building2,
} from "lucide-react";

import api from "../../api/axios";
import { toast } from "react-toastify";

const emptyForm = {
  roleName: "",
  parentRoleId: "",
};

const Roles = () => {
  const { companyId } = useParams();

  const [roles, setRoles] = useState([]);
  const [rootRoles, setRootRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedChildren, setSelectedChildren] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [parentFilter, setParentFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingId, setDeletingId] = useState(null);

  const [treeTranslate, setTreeTranslate] = useState({
    x: 400,
    y: 80,
  });

  // Get ID from populated or unpopulated parentRoleId.
  const getParentId = (role) => {
    if (!role?.parentRoleId) return null;

    return typeof role.parentRoleId === "object"
      ? role.parentRoleId._id
      : role.parentRoleId;
  };

  // Load roles and root roles for this company.
  const loadRoles = useCallback(async () => {
    if (!companyId) {
      toast.error("Company ID is missing from the URL.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [allResponse, rootResponse] = await Promise.all([
        api.get(`/roles/company/${companyId}`),
        api.get(`/roles/company/${companyId}/root`),
      ]);

      if (!allResponse.data.success) {
        throw new Error(
          allResponse.data.message || "Failed to load roles."
        );
      }

      if (!rootResponse.data.success) {
        throw new Error(
          rootResponse.data.message || "Failed to load root roles."
        );
      }

      setRoles(allResponse.data.roles || []);
      setRootRoles(rootResponse.data.roles || []);
    } catch (err) {
      console.error(
        "Load Roles Error:",
        err.response?.data || err.message
      );

      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to load roles."
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Create a hierarchy tree from the flat roles array.
  const treeData = useMemo(() => {
    const nodeMap = new Map();

    roles.forEach((role) => {
      nodeMap.set(String(role._id), {
        name: role.roleName,
        roleId: String(role._id),
        attributes: {
          id: String(role._id),
        },
        children: [],
      });
    });

    const roots = [];

    roles.forEach((role) => {
      const node = nodeMap.get(String(role._id));
      const parentId = getParentId(role);

      if (parentId && nodeMap.has(String(parentId))) {
        nodeMap.get(String(parentId)).children.push(node);
      } else {
        roots.push(node);
      }
    });

    // A virtual root allows multiple top-level roles.
    return {
      name: "Role Hierarchy",
      roleId: "virtual-root",
      children: roots,
    };
  }, [roles]);

  // Flatten descendants to prevent selecting a child as its ancestor's parent.
  const getDescendantIds = useCallback(
    (roleId) => {
      const descendants = new Set();
      const stack = [String(roleId)];

      while (stack.length) {
        const currentId = stack.pop();

        roles.forEach((role) => {
          if (String(getParentId(role)) === currentId) {
            const childId = String(role._id);

            if (!descendants.has(childId)) {
              descendants.add(childId);
              stack.push(childId);
            }
          }
        });
      }

      return descendants;
    },
    [roles]
  );

  const filteredRoles = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return roles.filter((role) => {
      const matchesSearch = role.roleName
        ?.toLowerCase()
        .includes(searchText);

      const matchesParent =
        parentFilter === "all" ||
        (parentFilter === "root" && !getParentId(role)) ||
        String(getParentId(role)) === parentFilter;

      return matchesSearch && matchesParent;
    });
  }, [roles, search, parentFilter]);

  const getRoleName = (roleId) => {
    if (!roleId) return "Top-level role";

    const role = roles.find(
      (item) => String(item._id) === String(roleId)
    );

    return role?.roleName || "Unknown role";
  };

  // Fetch details and child roles when a tree node is selected.
  const handleSelectRole = async (roleId) => {
    if (!roleId || roleId === "virtual-root") {
      setSelectedRole(null);
      setSelectedChildren([]);
      return;
    }

    const role = roles.find(
      (item) => String(item._id) === String(roleId)
    );

    setSelectedRole(role || null);
    setSelectedChildren([]);

    try {
      const [roleResponse, childrenResponse] = await Promise.all([
        api.get(`/roles/${roleId}`),
        api.get(`/roles/${roleId}/children`),
      ]);

      if (roleResponse.data.success) {
        setSelectedRole(roleResponse.data.role);
      }

      if (childrenResponse.data.success) {
        setSelectedChildren(childrenResponse.data.childRoles || []);
      }
        } catch (err) {
      console.error(
        "Load Role Details Error:",
        err.response?.data || err.message
      );

      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to load role details."
      );

      // The complete role list still provides the basic information.
      setSelectedChildren(
        roles.filter(
          (item) => String(getParentId(item)) === String(roleId)
        )
      );
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);

    setForm({
      roleName: role.roleName || "",
      parentRoleId: getParentId(role) || "",
    });

    toast.error("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;

    setModalOpen(false);
    setEditingRole(null);
    setForm(emptyForm);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Create or update a role.
  const handleSubmit = async (e) => {
    e.preventDefault();

    const roleName = form.roleName.trim();

    if (!roleName) {
      toast.error("Role name is required.");
      return;
    }

    if (!companyId) {
      toast.error("Company ID is missing.");
      return;
    }

    if (editingRole && form.parentRoleId === editingRole._id) {
      toast.error("A role cannot be its own parent.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        roleName,
        companyId,
        parentRoleId: form.parentRoleId || null,
      };

      let response;

      if (editingRole) {
        response = await api.put(
          `/roles/${editingRole._id}`,
          {
            roleName,
            parentRoleId: form.parentRoleId || null,
          }
        );
      } else {
        response = await api.post("/roles", payload);
      }

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to save role."
        );
      }

      toast.success(
        editingRole
          ? "Role updated successfully."
          : "Role created successfully."
      );

      setModalOpen(false);
      setEditingRole(null);
      setForm(emptyForm);

      await loadRoles();

      if (editingRole) {
        setSelectedRole(response.data.role);
      }
    } catch (err) {
      console.error(
        "Save Role Error:",
        err.response?.data || err.message
      );

      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to save role."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a role. The backend rejects deletion when child roles exist.
  const handleDelete = async (role) => {
    const confirmed = window.confirm(
      `Delete "${role.roleName}"? A role with child roles cannot be deleted.`
    );

    if (!confirmed) return;

    setDeletingId(role._id);

    try {
      const response = await api.delete(`/roles/${role._id}`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to delete role."
        );
      }

      setRoles((previous) =>
        previous.filter((item) => item._id !== role._id)
      );

      if (String(selectedRole?._id) === String(role._id)) {
        setSelectedRole(null);
        setSelectedChildren([]);
      }

      toast.success("Role deleted successfully.");
      await loadRoles();
    } catch (err) {
      console.error(
        "Delete Role Error:",
        err.response?.data || err.message
      );

      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete role."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleTreeNodeClick = (nodeDatum) => {
    handleSelectRole(nodeDatum.roleId);
  };

  const activeParentId = form.parentRoleId;

  const excludedParentIds = useMemo(() => {
    if (!editingRole) return new Set();

    const descendants = getDescendantIds(editingRole._id);
    descendants.add(String(editingRole._id));

    return descendants;
  }, [editingRole, getDescendantIds]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Building2 size={16} />
              Company Workspace
              <ChevronRight size={15} />
              <span className="text-blue-600">Roles & Permissions</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Roles & Hierarchy
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Organize your company roles and visualize reporting relationships.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadRoles}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={18} />
              Create Role
            </button>
          </div>
        </div>

        {/* Notifications */}
        {/* {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => toast.error("")}>
              <X size={17} />
            </button>
          </div>
        )} */}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Roles</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {roles.length}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Users size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Top-level Roles</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {rootRoles.length}
                </p>
              </div>
              <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                <Network size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Nested Roles</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {roles.length - rootRoles.length}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <GitBranch size={23} />
              </div>
            </div>
          </div>
        </div>

        {/* Hierarchy Tree */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Role Hierarchy Tree
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a node to view its parent and child roles.
              </p>
            </div>

            <span className="w-fit rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              {roles.length} roles in hierarchy
            </span>
          </div>

          {loading ? (
            <div className="flex h-96 items-center justify-center gap-3 text-slate-500">
              <LoaderCircle size={25} className="animate-spin text-blue-600" />
              Loading hierarchy...
            </div>
          ) : roles.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">
                <Network size={34} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-800">
                No roles created yet
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Create a top-level role first, then add child roles beneath it.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={17} />
                Create First Role
              </button>
            </div>
          ) : (
            <div className="relative h-[560px] w-full overflow-hidden bg-slate-50 sm:h-[650px]">
              <div className="absolute left-4 top-4 z-10 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-500 shadow-sm">
                Scroll to zoom · Drag to move
              </div>

              <Tree
                data={treeData}
                translate={treeTranslate}
                orientation="vertical"
                pathFunc="step"
                collapsible
                zoomable
                draggable
                separation={{ siblings: 1.4, nonSiblings: 1.8 }}
                nodeSize={{ x: 210, y: 105 }}
                onUpdate={(state) => {
                  if (state?.translate) {
                    setTreeTranslate(state.translate);
                  }
                }}
                onNodeClick={handleTreeNodeClick}
                renderCustomNodeElement={({ nodeDatum }) => {
                  const isVirtualRoot =
                    nodeDatum.roleId === "virtual-root";

                  const isSelected =
                    String(selectedRole?._id) ===
                    String(nodeDatum.roleId);

                  const childCount = nodeDatum.children?.length || 0;

                  return (
                    <g>
                      <rect
                        x="-88"
                        y="-28"
                        width="176"
                        height="56"
                        rx="12"
                        fill={
                          isVirtualRoot
                            ? "#0f172a"
                            : isSelected
                              ? "#dbeafe"
                              : "#ffffff"
                        }
                        stroke={
                          isVirtualRoot
                            ? "#0f172a"
                            : isSelected
                              ? "#2563eb"
                              : "#cbd5e1"
                        }
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        filter="url(#roleNodeShadow)"
                      />

                      <text
                        fill={
                          isVirtualRoot
                            ? "#ffffff"
                            : "#0f172a"
                        }
                        fontSize="12"
                        fontWeight="600"
                        textAnchor="middle"
                        y="-3"
                      >
                        {nodeDatum.name.length > 23
                          ? `${nodeDatum.name.slice(0, 20)}...`
                          : nodeDatum.name}
                      </text>

                      <text
                        fill={
                          isVirtualRoot ? "#cbd5e1" : "#64748b"
                        }
                        fontSize="10"
                        textAnchor="middle"
                        y="15"
                      >
                        {isVirtualRoot
                          ? `${childCount} top-level roles`
                          : `${childCount} direct child${
                              childCount === 1 ? "" : "ren"
                            }`}
                      </text>

                      {isSelected && !isVirtualRoot && (
                        <circle
                          cx="77"
                          cy="-18"
                          r="5"
                          fill="#2563eb"
                        />
                      )}
                    </g>
                  );
                }}
              />
            </div>
          )}
        </section>

        {/* Selected Role Details */}
        {selectedRole && (
          <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Selected Role
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedRole.roleName}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Parent: {getRoleName(getParentId(selectedRole))}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(selectedRole)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Pencil size={15} />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(selectedRole)}
                  disabled={deletingId === selectedRole._id}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === selectedRole._id ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Direct Child Roles ({selectedChildren.length})
              </h3>

              {selectedChildren.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  This role has no direct child roles.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedChildren.map((child) => (
                    <button
                      type="button"
                      key={child._id}
                      onClick={() => handleSelectRole(child._id)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <GitBranch
                        size={14}
                        className="mr-2 inline-block"
                      />
                      {child.roleName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* All Roles Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                All Roles
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage each role and its reporting parent.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search roles..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-56"
                />
              </div>

              <select
                value={parentFilter}
                onChange={(e) => setParentFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">All parent roles</option>
                <option value="root">Top-level only</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    Child of {role.roleName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center gap-3 text-slate-500">
              <LoaderCircle size={23} className="animate-spin" />
              Loading roles...
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No matching roles found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Role Name
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Parent Role
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Direct Children
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Created
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRoles.map((role) => {
                    const childCount = roles.filter(
                      (item) =>
                        String(getParentId(item)) === String(role._id)
                    ).length;

                    const isSelected =
                      String(selectedRole?._id) === String(role._id);

                    return (
                      <tr
                        key={role._id}
                        className={`transition hover:bg-slate-50 ${
                          isSelected ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => handleSelectRole(role._id)}
                            className="flex items-center gap-3 text-left"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                              <Network size={18} />
                            </span>
                            <span>
                              <span className="block font-semibold text-slate-800">
                                {role.roleName}
                              </span>
                              <span className="mt-1 block text-xs text-slate-400">
                                {isSelected ? "Selected" : "Click to view"}
                              </span>
                            </span>
                          </button>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getRoleName(getParentId(role))}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                            <Users size={13} />
                            {childCount}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {role.createdAt
                            ? new Date(role.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(role)}
                              title="Edit role"
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(role)}
                              disabled={deletingId === role._id}
                              title="Delete role"
                              className="rounded-lg border border-slate-200 p-2 text-red-500 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === role._id ? (
                                <LoaderCircle
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
            Showing {filteredRoles.length} of {roles.length} roles
          </div>
        </section>
      </div>

      {/* Create / Edit Role Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingRole ? "Edit Role" : "Create Role"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingRole
                    ? "Update the role and its parent."
                    : "Add a role to your company hierarchy."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5 px-6 py-6">

                <div>
                  <label
                    htmlFor="roleName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Role Name <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="roleName"
                    name="roleName"
                    value={form.roleName}
                    onChange={handleFormChange}
                    placeholder="e.g. Department Manager"
                    maxLength={100}
                    required
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="parentRoleId"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Parent Role
                  </label>

                  <select
                    id="parentRoleId"
                    name="parentRoleId"
                    value={activeParentId}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">None — Top-level role</option>

                    {roles
                      .filter(
                        (role) =>
                          !excludedParentIds.has(String(role._id))
                      )
                      .map((role) => (
                        <option key={role._id} value={role._id}>
                          {role.roleName}
                        </option>
                      ))}
                  </select>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Select an existing role to place this role beneath it.
                    Leave empty to create a top-level role.
                  </p>
                </div>

                {editingRole && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Role ID
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-700">
                      {editingRole._id}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <LoaderCircle size={17} className="animate-spin" />
                  )}
                  {submitting
                    ? "Saving..."
                    : editingRole
                      ? "Save Changes"
                      : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
