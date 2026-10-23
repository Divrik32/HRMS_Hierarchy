import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  UserCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../../api/axios";

const Sidebar = ({ open, setSelectedCompany }) => {
  const navigate = useNavigate();

  const [showCompanies, setShowCompanies] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyError, setCompanyError] = useState("");

  const fetchCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    setCompanyError("");

    try {
const response = await api.get("/companies");
const result = response.data;

if (!result.success) {
  throw new Error(result.message || "Failed to create company.");
}

      setCompanies(result.companies || []);
    } catch (error) {
      setCompanyError(error.message || "Unable to load companies.");
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();

    const handleCompaniesUpdated = () => {
      fetchCompanies();
    };

    window.addEventListener("companies-updated", handleCompaniesUpdated);

    return () => {
      window.removeEventListener(
        "companies-updated",
        handleCompaniesUpdated
      );
    };
  }, [fetchCompanies]);

  if (!open) return null;

  const handleCompanyClick = (company) => {
    setSelectedCompany?.(company);
    navigate(`/super-admin/company/${company._id}`);
  };

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-slate-200 min-h-[calc(100vh-64px)] p-4">
      <nav className="space-y-3">
        {/* Dashboard */}
        <Link
          to="/super-admin/dashboard"
          className="flex items-center gap-3 p-3 rounded-lg text-slate-700 hover:bg-slate-100 transition"
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        {/* Register Company */}
        <Link
          to="/super-admin/create-company"
          className="flex items-center gap-3 p-3 rounded-lg text-slate-700 hover:bg-slate-100 transition"
        >
          <Building2 size={20} />
          Register Company
        </Link>

        {/* Company Directory */}
        <button
          type="button"
          onClick={() => setShowCompanies((prev) => !prev)}
          className="w-full flex justify-between items-center p-3 rounded-lg text-slate-700 hover:bg-slate-100 transition"
        >
          <span className="flex items-center gap-3">
            <Building2 size={20} />
            Company Directory
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
              {companies.length}
            </span>
          </span>

          {showCompanies ? (
            <ChevronUp size={18} />
          ) : (
            <ChevronDown size={18} />
          )}
        </button>

        {showCompanies && (
          <div className="ml-4 pl-3 border-l border-slate-200 space-y-1">
            {loadingCompanies && companies.length === 0 && (
              <p className="py-2 text-xs text-slate-500">
                Loading companies...
              </p>
            )}

            {!loadingCompanies && companyError && (
              <div className="py-2">
                <p className="text-xs text-red-600">{companyError}</p>

                <button
                  type="button"
                  onClick={fetchCompanies}
                  className="mt-2 text-xs font-medium text-blue-700 hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loadingCompanies &&
              !companyError &&
              companies.length === 0 && (
                <p className="py-2 text-xs text-slate-500">
                  No companies registered yet.
                </p>
              )}

            {companies.map((company) => (
              <button
                key={company._id}
                type="button"
                onClick={() => handleCompanyClick(company)}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition break-words"
                title={company.companyName}
              >
                {company.companyName}
                {company.status === "inactive" && (
                  <span className="block text-xs text-red-500">
                    Inactive
                  </span>
                )}
              </button>
            ))}

            {companies.length > 0 && (
              <button
                type="button"
                onClick={fetchCompanies}
                disabled={loadingCompanies}
                className="px-3 py-2 text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
              >
                {loadingCompanies ? "Refreshing..." : "Refresh list"}
              </button>
            )}
          </div>
        )}

        {/* My Profile */}
        <Link
          to="/super-admin/profile"
          className="flex items-center gap-3 p-3 rounded-lg text-slate-700 hover:bg-slate-100 transition"
        >
          <UserCircle size={20} />
          My Profile
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;
