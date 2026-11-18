import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api/axios";

const testimonials = [
  {
    quote:
      "Manage your entire workforce from one centralized platform. Keep employee information organized and accessible.",
    name: "Employee Management",
    role: "Centralized Workforce Management",
    initials: "EM",
  },
  {
    quote:
      "Track employee attendance, monitor working hours and maintain accurate daily attendance records with ease.",
    name: "Attendance Tracking",
    role: "Smart Attendance Management",
    initials: "AT",
  },
  {
    quote:
      "Simplify leave applications, manage approvals and keep employee leave balances organized in one place.",
    name: "Leave Management",
    role: "Streamlined Leave Administration",
    initials: "LM",
  },
  {
    quote:
      "Plan projects, organize responsibilities and manage employee access with a structured project management system.",
    name: "Project Management",
    role: "Organized Team Collaboration",
    initials: "PM",
  },
  {
    quote:
      "Record daily work activities, monitor productivity and simplify timesheet tracking across your organization.",
    name: "Timesheet Management",
    role: "Work Hours & Productivity Tracking",
    initials: "TM",
  },
  {
    quote:
      "Manage your organizational structure, departments and employee roles with centralized workforce controls.",
    name: "Organization Management",
    role: "Structured HR Administration",
    initials: "OM",
  },
];

const TOTAL = testimonials.length;
// 3 copies so the carousel can loop without any visible gap
const carouselItems = [...testimonials, ...testimonials, ...testimonials];

