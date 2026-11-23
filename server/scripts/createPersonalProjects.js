import Company from "../models/Company.js";
import Project from "../models/Project.js";

export const createPersonalProjectsForAllCompanies = async () => {
  try {
    const companies = await Company.find({}, "_id");

    let created = 0;
    let skipped = 0;

    for (const company of companies) {
      const existingProject = await Project.findOne({
        companyId: company._id,
        projectName: "Personal",
      });

      if (existingProject) {
        skipped++;
        continue;
      }

      await Project.create({
        projectName: "Personal",
        clientName: "Personal",
        projectDetails: "Personal Work",
        projectDescription: "Personal",
        remarks: "",
        companyId: company._id,
        status: "active",
      });

      created++;
    }

    console.log("Personal Projects Setup Completed");
    console.log("Created:", created);
    console.log("Skipped:", skipped);
    console.log("Total Companies:", companies.length);

    return {
      success: true,
      created,
      skipped,
      totalCompanies: companies.length,
    };
  } catch (error) {
    console.error("Personal Project Setup Error:", error);
    throw error;
  }
};

createPersonalProjectsForAllCompanies();