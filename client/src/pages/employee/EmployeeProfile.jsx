import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Save,
  UserRound,
  Camera,
  LockKeyhole,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import {
  getEmployeeProfile,
  verifyEmployeeRoute,
} from "./employeeApi";
import ImageCropper from "../../components/common/ImageCropper";

const EmployeeProfile = () => {
  const formRef = useRef(null);
  const { employeeId } = useParams();
  const [cropFile, setCropFile] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [preview, setPreview] = useState("");
const [form, setForm] = useState({
  name: "",
  email: "",
  phone: "",
  presentAddress: "",
  gender: "Other",
});

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const fieldClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await getEmployeeProfile();

        if (!verifyEmployeeRoute(employeeId, data)) {
          throw new Error(
            "You are not authorized to view this profile."
          );
        }

        if (cancelled) return;

        setEmployee(data);
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          presentAddress: data.presentAddress ?? "",
          gender: data.gender ?? "Other",
        });
      } catch (err) {
if (!cancelled) {
  toast.error(
    err.response?.data?.message ||
      err.message ||
      "Failed to load profile."
  );
}
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleKeyboardNavigation = (event) => {
  const navigationKeys = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
  ];

  if (!navigationKeys.includes(event.key)) return;

  const current = event.target;

  if (
    current instanceof HTMLInputElement &&
    ["text", "email", "password", "search", "tel", "url"].includes(
      current.type
    )
  ) {
    const start = current.selectionStart;
    const end = current.selectionEnd;

    if (
      (event.key === "ArrowLeft" &&
        (start > 0 || start !== end)) ||
      (event.key === "ArrowRight" &&
        (end < current.value.length || start !== end))
    ) {
      return;
    }
  }

  if (
    current instanceof HTMLSelectElement &&
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
  ) {
    return;
  }

  const focusableElements = Array.from(
    formRef.current?.querySelectorAll(
      'input:not(:disabled), button:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
    ) || []
  ).filter(
    (element) =>
      element.getClientRects().length > 0 &&
      element.getAttribute("aria-hidden") !== "true"
  );

  const currentIndex = focusableElements.indexOf(current);

  if (currentIndex === -1) return;

  const movingForward =
    event.key === "ArrowDown" || event.key === "ArrowRight";

  const movingBackward =
    event.key === "ArrowUp" || event.key === "ArrowLeft";

  if (movingForward && currentIndex < focusableElements.length - 1) {
    event.preventDefault();
    focusableElements[currentIndex + 1].focus();
  } else if (movingBackward && currentIndex > 0) {
    event.preventDefault();
    focusableElements[currentIndex - 1].focus();
  }
};

const handleProfilePic = (event) => {
  const file = event.target.files?.[0];

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

  setCropFile(file);
  event.target.value = "";
};

const handleProfileImageCrop = (croppedFile) => {
  setProfilePic(croppedFile);
  setPreview(URL.createObjectURL(croppedFile));
  setCropFile(null);
};

const handleSubmit = async (event) => {
  event.preventDefault();

  if (saving) return;

  setSaving(true);

  const toastId = toast.loading("Updating profile...");

  try {
    const formData = new FormData();

    formData.append("name", form.name.trim());
    formData.append("email", form.email.trim());
    formData.append("phone", form.phone.trim());
    formData.append("presentAddress", form.presentAddress.trim());
    formData.append("gender", form.gender);

    if (profilePic) {
      formData.append("profilePic", profilePic);
    }

    const response = await api.put(
      "/employees/profile/me",
      formData,
      { withCredentials: true }
    );

    const updated = response.data.employee;

    if (updated) {
      setEmployee(updated);

setForm({
  name: updated.name ?? "",
  email: updated.email ?? "",
  phone: updated.phone ?? "",
  presentAddress: updated.presentAddress ?? "",
  gender: updated.gender ?? "Other",
});
    }

    setProfilePic(null);

    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview("");
    }

    toast.update(toastId, {
      render: response.data.message || "Profile updated successfully.",
      type: "success",
      isLoading: false,
      autoClose: 3000,
    });
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        "Failed to update profile.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setSaving(false);
  }
};

