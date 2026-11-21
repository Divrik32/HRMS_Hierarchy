import { useState, useEffect } from "react";
import api from "../../api/axios";
import { toast } from "react-toastify";

/* ---------- Employee Profile API ---------- */

const API_BASE_URL = api.defaults.baseURL.replace(/\/+$/, "");

const EMPLOYEE_PROFILE_URL = "/employees/profile/me";

const ATTENDANCE_REPORT_URL = "/attendance/last-18-days-working-report";

const TIMESHEET_WEEKLY_STATUS_URL = "/timesheets/my-weekly-status";

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
const getCheckInTimestamp = (attendance) => {
  if (!attendance?.checkIn) return null;

  const checkIn = String(attendance.checkIn).trim();

  // Full ISO date-time
  if (/^\d{4}-\d{2}-\d{2}T/.test(checkIn)) {
    const timestamp = new Date(checkIn).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  const attendanceDate =
    attendance.attendanceDate ||
    attendance.date ||
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const timestamp = new Date(
    `${String(attendanceDate).slice(0, 10)}T${checkIn}+05:30`
  ).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};
/* ---------- Header ---------- */


const Header = () => {
  const [seconds, setSeconds] = useState(0);
  const [attendance, setAttendance] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [employee, setEmployee] = useState(null);

  const fetchAttendance = async () => {
    try {
      const response = await api.get("/attendance/my-attendance");
      const result = response.data;

      const records = Array.isArray(result.attendance)
        ? result.attendance
        : Array.isArray(result.records)
        ? result.records
        : result.attendance
        ? [result.attendance]
        : [];

      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const todayRecord = records.find((record) => {
        const date = record.attendanceDate || record.date;
        return date && String(date).slice(0, 10) === today;
      });

      setAttendance(todayRecord || null);
    } catch (error) {
      console.error(
        "Attendance Fetch Error:",
        error.response?.data || error.message
      );
    }
  };

  useEffect(() => {
    let active = true;

    const fetchEmployeeProfile = async () => {
      try {
        const response = await api.get(EMPLOYEE_PROFILE_URL);

        if (!response.data.success) {
          throw new Error(
            response.data.message || "Unable to load employee profile."
          );
        }

        if (active) {
          setEmployee(response.data.employee);
        }
      } catch (error) {
        console.error(
          "Employee Profile Error:",
          error.response?.data || error.message
        );
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    fetchEmployeeProfile();
    fetchAttendance();

    // EmployeeAttendance থেকে attendance change হলে refresh
    const handleAttendanceUpdate = () => {
      fetchAttendance();
    };

    window.addEventListener(
      "employee-attendance-updated",
      handleAttendanceUpdate
    );

    return () => {
      active = false;
      window.removeEventListener(
        "employee-attendance-updated",
        handleAttendanceUpdate
      );
    };
  }, []);

  const isCheckedIn = Boolean(attendance?.checkIn);
  const isCheckedOut = Boolean(attendance?.checkOut);
  const running = isCheckedIn && !isCheckedOut;

useEffect(() => {
  if (!attendance?.checkIn) {
    setSeconds(0);
    return;
  }

  const checkInTime = getCheckInTimestamp(attendance);

  if (!checkInTime) {
    setSeconds(0);
    return;
  }

  // Check Out হলে Check Out time, নাহলে বর্তমান সময়
  const endTime = attendance.checkOut
    ? new Date(attendance.checkOut).getTime()
    : Date.now();

  if (Number.isNaN(endTime)) {
    setSeconds(0);
    return;
  }

  const elapsed = Math.max(
    0,
    Math.floor((endTime - checkInTime) / 1000)
  );

  setSeconds(elapsed);

  // Check Out হয়ে গেলে timer আর চলবে না
  if (attendance.checkOut) return;

  const interval = setInterval(() => {
    setSeconds(
      Math.max(0, Math.floor((Date.now() - checkInTime) / 1000))
    );
  }, 1000);

  return () => clearInterval(interval);
}, [
  attendance?.checkIn,
  attendance?.checkOut,
  attendance?.attendanceDate,
  attendance?.date,
]);

  const notifyAttendanceUpdate = () => {
    window.dispatchEvent(new Event("employee-attendance-updated"));
  };

  const handleStartDay = async () => {
    if (actionLoading || running || isCheckedOut) return;

    try {
      setActionLoading(true);

      const response = await api.post("/attendance/check-in");

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Unable to check in."
        );
      }

      toast.success(response.data.message || "Check-in successful.");

      await fetchAttendance();
      notifyAttendanceUpdate();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Check-in failed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndDay = () => {
    if (actionLoading || !running) return;

    toast.info(
      <div>
        <p className="font-semibold text-sm">
          Are you sure you want to end your day?
        </p>

        <p className="text-xs mt-1">
          This will check you out for today.
        </p>

        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={() => toast.dismiss()}
            className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={async () => {
              toast.dismiss();

              try {
                setActionLoading(true);

                const response = await api.patch(
                  "/attendance/check-out"
                );

                if (!response.data.success) {
                  throw new Error(
                    response.data.message || "Unable to check out."
                  );
                }

                toast.success(
                  response.data.message || "Check-out successful."
                );

                await fetchAttendance();
                notifyAttendanceUpdate();
              } catch (error) {
                toast.error(
                  error.response?.data?.message ||
                  error.message ||
                  "Check-out failed."
                );
              } finally {
                setActionLoading(false);
              }
            }}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            OK
          </button>
        </div>
      </div>,
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }
    );
  };

  const pad = (n) => String(n).padStart(2, "0");

  const time = `${pad(Math.floor(seconds / 3600))}:${pad(
    Math.floor((seconds % 3600) / 60)
  )}:${pad(seconds % 60)}`;

  const employeeName = employee?.name || "Employee";
  const profilePic = employee?.profilePic?.trim();
  const API_ORIGIN = new URL(API_BASE_URL).origin;

  const profilePicUrl = profilePic
    ? profilePic.startsWith("http")
      ? profilePic
      : profilePic.startsWith("/uploads/")
      ? `${API_ORIGIN}${profilePic}`
      : profilePic.startsWith("uploads/")
      ? `${API_ORIGIN}/${profilePic}`
      : `${API_ORIGIN}/uploads/${profilePic.replace(/^\/+/, "")}`
    : null;

  const initials = employeeName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const employeeRole = employee?.roleId?.roleName || "—";
  const employeeId = employee?.empId || "—";
  const department = employee?.departmentId?.departmentName || "—";
  const joiningDate = employee?.joiningDate || "—";
  const reportsTo = employee?.reportsTo || "—";

  return (
    <div className="rounded-2xl bg-[#348aaf] text-white px-6 py-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-14 h-14 shrink-0 rounded-full p-[3px] border-2 border-orange-500 flex items-center justify-center overflow-hidden">
          {profileLoading ? (
            <div className="w-full h-full rounded-full bg-[#4f2ff5] flex items-center justify-center font-bold">
              ...
            </div>
          ) : profilePicUrl ? (
            <img
              src={profilePicUrl}
              alt={employeeName}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling.style.display = "flex";
              }}
            />
          ) : null}

          <div
            className={`w-full h-full rounded-full bg-[#4f2ff5] items-center justify-center font-bold ${
              profileLoading || !profilePicUrl ? "flex" : "hidden"
            }`}
          >
            {profileLoading ? "..." : initials}
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight">
            {profileLoading ? "Loading..." : employeeName}
          </h1>

          <p className="text-sm mt-0.5">
            {profileLoading
              ? "Loading employee profile..."
              : `${employeeRole} · ${employeeId} · ${department}`}
          </p>

          {!profileLoading && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0b2f45]">
                Joined {joiningDate}
              </span>

              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0b2f45]">
                Reports to {reportsTo}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="text-4xl font-bold tracking-wider tabular-nums">
          {time}
        </div>

        <p className="text-[11px] text-yellow-200 mt-1">
          {running
            ? "Running"
            : isCheckedOut
            ? "Day completed"
            : "Not started"}
        </p>

        <div className="flex gap-3 justify-end mt-3">
          <button
            onClick={handleStartDay}
            disabled={running || isCheckedOut || actionLoading || profileLoading}
            className="px-5 py-2 rounded-lg bg-[#02e8ab] text-slate-900 text-sm font-semibold border-b-2 border-[#017a56] shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-all duration-150 hover:-translate-y-px hover:brightness-120 active:translate-y-px disabled:bg-[#00d38a]/50 disabled:text-slate-900/60 disabled:border-transparent disabled:shadow-none disabled:cursor-not-allowed"
          >
            {actionLoading && !running ? "Please wait..." : "Start day"}
          </button>

          <button
            onClick={handleEndDay}
            disabled={!running || actionLoading}
            className="px-5 py-2 rounded-lg bg-[#f70254] text-white text-sm font-semibold border-b-2 border-[#7d2340] shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-all duration-150 enabled:hover:-translate-y-px enabled:hover:brightness-120 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
          >
            End day
          </button>
        </div>
      </div>
    </div>
  );
};


