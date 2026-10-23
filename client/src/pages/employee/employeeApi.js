
import api from "../../api/axios";

export const getEmployeeProfile = async () => {
  const response = await api.get("/employees/profile/me", {
    withCredentials: true,
  });

  return response.data.employee ?? response.data;
};

export const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id ?? value.id ?? "");
};

export const getEmployeeId = (employee) =>
  getId(employee?._id ?? employee?.id);

export const getProjectId = (project) =>
  getId(project?._id ?? project?.id);

export const getRoleName = (role) =>
  typeof role === "string" ? role : role?.roleName ?? "Not assigned";

export const verifyEmployeeRoute = (routeEmployeeId, employee) => {
  const loggedInEmployeeId = getEmployeeId(employee);

  return Boolean(
    routeEmployeeId &&
    loggedInEmployeeId &&
    routeEmployeeId === loggedInEmployeeId
  );
};
