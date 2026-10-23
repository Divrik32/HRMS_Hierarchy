import { useState } from "react";
import { toast } from "react-toastify";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Shield,
  LockKeyhole,
  ImagePlus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api/axios";

const RegisterSuperAdmin = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    superAdminId: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    profilePicture: null,
  });

const handleChange = (e) => {
  const { name, value, files } = e.target;

  setFormData((prev) => ({
    ...prev,
    [name]: files ? files[0] || null : value,
  }));
};

const handleSubmit = async (e) => {
  e.preventDefault();

  if (loading) return;

  if (formData.password !== formData.confirmPassword) {
    toast.error("Passwords do not match.");
    return;
  }

  if (formData.password.length < 8) {
    toast.error("Password must contain at least 8 characters.");
    return;
  }

  if (
    formData.profilePicture &&
    !formData.profilePicture.type.startsWith("image/")
  ) {
    toast.error("Please select a valid image file.");
    return;
  }

  if (
    formData.profilePicture &&
    formData.profilePicture.size > 5 * 1024 * 1024
  ) {
    toast.error("Profile picture must be smaller than 5 MB.");
    return;
  }

  const data = new FormData();

  data.append("superAdminId", formData.superAdminId.trim());
  data.append("name", formData.fullName.trim());
  data.append("email", formData.email.trim().toLowerCase());
  data.append("password", formData.password);

  if (formData.profilePicture) {
    data.append("profilePic", formData.profilePicture);
  }

  setLoading(true);

  const toastId = toast.loading("Creating Super Admin account...");

  try {
    const response = await api.post("/super-admin/create", data);
    const result = response.data;

    if (!result.success) {
      throw new Error(
        result.message || "Failed to create Super Admin account."
      );
    }

    toast.update(toastId, {
      render:
        result.message || "Super Admin account created successfully.",
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });

    const registeredEmail = result.superAdmin?.email || "";

    setFormData({
      superAdminId: "",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      profilePicture: null,
    });

    e.target.reset();

    // Navigate to login after successful registration.
    setTimeout(() => {
      navigate("/login", {
        replace: true,
        state: {
          email: registeredEmail,
        },
      });
    }, 1200);
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        err.message ||
        "Unable to connect to the server. Please try again.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setLoading(false);
  }
};

  const inputClass =
    "w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 bg-white outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <Shield size={28} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Register as Super Administrator
          </h1>

          <p className="mt-3 text-sm sm:text-base leading-6 text-slate-500">
            Create a super administrator account to manage all
            companies and workspaces.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="superAdminId"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Super Admin ID
            </label>

            <div className="relative">
              <Shield
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="superAdminId"
                name="superAdminId"
                type="text"
                value={formData.superAdminId}
                onChange={handleChange}
                placeholder="Enter Super Admin ID"
                autoComplete="username"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Full Name
            </label>

            <div className="relative">
              <User
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter Full Name"
                autoComplete="name"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Email Address
            </label>

            <div className="relative">
              <Mail
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter Email Address"
                autoComplete="email"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Password
            </label>

            <div className="relative">
              <LockKeyhole
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Create Password"
                autoComplete="new-password"
                minLength={8}
                required
                className={`${inputClass} pr-12`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Confirm Password
            </label>

            <div className="relative">
              <LockKeyhole
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                autoComplete="new-password"
                minLength={8}
                required
                className={`${inputClass} pr-12`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((prev) => !prev)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-700"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="profilePicture"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Profile Picture
            </label>

            <div className="relative">
              <ImagePlus
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="profilePicture"
                name="profilePicture"
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl pl-11 pr-3 py-3 text-sm text-slate-600 file:mr-3 file:border-0 file:rounded-lg file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Maximum file size: 5 MB.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold shadow-md shadow-blue-700/20 transition duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            {loading
              ? "Creating Account..."
              : "Create Super Administrator Account"}
          </button>
        </form>

        <div className="mt-7 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterSuperAdmin;
