import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ChevronLeft,
  Mail,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Check,
} from "lucide-react";

import api from "../api/axios";

const OTP_LENGTH = 6;

const steps = [
  { key: "email", label: "Email" },
  { key: "otp", label: "Verify OTP" },
  { key: "password", label: "New Password" },
];

const ForgotPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef([]);

  const normalizedEmail = email.trim().toLowerCase();
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // Focus first OTP box when OTP step opens
  useEffect(() => {
    if (step === "otp") {
      const timer = setTimeout(() => otpRefs.current[0]?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // =========================================
  // OTP BOX HELPERS (UI only)
  // =========================================

  const focusBox = (index) => {
    const safeIndex = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    otpRefs.current[safeIndex]?.focus();
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    if (!digit) return;

    const position = Math.min(index, otp.length);
    const updated = (
      otp.slice(0, position) +
      digit +
      otp.slice(position + 1)
    ).slice(0, OTP_LENGTH);

    setOtp(updated);
    focusBox(position + 1);
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();

      if (otp[index]) {
        setOtp(otp.slice(0, index) + otp.slice(index + 1));
        focusBox(index);
      } else if (index > 0) {
        setOtp(otp.slice(0, index - 1) + otp.slice(index));
        focusBox(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    setOtp(pasted);
    focusBox(pasted.length >= OTP_LENGTH ? OTP_LENGTH - 1 : pasted.length);
  };

  // =========================================
  // COMMON FORGOT PASSWORD
  // =========================================

  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (!normalizedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", {
        email: normalizedEmail,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to send OTP."
        );
      }

      toast.success(
        response.data.message || "OTP sent successfully."
      );

      setStep("otp");
      setOtp("");
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

  // =========================================
  // COMMON VERIFY OTP
  // =========================================

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const response = await api.post("/auth/verify-otp", {
        email: normalizedEmail,
        otp: otp.trim(),
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "OTP verification failed."
        );
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

  // =========================================
  // COMMON RESEND OTP
  // =========================================

  const handleResendOtp = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await api.post("/auth/resend-otp", {
        email: normalizedEmail,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to resend OTP."
        );
      }

      setOtp("");
      focusBox(0);

      toast.success(
        response.data.message || "A new OTP has been sent."
      );
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

  // =========================================
  // COMMON RESET PASSWORD
  // =========================================

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

    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error("Please enter a valid 6-digit OTP.");
      setStep("otp");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const response = await api.post("/auth/reset-password", {
        email: normalizedEmail,
        otp: otp.trim(),
        newPassword,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Password reset failed."
        );
      }

      toast.success(
        "Password reset successful. Please sign in."
      );

      navigate("/login", {
        replace: true,
        state: {
          email: normalizedEmail,
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

  // =========================================
  // UI HELPERS (display only)
  // =========================================

  const labelClass = "mb-2 block text-sm font-semibold text-black-700";

  const inputClass =
    "w-full rounded-xl border border-slate-200/80 bg-white py-3.5 text-sm text-black-900 placeholder:text-black-400 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.15)] outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15";

  const eyeBtnClass =
    "absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-black-400 transition hover:bg-slate-100 hover:text-blue-600";

  const primaryBtn =
    "w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40 focus:outline-none focus:ring-4 focus:ring-blue-400/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";

  const linkBtn =
    "font-semibold text-blue-700 underline underline-offset-4 transition hover:text-blue-900 disabled:opacity-60";

  // Password strength (visual hint only, does not block submit)
  const strengthScore = (() => {
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 10) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (/\d/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  })();

  const strengthMeta = [
    { label: "Too short", text: "text-red-500", bar: "bg-red-400" },
    { label: "Weak", text: "text-red-500", bar: "bg-red-400" },
    { label: "Fair", text: "text-amber-500", bar: "bg-amber-400" },
    { label: "Good", text: "text-blue-600", bar: "bg-blue-500" },
    { label: "Strong", text: "text-emerald-600", bar: "bg-emerald-500" },
  ][strengthScore];

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const StepIcon =
    step === "email" ? Mail : step === "otp" ? KeyRound : Lock;

  const stepTitle =
    step === "email"
      ? "Forgot your password?"
      : step === "otp"
      ? "Enter Verification Code"
      : "Set a new password";

  const stepText =
    step === "email"
      ? "Enter your registered email address to receive a password reset OTP."
      : step === "otp"
      ? "Enter the 6-digit OTP sent to your email. The OTP is valid for 10 minutes."
      : "Choose a new password. Your OTP must remain valid when you reset your password.";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1426] px-4 py-10">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 25% 15%, rgba(34,211,238,0.22) 0%, transparent 70%)," +
            "radial-gradient(ellipse 65% 50% at 85% 90%, rgba(37,99,235,0.45) 0%, transparent 70%)," +
            "radial-gradient(ellipse 50% 40% at 80% 10%, rgba(255,120,40,0.18) 0%, transparent 70%)," +
            "linear-gradient(180deg, #0c1730 0%, #0b1426 100%)",
        }}
      />

      {/* Floating glass squares (decorative) */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        <div className="absolute left-[8%] top-[14%] h-20 w-20 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm" />
        <div className="absolute left-[16%] top-[30%] h-10 w-10 rounded-xl border border-white/15 bg-white/10" />
        <div className="absolute left-[6%] bottom-[18%] h-12 w-12 rounded-xl border border-white/15 bg-white/10" />
        <div className="absolute right-[10%] top-[12%] h-12 w-12 rounded-xl border border-white/15 bg-white/10" />
        <div className="absolute right-[18%] top-[26%] h-9 w-9 rounded-lg border border-white/15 bg-white/5" />
        <div className="absolute right-[7%] bottom-[22%] h-24 w-24 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-sm" />
        <div className="absolute right-[22%] bottom-[10%] h-10 w-10 rounded-xl border border-white/15 bg-white/10" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black-900">
            <ShieldCheck size={20} />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Login Portal
          </span>
        </div>

        {/* Step indicator */}
        <div className="mb-3 grid grid-cols-3 gap-2 px-2">
          {steps.map((s, index) => {
            const done = index < currentStepIndex;
            const active = index === currentStepIndex;

            return (
              <div key={s.key} className="text-center">
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${
                    done || active ? "bg-cyan-300" : "bg-white/20"
                  }`}
                />
                <p
                  className={`mt-2 flex items-center justify-center gap-1 text-[11px] font-medium ${
                    active
                      ? "text-white"
                      : done
                      ? "text-cyan-200"
                      : "text-white/50"
                  }`}
                >
                  {done && <Check size={11} />}
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Card (light, frosted) */}
        <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white via-sky-50 to-emerald-50 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]">
          {/* Corner glow (top right) */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-300/60 via-emerald-200/50 to-transparent blur-2xl" />

          {/* Soft diagonal light streaks */}
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 overflow-hidden">
            <div className="absolute -right-4 top-6 h-px w-28 rotate-[-45deg] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="absolute right-2 top-14 h-px w-24 rotate-[-45deg] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
            <div className="absolute right-8 top-24 h-px w-20 rotate-[-45deg] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          </div>

          {/* Soft glow (bottom left) */}
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-lime-200/50 via-emerald-100/40 to-transparent blur-3xl" />

          <div className="relative z-10 p-6 sm:p-8">
            {/* Back to Login (top, like reference) */}
            <Link
              to="/login"
              state={{
                email: normalizedEmail,
              }}
              className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-black-600 transition hover:text-blue-600"
            >
              <ChevronLeft size={18} />
              Back to Login
            </Link>

            {/* Icon + heading */}
            <div className="mb-7">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-500/30 ring-4 ring-white">
                <StepIcon size={24} />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-black-900">
                {stepTitle}
              </h1>

              <p className="mt-2 text-sm leading-6 text-black-500">
                {stepText}
              </p>
            </div>

            {/* =========================================
                STEP 1: EMAIL
            ========================================= */}

            {step === "email" && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label htmlFor="forgotEmail" className={labelClass}>
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
                    className={`${inputClass} px-4`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={primaryBtn}
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            )}

            {/* =========================================
                STEP 2: OTP
            ========================================= */}

            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label htmlFor="otpBox0" className="sr-only">
                    6-Digit OTP
                  </label>

                  <div
                    className="grid grid-cols-6 gap-2"
                    onPaste={handleOtpPaste}
                  >
                    {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                      <input
                        key={index}
                        id={`otpBox${index}`}
                        ref={(el) => (otpRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={otp[index] || ""}
                        onChange={(e) =>
                          handleOtpChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onFocus={(e) => {
                          e.target.select();
                          if (index > otp.length) focusBox(otp.length);
                        }}
                        aria-label={`OTP digit ${index + 1}`}
                        className={`h-14 w-full min-w-0 rounded-2xl border text-center text-xl font-bold outline-none backdrop-blur-sm transition ${
                          otp[index]
                            ? "border-blue-400 bg-white text-blue-700 shadow-md shadow-blue-500/15"
                            : "border-slate-200/80 bg-white/60 text-black-900 shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)]"
                        } focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15`}
                      />
                    ))}
                  </div>

                  <p className="mt-4 break-all text-xs text-black-500">
                    Code sent to{" "}
                    <span className="font-semibold text-black-700">
                      {normalizedEmail}
                    </span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={primaryBtn}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>

                <div className="space-y-2 text-center text-sm text-black-500">
                  <p>
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className={linkBtn}
                    >
                      Resend
                    </button>
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                    }}
                    disabled={loading}
                    className="text-xs font-medium text-black-500 transition hover:text-blue-600 disabled:opacity-60"
                  >
                    Change email address
                  </button>
                </div>
              </form>
            )}

            {/* =========================================
                STEP 3: NEW PASSWORD
            ========================================= */}

            {step === "password" && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className={labelClass}>
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
                      className={`${inputClass} pl-4 pr-12`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className={eyeBtnClass}
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {newPassword.length > 0 ? (
                    <div className="mt-2.5">
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              strengthScore >= level
                                ? strengthMeta.bar
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p
                        className={`mt-1.5 text-xs font-medium ${strengthMeta.text}`}
                      >
                        {strengthMeta.label}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-black-500">
                      Minimum 6 characters.
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>
                    Confirm New Password
                  </label>

                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      className={`${inputClass} pl-4 pr-12 ${
                        passwordsMismatch
                          ? "!border-red-300 focus:!border-red-400 focus:!ring-red-400/15"
                          : passwordsMatch
                          ? "!border-emerald-300 focus:!border-emerald-400 focus:!ring-emerald-400/15"
                          : ""
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((previous) => !previous)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className={eyeBtnClass}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {passwordsMatch && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <Check size={13} />
                      Passwords match
                    </p>
                  )}

                  {passwordsMismatch && (
                    <p className="mt-2 text-xs font-medium text-red-500">
                      Passwords do not match yet
                    </p>
                  )}
                </div>

                {/* Reset Password */}
                <button
                  type="submit"
                  disabled={loading}
                  className={primaryBtn}
                >
                  {loading ? "Resetting Password..." : "Reset Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;