import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api/axios";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const registrationMessage = location.state?.message || "";
  useEffect(() => {
  if (registrationMessage) {
    toast.success(registrationMessage, {
      autoClose: 3000,
    });

    // Prevent the same registration message from reappearing
    // when the Login page is revisited.
    navigate(location.pathname, {
      replace: true,
      state: {
        email: location.state?.email || "",
      },
    });
  }
}, [registrationMessage, navigate, location.pathname, location.state]);

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!email.trim() || !password) {
    toast.error("Please enter your email and password.");
    return;
  }

  if (loading) return;

  setLoading(true);

  const toastId = toast.loading(
    activeTab === "admin"
      ? "Signing in as Super Admin..."
      : "Signing in as Employee..."
  );

  try {
    const endpoint =
      activeTab === "admin"
        ? "/super-admin/login"
        : "/employees/login";

    const response = await api.post(endpoint, {
      email: email.trim().toLowerCase(),
      password,
    });

    const result = response.data;

    if (!result.success) {
      throw new Error(result.message || "Login failed.");
    }

    if (activeTab === "admin") {
      toast.update(toastId, {
        render: "Super Admin login successful.",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      navigate("/super-admin/dashboard", {
        replace: true,
        state: {
          superAdmin: result.superAdmin,
        },
      });
    } else {
      const employee = result.employee;

      if (!employee?.companyId) {
        throw new Error(
          "Employee login succeeded, but company information is missing."
        );
      }

      const companyId =
        typeof employee.companyId === "object"
          ? employee.companyId._id
          : employee.companyId;

      if (!companyId) {
        throw new Error("Invalid employee company information.");
      }

      toast.update(toastId, {
        render: "Employee login successful.",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      navigate(`/employee/${employee._id}/dashboard`, {
        replace: true,
        state: {
          employee,
        },
      });
    }
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        err.message ||
        "Unable to connect to the server.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setLoading(false);
  }
};

  const inputClass =
    "w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-slate-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <ShieldCheck size={30} />
          </div>

          <h1 className="text-3xl font-bold text-slate-800">
            Login Portal
          </h1>

          <p className="mt-2 text-gray-500">
            Access your account securely
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 sm:p-8">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              type="button"
              onClick={() => {
                setActiveTab("admin");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === "admin"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ShieldCheck size={17} />
              Super Admin
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("employee");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === "employee"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users size={17} />
              Employee
            </button>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800">
              {activeTab === "admin"
                ? "Super Administrator Sign In"
                : "Employee Sign In"}
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              Please provide your login credentials
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label
                htmlFor="loginEmail"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Official Email Address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mb-3">
              <label
                htmlFor="loginPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Account Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="loginPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className={`${inputClass} pr-12`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-700"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="text-right mb-6">
<Link
  to="/forgot-password"
  state={{
    accountType: activeTab,
    email: email.trim().toLowerCase(),
  }}
  className="text-sm font-medium text-blue-700 hover:text-blue-800 transition"
>
  Forgot Password?
</Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-gray-500">
            {activeTab === "admin" ? (
              <>
                Need a Super Administrator account?{" "}
                <Link
                  to="/register-super-admin"
                  className="font-semibold text-blue-700 hover:text-blue-800 transition"
                >
                  Create an Account
                </Link>
              </>
            ) : (
              <>
                New employee joining the organization?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-blue-700 hover:text-blue-800 transition"
                >
                  Create an Account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;