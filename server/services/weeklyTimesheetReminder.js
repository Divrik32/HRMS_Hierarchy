import cron from "node-cron";
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import Timesheet from "../models/TimesheetModel.js";
import sendEmail from "../utils/sendEmail.js";

const getPreviousWeekRange = () => {
  // Asia/Kolkata local calendar date
  const now = new Date();

  const indiaDate = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  );

  // Previous week's Sunday 00:00
  const day = indiaDate.getDay();
  const thisSunday = new Date(indiaDate);
  thisSunday.setHours(0, 0, 0, 0);
  thisSunday.setDate(thisSunday.getDate() - day);

  const previousSunday = new Date(thisSunday);
  previousSunday.setDate(previousSunday.getDate() - 7);

  // Following Sunday 00:00 (exclusive)
  return {
    start: previousSunday,
    end: thisSunday,
  };
};

const formatDate = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });

export const sendWeeklyTimesheetReminders = async () => {
  const { start, end } = getPreviousWeekRange();

  console.log(
    `[Weekly Timesheet Reminder] Checking ${start.toISOString()} to ${end.toISOString()}`
  );

  // Find only unaudited timesheets from the previous Sunday-Saturday.
  const pendingTimesheets = await Timesheet.find({
    startTime: {
      $gte: start,
      $lt: end,
    },
    approvalStatus: "Pending",
  })
    .populate({
      path: "employeeId",
      select: "name empId email companyId roleId status",
    })
    .lean();

  if (pendingTimesheets.length === 0) {
    console.log(
      "[Weekly Timesheet Reminder] No pending timesheets. No email sent."
    );
    return;
  }

  // Remove records whose employee is missing/inactive.
  const validTimesheets = pendingTimesheets.filter(
    (sheet) =>
      sheet.employeeId &&
      sheet.employeeId.status === "active" &&
      sheet.employeeId.roleId &&
      sheet.employeeId.companyId
  );

  if (validTimesheets.length === 0) {
    console.log(
      "[Weekly Timesheet Reminder] No eligible employee records found."
    );
    return;
  }

  const companyIds = [
    ...new Set(
      validTimesheets.map((sheet) =>
        sheet.companyId.toString()
      )
    ),
  ];

  // Load roles for all affected companies.
  const roles = await Role.find({
    companyId: { $in: companyIds },
  })
    .select("_id companyId roleName parentRoleId")
    .lean();

  const roleById = new Map(
    roles.map((role) => [role._id.toString(), role])
  );

  // Group pending records by the grandparent role.
  const remindersByRecipientRole = new Map();

  for (const sheet of validTimesheets) {
    const employee = sheet.employeeId;
    const employeeRole = roleById.get(employee.roleId.toString());

    if (!employeeRole || !employeeRole.parentRoleId) {
      // No parent role, so no parent/grandparent audit chain.
      continue;
    }

    const parentRole = roleById.get(
      employeeRole.parentRoleId.toString()
    );

    if (!parentRole || !parentRole.parentRoleId) {
      // No grandparent role available to receive the reminder.
      continue;
    }

    const grandparentRole = roleById.get(
      parentRole.parentRoleId.toString()
    );

    if (!grandparentRole) continue;

    const recipientKey = `${employee.companyId.toString()}_${grandparentRole._id.toString()}`;

    if (!remindersByRecipientRole.has(recipientKey)) {
      remindersByRecipientRole.set(recipientKey, {
        companyId: employee.companyId,
        grandparentRole,
        pendingByParentRole: new Map(),
      });
    }

    const reminder = remindersByRecipientRole.get(recipientKey);
    const parentKey = parentRole._id.toString();

    if (!reminder.pendingByParentRole.has(parentKey)) {
      reminder.pendingByParentRole.set(parentKey, {
        roleName: parentRole.roleName,
        employees: new Map(),
      });
    }

    const parentGroup = reminder.pendingByParentRole.get(parentKey);
    const employeeKey = employee._id.toString();

    if (!parentGroup.employees.has(employeeKey)) {
      parentGroup.employees.set(employeeKey, {
        name: employee.name,
        empId: employee.empId,
        timesheets: [],
      });
    }

    parentGroup.employees.get(employeeKey).timesheets.push({
      task: sheet.task,
      projectName: sheet.projectName || "",
      startTime: sheet.startTime,
      endTime: sheet.endTime,
    });
  }

  for (const reminder of remindersByRecipientRole.values()) {
    const recipients = await Employee.find({
      companyId: reminder.companyId,
      roleId: reminder.grandparentRole._id,
      status: "active",
    })
      .select("name email")
      .lean();

    if (recipients.length === 0) continue;

    const parentSections = [];

    for (const [parentRoleId, parentGroup] of reminder.pendingByParentRole) {
      const parentEmployees = await Employee.find({
        companyId: reminder.companyId,
        roleId: parentRoleId,
        status: "active",
      })
        .select("name empId")
        .lean();

      const parentEmployeeNames = parentEmployees
        .map(
          (employee) =>
            `${escapeHtml(employee.name)} (${escapeHtml(employee.empId)})`
        )
        .join(", ");

      const employeeSections = [];

      for (const employee of parentGroup.employees.values()) {
        const timesheetRows = employee.timesheets
          .map(
            (sheet) => `
              <tr>
                <td style="padding:8px;border:1px solid #ddd;">
                  ${escapeHtml(sheet.task)}
                </td>
                <td style="padding:8px;border:1px solid #ddd;">
                  ${escapeHtml(sheet.projectName || "—")}
                </td>
                <td style="padding:8px;border:1px solid #ddd;">
                  ${sheet.startTime ? formatDate(sheet.startTime) : "—"}
                </td>
              </tr>
            `
          )
          .join("");

        employeeSections.push(`
          <h4 style="margin-bottom:6px;">
            ${escapeHtml(employee.name)}
            (${escapeHtml(employee.empId)})
          </h4>

          <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
            <thead>
              <tr>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Task</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Project</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Work Date</th>
              </tr>
            </thead>
            <tbody>${timesheetRows}</tbody>
          </table>
        `);
      }

      parentSections.push(`
        <section style="margin:20px 0;">
          <h3>Parent Role: ${escapeHtml(parentGroup.roleName)}</h3>

          <p>
            <strong>Active employees in this parent role:</strong>
            ${parentEmployeeNames || "No active employee found"}
          </p>

          ${employeeSections.join("")}
        </section>
      `);
    }

    const html = `
      <div style="font-family:Arial,sans-serif;color:#222;line-height:1.6;">
        <h2>Weekly Timesheet Audit Reminder</h2>

        <p>
          The following timesheets are still pending audit for
          <strong>${formatDate(start)} to ${formatDate(
            new Date(end.getTime() - 1)
          )}</strong>.
        </p>

        <p>Please review the pending timesheets and ensure they are audited.</p>

        ${parentSections.join("")}

        <p style="color:#666;font-size:12px;">
          This is an automatically generated weekly reminder.
        </p>
      </div>
    `;

    const subject = `Weekly Timesheet Audit Reminder — ${formatDate(start)} to ${formatDate(
      new Date(end.getTime() - 1)
    )}`;

    for (const recipient of recipients) {
      if (!recipient.email) continue;

      try {
        await sendEmail(recipient.email, subject, html);
        console.log(
          `[Weekly Timesheet Reminder] Email sent to ${recipient.email}`
        );
      } catch (error) {
        console.error(
          `[Weekly Timesheet Reminder] Failed for ${recipient.email}:`,
          error.message
        );
      }
    }
  }
};

export const startWeeklyTimesheetReminderCron = () => {
  // Every Monday at 12:00 PM India time.
  cron.schedule(
    "0 12 * * 1",
    async () => {
      try {
        await sendWeeklyTimesheetReminders();
      } catch (error) {
        console.error(
          "[Weekly Timesheet Reminder] Job failed:",
          error
        );
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log(
    "[Weekly Timesheet Reminder] Scheduled for every Monday at 12:00 PM IST."
  );
};
