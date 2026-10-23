import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Users,
  KeyRound,
  RefreshCw,
} from "lucide-react";

import api from "../api/axios";

const ForgotPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState(
    location.state?.accountType === "employee" ? "employee" : "admin"
  );

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const endpoints =
    accountType === "admin"
      ? {
          forgot: "/super-admin/forgot-password",
          verify: "/super-admin/verify-otp",
          reset: "/super-admin/reset-password",
          resend: "/super-admin/resend-otp",
        }
      : {
          forgot: "/employees/forgot-password",
          verify: "/employees/verify-otp",
          reset: "/employees/reset-password",
          resend: "/employees/resend-otp",
        };

  const accountLabel =
    accountType === "admin" ? "Super Admin" : "Employee";

  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(endpoints.forgot, {
        email: email.trim().toLowerCase(),
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to send OTP.");
      }

      toast.success(response.data.message || "OTP sent successfully.");
      setStep("otp");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Unable to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(endpoints.verify, {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "OTP verification failed.");
      }

      toast.success("OTP verified successfully.");
      setStep("password");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Unable to verify OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await api.post(endpoints.resend, {
        email: email.trim().toLowerCase(),
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to resend OTP.");
      }

      setOtp("");
      toast.success(response.data.message || "A new OTP has been sent.");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Unable to resend OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(endpoints.reset, {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Password reset failed.");
      }

      toast.success("Password reset successful. Please sign in.");

      navigate("/login", {
        replace: true,
        state: {
          accountType,
          email: email.trim().toLowerCase(),
        },
      });
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <ShieldCheck size={29} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Forgot Password
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Reset your {accountLabel} account password securely.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setAccountType("admin");
                setStep("email");
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
                accountType === "admin"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck size={16} />
              Super Admin
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setAccountType("employee");
                setStep("email");
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
                accountType === "employee"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users size={16} />
              Employee
            </button>
          </div>

          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2 text-blue-700">
              {step === "email" && <Mail size={20} />}
              {step === "otp" && <KeyRound size={20} />}
              {step === "password" && <Lock size={20} />}

              <h2 className="font-semibold text-slate-900">
                {step === "email" && "Request Password Reset"}
                {step === "otp" && "Verify Your OTP"}
                {step === "password" && "Set New Password"}
              </h2>
            </div>

            <p className="text-sm leading-6 text-slate-500">
              {step === "email" &&
                "Enter your registered email address to receive a password reset OTP."}
              {step === "otp" &&
                "Enter the 6-digit OTP sent to your email. The OTP is valid for 10 minutes."}
              {step === "password" &&
                "Choose a new password. You will need to enter your OTP again if it expires before resetting."}
            </p>
          </div>

          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label
                  htmlFor="forgotEmail"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Registered Email Address
                </label>

                <input
                  id="forgotEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label
                  htmlFor="verifyOtp"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  6-Digit OTP
                </label>

                <input
                  id="verifyOtp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter OTP"
                  required
                  className={`${inputClass} text-center text-lg tracking-[0.35em]`}
                />

                <p className="mt-2 break-all text-xs text-slate-500">
                  OTP sent to: {email}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw size={16} />
                Resend OTP
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                }}
                disabled={loading}
                className="w-full text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                Change email address
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  New Password
                </label>

                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className={`${inputClass} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Minimum 6 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Confirm New Password
                </label>

                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <Link
              to="/login"
              state={{
                accountType,
                email,
              }}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;