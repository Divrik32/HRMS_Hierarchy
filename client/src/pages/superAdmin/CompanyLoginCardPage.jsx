
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CompanyLoginCard from "../../components/SuperAdmin/CompanyLoginCard";

import api from "../../api/axios";

const CompanyLoginCardPage = () => {
  const { id } = useParams();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCompany = async () => {
      setLoading(true);
      setError("");

      try {
const response = await api.get(`/companies/${id}`);
const result = response.data;

if (!result.success) {
  throw new Error(result.message || "Failed to load company.");
}

        setCompany(result.company);
      } catch (err) {
        setError(err.message || "Unable to load company.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCompany();
    } else {
      setError("Company ID is missing.");
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-600 font-medium">Loading company...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-800">
            Company Not Found
          </h2>

          <p className="text-sm text-red-600 mt-2">
            {error || "The requested company could not be found."}
          </p>
        </div>
      </div>
    );
  }

  return <CompanyLoginCard company={company} />;
};

export default CompanyLoginCardPage;
