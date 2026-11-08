import { Link, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building,
  Shield,
  FolderKanban,
  UserRound,
  CalendarDays,
  Activity,
  CalendarCheck,
  ClipboardList,
  CalendarPlus,
  CheckCircle2,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

const CompanySidebar = ({ open }) => {
  const { companyId } = useParams();

  const [overview, setOverview] = useState({
    employees: 0,
    departments: 0,
    activeProjects: 0,
  });

  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const fetchOverview = async () => {
      setOverviewLoading(true);

      try {
        const [employeesRes, departmentsRes, projectsRes] =
          await Promise.all([
            api.get(`/employees/company/${companyId}`),
            api.get(`/departments/company/${companyId}`),
            api.get("/projects", { params: { companyId } }),
          ]);

        const employees = employeesRes.data.employees || [];
        const departments = departmentsRes.data.departments || [];
        const projects = projectsRes.data.projects || [];

        setOverview({
          employees: employeesRes.data.count ?? employees.length,
          departments: departmentsRes.data.count ?? departments.length,
          activeProjects: projects.filter(
            (project) =>
              String(project.status).toLowerCase() === "active"
          ).length,
        });
      } catch (error) {
        console.error(
          "Company Overview API Error:",
          error.response?.status,
          error.response?.data || error.message
        );
      } finally {
        setOverviewLoading(false);
      }
    };

    fetchOverview();
  }, [companyId]);

  if (!open) return null;

  const linkClass =
    "flex items-center gap-3 rounded-lg p-3 text-slate-700 hover:bg-blue-50 hover:text-blue-700";

  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 bg-white p-4 min-h-[calc(100vh-64px)]">
      <div className="mb-8">
        <h2 className="text-xl font-bold">Workspace</h2>
        <p className="text-sm text-gray-500">Company Management</p>
      </div>

      <nav className="space-y-2">
        <Link to={`/company/${companyId}/dashboard`} className={linkClass}>
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link to={`/company/${companyId}/employees`} className={linkClass}>
          <Users size={20} />
          Manage Employees
        </Link>

        <Link to={`/company/${companyId}/departments`} className={linkClass}>
          <Building size={20} />
          Departments
        </Link>

        <Link to={`/company/${companyId}/roles`} className={linkClass}>
          <Shield size={20} />
          Roles & Permissions
        </Link>

        <Link to={`/company/${companyId}/projects`} className={linkClass}>
          <FolderKanban size={20} />
          Projects
        </Link>

        <Link to={`/company/${companyId}/timesheets`} className={linkClass}>
          <CalendarDays size={20} />
          Timesheets
        </Link>

        <Link to={`/company/${companyId}/attendance`} className={linkClass}>
          <CalendarCheck size={20} />
          Attendance Checker
        </Link>
        <Link
  to={`/company/${companyId}/absent`}
  className={linkClass}
>
  <UserX size={20} />
  Absent Management
</Link>

        <Link to={`/company/${companyId}/holidays`} className={linkClass}>
          <CalendarDays size={20} />
          Mark Holidays
        </Link>

        <Link to={`/company/${companyId}/efficiency`} className={linkClass}>
          <Activity size={20} />
          Daily Efficiency
        </Link>

        {/* Leave Management */}
        <div className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Leave Management
        </div>

        <Link
          to={`/company/${companyId}/leave-approvals`}
          className={linkClass}
        >
          <CheckCircle2 size={20} />
          Leave Approvals
        </Link>

        <Link
          to={`/company/${companyId}/comp-off-approvals`}
          className={linkClass}
        >
          <CalendarPlus size={20} />
          Comp-Off Approvals
        </Link>

        <Link
          to={`/company/${companyId}/all-employee-leaves`}
          className={linkClass}
        >
          <ClipboardList size={20} />
          All Employee Leaves
        </Link>

        <Link to={`/company/${companyId}/profile`} className={linkClass}>
          <UserRound size={20} />
          Profile
        </Link>
      </nav>

      <div className="mt-10 rounded-xl bg-blue-50 p-4">
        <h3 className="font-semibold text-slate-800">
          Quick Overview
        </h3>

        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-3">
            <span>Employees</span>
            <span className="font-semibold text-slate-800">
              {overviewLoading ? "..." : overview.employees}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span>Departments</span>
            <span className="font-semibold text-slate-800">
              {overviewLoading ? "..." : overview.departments}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span>Active Projects</span>
            <span className="font-semibold text-slate-800">
              {overviewLoading ? "..." : overview.activeProjects}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CompanySidebar;