
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  FileText,
  Wallet,
  Sun,
  Moon,
  Users,
  UserRound,
  Building2,
  Search,
} from "lucide-react";

import api from "../../api/axios";
import { toast } from "react-toastify";

// =====================================================
// STATUS CONFIG
// =====================================================

const statusConfig = {
  Pending: {
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  Approved: {
    color: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  Rejected: {
    color: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  Withdrawn: {
    color: "bg-slate-100 text-slate-600 border-slate-200",
    icon: AlertCircle,
  },
};

// =====================================================
// DATE HELPERS
// =====================================================

const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDays = (days) => {
  const value = Number(days || 0);
  return Number.isInteger(value) ? value : value.toFixed(1);
};

// =====================================================
// LEAVE HELPERS
// =====================================================

const getLeaveBreakdown = (leave) => {
  if (
    Array.isArray(leave?.leaveBreakdown) &&
    leave.leaveBreakdown.length > 0
  ) {
    return leave.leaveBreakdown;
  }

  if (leave?.leaveType && Number(leave?.totalDays) > 0) {
    return [
      {
        leaveType: leave.leaveType,
        days: Number(leave.totalDays),
      },
    ];
  }

  return [];
};

const getDailyBreakdown = (leave) => {
  return Array.isArray(leave?.dailyBreakdown)
    ? leave.dailyBreakdown
    : [];
};

const getLeaveCategory = (leave) => {
  if (leave?.leaveCategory) {
    return leave.leaveCategory;
  }

  return leave?.isUnpaid ? "Unpaid Leave" : "Paid Leave";
};

const renderLeaveTitle = (leave) => {
  const breakdown = getLeaveBreakdown(leave);

  if (!breakdown.length) {
    return leave?.leaveType || "Leave Request";
  }

  if (breakdown.length === 1) {
    return breakdown[0].leaveType;
  }

  return `${breakdown.length} Leave Types`;
};

// =====================================================
// REUSABLE BREAKDOWN COMPONENT
// =====================================================

const LeaveTypeBreakdown = ({ leave }) => {
  const breakdown = getLeaveBreakdown(leave);

  if (!breakdown.length) {
    return (
      <p className="text-sm text-slate-500">
        No leave type breakdown available.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {breakdown.map((item, index) => (
        <div
          key={`${item.leaveType}-${index}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
        >
          <span className="text-sm font-medium text-slate-700">
            {item.leaveType}
          </span>

          <span className="shrink-0 rounded-lg bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
            {formatDays(item.days)}{" "}
            {Number(item.days) === 1 ? "Day" : "Days"}
          </span>
        </div>
      ))}
    </div>
  );
};

// =====================================================
// REUSABLE DAILY BREAKDOWN COMPONENT
// =====================================================

const DailyLeaveBreakdown = ({ leave }) => {
  const dailyBreakdown = getDailyBreakdown(leave);

  if (!dailyBreakdown.length) {
    return (
      <p className="text-sm text-slate-500">
        Daily breakdown is not available for this request.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {dailyBreakdown.map((item, index) => {
        const isHalfDay = item.dayType === "Half Day";

        return (
          <div
            key={`${item.date}-${index}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              {isHalfDay ? (
                <Moon size={16} className="text-amber-600" />
              ) : (
                <Sun size={16} className="text-blue-600" />
              )}

              <span className="text-sm font-medium text-slate-700">
                {formatDate(item.date)}
              </span>
            </div>

            <div className="text-right">
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  isHalfDay
                    ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {item.dayType || "Full Day"}
              </span>

              <p className="mt-1 text-xs text-slate-500">
                {formatDays(item.days)}{" "}
                {Number(item.days) === 1 ? "Day" : "Days"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// =====================================================
// STATUS BADGE
// =====================================================

const LeaveStatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.Pending;
  const StatusIcon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.color}`}
    >
      <StatusIcon size={14} />
      {status || "Pending"}
    </span>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const AllEmployeeLeaves = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedLeave, setSelectedLeave] = useState(null);

  // =====================================================
  // FETCH ALL EMPLOYEE LEAVES
  // =====================================================

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.get(
        "/leaves/super-admin/all-employee-leaves"
      );

      if (data.success) {
        setRequests(data.requests || []);
      } else {
        toast.error(
          data.message || "Failed to load employee leave records."
        );
      }
    } catch (error) {
      console.error("Fetch All Employee Leaves Error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to load employee leave records."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
  };

  // =====================================================
  // FILTERED REQUESTS
  // =====================================================

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const employee = request.employeeId || {};

      const searchableText = [
        employee.name,
        employee.empId,
        employee.email,
        employee.roleId?.roleName,
        employee.departmentId?.departmentName,
        request.leaveType,
        request.leaveCategory,
        request.reason,
        request.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(
        search.trim().toLowerCase()
      );

      const matchesStatus =
        statusFilter === "All" ||
        String(request.status || "").toLowerCase() ===
          statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  // =====================================================
  // SUMMARY COUNTS
  // =====================================================

  const counts = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(
        (item) => item.status === "Pending"
      ).length,
      approved: requests.filter(
        (item) => item.status === "Approved"
      ).length,
      rejected: requests.filter(
        (item) => item.status === "Rejected"
      ).length,
      withdrawn: requests.filter(
        (item) => item.status === "Withdrawn"
      ).length,
    };
  }, [requests]);

  // =====================================================
  // SUMMARY CARDS
  // =====================================================

  const summaryCards = [
    {
      label: "Total Applications",
      value: counts.total,
      icon: FileText,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Pending",
      value: counts.pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Approved",
      value: counts.approved,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Rejected",
      value: counts.rejected,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  // =====================================================
  // OPEN / CLOSE DETAILS
  // =====================================================

  const openDetails = (leave) => {
    setSelectedLeave(leave);
  };

  const closeDetails = () => {
    setSelectedLeave(null);
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Users size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                All Employee Leaves
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                View leave applications submitted by employees in this company.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing || loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} ${item.color}`}
                  >
                    <Icon size={20} />
                  </div>

                  <p className="text-2xl font-bold text-slate-800">
                    {item.value}
                  </p>
                </div>

                <p className="mt-3 text-sm font-medium text-slate-500">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* =================================================
            SEARCH AND FILTERS
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee, ID, department or leave type..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        {/* =================================================
            ALL EMPLOYEE LEAVE RECORDS
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Employee Leave Records
              </h2>

              <p className="text-sm text-slate-500">
                View complete leave application details of employees.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {filteredRequests.length} record(s)
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw
                size={30}
                className="animate-spin text-indigo-600"
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading employee leave records...
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400">
                <CalendarDays size={30} />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-700">
                No Employee Leave Records
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {search || statusFilter !== "All"
                  ? "Try changing your search or status filter."
                  : "No leave applications were found for this company."}
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1150px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Department</th>
                      <th className="px-5 py-4">Leave Details</th>
                      <th className="px-5 py-4">Duration</th>
                      <th className="px-5 py-4">Total Days</th>
                      <th className="px-5 py-4">Applied On</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((leave) => {
                      const employee = leave.employeeId || {};

                      return (
                        <tr
                          key={leave._id}
                          className="align-top transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                <UserRound size={18} />
                              </div>

                              <div>
                                <p className="font-semibold text-slate-800">
                                  {employee.name || "Unknown Employee"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  ID: {employee.empId || "N/A"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {employee.email || ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-700">
                              {employee.departmentId?.departmentName || "N/A"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {employee.roleId?.roleName || "N/A"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {renderLeaveTitle(leave)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {getLeaveCategory(leave)}
                            </p>

                            {getLeaveBreakdown(leave).length > 1 && (
                              <p className="mt-1 text-xs text-indigo-600">
                                {getLeaveBreakdown(leave).length} types allocated
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-700">
                              {formatDate(leave.startDate)}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              to {formatDate(leave.endDate)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-semibold text-slate-700">
                              {formatDays(leave.totalDays)} days
                            </span>

                            {getDailyBreakdown(leave).some(
                              (item) => item.dayType === "Half Day"
                            ) && (
                              <p className="mt-1 text-xs font-medium text-amber-600">
                                Includes Half Day
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(leave.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            <LeaveStatusBadge status={leave.status} />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openDetails(leave)}
                              title="View Leave Details"
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Eye size={17} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}

              <div className="space-y-3 p-4 md:hidden">
                {filteredRequests.map((leave) => {
                  const employee = leave.employeeId || {};

                  return (
                    <div
                      key={leave._id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <UserRound size={18} />
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-800">
                              {employee.name || "Unknown Employee"}
                            </h4>

                            <p className="mt-1 text-xs text-slate-500">
                              ID: {employee.empId || "N/A"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {employee.email || ""}
                            </p>
                          </div>
                        </div>

                        <LeaveStatusBadge status={leave.status} />
                      </div>

                      <div className="mt-3 rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Building2 size={14} />
                          {employee.departmentId?.departmentName || "N/A"}
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          Role: {employee.roleId?.roleName || "N/A"}
                        </p>
                      </div>

                      <div className="mt-3">
                        <p className="font-semibold text-slate-800">
                          {renderLeaveTitle(leave)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {getLeaveCategory(leave)}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-400">Start Date</p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatDate(leave.startDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">End Date</p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatDate(leave.endDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">Total Days</p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatDays(leave.totalDays)} days
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">Applied On</p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatDate(leave.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => openDetails(leave)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 px-3 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          <Eye size={16} />
                          View Leave Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* =================================================
            LEAVE DETAILS MODAL
        ================================================= */}

        {selectedLeave && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}

              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Leave Details
                  </h2>

                  <p className="text-xs text-slate-500">
                    Employee leave application information
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDetails}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-5">

                {/* EMPLOYEE INFORMATION */}

                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                  <div className="flex items-center gap-2">
                    <UserRound size={18} className="text-indigo-600" />

                    <h3 className="text-sm font-bold text-indigo-800">
                      Employee Information
                    </h3>
                  </div>

                  <p className="mt-3 font-semibold text-slate-800">
                    {selectedLeave.employeeId?.name ||
                      "Unknown Employee"}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Employee ID:{" "}
                    {selectedLeave.employeeId?.empId || "N/A"}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Email: {selectedLeave.employeeId?.email || "N/A"}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Department:{" "}
                    {selectedLeave.employeeId?.departmentId
                      ?.departmentName || "N/A"}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Role:{" "}
                    {selectedLeave.employeeId?.roleId?.roleName || "N/A"}
                  </p>
                </div>

                {/* STATUS & CATEGORY */}

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Leave Category
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-slate-800">
                      {getLeaveCategory(selectedLeave)}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {renderLeaveTitle(selectedLeave)}
                    </p>
                  </div>

                  <LeaveStatusBadge status={selectedLeave.status} />
                </div>

                {/* DATE & TOTAL SUMMARY */}

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Start Date</p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {formatDate(selectedLeave.startDate)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">End Date</p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {formatDate(selectedLeave.endDate)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-3">
                    <p className="text-xs text-blue-600">
                      Total Leave Days
                    </p>

                    <p className="mt-1 text-xl font-bold text-blue-800">
                      {formatDays(selectedLeave.totalDays)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Applied On</p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {formatDate(selectedLeave.createdAt)}
                    </p>
                  </div>
                </div>

                {/* LEAVE TYPE BREAKDOWN */}

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Wallet size={17} className="text-blue-600" />

                    <h3 className="text-sm font-bold text-slate-800">
                      Leave Type Allocation
                    </h3>
                  </div>

                  <LeaveTypeBreakdown leave={selectedLeave} />

                  <div className="mt-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-3">
                    <span className="text-sm font-semibold text-blue-800">
                      Total Allocated
                    </span>

                    <span className="text-sm font-bold text-blue-800">
                      {formatDays(
                        getLeaveBreakdown(selectedLeave).reduce(
                          (sum, item) => sum + Number(item.days || 0),
                          0
                        )
                      )}{" "}
                      Days
                    </span>
                  </div>
                </div>

                {/* DAILY BREAKDOWN */}

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays size={17} className="text-indigo-600" />

                    <h3 className="text-sm font-bold text-slate-800">
                      Daily Breakdown
                    </h3>
                  </div>

                  <DailyLeaveBreakdown leave={selectedLeave} />

                  {getDailyBreakdown(selectedLeave).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-blue-700">
                        <Sun size={14} />
                        Full Day
                      </span>

                      <span className="inline-flex items-center gap-1.5 text-amber-700">
                        <Moon size={14} />
                        Half Day
                      </span>
                    </div>
                  )}
                </div>

                {/* REASON */}

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Reason
                  </p>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-600">
                    {selectedLeave.reason || "No reason provided."}
                  </div>
                </div>

                {/* REJECTION REASON */}

                {selectedLeave.rejectionReason && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-red-700">
                      Rejection Reason
                    </p>

                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-700">
                      {selectedLeave.rejectionReason}
                    </div>
                  </div>
                )}

                {/* APPROVED INFO */}

                {selectedLeave.approvedAt && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                    <p className="text-sm font-semibold text-green-800">
                      Approved On
                    </p>

                    <p className="mt-1 text-sm text-green-700">
                      {formatDateTime(selectedLeave.approvedAt)}
                    </p>
                  </div>
                )}

                {/* REJECTED INFO */}

                {selectedLeave.rejectedAt && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-800">
                      Rejected On
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                      {formatDateTime(selectedLeave.rejectedAt)}
                    </p>
                  </div>
                )}

                {/* PENDING INFO */}

                {selectedLeave.status === "Pending" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-800">
                      Awaiting Approval
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-amber-700">
                      This employee's leave application is awaiting approval.
                    </p>
                  </div>
                )}

                {/* WITHDRAWN INFO */}

                {selectedLeave.status === "Withdrawn" && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-700">
                      Withdrawn Request
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      This leave application has been withdrawn.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllEmployeeLeaves;
