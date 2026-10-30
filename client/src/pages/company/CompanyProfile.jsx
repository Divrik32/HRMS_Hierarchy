import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Pencil, Save, X, Building2, LoaderCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

const initialForm = {
  companyName: "",
  companyType: "",
  registeredEmail: "",
  gstNumber: "",
  panNumber: "",
  phone: "",
  website: "",
  industry: "",
  address: "",
};

const getCompanyImageUrl = (filename) => {
  if (!filename) return "";

  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }

  const baseURL = api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";

  return `${baseURL}/uploads/companies/${filename.replace(/^\/+/, "")}`;
};

const CompanyProfile = () => {
  const { companyId } = useParams();

  const [form, setForm] = useState(initialForm);
  const [company, setCompany] = useState(null);
  const [logo, setLogo] = useState(null);
  const [signature, setSignature] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [signaturePreview, setSignaturePreview] = useState("");
  const [cropFile, setCropFile] = useState(null);
  const [cropTarget, setCropTarget] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      try {
        const response = await api.get(
          `/companies/workspace/${companyId}`
        );

        const data = response.data.company;

        setCompany(data);
        setLogoPreview(getCompanyImageUrl(data.logo));
        setSignaturePreview(getCompanyImageUrl(data.signature));
        setForm({
          companyName: data.companyName || "",
          companyType: data.companyType || "",
          registeredEmail: data.registeredEmail || "",
          gstNumber: data.gstNumber || "",
          panNumber: data.panNumber || "",
          phone: data.phone || "",
          website: data.website || "",
          industry: data.industry || "",
          address: data.address || "",
        });
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Failed to load company profile."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [companyId]);

  const validateCompanyProfile = (form, logo, signature) => {
  if (!form.companyName.trim()) {
    toast.error("Company name is required.");
    return false;
  }

  const validCompanyTypes = [
    "Private Limited",
    "Public Limited",
    "LLP",
    "Partnership",
    "Proprietorship",
  ];

  if (!validCompanyTypes.includes(form.companyType)) {
    toast.error("Please select a valid company type.");
    return false;
  }

  if (!form.registeredEmail.trim()) {
    toast.error("Registered email is required.");
    return false;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.registeredEmail.trim())) {
    toast.error("Please enter a valid registered email.");
    return false;
  }

  if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
    toast.error(
      "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
    );
    return false;
  }

  const gst = form.gstNumber.trim().toUpperCase();

  if (
    gst &&
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)
  ) {
    toast.error("Invalid GSTIN format. Example: 22ABCDE1234F1Z5.");
    return false;
  }

  const pan = form.panNumber.trim().toUpperCase();

  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    toast.error("Invalid PAN format. Example: ABCDE1234F.");
    return false;
  }

  if (!form.address.trim()) {
    toast.error("Company address is required.");
    return false;
  }

  if (form.website.trim()) {
    try {
      const url = new URL(form.website.trim());

      if (!["http:", "https:"].includes(url.protocol)) {
        toast.error("Website must start with http:// or https://.");
        return false;
      }
    } catch {
      toast.error("Please enter a valid website URL.");
      return false;
    }
  }

  for (const file of [logo, signature]) {
    if (!file) continue;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must not exceed 5 MB.");
      return false;
    }
  }

  return true;
};

const handleChange = (event) => {
  const { name, value } = event.target;

  let nextValue = value;

  if (name === "phone") {
    nextValue = value.replace(/\D/g, "").slice(0, 10);
  }

  if (name === "gstNumber") {
    nextValue = value.toUpperCase().slice(0, 15);
  }

  if (name === "panNumber") {
    nextValue = value.toUpperCase().slice(0, 10);
  }

  setForm((previous) => ({
    ...previous,
    [name]: nextValue,
  }));
};

const handleCompanyImageCrop = (croppedFile) => {
  const previewUrl = URL.createObjectURL(croppedFile);

  if (cropTarget === "logo") {
    setLogo(croppedFile);
    setLogoPreview(previewUrl);
  }

  if (cropTarget === "signature") {
    setSignature(croppedFile);
    setSignaturePreview(previewUrl);
  }

  setCropFile(null);
  setCropTarget("");
};

  const handleCancel = () => {
    if (company) {
      setForm({
        companyName: company.companyName || "",
        companyType: company.companyType || "",
        registeredEmail: company.registeredEmail || "",
        gstNumber: company.gstNumber || "",
        panNumber: company.panNumber || "",
        phone: company.phone || "",
        website: company.website || "",
        industry: company.industry || "",
        address: company.address || "",
      });
    }

    setLogo(null);
    setSignature(null);
    setEditing(false);
  };