const CARD_WIDTH = 256; // w-64
const CARD_GAP = 16; // mr-4
const STEP = CARD_WIDTH + CARD_GAP;
const SLIDE_DURATION = 700; // ms (slide animation)
const SLIDE_INTERVAL = 3500; // ms (pause between slides)

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Carousel state
  const [slideIndex, setSlideIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);

  const registrationMessage = location.state?.message || "";

  // Registration success message
  useEffect(() => {
    if (registrationMessage) {
      toast.success(registrationMessage, {
        autoClose: 3000,
      });

      navigate(location.pathname, {
        replace: true,
        state: {
          email: location.state?.email || "",
        },
      });
    }
  }, [registrationMessage, navigate, location.pathname, location.state]);

  // Carousel: move one card, then wait
  useEffect(() => {
    if (paused) return;

    const timer = setInterval(() => {
      setSlideIndex((prev) => prev + 1);
    }, SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [paused]);

  // Carousel: seamless loop (jump back to start without animation)
  useEffect(() => {
    if (slideIndex >= TOTAL) {
      const timer = setTimeout(() => {
        setAnimate(false);
        setSlideIndex(0);
      }, SLIDE_DURATION);

      return () => clearTimeout(timer);
    }

    if (!animate) {
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimate(true));
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [slideIndex, animate]);

  // Common Login
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    if (loading) return;

    setLoading(true);

    const toastId = toast.loading("Signing in...");

    try {
      // Common Authentication API
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || "Login failed.");
      }

      // =========================================
      // SUPER ADMIN LOGIN
      // =========================================

      if (result.accountType === "superadmin") {
        if (!result.superAdmin?._id) {
          throw new Error("Super Admin information is missing.");
        }

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

        return;
      }

      // =========================================
      // EMPLOYEE LOGIN
      // =========================================

      if (result.accountType === "employee") {
        const employee = result.employee;

        if (!employee?._id) {
          throw new Error("Employee information is missing.");
        }

        if (!employee.companyId) {
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

        return;
      }

      // Unknown account type
      throw new Error("Invalid account type received from server.");
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
    "w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition";

  return (
    <div className="min-h-screen w-full bg-[#0b1426] lg:grid lg:grid-cols-2">
      {/* ============================= */}
      {/* LEFT HERO PANEL (desktop only) */}
      {/* ============================= */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10 xl:p-14 text-white bg-[#05051a]">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 45% at 28% 8%, rgba(255,120,40,0.95) 0%, rgba(255,150,90,0.55) 30%, transparent 70%)," +
              "radial-gradient(ellipse 70% 40% at 90% 100%, rgba(40,80,255,0.9) 0%, transparent 70%)," +
              "radial-gradient(ellipse 80% 40% at 40% 98%, rgba(120,110,255,0.65) 0%, transparent 70%)," +
              "linear-gradient(180deg, #070720 0%, #0a0a2c 55%, #10104a 100%)",
          }}
        />
        <div className="absolute inset-0 bg-black/10" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900">
            <ShieldCheck size={20} />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Login Portal
          </span>
        </div>

        {/* Heading + testimonials */}
        <div className="relative z-10 mt-16">
          <h1 className="text-4xl xl:text-5xl font-semibold leading-tight tracking-tight">
            Start securely.
            <br />
            Scale confidently.
          </h1>

          <p className="mt-5 max-w-md text-base text-white/60 leading-relaxed">
            Authenticate quickly and securely. Designed to keep your team
            moving while protecting every account.
          </p>

          {/* Testimonial carousel (slide, pause, slide) */}
          <div
            className="mt-12"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              className="-mr-10 xl:-mr-14 overflow-hidden"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, #000 0, #000 90%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, #000 0, #000 90%, transparent 100%)",
              }}
            >
              <div
                className="flex w-max"
                style={{
                  transform: `translateX(-${slideIndex * STEP}px)`,
                  transition: animate
                    ? `transform ${SLIDE_DURATION}ms cubic-bezier(0.65, 0, 0.35, 1)`
                    : "none",
                }}
              >
                {carouselItems.map((t, i) => (
                  <div
                    key={`${t.name}-${i}`}
                    aria-hidden={i >= TOTAL ? "true" : undefined}
                    className="mr-4 flex h-56 w-64 shrink-0 flex-col justify-between rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md"
                  >
                    <p className="text-sm leading-relaxed text-white/90">
                      “{t.quote}”
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {t.name}
                        </p>
                        <p className="truncate text-xs text-white/60">
                          {t.role}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
                        {t.initials}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dots */}
            <div className="mt-5 flex items-center gap-2">
              {testimonials.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => {
                    setAnimate(true);
                    setSlideIndex(i);
                  }}
                  aria-label={`Show testimonial ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    slideIndex % TOTAL === i
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-12 text-center">
          <p className="text-sm text-white/70">
            Trusted by growing businesses
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold text-white/50">
            <span>Linear</span>
            <span>Vercel</span>
            <span>Notion</span>
            <span>Stripe</span>
            <span>Framer</span>
            <span>GitHub</span>
          </div>
          <p className="mt-8 text-xs text-white/40 text-left">
            © {new Date().getFullYear()} Login Portal, Inc. All rights
            reserved.
          </p>
        </div>

        {/* Divider between panels */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-px bg-gradient-to-b from-white/5 via-white/30 to-white/5" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black/40 to-transparent" />
      </div>

      {/* ============================= */}
      {/* RIGHT FORM PANEL (dark theme) */}
      {/* ============================= */}
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0e1a33] text-white lg:shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.6)]">
        {/* Soft glow background (kept light on purpose for easy reading) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 40% at 30% 18%, rgba(34,211,238,0.22) 0%, transparent 70%)," +
              "radial-gradient(ellipse 70% 40% at 85% 100%, rgba(37,99,235,0.30) 0%, transparent 70%)," +
              "linear-gradient(180deg, #11203f 0%, #0e1a33 100%)",
          }}
        />

        {/* Left edge highlight for clear separation */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-px bg-white/20 lg:block" />

        {/* Mobile brand */}
        <div className="relative z-10 flex items-center gap-3 px-6 pt-6 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900">
            <ShieldCheck size={20} />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Login Portal
          </span>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-sm">
            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-4xl font-bold tracking-tight">Sign in</h2>
<p className="mt-4 text-sm leading-relaxed text-slate-300">
  Sign in using your registered account credentials to
  securely access your workspace.
</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="mb-5">
                <label
                  htmlFor="loginEmail"
                  className="mb-2 block text-sm font-medium text-slate-100"
                >
                  Official Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="loginEmail"
                    type="email"
                    value={email}
                    onKeyDown={(e) => {
                      if (e.key === " ") {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      setEmail(e.target.value.replace(/\s/g, ""));
                    }}
                    placeholder="Enter your email address"
                    autoComplete="email"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-3">
                <label
                  htmlFor="loginPassword"
                  className="mb-2 block text-sm font-medium text-slate-100"
                >
                  Account Password
                </label>

                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
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
                    className={`${inputClass} pr-14`}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword((prev) => !prev);
                    }}
                    className="absolute right-0 top-1/2 flex h-7 w-12 -translate-y-1/2 items-center justify-center border-l border-slate-200 text-slate-500 transition hover:text-slate-900"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="mb-8 text-right">
                <Link
                  to="/forgot-password"
                  state={{
                    email: email.trim().toLowerCase(),
                  }}
                  className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition duration-200 hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-400/40 disabled:cursor-not-allowed disabled:bg-blue-500/50"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;