import Company from "../models/Company.js";
import Project from "../models/Project.js";

export const createPersonalProjectsForAllCompanies = async () => {
  try {
    const companies = await Company.find({}, "_id");

    let personalCreated = 0;
    let personalSkipped = 0;
    let idleCreated = 0;
    let idleSkipped = 0;

    for (const company of companies) {
      // Personal Project
      const existingPersonal = await Project.findOne({
        companyId: company._id,
        projectName: "Personal",
      });

      if (existingPersonal) {
        personalSkipped++;
      } else {
        await Project.create({
          projectName: "Personal",
          clientName: "Personal",
          projectDetails: "Personal Work",
          projectDescription: "Personal",
          remarks: "",
          companyId: company._id,
          status: "active",
        });

        personalCreated++;
      }

      // Idle Project
      const existingIdle = await Project.findOne({
        companyId: company._id,
        projectName: "Idle",
      });

      if (existingIdle) {
        idleSkipped++;
      } else {
        await Project.create({
          projectName: "Idle",
          clientName: "Idle",
          projectDetails: "Idle Work",
          projectDescription: "Idle",
          remarks: "",
          companyId: company._id,
          status: "active",
        });

        idleCreated++;
      }
    }

    console.log("Personal & Idle Projects Setup Completed");

    console.log("Personal Created:", personalCreated);
    console.log("Personal Skipped:", personalSkipped);

    console.log("Idle Created:", idleCreated);
    console.log("Idle Skipped:", idleSkipped);

    console.log("Total Companies:", companies.length);

    return {
      success: true,
      personalCreated,
      personalSkipped,
      idleCreated,
      idleSkipped,
      totalCompanies: companies.length,
    };
  } catch (error) {
    console.error("Personal & Idle Project Setup Error:", error);
    throw error;
  }
};

createPersonalProjectsForAllCompanies();