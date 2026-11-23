import { useState, useEffect } from "react";
import api from "../../api/axios";

// day label, hours (decimal)
const daily = [
  ["2", 8.6], ["3", 8.3], ["4", 7.3], ["5", 8.2], ["6", 7.1], ["9", 8.7], ["10", 8.5],
  ["11", 8.8], ["12", 5.9], ["13", 8.3], ["16", 7.8], ["17", 8.7], ["18", 8.3], ["19", 7.2],
];

const shortDays = [
  { day: "Thu 19", worked: "7h 12m", range: "09:30 to 16:42", short: "0h 48m", pct: 90 },
  { day: "Mon 16", worked: "7h 48m", range: "09:30 to 17:18", short: "0h 12m", pct: 97 },
  { day: "Thu 12", worked: "5h 54m", range: "09:30 to 15:24", short: "2h 06m", pct: 74 },
  { day: "Fri 6", worked: "6h 30m", range: "09:30 to 16:00", short: "1h 30m", pct: 81 },
  { day: "Wed 4", worked: "7h 24m", range: "09:30 to 16:54", short: "0h 36m", pct: 92 },
];

const holidays = [
  { d: "24", m: "Nov", name: "Guru Nanak Jayanti", sub: "Tuesday · in 4 days" },
  { d: "25", m: "Dec", name: "Christmas Day", sub: "Friday · in 35 days" },
  { d: "1", m: "Jan", name: "New Year's Day", sub: "Friday · in 42 days" },
  { d: "14", m: "Jan", name: "Makar Sankranti", sub: "Thursday · in 55 days" },
];

const weeks = [
  { label: "Week of 26 Oct", status: "Approved", cls: "bg-emerald-100 text-emerald-800" },
  { label: "Week of 2 Nov", status: "Approved", cls: "bg-emerald-100 text-emerald-800" },
  { label: "Week of 9 Nov", status: "With manager", cls: "bg-amber-100 text-amber-800" },
  { label: "Week of 16 Nov", status: "Draft, due Fri", cls: "bg-indigo-100 text-indigo-800" },
];

const donut = [
  { name: "Approved", value: 5, color: "#0f8a6a" },
  { name: "Submitted", value: 1, color: "#b7791f" },
  { name: "Draft", value: 1, color: "#3b3fd8" },
  { name: "Rejected", value: 1, color: "#c53030" },
];

const steps = ["Draft", "Submit", "Manager review", "Approved"];

