import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import SuperAdminLayout from "./layouts/SuperAdminLayout";
import CompanyLayout from "./layouts/CompanyLayout";
import EmployeeLayout from "./layouts/EmployeeLayout";

// Authentication Pages
import LoginPage from "./pages/LoginPage";
import RegisterSuperAdmin from "./pages/RegisterSuperAdmin";
import ForgotPassword from "./pages/ForgotPassword";
import CompanyForgotPassword from "./pages/company/CompanyForgotPassword";

// Super Admin Pages
import Dashboard from "./pages/superAdmin/Dashboard";
import CreateCompany from "./pages/superAdmin/CreateCompany";
import MyProfile from "./pages/superAdmin/MyProfile";
import CompanyLoginCardPage from "./pages/superAdmin/CompanyLoginCardPage";

// Company Pages
import CompanyDashboard from "./pages/company/CompanyDashboard";
import Employees from "./pages/company/Employees";
import Departments from "./pages/company/Departments";
import Roles from "./pages/company/Roles";
import Projects from "./pages/company/Projects";
import Timesheets from "./pages/company/Timesheets";
import EfficiencyGraph from "./pages/company/EfficiencyGraph";
import CompanyAttendanceChecker from "./pages/company/CompanyAttendanceChecker";
import Holiday from "./pages/company/Holiday";
import CompanyProfile from "./pages/company/CompanyProfile";
import AbsentManagement from "./pages/company/AbsentManagement";

// Employee Pages
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import EmployeeProjects from "./pages/employee/EmployeeProjects";
import EmployeeRoleAccess from "./pages/employee/EmployeeRoleAccess";
import ModulesAssigned from "./pages/employee/ModulesAssigned";
import Timesheet from "./pages/employee/Timesheet";
import EmployeeAttendance from "./pages/employee/EmployeeAttendance";
import EmployeeHolidays from "./pages/employee/EmployeeHolidays";

// Leave Management Pages
import MyLeave from "./pages/employee/MyLeave";
import ApplyLeave from "./pages/employee/ApplyLeave";
import PendingLeaves from "./pages/employee/PendingLeaves";

// Comp-Off Pages
import MyCompOff from "./pages/employee/MyCompOff";
import ApplyCompOff from "./pages/employee/ApplyCompOff";
import CompOffApprovals from "./pages/employee/CompOffApprovals";
import CompanyLeaveApprovals from "./pages/company/CompanyLeaveApprovals";
import CompanyCompOffApprovals from "./pages/company/CompanyCompOffApprovals";
import AllEmployeeLeaves from "./pages/company/AllEmployeeLeaves";
import AttendanceManagement from "./pages/employee/AttendanceManagement";

const router = createBrowserRouter([
  // =====================================================
  // AUTHENTICATION
  // =====================================================

  {
    path: "/register-super-admin",
    element: <RegisterSuperAdmin />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/company-forgot-password/:id",
    element: <CompanyForgotPassword />,
  },
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },

  // =====================================================
  // SUPER ADMIN
  // =====================================================

  {
    path: "/super-admin",
    element: <SuperAdminLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "create-company",
        element: <CreateCompany />,
      },
      {
        path: "profile",
        element: <MyProfile />,
      },
      {
        path: "company/:id",
        element: <CompanyLoginCardPage />,
      },
    ],
  },

  // =====================================================
  // COMPANY WORKSPACE
  // =====================================================

  {
    path: "/company/:companyId",
    element: <CompanyLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <CompanyDashboard />,
      },
      {
        path: "employees",
        element: <Employees />,
      },
      {
        path: "departments",
        element: <Departments />,
      },
      {
        path: "roles",
        element: <Roles />,
      },
      {
        path: "projects",
        element: <Projects />,
      },
      {
        path: "timesheets",
        element: <Timesheets />,
      },
      {
        path: "efficiency",
        element: <EfficiencyGraph />,
      },
      {
        path: "attendance",
        element: <CompanyAttendanceChecker />,
      },
      {
        path: "absent",
        element: <AbsentManagement />,
      },
      {
        path: "holidays",
        element: <Holiday />,
      },
      {
        path: "profile",
        element: <CompanyProfile />,
      },

      // Leave Management
      {
        path: "leave-approvals",
        element: <CompanyLeaveApprovals />,
      },
      {
        path: "comp-off-approvals",
        element: <CompanyCompOffApprovals />,
      },
      {
        path: "all-employee-leaves",
        element: <AllEmployeeLeaves />,
      },
    ],
  },

  // =====================================================
  // EMPLOYEE WORKSPACE
  // =====================================================

  {
    path: "/employee/:employeeId",
    element: <EmployeeLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <EmployeeDashboard />,
      },
      {
        path: "profile",
        element: <EmployeeProfile />,
      },
      {
        path: "projects",
        element: <EmployeeProjects />,
      },
      {
        path: "access",
        element: <EmployeeRoleAccess />,
      },
      {
        path: "modules-assigned",
        element: <ModulesAssigned />,
      },
      {
        path: "timesheet",
        element: <Timesheet />,
      },
      {
        path: "attendance",
        element: <EmployeeAttendance />,
      },
      {
  path: "attendance-management",
  element: <AttendanceManagement />,
},
      {
        path: "holidays",
        element: <EmployeeHolidays />,
      },
      {
        path: "absent",
        element: <AbsentManagement />,
      },

      // Leave Management
      {
        path: "leaves",
        element: <MyLeave />,
      },
      {
        path: "leaves/apply",
        element: <ApplyLeave />,
      },
      {
        path: "leave-approvals",
        element: <PendingLeaves />,
      },

      // Comp-Off Management
      {
        path: "comp-off",
        element: <MyCompOff />,
      },
      {
        path: "comp-off-apply",
        element: <ApplyCompOff />,
      },
      {
        path: "comp-off-approvals",
        element: <CompOffApprovals />,
      },
    ],
  },

  // =====================================================
  // UNKNOWN ROUTES
  // =====================================================

  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;