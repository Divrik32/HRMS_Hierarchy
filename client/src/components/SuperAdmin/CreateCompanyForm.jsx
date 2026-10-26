
import { useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { Eye, EyeOff } from "lucide-react";

const initialForm = {
  companyName: "",
  companyType: "Private Limited",
  gstNumber: "",
  panNumber: "",
  registeredEmail: "",
  password: "",
  phone: "",
  website: "",
  industry: "",
  address: "",
  status: "active",
};

const inputClass =
  "w-full min-w-0 border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

const CreateCompanyForm = () => {
  const [formData, setFormData] = useState(initialForm);
  const [logo, setLogo] = useState(null);
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e, setFile) => {
    const file = e.target.files?.[0];

    if (!file) {
      setFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      e.target.value = "";
      setFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must not exceed 5 MB.");
      e.target.value = "";
      setFile(null);
      return;
    }

    setFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    const toastId = toast.loading("Creating company...");

    try {
      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });

      if (logo) data.append("logo", logo);
      if (signature) data.append("signature", signature);

      const response = await api.post("/companies", data);
      const result = response.data;

      if (!result.success) {
        throw new Error(
          result.message || "Failed to create company."
        );
      }

      toast.update(toastId, {
        render: "Company registered successfully.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeOnClick: true,
      });

      setFormData(initialForm);
      setLogo(null);
      setSignature(null);

      e.target.reset();

      // Refresh Company Directory in the Sidebar
      window.dispatchEvent(new Event("companies-updated"));
    } catch (err) {
      toast.update(toastId, {
        render:
          err.response?.data?.message ||
          err.message ||
          "Unable to create company. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
        closeOnClick: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm">
      <h2 className="text-2xl font-semibold mb-2 text-slate-800">
        Register Company
      </h2>

      <p className="text-sm text-black-500 mb-7">
        Enter the company details below to register a new company.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium mb-2">
            Company Name *
          </label>
          <input
            name="companyName"
            value={formData.companyName}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                companyName: e.target.value.replace(/[0-9]/g, ""),
              }))
            }
            placeholder="Enter company name"
            className={inputClass}
            required
          />
        </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Company Type *
            </label>
            <select
              name="companyType"
              value={formData.companyType}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="Private Limited">Private Limited</option>
              <option value="Public Limited">Public Limited</option>
              <option value="LLP">LLP</option>
              <option value="Partnership">Partnership</option>
              <option value="Proprietorship">Proprietorship</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              GSTIN
            </label>
            <input
              name="gstNumber"
              value={formData.gstNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  gstNumber: e.target.value.toUpperCase(),
                }))
              }
              placeholder="22ABCDE1234F1Z5"
              maxLength={15}
              minLength={15}
              pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z]Z[0-9A-Za-z]"
              title="GSTIN must contain 15 characters in the prescribed format."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              PAN Number
            </label>
            <input
              name="panNumber"
              value={formData.panNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  panNumber: e.target.value.toUpperCase(),
                }))
              }
              placeholder="ABCDE1234F"
              maxLength={10}
              pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]"
              title="Enter PAN in the format ABCDE1234F."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Registered Email *
            </label>
            <input
              type="email"
              name="registeredEmail"
              value={formData.registeredEmail}
              onChange={handleChange}
              placeholder="registered@example.com"
              className={inputClass}
              required
            />
          </div>


<div>
  <label className="block text-sm font-medium mb-2">
    Company Password *
  </label>

  <div className="relative">
    <input
      type={showPassword ? "text" : "password"}
      name="password"
      value={formData.password}
      onChange={handleChange}
      placeholder="Create a password"
      className={`${inputClass} pr-12`}
      minLength={8}
      autoComplete="new-password"
      required
    />

    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      aria-label={showPassword ? "Hide password" : "Show password"}
      title={showPassword ? "Hide password" : "Show password"}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-700"
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
</div>


<div>
  <label className="block text-sm font-medium mb-2">
    Phone Number *
  </label>

  <div className="flex">
    <div className="flex items-center justify-center px-4 border border-slate-300 border-r-0 rounded-l-lg bg-slate-100 text-slate-700 font-medium">
      +91
    </div>

    <input
      type="tel"
      name="phone"
      value={formData.phone}
      onChange={(e) =>
        setFormData((prev) => ({
          ...prev,
          phone: e.target.value.replace(/\D/g, "").slice(0, 10),
        }))
      }
      placeholder="Enter mobile number"
      inputMode="numeric"
      maxLength={10}
      minLength={10}
      pattern="[6-9][0-9]{9}"
      title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
      className="w-full min-w-0 border border-slate-300 p-3 rounded-r-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      required
    />
  </div>
</div>


          <div>
            <label className="block text-sm font-medium mb-2">
              Website
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Industry
            </label>
            <input
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              placeholder="e.g. Information Technology"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium mb-2">
            Company Address *
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={4}
            placeholder="Enter registered company address"
            className={inputClass}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Company Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setLogo)}
              className={inputClass}
            />
            {logo && (
              <p className="text-xs text-slate-500 mt-2">
                Selected: {logo.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Company Signature
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setSignature)}
              className={inputClass}
            />
            {signature && (
              <p className="text-xs text-slate-500 mt-2">
                Selected: {signature.name}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium mb-2">
            Company Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-7 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition"
        >
          {loading ? "Creating Company..." : "Create Company"}
        </button>
      </form>
    </div>
  );
};

export default CreateCompanyForm;