import { useCallback, useEffect, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../api/axios";
import CompanyNavbar from "../components/company/CompanyNavbar";
import CompanySidebar from "../components/company/CompanySidebar";

// Tailwind `lg` breakpoint. Below this the sidebar is an overlay drawer,
// at/above it the sidebar sits beside the content (desktop behaviour).
const DESKTOP_QUERY = "(min-width: 1024px)";

const isDesktopNow = () =>
  typeof window === "undefined" ? true : window.matchMedia(DESKTOP_QUERY).matches;

const CompanyLayout = () => {
  // Desktop: open by default. Mobile / tablet: closed by default.
  const [sidebarOpen, setSidebarOpen] = useState(isDesktopNow);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const { companyId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Screen crosses the breakpoint (rotate phone / resize window):
  // open on desktop, closed on mobile + tablet.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setSidebarOpen(e.matches);

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // On mobile / tablet, close the drawer after going to another page.
  useEffect(() => {
    if (!isDesktopNow()) setSidebarOpen(false);
  }, [pathname]);

  const loadCompany = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get(`/companies/workspace/${companyId}`);

      const result = response.data;

      if (!result.success || !result.company) {
        throw new Error(result.message || "Failed to load company.");
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
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
        <p className="text-center text-sm text-slate-600 sm:text-base">
          Loading company workspace...
        </p>
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="min-h-dvh bg-slate-100">
      <CompanyNavbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        company={company}
        onLogout={handleLogout}
      />

      <div className="flex">
        <CompanySidebar
          open={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
        />

        <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CompanyLayout;