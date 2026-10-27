import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import Dashboard from "./pages/superAdmin/Dashboard";
import CreateCompany from "./pages/superAdmin/CreateCompany";
import MyProfile from "./pages/superAdmin/MyProfile";
import CompanyLoginCardPage from "./pages/superAdmin/CompanyLoginCardPage";
import LoginPage from "./pages/LoginPage";
import CompanyLayout from "./layouts/CompanyLayout";
import CompanyDashboard from "./pages/company/CompanyDashboard";
import Employees from "./pages/company/Employees";
import Departments from "./pages/company/Departments";
import Roles from "./pages/company/Roles";
import Projects from "./pages/company/Projects";
import RegisterSuperAdmin from "./pages/RegisterSuperAdmin";
import EmployeeLayout from "./layouts/EmployeeLayout";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import EmployeeProjects from "./pages/employee/EmployeeProjects";
import EmployeeRoleAccess from "./pages/employee/EmployeeRoleAccess";
import ForgotPassword from "./pages/ForgotPassword";
import CompanyForgotPassword from "./pages/company/CompanyForgotPassword";
import CompanyProfile from "./pages/company/CompanyProfile";
import ModulesAssigned from "./pages/employee/ModulesAssigned";

const router = createBrowserRouter([
  // Registration Page for Super Admin
  {
    path: "/register-super-admin",
    element: <RegisterSuperAdmin />,
  },

  // Login Page
  {
    path: "/login",
    element: <LoginPage />,
  },

  // Forgot Password
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },

// Company Forgot Password — নতুন route
{
  path: "/company-forgot-password/:id",
  element: <CompanyForgotPassword />,
},

  // Default Route
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },

  // Super Admin Layout and Nested Routes
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

  // Company Layout and Nested Routes
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
      path: "profile",
      element: <CompanyProfile />,
    },
  ],
},

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
  ],
},

  // Unknown Routes
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;