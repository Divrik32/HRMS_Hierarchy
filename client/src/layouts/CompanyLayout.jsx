import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";

import api from "../api/axios";
import CompanyNavbar from "../components/company/CompanyNavbar";
import CompanySidebar from "../components/company/CompanySidebar";

const CompanyLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const { companyId } = useParams();
  const navigate = useNavigate();

  const loadCompany = useCallback(async () => {
    console.log("Company ID:", companyId);
    console.log("Current URL:", window.location.pathname);
    setLoading(true);

    try {
      const response = await api.get(
        `/companies/workspace/${companyId}`
      );

      const result = response.data;

      if (!result.success || !result.company) {
        throw new Error(
          result.message || "Failed to load company."
        );
      }

      setCompany(result.company);
    } catch (error) {
      console.error(
        "Failed to load company:",
        error.response?.data || error.message
      );

      setCompany(null);
      navigate("/super-admin/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [companyId, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await api.post("/companies/logout");
    } catch (error) {
      console.error(
        "Company logout error:",
        error.response?.data || error.message
      );
    } finally {
      setCompany(null);
      navigate("/super-admin/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600">
          Loading company workspace...
        </p>
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <CompanyNavbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        company={company}
        onLogout={handleLogout}
      />

      <div className="flex">
        <CompanySidebar open={sidebarOpen} />

        <main className="flex-1 min-w-0 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CompanyLayout;