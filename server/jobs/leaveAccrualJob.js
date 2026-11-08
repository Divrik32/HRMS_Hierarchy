
import cron from "node-cron";
import Employee from "../models/Employee.js";
import LeaveBalance from "../models/LeaveBalance.js";

// Get current month in Asia/Kolkata timezone: YYYY-MM
const getCurrentMonth = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;

  return `${year}-${month}`;
};

// Initialize leave balance for employees who do not have a document
export const initializeEmployeeLeaveBalances = async () => {
  const currentMonth = getCurrentMonth();

  const employees = await Employee.find({
    companyId: { $exists: true, $ne: null },
  }).select("_id companyId");

  console.log(
    `Checking leave balances for ${employees.length} employees...`
  );

  let createdCount = 0;
  let existingCount = 0;
  let errorCount = 0;

  for (const employee of employees) {
    try {
      const result = await LeaveBalance.updateOne(
        {
          employeeId: employee._id,
          companyId: employee.companyId,
        },
        {
          $setOnInsert: {
            employeeId: employee._id,
            companyId: employee.companyId,
            casualLeave: 0.5,
            sickLeave: 0.5,
            paidLeave: 0.5,
            lastAccrualMonth: currentMonth,
            accrualHistory: [
              {
                month: currentMonth,
                casualLeave: 0.5,
                sickLeave: 0.5,
                paidLeave: 0.5,
                creditedAt: new Date(),
              },
            ],
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        createdCount++;
        console.log(`Leave balance created: ${employee._id}`);
      } else {
        existingCount++;
      }
    } catch (error) {
      if (error.code === 11000) {
        existingCount++;
        continue;
      }

      errorCount++;

      console.error(
        `Leave balance initialization failed for ${employee._id}:`,
        error.message
      );
    }
  }

  console.log("Leave balance initialization completed.");
  console.log(`Created: ${createdCount}`);
  console.log(`Already existed: ${existingCount}`);
  console.log(`Errors: ${errorCount}`);
};

// Credit monthly leave to employees
const creditEmployeeLeave = async (employee, currentMonth) => {
  const { _id: employeeId, companyId } = employee;

  if (!companyId) return;

  const existingBalance = await LeaveBalance.findOne({
    employeeId,
    companyId,
  }).select("_id lastAccrualMonth");

  if (!existingBalance) {
    try {
      await LeaveBalance.create({
        employeeId,
        companyId,
        casualLeave: 0.5,
        sickLeave: 0.5,
        paidLeave: 0.5,
        lastAccrualMonth: currentMonth,
        accrualHistory: [
          {
            month: currentMonth,
            casualLeave: 0.5,
            sickLeave: 0.5,
            paidLeave: 0.5,
            creditedAt: new Date(),
          },
        ],
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }

    return;
  }

  // Do not credit twice in the same month
  if (existingBalance.lastAccrualMonth === currentMonth) return;

  const result = await LeaveBalance.updateOne(
    {
      _id: existingBalance._id,
      lastAccrualMonth: { $ne: currentMonth },
    },
    {
      $inc: {
        casualLeave: 0.5,
        sickLeave: 0.5,
        paidLeave: 0.5,
      },
      $set: {
        lastAccrualMonth: currentMonth,
      },
      $push: {
        accrualHistory: {
          month: currentMonth,
          casualLeave: 0.5,
          sickLeave: 0.5,
          paidLeave: 0.5,
          creditedAt: new Date(),
        },
      },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`Monthly leave credited: ${employeeId}`);
  }
};

// Run monthly leave accrual
export const runMonthlyLeaveAccrual = async () => {
  const currentMonth = getCurrentMonth();

  console.log(`Monthly Leave Accrual started: ${currentMonth}`);

  const employees = await Employee.find({
    status: "active",
  }).select("_id companyId");

  let successCount = 0;
  let errorCount = 0;

  for (const employee of employees) {
    try {
      await creditEmployeeLeave(employee, currentMonth);
      successCount++;
    } catch (error) {
      errorCount++;

      console.error(
        `Leave accrual failed for employee ${employee._id}:`,
        error.message
      );
    }
  }

  console.log(
    `Monthly Leave Accrual completed. Success: ${successCount}, Errors: ${errorCount}`
  );
};

// Run initialization on server startup and schedule monthly cron
export const startLeaveAccrualJob = async () => {
  // Check/create missing leave balance documents on server startup
  await initializeEmployeeLeaveBalances();

  // Run on the 1st day of every month exactly at 12:00 AM
  cron.schedule(
    "0 0 1 * *",
    async () => {
      try {
        await runMonthlyLeaveAccrual();
      } catch (error) {
        console.error("Monthly Leave Accrual Job Error:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("Monthly Leave Accrual Cron Job scheduled at 12:00 AM.");
};
