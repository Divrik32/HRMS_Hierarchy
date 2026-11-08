import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import dns from "dns";
import connectDB from "./config/db.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import timesheetRoutes from "./routes/timesheetRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import roleHierarchyRoutes from "./routes/roleHierarchyRoutes.js";
import absentRoutes from "./routes/absentRoutes.js";
import { startWeeklyTimesheetReminderCron } from "./services/weeklyTimesheetReminder.js";
import { startLeaveAccrualJob } from "./jobs/leaveAccrualJob.js";
dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://hrms.wsdstech.com"
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Uploaded files
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// API routes
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/timesheets", timesheetRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/role-hierarchy", roleHierarchyRoutes);
app.use("/api/absent", absentRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "HRMS Server is running",
  });
});

const PORT = process.env.PORT || 5003;

const startServer = async () => {
  try {
    await connectDB();

    await startLeaveAccrualJob();

    app.listen(PORT, () => {
      console.log(`HRMS Server running on port ${PORT}`);
      startWeeklyTimesheetReminderCron();
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();