import { Link, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building,
  Shield,
  FolderKanban,
} from "lucide-react";


const CompanySidebar = ({ open }) => {
  const { companyId } = useParams();

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

      </nav>

      <div className="mt-10 p-4 rounded-xl bg-blue-50">

        <h3 className="font-semibold">
          Quick Overview
        </h3>

        <div className="mt-3 text-sm text-gray-600">
          Employees : 125
        </div>

        <div className="text-sm text-gray-600">
          Departments : 8
        </div>

        <div className="text-sm text-gray-600">
          Active Projects : 14
        </div>

      </div>

    </aside>
  );
};

export default CompanySidebar;