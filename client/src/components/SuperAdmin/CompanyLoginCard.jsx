import { useState } from "react";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import api from "../../api/axios";

const CompanyLoginCard = ({ company }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(company?.registeredEmail || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  if (!company) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="bg-white p-10 rounded-xl shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-700">
            Select a Company
          </h2>
          <p className="text-gray-500 mt-2">
            Choose a company from the Company Directory
          </p>
        </div>
      </div>
    );
  }

const handleLogin = async (e) => {
  e.preventDefault();
  if (!email.trim() || !password) {
    toast.error("Please enter your registered email and password.");
    return;
  }
  if (loading) return;
  setLoading(true);
  const toastId = toast.loading("Logging in to company portal...");
  try {
    const response = await api.post("/companies/login", {
      companyId: company._id,
      registeredEmail: email.trim(),
      password,
    });
    const result = response.data;
    if (!result.success) {
      throw new Error(result.message || "Company login failed.");
    }
    toast.update(toastId, {
      render: "Company login successful.",
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
    navigate(`/company/${company._id}/dashboard`, {
      replace: true,
    });
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        err.message ||
        "Unable to login. Please try again.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex justify-center mt-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-md p-8">
        {/* Company Logo and Name */}
        <div className="flex flex-col items-center mb-6">
<img
  src={
    company.logo
      ? `${
          import.meta.env.MODE === "production"
            ? "https://api.hrms.wsdstech.com"
            : "http://localhost:5003"
        }/uploads/companies/${company.logo}`
      : "/default-company-logo.png"
  }
  alt={company.companyName}
  className="w-24 h-24 object-contain rounded-xl mb-4"
  onError={(e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = "/default-company-logo.png";
  }}
/>

          <h2 className="text-xl font-semibold text-slate-800 text-center">
            {company.companyName}
          </h2>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Registered Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registered Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter registered email"
              autoComplete="username"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <Link
              to={`/company-forgot-password/${company._id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition duration-200"
          >
            {loading ? "Logging in..." : "Access Company Portal"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompanyLoginCard;