/* ---------- Small pieces ---------- */
const Card = ({ title, subtitle, children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 p-5 ${className}`}>
    {title && <h2 className="text-sm font-bold text-slate-900">{title}</h2>}
    {subtitle && <p className="text-xs text-sky-600 mt-1 mb-4">{subtitle}</p>}
    {children}
  </div>
);

const Stat = ({ value, label }) => (
  <div className="bg-slate-100 rounded-xl px-4 py-3">
    <div className="text-xl font-bold text-slate-900">{value}</div>
    <div className="text-xs text-slate-500 mt-1">{label}</div>
  </div>
);

/* ---------- Header ---------- */
const Header = () => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [superAdmin, setSuperAdmin] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profilePicError, setProfilePicError] = useState(false);
  useEffect(() => {
    const fetchSuperAdminProfile = async () => {
      try {
        const response = await api.get("/super-admin/profile");

        if (response.data?.success) {
          setSuperAdmin(response.data.superAdmin);
        }
      } catch (error) {
        console.error(
          "Super Admin Profile Error:",
          error.response?.data || error.message
        );
      } finally {
        setProfileLoading(false);
      }
    };

    fetchSuperAdminProfile();
  }, []);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);

  const pad = (n) => String(n).padStart(2, "0");

  const time = `${pad(Math.floor(seconds / 3600))}:${pad(
    Math.floor((seconds % 3600) / 60)
  )}:${pad(seconds % 60)}`;

  const initials = superAdmin?.name
    ? superAdmin.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "SA";

  const formatCreatedAt = (date) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "N/A";

  return `Joined ${parsedDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })}`;
};

const API_ORIGIN = new URL(api.defaults.baseURL).origin;

const getProfilePicUrl = (profilePic) => {
  if (!profilePic) return null;

  if (/^https?:\/\//i.test(profilePic)) {
    return profilePic;
  }

  if (profilePic.startsWith("/uploads/")) {
    return `${API_ORIGIN}${profilePic}`;
  }

  if (profilePic.startsWith("uploads/")) {
    return `${API_ORIGIN}/${profilePic}`;
  }

  return `${API_ORIGIN}/uploads/${profilePic.replace(/^\/+/, "")}`;
};

const profilePicUrl = getProfilePicUrl(superAdmin?.profilePic);
useEffect(() => {
  setProfilePicError(false);
}, [profilePicUrl]);

  return (
    <div className="rounded-2xl bg-[#348aaf] text-white px-6 py-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">

{/* Super Admin Profile Picture */}
<div className="w-14 h-14 rounded-full p-[3px] border-2 border-orange-500 flex items-center justify-center shrink-0 overflow-hidden">
  {profileLoading ? (
    <div className="w-full h-full rounded-full bg-[#4f2ff5] flex items-center justify-center font-bold text-white">
      {initials}
    </div>
  ) : profilePicUrl && !profilePicError ? (
    <img
      src={profilePicUrl}
      alt="Super Admin"
      className="w-full h-full rounded-full object-cover"
      onError={(e) => {
        console.error(
          "Super Admin Profile Image Failed:",
          e.currentTarget.src
        );
        setProfilePicError(true);
      }}
      onLoad={(e) => {
        console.log(
          "Super Admin Profile Image Loaded:",
          e.currentTarget.src
        );
      }}
    />
  ) : (
    <div className="w-full h-full rounded-full bg-[#4f2ff5] flex items-center justify-center font-bold text-white">
      {initials}
    </div>
  )}
</div>

        <div>
          <h1 className="text-2xl font-bold leading-tight">
            {profileLoading ? "Loading..." : superAdmin?.name || "Super Admin"}
          </h1>

          <p className="text-sm text-white mt-0.5">
            Super Admin
            {superAdmin?.superAdminId
              ? ` · ${superAdmin.superAdminId}`
              : ""}
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0b2f45] text-white">
              {formatCreatedAt(superAdmin?.createdAt)}
            </span>

            {superAdmin?.email && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0b2f45] text-white">
                {superAdmin.email}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-4xl font-bold tracking-wider tabular-nums">
          {time}
        </div>

        <p className="text-[11px] text-yellow-200 mt-1">
          {running ? "Running" : "Not started"}
        </p>

        <div className="flex gap-3 justify-end mt-3">
          <button
            onClick={() => setRunning(true)}
            disabled={running}
            className="px-5 py-2 rounded-lg bg-[#02e8ab] text-slate-900 text-sm font-semibold
                       border-b-2 border-[#017a56] shadow-[0_2px_4px_rgba(0,0,0,0.25)]
                       transition-all duration-150
                       hover:-translate-y-px hover:brightness-120
                       active:translate-y-px active:border-b-[1px] active:shadow-none
                       disabled:bg-[#00d38a]/50 disabled:text-slate-900/60 disabled:border-transparent
                       disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed"
          >
            Start day
          </button>

          <button
            onClick={() => setRunning(false)}
            disabled={!running}
            className="px-5 py-2 rounded-lg bg-[#f70254] text-slate-300 text-sm font-semibold
                       border-b-2 border-[#7a0148] shadow-[0_2px_4px_rgba(0,0,0,0.25)]
                       transition-all duration-150
                       enabled:bg-[#f70254] enabled:border-[#7d2340] enabled:text-white
                       enabled:hover:-translate-y-px enabled:hover:brightness-120
                       enabled:active:translate-y-[3px] enabled:active:border-b-[1px] enabled:active:shadow-[0_1px_2px_rgba(0,0,0,0.35)]
                       disabled:shadow-none disabled:cursor-not-allowed"
          >
            End day
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Progress ---------- */
const Progress = () => (
  <Card
    title="Progress this month"
    subtitle="Daily hours for the last 14 working days. Target is 8 hours."
  >
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Stat value="108h 54m" label="Hours logged" />
      <Stat value="7h 47m" label="Daily average" />
      <Stat value="64%" label="Days at 8h or more" />
      <Stat value="12 days" label="Leave balance" />
    </div>

    <div className="relative mt-6 h-40">
      <div className="absolute left-0 right-0 top-0 border-t border-dashed border-slate-400" />
      <div className="absolute inset-0 flex items-end gap-2">
        {daily.map(([d, h]) => (
          <div key={d} className="flex-1 h-full flex items-end">
            <div
              className={`w-full rounded-t ${h >= 8 ? "bg-indigo-600" : "bg-orange-600"}`}
              style={{ height: `${(h / 8.8) * 100}%` }}
            />
          </div>
        ))}
      </div>
    </div>
    <div className="flex gap-2 mt-1">
      {daily.map(([d]) => (
        <span key={d} className="flex-1 text-center text-[10px] text-slate-500">{d}</span>
      ))}
    </div>
    <div className="flex gap-4 mt-3 text-[11px] text-slate-500">
      <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-indigo-600" />8 hours or more</span>
      <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-orange-600" />Under 8 hours</span>
      <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-emerald-600" />Today, running</span>
    </div>
  </Card>
);

/* ---------- Calendar ---------- */
/* ---------- Government Holidays ---------- */

const governmentHolidays = {
  2025: [
    { date: "2025-01-26", name: "Republic Day" },
    { date: "2025-02-26", name: "Maha Shivaratri" },
    { date: "2025-03-14", name: "Holi" },
    { date: "2025-03-31", name: "Id-ul-Fitr" },
    { date: "2025-04-10", name: "Mahavir Jayanti" },
    { date: "2025-04-18", name: "Good Friday" },
    { date: "2025-05-12", name: "Buddha Purnima" },
    { date: "2025-06-07", name: "Id-ul-Zuha (Bakrid)" },
    { date: "2025-07-06", name: "Muharram" },
    { date: "2025-08-15", name: "Independence Day" },
    { date: "2025-08-16", name: "Janmashtami" },
    { date: "2025-09-05", name: "Milad-un-Nabi" },
    { date: "2025-10-02", name: "Gandhi Jayanti / Dussehra" },
    { date: "2025-10-20", name: "Diwali" },
    { date: "2025-11-05", name: "Guru Nanak Jayanti" },
    { date: "2025-12-25", name: "Christmas" },
  ],

  2026: [
    { date: "2026-01-26", name: "Republic Day" },
    { date: "2026-03-04", name: "Holi" },
    { date: "2026-03-21", name: "Id-ul-Fitr" },
    { date: "2026-03-26", name: "Ram Navami" },
    { date: "2026-03-31", name: "Mahavir Jayanti" },
    { date: "2026-04-03", name: "Good Friday" },
    { date: "2026-05-01", name: "Buddha Purnima" },
    { date: "2026-05-27", name: "Id-ul-Zuha (Bakrid)" },
    { date: "2026-06-26", name: "Muharram" },
    { date: "2026-08-15", name: "Independence Day" },
    { date: "2026-08-26", name: "Milad-un-Nabi" },
    { date: "2026-09-04", name: "Janmashtami" },
    { date: "2026-10-02", name: "Gandhi Jayanti" },
    { date: "2026-10-20", name: "Dussehra" },
    { date: "2026-11-08", name: "Diwali" },
    { date: "2026-11-24", name: "Guru Nanak Jayanti" },
    { date: "2026-12-25", name: "Christmas" },
  ],

  2027: [
    { date: "2027-01-26", name: "Republic Day" },
    { date: "2027-03-10", name: "Id-ul-Fitr" },
    { date: "2027-03-23", name: "Holi" },
    { date: "2027-03-26", name: "Good Friday" },
    { date: "2027-04-15", name: "Ram Navami" },
    { date: "2027-04-19", name: "Mahavir Jayanti" },
    { date: "2027-05-17", name: "Id-ul-Zuha (Bakrid)" },
    { date: "2027-05-20", name: "Buddha Purnima" },
    { date: "2027-06-16", name: "Muharram" },
    { date: "2027-08-15", name: "Independence Day / Milad-un-Nabi" },
    { date: "2027-08-25", name: "Janmashtami" },
    { date: "2027-10-02", name: "Gandhi Jayanti" },
    { date: "2027-10-09", name: "Dussehra" },
    { date: "2027-10-29", name: "Diwali" },
    { date: "2027-11-14", name: "Guru Nanak Jayanti" },
    { date: "2027-12-25", name: "Christmas" },
  ],
};

/* ---------- Calendar ---------- */
const Calendar = () => {
  const today = new Date();

  const [calendarDate, setCalendarDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedHoliday, setSelectedHoliday] = useState(null);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const monthName = calendarDate.toLocaleString("en-IN", {
    month: "long",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const holidaysForMonth = governmentHolidays[year] || [];

  const getHoliday = (day) => {
    const dateString = [
      year,
      String(month + 1).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");

    return holidaysForMonth.find((holiday) => holiday.date === dateString);
  };

  const isToday = (day) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const previousMonth = () => {
    if (year <= 2025 && month === 0) return;

    setCalendarDate(new Date(year, month - 1, 1));
    setSelectedHoliday(null);
  };

  const nextMonth = () => {
    if (year >= 2027 && month === 11) return;

    setCalendarDate(new Date(year, month + 1, 1));
    setSelectedHoliday(null);
  };

  const monthHolidays = holidaysForMonth.filter((holiday) => {
    const holidayDate = new Date(`${holiday.date}T00:00:00`);
    return holidayDate.getMonth() === month;
  });

  const calendarCells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Card>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={previousMonth}
          disabled={year === 2025 && month === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg
                     bg-slate-100 text-slate-600 transition
                     hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous month"
        >
          ‹
        </button>

        <div className="text-center">
          <h3 className="text-sm font-bold text-slate-900">
            {monthName} {year}
          </h3>
          <p className="text-[10px] text-slate-500">
            Government Holidays
          </p>
        </div>

        <button
          type="button"
          onClick={nextMonth}
          disabled={year === 2027 && month === 11}
          className="flex h-8 w-8 items-center justify-center rounded-lg
                     bg-slate-100 text-slate-600 transition
                     hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-semibold text-slate-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
          (day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          )
        )}
      </div>

      {/* Calendar Dates */}
      <div className="grid grid-cols-7 gap-y-1">
        {calendarCells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }

          const holiday = getHoliday(day);
          const todayDate = isToday(day);

          return (
            <div
              key={day}
              className="flex items-center justify-center"
            >
              <button
                type="button"
                onClick={() => setSelectedHoliday(holiday || null)}
                title={holiday?.name || `${day} ${monthName}`}
                className={`relative flex h-9 w-9 items-center justify-center
                  rounded-lg text-xs transition-all

                  ${
                    holiday
                      ? "bg-rose-100 text-rose-700 font-bold hover:bg-rose-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }

                  ${
                    todayDate
                      ? "ring-2 ring-indigo-700 ring-offset-1 font-bold text-slate-900"
                      : ""
                  }

                  ${
                    selectedHoliday?.date === holiday?.date && holiday
                      ? "ring-2 ring-rose-500"
                      : ""
                  }
                `}
              >
                {day}

                {holiday && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-rose-600" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full ring-2 ring-indigo-700" />
          Today
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-rose-100" />
          Government Holiday
        </div>
      </div>

      {/* Selected Holiday */}
      {selectedHoliday && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <div className="text-xs font-semibold text-rose-800">
            {selectedHoliday.name}
          </div>

          <div className="mt-1 text-[10px] text-rose-600">
            {new Date(
              `${selectedHoliday.date}T00:00:00`
            ).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
      )}

      {/* Holidays List */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900">
            Holidays in {monthName}
          </h4>

          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            {monthHolidays.length}
          </span>
        </div>

        {monthHolidays.length === 0 ? (
          <p className="rounded-lg bg-slate-50 py-3 text-center text-xs text-slate-400">
            No government holidays this month.
          </p>
        ) : (
          <div className="space-y-2">
            {monthHolidays.map((holiday) => {
              const holidayDate = new Date(
                `${holiday.date}T00:00:00`
              );

              return (
                <button
                  key={holiday.date}
                  type="button"
                  onClick={() => setSelectedHoliday(holiday)}
                  className="flex w-full items-center gap-3 rounded-xl
                             bg-slate-50 p-2.5 text-left transition
                             hover:bg-rose-50"
                >
                  <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                    <span className="text-sm font-bold leading-none">
                      {holidayDate.getDate()}
                    </span>

                    <span className="text-[9px]">
                      {holidayDate.toLocaleString("en-IN", {
                        month: "short",
                      })}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-800">
                      {holiday.name}
                    </div>

                    <div className="text-[10px] text-slate-500">
                      {holidayDate.toLocaleDateString("en-IN", {
                        weekday: "long",
                      })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

/* ---------- Days under 8 hours ---------- */
const UnderEight = () => (
  <Card
    title="Days under 8 hours"
    subtitle="Shortfalls in the last 14 working days. 5 days, 5h 12m short in total."
  >
    <div className="space-y-3">
      {shortDays.map((d) => (
        <div key={d.day} className="flex items-center gap-4 bg-slate-100 rounded-xl px-4 py-3">
          <div className="w-14">
            <div className="text-sm font-bold text-slate-900">{d.day}</div>
            <div className="text-[10px] text-slate-500">Nov</div>
          </div>
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-orange-600" style={{ width: `${d.pct}%` }} />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {d.worked} worked · {d.range}
            </div>
          </div>
          <div className="text-sm font-bold text-orange-700">−{d.short}</div>
        </div>
      ))}
    </div>
  </Card>
);

/* ---------- Timesheet status ---------- */
const Donut = () => {
  const total = donut.reduce((a, b) => a + b.value, 0);
  const r = 44;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative w-40 h-40 shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        {donut.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.name}
              cx="60" cy="60" r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{total}</span>
        <span className="text-[10px] text-sky-600">timesheets</span>
      </div>
    </div>
  );
};

const Timesheet = () => (
  <Card
    title="Timesheet status"
    subtitle="Last 8 weeks, and where this week's sheet stands."
    className="h-full"
  >
    {/* Stepper */}
    <div className="flex justify-end mb-4">
      <div className="relative w-80 flex justify-between">
        <div className="absolute top-2 left-4 right-4 h-0.5 bg-slate-200" />
        <div className="absolute top-2 left-4 w-1/3 h-0.5 bg-emerald-600" />
        {steps.map((s, i) => (
          <div key={s} className="relative flex flex-col items-center w-16">
            <span
              className={`w-4 h-4 rounded-full border-2 bg-white ${
                i === 0 ? "bg-emerald-600 border-emerald-600"
                : i === 1 ? "border-indigo-700"
                : "border-slate-200 bg-slate-200"
              }`}
            />
            <span className={`text-[10px] mt-1 text-center ${i <= 1 ? "text-slate-900" : "text-slate-500"}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-6">
      <Donut />
      <div className="flex-1 min-w-[220px]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {weeks.map((w) => (
            <div key={w.label} className={`rounded-lg p-2.5 ${w.cls}`}>
              <div className="text-[11px] font-bold">{w.label}</div>
              <div className="text-[11px] mt-1">{w.status}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 text-xs text-slate-700">
          {donut.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <i className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
              {s.name} <b>{s.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Card>
);

/* ---------- Page ---------- */
const Dashboard = () => {
  return (
    <div className="space-y-5">
      <Header />

      <div className="grid lg:grid-cols-[1.45fr_1fr] gap-5">
        <Progress />
        <Calendar />
      </div>

      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-5">
        <UnderEight />
        <Timesheet />
      </div>
    </div>
  );
};

export default Dashboard;