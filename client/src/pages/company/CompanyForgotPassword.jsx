import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Mail, ShieldCheck, LockKeyhole, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

const CompanyForgotPassword = () => {
  const { id } = useParams();

const [companies, setCompanies] = useState([]);
const [selectedCompanyName, setSelectedCompanyName] = useState("");
const [registeredEmail, setRegisteredEmail] = useState("");
const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  const fetchCompanyNames = async () => {
    try {
      const response = await api.get("/companies/names");
      const companyList = response.data.companies || [];

      setCompanies(companyList);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load company names."
      );
    }
  };

  fetchCompanyNames();
}, []);

const handleSendOtp = async (e) => {
  e.preventDefault();

  if (!selectedCompanyName) {
    toast.error("Please select your company.");
    return;
  }

  if (!registeredEmail.trim()) {
    toast.error("Please enter your registered email.");
    return;
  }

  setLoading(true);

  try {
    const response = await api.post("/companies/forgot-password", {
      companyName: selectedCompanyName,
      registeredEmail: registeredEmail.trim(),
    });

    toast.success(response.data.message || "OTP sent successfully.");
    setStep(2);
  } catch (error) {
    toast.error(
      error.response?.data?.message || "Failed to send OTP."
    );
  } finally {
    setLoading(false);
  }
};

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
const response = await api.post("/companies/verify-otp", {
  companyName: selectedCompanyName,
  registeredEmail: registeredEmail.trim(),
  otp,
});

      toast.success(response.data.message || "OTP verified successfully.");
      setStep(3);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!registeredEmail.trim()) {
      toast.error("Please enter your registered email.");
      return;
    }

    setLoading(true);

    try {
const response = await api.post("/companies/resend-otp", {
  companyName: selectedCompanyName,
  registeredEmail: registeredEmail.trim(),
});

      setOtp("");
      setStep(2);
      toast.success(response.data.message || "A new OTP has been sent.");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to resend OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
const response = await api.post("/companies/reset-password", {
  companyName: selectedCompanyName,
  registeredEmail: registeredEmail.trim(),
  otp,
  newPassword,
});

      toast.success(response.data.message || "Password reset successfully.");

      setNewPassword("");
      setConfirmPassword("");

      // Password reset হলে Company Login page-এ ফিরে যাও।
      window.location.href = "/super-admin/dashboard";
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const buttonClass =
    "w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <Link
          to={`/company-login/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-indigo-600"
        >
          <ArrowLeft size={16} />
          Back to Company Login
        </Link>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          {step === 1 && <Mail size={26} />}
          {step === 2 && <ShieldCheck size={26} />}
          {step === 3 && <LockKeyhole size={26} />}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          {step === 1 && "Forgot Password?"}
          {step === 2 && "Verify OTP"}
          {step === 3 && "Reset Password"}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {step === 1 &&
            "Enter your company's registered email to receive a password reset OTP."}
          {step === 2 &&
            `Company: ${selectedCompanyName}. Enter the 6-digit OTP sent to ${registeredEmail}.`}
          {step === 3 &&
            "Create a new password for your company account."}
        </p>

{step === 1 && (
  <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        Company Name
      </span>

      <select
        required
        value={selectedCompanyName}
        onChange={(e) => setSelectedCompanyName(e.target.value)}
        className={inputClass}
      >
        <option value="">Select your company</option>

        {companies.map((company) => (
          <option key={company._id} value={company.companyName}>
            {company.companyName}
          </option>
        ))}
      </select>
    </label>

    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        Registered Email
      </span>

      <input
        type="email"
        required
        autoComplete="email"
        value={registeredEmail}
        onChange={(e) => setRegisteredEmail(e.target.value)}
        placeholder="company@example.com"
        className={inputClass}
      />
    </label>

    <button
      type="submit"
      disabled={loading || companies.length === 0}
      className={buttonClass}
    >
      {loading ? "Sending OTP..." : "Send OTP"}
    </button>
  </form>
)}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                6-Digit OTP
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter OTP"
                className={`${inputClass} text-center text-lg tracking-[0.4em]`}
              />
            </label>

            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
            >
              Resend OTP
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                New Password
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Confirm New Password
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={inputClass}
              />
            </label>

            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CompanyForgotPassword;