const handlePasswordChange = async (event) => {
  event.preventDefault();

  if (changingPassword) return;

  if (passwordForm.newPassword.length < 6) {
    toast.error("New password must be at least 6 characters.");
    return;
  }

  setChangingPassword(true);

  const toastId = toast.loading("Updating password...");

  try {
    const response = await api.patch(
      `/employees/${employee?._id}/password`,
      passwordForm,
      { withCredentials: true }
    );

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
    });

    toast.update(toastId, {
      render: response.data.message || "Password updated successfully.",
      type: "success",
      isLoading: false,
      autoClose: 3000,
    });
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        err.message ||
        "Failed to change password.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setChangingPassword(false);
  }
};

  if (loading) {
    return (
      <div className="p-6 text-black-500">
        Loading profile...
      </div>
    );
  }

const serverUrl = api.defaults.baseURL?.replace(/\/api\/?$/, "");

const imageUrl = preview ? preview : employee.profilePic ? employee.profilePic.startsWith("http") ? employee.profilePic : `${serverUrl}/uploads/${employee.profilePic}` : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-black-900">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-black-500">
          Manage your personal information and account password.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-indigo-50 text-indigo-600">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Employee profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound size={34} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-black-900">
              {employee.name}
            </h2>
            <p className="text-sm text-black-500">
              {employee.empId}
            </p>

            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              <Camera size={16} />
              Change picture
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleProfilePic}
              />
            </label>
          </div>
        </div>

        <form
  ref={formRef}
  onSubmit={handleSubmit}
  onKeyDown={handleKeyboardNavigation}
  className="min-w-0 space-y-6"
>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-black-700">
                Employee ID
              </label>
              <input
                value={employee.empId ?? ""}
                disabled
                className={`${fieldClass} bg-slate-50`}
              />
            </div>

<div>
  <label className="text-sm font-medium text-black-700">
    Email
  </label>
  <input
    name="email"
    type="email"
    value={form.email}
    onChange={handleChange}
    required
    className={fieldClass}
    placeholder="Enter email address"
  />
</div>

            <div>
              <label className="text-sm font-medium text-black-700">
                Full name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className={fieldClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-black-700">
                Phone
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                className={fieldClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-black-700">
                Gender
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={fieldClass}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-black-700">
                Department
              </label>
              <input
                value={
                  employee.departmentId?.departmentName ??
                  "Not assigned"
                }
                disabled
                className={`${fieldClass} bg-slate-50`}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-black-700">
                Role
              </label>
              <input
                value={
                  employee.roleId?.roleName ?? "Not assigned"
                }
                disabled
                className={`${fieldClass} bg-slate-50`}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-black-700">
                Company
              </label>
              <input
                value={
                  employee.companyId?.companyName ?? "Not assigned"
                }
                disabled
                className={`${fieldClass} bg-slate-50`}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-black-700">
                Present address
              </label>
              <textarea
                name="presentAddress"
                value={form.presentAddress}
                onChange={handleChange}
                rows={3}
                required
                className={fieldClass}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <LockKeyhole size={21} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black-900">
              Change Password
            </h2>
            <p className="text-sm text-black-500">
              Confirm your current password before changing it.
            </p>
          </div>
        </div>

        <form
          onSubmit={handlePasswordChange}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-black-700">
              Current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((previous) => ({
                  ...previous,
                  currentPassword: event.target.value,
                }))
              }
              required
              className={fieldClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-black-700">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((previous) => ({
                  ...previous,
                  newPassword: event.target.value,
                }))
              }
              required
              className={fieldClass}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changingPassword}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {changingPassword
                ? "Updating..."
                : "Update Password"}
            </button>
          </div>
        </form>
      </section>
      <ImageCropper
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onCrop={handleProfileImageCrop}
      />
    </div>
  );
};

export default EmployeeProfile;