const handleSubmit = async (event) => {
  event.preventDefault();

  if (saving) return;

  if (!validateCompanyProfile(form, logo, signature)) {
    return;
  }

  setSaving(true);

  const toastId = toast.loading("Updating company profile...");

  try {
    const data = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      data.append(key, value.trim());
    });

    if (logo) data.append("logo", logo);
    if (signature) data.append("signature", signature);

    const response = await api.put("/companies/profile", data, {
      withCredentials: true,
    });

    const updatedCompany = response.data.company;

    setCompany(updatedCompany);

    setForm({
      companyName: updatedCompany.companyName || "",
      companyType: updatedCompany.companyType || "",
      registeredEmail: updatedCompany.registeredEmail || "",
      gstNumber: updatedCompany.gstNumber || "",
      panNumber: updatedCompany.panNumber || "",
      phone: updatedCompany.phone || "",
      website: updatedCompany.website || "",
      industry: updatedCompany.industry || "",
      address: updatedCompany.address || "",
    });

    setLogo(null);
    setSignature(null);
    setEditing(false);

    toast.update(toastId, {
      render: "Company profile updated successfully.",
      type: "success",
      isLoading: false,
      autoClose: 3000,
      closeOnClick: true,
    });
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to update company profile.";

    toast.update(toastId, {
      render: message,
      type: "error",
      isLoading: false,
      autoClose: 4000,
      closeOnClick: true,
    });
  } finally {
    setSaving(false);
  }
};

const fields = [
  {
    name: "companyName",
    label: "Company Name",
    required: true,
  },
  {
    name: "companyType",
    label: "Company Type",
    required: true,
  },
  {
    name: "registeredEmail",
    label: "Registered Email",
    type: "email",
    required: true,
  },
  {
    name: "phone",
    label: "Phone Number",
    required: true,
    maxLength: 10,
  },
  {
    name: "gstNumber",
    label: "GSTIN",
    maxLength: 15,
  },
  {
    name: "panNumber",
    label: "PAN Number",
    maxLength: 10,
  },
  {
    name: "website",
    label: "Website",
    type: "url",
  },
  {
    name: "industry",
    label: "Industry",
  },
];

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-slate-600">
        <LoaderCircle className="animate-spin" size={22} />
        Loading company profile...
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-slate-600 shadow-sm">
        Company profile could not be loaded.
      </div>
    );
  }

  const inputClass =
    "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Building2 size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Company Profile
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                View and manage your company information.
              </p>
            </div>
          </div>
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Pencil size={16} />
            Edit Profile
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="font-semibold text-slate-800">
            General Information
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update your registered company details.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.name}
              className="block text-sm font-medium text-slate-700"
            >
              {field.label}
              {field.required && (
                <span className="ml-1 text-red-500">*</span>
              )}

<input
  name={field.name}
  type={field.type || "text"}
  value={form[field.name]}
  onChange={handleChange}
  disabled={!editing || saving}
  required={field.required || false}
  maxLength={field.maxLength}
  className={inputClass}
/>
            </label>
          ))}

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Company Address
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              disabled={!editing || saving}
              rows={3}
              className={inputClass}
            />
          </label>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Company Logo
            </p>
            <p className="mt-1 break-all text-xs text-slate-500">
              {company.logo || "No logo uploaded"}
            </p>

            {logoPreview && (
              <img
                src={logoPreview}
                alt="Company Logo Preview"
                className="mt-3 h-28 w-28 rounded-lg border border-slate-200 bg-white object-contain p-2"
              />
            )}

            {editing && (
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
onChange={(event) => {
  const file = event.target.files?.[0] || null;
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    toast.error("Please select a valid image.");
    event.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error("Image size must not exceed 5MB.");
    event.target.value = "";
    return;
  }

  setCropTarget("logo");
  setCropFile(file);
  event.target.value = "";
}}
                className="mt-3 block w-full text-sm"
              />
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Authorized Signature
            </p>
            <p className="mt-1 break-all text-xs text-slate-500">
              {company.signature || "No signature uploaded"}
            </p>

            {signaturePreview && (
              <img
                src={signaturePreview}
                alt="Authorized Signature Preview"
                className="mt-3 h-28 w-full max-w-xs rounded-lg border border-slate-200 bg-white object-contain p-2"
              />
            )}

            {editing && (
              <input
                type="file"
                accept="image/*"
onChange={(event) => {
  const file = event.target.files?.[0] || null;
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    toast.error("Please select a valid image.");
    event.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error("Image size must not exceed 5MB.");
    event.target.value = "";
    return;
  }

  setCropTarget("signature");
  setCropFile(file);
  event.target.value = "";
}}
                className="mt-3 block w-full text-sm"
              />
            )}
          </div>
        </div>

        {editing && (
          <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </form>
      <ImageCropper
        file={cropFile}
        onCancel={() => {
          setCropFile(null);
          setCropTarget("");
        }}
        onCrop={handleCompanyImageCrop}
      />
    </div>
  );
};

export default CompanyProfile;