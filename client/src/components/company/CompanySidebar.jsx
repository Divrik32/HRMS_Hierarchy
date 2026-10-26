import { Link, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building,
  Shield,
  FolderKanban,
  UserRound,
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

  let cancelled = false;

const fetchOverview = async () => {
  setOverviewLoading(true);

  try {
    const [employeesRes, departmentsRes, projectsRes] =
      await Promise.all([
        api.get(`/employees/company/${companyId}`),
        api.get(`/departments/company/${companyId}`),
        api.get(`/projects`, {
          params: { companyId },
        }),
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

  return () => {
    cancelled = true;
  };
}, [companyId]);

  if (!open) return null;

  return (
    <aside className="w-72 bg-white border-r min-h-[calc(100vh-64px)] p-4">

      <div className="mb-8">

        <h2 className="font-bold text-xl">
          Workspace
        </h2>

        <p className="text-sm text-gray-500">
          Company Management
        </p>

      </div>

      <nav className="space-y-2">

        <Link
          to={`/company/${companyId}/dashboard`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50"
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link
          to={`/company/${companyId}/employees`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50"
        >
          <Users size={20} />
          Manage Employees
        </Link>

        <Link
          to={`/company/${companyId}/departments`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50"
        >
          <Building size={20} />
          Departments
        </Link>

        <Link
          to={`/company/${companyId}/roles`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50"
        >
          <Shield size={20} />
          Roles & Permissions
        </Link>

        <Link
          to={`/company/${companyId}/projects`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50"
        >
          <FolderKanban size={20} />
          Projects
        </Link>

        <Link
          to={`/company/${companyId}/profile`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50"
        >
          <UserRound size={20} />
          Profile
        </Link>

      </nav>

<div className="mt-10 p-4 rounded-xl bg-blue-50">
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