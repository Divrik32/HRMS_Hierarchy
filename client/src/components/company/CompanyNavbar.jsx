import { Menu, X, ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
const CompanyNavbar = ({
  sidebarOpen,
  setSidebarOpen,
  company,
  onLogout,
}) => {
  const [dropdown, setDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

const handleLogout = async () => {
  if (loggingOut) return;

  setLoggingOut(true);
  setDropdown(false);

  const toastId = toast.loading("Logging out...");

  try {
    await onLogout();

    toast.update(toastId, {
      render: "Logged out successfully.",
      type: "success",
      isLoading: false,
      autoClose: 2500,
    });
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        err.message ||
        "Failed to log out.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setLoggingOut(false);
  }
};

  const apiBaseUrl =
    import.meta.env.MODE === "production"
      ? "https://api.hrms.wsdstech.com"
      : "http://localhost:5003";

  return (
    <nav className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex justify-between items-center">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          aria-label={
            sidebarOpen ? "Close sidebar" : "Open sidebar"
          }
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <span className="font-semibold text-normal text-gray-800">
          Company Workspace
        </span>
      </div>

      {/* Right Section */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdown(!dropdown)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
          aria-expanded={dropdown}
        >
          <img
            src={
              company?.logo
                ? `${apiBaseUrl}/uploads/companies/${company.logo}`
                : "/default-company-logo.png"
            }
            alt={company?.companyName || "Company logo"}
            className="w-9 h-9 rounded-full object-cover border border-gray-200"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/default-company-logo.png";
            }}
          />

          <div className="hidden sm:block text-left">
            <h3 className="font-semibold text-sm text-gray-800">
              {company?.companyName || "Company Workspace"}
            </h3>

            <p className="text-xs text-gray-500">
              Company Workspace
            </p>
          </div>

          <ChevronDown
            size={16}
            className={`text-gray-500 transition-transform ${
              dropdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdown && (
          <>
            <button
              type="button"
              aria-label="Close dropdown"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setDropdown(false)}
            />

            <div className="absolute right-0 top-full mt-2 z-20 w-48 bg-white border border-gray-200 shadow-lg rounded-xl py-2">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <LogOut size={17} />

                <span>
                  {loggingOut ? "Logging out..." : "Logout"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default CompanyNavbar;