/* ---------- Attendance API ---------- */

const formatMinutes = (minutes = 0) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
};

const formatDay = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

/* ---------- Progress ---------- */
const Progress = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

   const fetchReport = async () => {
  try {
    const response = await api.get(ATTENDANCE_REPORT_URL);

    const result = response.data;

    if (!result.success) {
      throw new Error(
        result.message || "Unable to load attendance report."
      );
    }

    if (active) {
      setReport(result);
      setError("");
    }
  } catch (err) {
    if (active) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load attendance report."
      );
    }
  } finally {
    if (active) {
      setLoading(false);
    }
  }
};

    fetchReport();

    // Running attendance থাকলে প্রতি মিনিটে refresh হবে।
    const interval = setInterval(fetchReport, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const records = report?.records || [];

  const validRecords = records.filter(
    (record) => record.workingMinutes !== null &&
                record.workingMinutes !== undefined
  );

  const totalMinutes = validRecords.reduce(
    (sum, record) => sum + Number(record.workingMinutes || 0),
    0
  );

  const averageMinutes = validRecords.length
    ? Math.round(totalMinutes / validRecords.length)
    : 0;

  const daysAtLeast8Hours = validRecords.filter(
    (record) => Number(record.workingMinutes) >= 480
  ).length;

  const daysUnder8Hours = validRecords.filter(
    (record) => Number(record.workingMinutes) < 480
  ).length;

  const dailyRecords = [...records].slice(-18);

  const maxMinutes = Math.max(
    528,
    ...dailyRecords.map((record) => Number(record.workingMinutes || 0))
  );

  return (
    <Card
      title="Progress this month"
      subtitle="Daily working hours for your last 18 attendance days. Target is 8 hours."
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Loading attendance report...
        </div>
      ) : error ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              value={formatMinutes(totalMinutes)}
              label="Hours logged"
            />
            <Stat
              value={formatMinutes(averageMinutes)}
              label="Daily average"
            />
            <Stat
              value={`${daysAtLeast8Hours}/${validRecords.length}`}
              label="Days at 8 hours or more"
            />
            <Stat
              value={`${daysUnder8Hours} days`}
              label="Days under 8 hours"
            />
          </div>

          {dailyRecords.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No check-in records found.
            </div>
          ) : (
            <>
              <div className="relative mt-6 h-40">
                {/* 8-hour target line */}
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-slate-400 z-10"
                  style={{ bottom: `${(480 / maxMinutes) * 100}%` }}
                />

                <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2">
                  {dailyRecords.map((record, index) => {
                    const minutes = Number(record.workingMinutes || 0);
                    const isRunning = record.isRunning === true;

                    return (
                      <div
                        key={`${record.attendanceDate}-${index}`}
                        className="flex-1 h-full flex items-end min-w-0"
                        title={`${formatDay(record.attendanceDate)}: ${
                          record.workingMinutes == null
                            ? "No completed duration"
                            : formatMinutes(minutes)
                        }${isRunning ? " (Running)" : ""}`}
                      >
                        <div
                          className={`w-full rounded-t ${
                            isRunning
                              ? "bg-emerald-600"
                              : minutes >= 480
                              ? "bg-indigo-600"
                              : "bg-orange-600"
                          }`}
                          style={{
                            height: `${
                              record.workingMinutes == null
                                ? 0
                                : Math.max(2, (minutes / maxMinutes) * 100)
                            }%`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-1.5 sm:gap-2 mt-1">
                {dailyRecords.map((record, index) => (
                  <span
                    key={`${record.attendanceDate}-label-${index}`}
                    className="flex-1 min-w-0 text-center text-[9px] sm:text-[10px] text-slate-500"
                  >
                    {record.attendanceDate?.slice(-2)}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <i className="w-2 h-2 rounded-sm bg-indigo-600" />
                  8 hours or more
                </span>
                <span className="flex items-center gap-1">
                  <i className="w-2 h-2 rounded-sm bg-orange-600" />
                  Under 8 hours
                </span>
                <span className="flex items-center gap-1">
                  <i className="w-2 h-2 rounded-full bg-emerald-600" />
                  Today, running
                </span>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
};

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
const UnderEight = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

const fetchReport = async () => {
  try {
    const response = await api.get(ATTENDANCE_REPORT_URL);

    const result = response.data;

    if (!result.success) {
      throw new Error(
        result.message || "Unable to load attendance report."
      );
    }

    if (active) {
      setRecords(result.records || []);
      setError("");
    }
  } catch (err) {
    if (active) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load attendance report."
      );
    }
  } finally {
    if (active) {
      setLoading(false);
    }
  }
};

    fetchReport();

    const interval = setInterval(fetchReport, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

const shortRecords = records
  .filter(
    (record) =>
      record.workingMinutes !== null &&
      record.workingMinutes !== undefined &&
      Number(record.workingMinutes) < 480
  )
  .reverse()
  .slice(0, 4);

  const totalShortfall = shortRecords.reduce(
    (sum, record) =>
      sum + Math.max(0, 480 - Number(record.workingMinutes || 0)),
    0
  );

  const formatTime = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
  };

  return (
    <Card
      title="Days under 8 hours"
      subtitle={
        loading
          ? "Loading attendance records..."
          : `${shortRecords.length} days, ${formatMinutes(totalShortfall)} short in total.`
      }
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Loading attendance records...
        </div>
      ) : error ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : shortRecords.length === 0 ? (
        <div className="rounded-xl bg-emerald-50 p-5 text-center text-sm text-emerald-700">
          Great! No attendance days below 8 hours.
        </div>
      ) : (
        <div className="space-y-3">
          {shortRecords.slice(0, 8).map((record, index) => {
            const workedMinutes = Number(record.workingMinutes || 0);
            const shortMinutes = Math.max(0, 480 - workedMinutes);
            const percentage = Math.min(100, (workedMinutes / 480) * 100);

            return (
              <div
                key={`${record.attendanceDate}-${index}`}
                className="flex items-center gap-3 sm:gap-4 bg-slate-100 rounded-xl px-3 sm:px-4 py-3"
              >
                <div className="w-14 shrink-0">
                  <div className="text-sm font-bold text-slate-900">
                    {formatDay(record.attendanceDate)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {record.attendanceDate
                      ? new Date(
                          `${record.attendanceDate}T00:00:00`
                        ).toLocaleDateString("en-IN", {
                          weekday: "short",
                        })
                      : ""}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        record.isRunning
                          ? "bg-emerald-600"
                          : "bg-orange-600"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-slate-500 mt-1">
                    {formatMinutes(workedMinutes)} worked
                    {" · "}
                    {formatTime(record.checkIn)} to{" "}
                    {record.isRunning ? "Running" : formatTime(record.checkOut)}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {record.isRunning ? (
                    <div className="text-[10px] font-semibold text-emerald-700">
                      Running
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-orange-700">
                      −{formatMinutes(shortMinutes)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};


/* ---------- Timesheet status ---------- */

const statusConfig = {
  Approved: {
    color: "#0f8a6a",
    text: "text-emerald-800",
    bg: "bg-emerald-100",
    label: "Approved",
  },
  Rejected: {
    color: "#dc2626",
    text: "text-red-800",
    bg: "bg-red-100",
    label: "Rejected",
  },
  Pending: {
    color: "#d97706",
    text: "text-amber-800",
    bg: "bg-amber-100",
    label: "Pending",
  },
  "Updated Pending": {
    color: "#4f46e5",
    text: "text-indigo-800",
    bg: "bg-[#b546e5]/40",
    label: "Updated Pending",
  },
  "No timesheets": {
  color: "#d97706",
  text: "text-amber-800",
  bg: "bg-amber-100",
  label: "No timesheets",
},
};

const summaryItems = [
  {
    key: "approved",
    label: "Approved",
    color: "#0f8a6a",
  },
  {
    key: "pending",
    label: "Pending",
    color: "#d97706",
  },
  {
    key: "updatedPending",
    label: "Updated Pending",
    color: "#bd46e5",
  },
  {
    key: "rejected",
    label: "Rejected",
    color: "#dc2626",
  },
];

/* ---------- Dynamic Donut ---------- */

const Donut = ({ summary = {} }) => {
  const total = Number(summary.totalTimesheets || 0);

  const r = 44;
  const circumference = 2 * Math.PI * r;

  const segments = summaryItems.map((item) => ({
    ...item,
    value: Number(summary[item.key] || 0),
  }));

  let offset = 0;

  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full -rotate-90"
      >
        {total === 0 ? (
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="16"
          />
        ) : (
          segments.map((segment) => {
            if (segment.value <= 0) return null;

            const length =
              (segment.value / total) * circumference;

            const circle = (
              <circle
                key={segment.key}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );

            offset += length;

            return circle;
          })
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">
          {total}
        </span>

        <span className="text-[10px] text-sky-600">
          timesheets
        </span>
      </div>
    </div>
  );
};

/* ---------- Weekly Timesheet Status ---------- */

const Timesheet = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWeeklyStatus = async () => {
  try {
    const response = await api.get(
      TIMESHEET_WEEKLY_STATUS_URL
    );

    const result = response.data;

    if (!result.success) {
      throw new Error(
        result.message || "Unable to load timesheet status."
      );
    }

    setData(result);
    setError("");
  } catch (err) {
    setError(
      err.response?.data?.message ||
      err.message ||
      "Failed to load timesheet status."
    );
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchWeeklyStatus();

    return () => {};
  }, []);

  const summary = data?.summary || {};

  const weeks = data?.weeks || [];

  const currentWeek = weeks[weeks.length - 1];

  const getStatusStyle = (status) => {
    return statusConfig[status] || statusConfig["No timesheets"];
  };

  const getWeekCount = (week) => {
    return Number(week.totalTimesheets || 0);
  };

  return (
    <Card
      title="Timesheet status"
      subtitle="Last 8 weeks, and where this week's sheet stands."
      className="h-full"
    >
      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          Loading timesheet status...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchWeeklyStatus();
            }}
            className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* CURRENT WEEK STATUS */}

          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                  This Week
                </p>

                <h3 className="mt-1 text-sm font-bold text-slate-900">
                  {currentWeek?.weekLabel || "Current Week"}
                </h3>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-lg bg-white px-3 py-2">
                Total: <b>{getWeekCount(currentWeek || {})}</b>
              </span>

              <span className="rounded-lg bg-white px-3 py-2">
                Approved:{" "}
                <b>{currentWeek?.counts?.approved || 0}</b>
              </span>

              <span className="rounded-lg bg-white px-3 py-2">
                Pending:{" "}
                <b>{currentWeek?.counts?.pending || 0}</b>
              </span>

              <span className="rounded-lg bg-white px-3 py-2">
                Updated Pending:{" "}
                <b>{currentWeek?.counts?.updatedPending || 0}</b>
              </span>

              <span className="rounded-lg bg-white px-3 py-2">
                Rejected:{" "}
                <b>{currentWeek?.counts?.rejected || 0}</b>
              </span>
            </div>
          </div>

          {/* WEEKLY RECORDS */}

          <div className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">
                Weekly Overview
              </h3>

              <span className="text-[10px] text-slate-500">
                {weeks.length} weeks
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {weeks.slice(-4).map((week, index) => {
                const style = getStatusStyle(week.status);

                const isCurrentWeek = week.weekStart === currentWeek?.weekStart;

                return (
                  <div
                    key={week.weekStart || index}
                    className={`rounded-xl border p-3 transition ${
                      isCurrentWeek
                        ? "border-blue-300 ring-1 ring-blue-100"
                        : "border-slate-100"
                    } ${style.bg}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-[10px] font-bold ${style.text}`}>
                        {week.weekLabel}
                      </p>

                      {isCurrentWeek && (
                        <span className="rounded bg-white/80 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">
                          CURRENT
                        </span>
                      )}
                    </div>

                    <p className={`mt-2 text-xs font-semibold ${style.text}`}>
                      {week.status}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-600">
                      {getWeekCount(week)} timesheet(s)
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-slate-600">
                      {(week.counts?.approved || 0) > 0 && (
                        <span>
                          A: {week.counts.approved}
                        </span>
                      )}

                      {(week.counts?.pending || 0) > 0 && (
                        <span>
                          P: {week.counts.pending}
                        </span>
                      )}

                      {(week.counts?.updatedPending || 0) > 0 && (
                        <span>
                          UP: {week.counts.updatedPending}
                        </span>
                      )}

                      {(week.counts?.rejected || 0) > 0 && (
                        <span>
                          R: {week.counts.rejected}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SUMMARY AND DONUT */}

          <div className="border-t border-slate-100 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">
                Last 8 Weeks Summary
              </h3>

              <span className="text-[10px] text-slate-500">
                {summary.totalTimesheets || 0} total
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <Donut summary={summary} />

              <div className="min-w-[180px] flex-1 space-y-3">
                {summaryItems.map((item) => {
                  const value = Number(
                    summary[item.key] || 0
                  );

                  const percentage =
                    summary.totalTimesheets > 0
                      ? Math.round(
                          (value / summary.totalTimesheets) * 100
                        )
                      : 0;

                  return (
                    <div key={item.key}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <i
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{
                              backgroundColor: item.color,
                            }}
                          />

                          <span className="text-xs text-slate-700">
                            {item.label}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-slate-900">
                          {value}
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};


/* ---------- Page ---------- */
const EmployeeDashboard = () => {
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

export default EmployeeDashboard;