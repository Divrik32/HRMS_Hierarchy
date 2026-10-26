import { useCallback, useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  ShieldCheck,
  CalendarDays,
  Clock,
  Camera,
  Save,
  LockKeyhole,
  RefreshCw,
  Eye,
  EyeOff,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios.js";

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  "Something went wrong. Please try again.";

const getApiOrigin = () => {
  const baseURL = api.defaults.baseURL || "";

  if (baseURL.startsWith("http://") || baseURL.startsWith("https://")) {
    return baseURL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  }

  return window.location.origin;
};

const getProfileImageUrl = (profilePic) => {
  if (!profilePic) return "";

  if (
    profilePic.startsWith("http://") ||
    profilePic.startsWith("https://") ||
    profilePic.startsWith("data:")
  ) {
    return profilePic;
  }

  const filename = profilePic.replace(/^\/+/, "");
  const origin = getApiOrigin();

  return `${origin}/${
    filename.startsWith("uploads/") ? filename : `uploads/${filename}`
  }`;
};

const formatDate = (date) => {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "Not available";

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:border-slate-200/80 disabled:bg-slate-50 disabled:text-slate-600";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

const ProfileField = ({
  id,
  label,
  icon: Icon,
  help,
  className = "",
  ...props
}) => (
  <div className={`min-w-0 ${className}`}>
    <label
      htmlFor={id}
      className="flex items-center gap-2 text-sm font-semibold text-slate-700"
    >
      <Icon size={16} className="shrink-0 text-slate-400" />
      {label}
    </label>

    <input id={id} className={inputClass} {...props} />

    {help && (
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{help}</p>
    )}
  </div>
);

const MyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    profilePic: null,
  });

  const [preview, setPreview] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/super-admin/profile");
      const data = response.data?.superAdmin;

      if (!data) {
        throw new Error("Profile data was not returned by the server");
      }

      setProfile(data);
      setForm({
        name: data.name || "",
        email: data.email || "",
        password: "",
        profilePic: null,
      });
      setPreview(getProfileImageUrl(data.profilePic));
    } catch (error) {
      console.error("Fetch Super Admin Profile Error:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!form.profilePic) return;

    const objectUrl = URL.createObjectURL(form.profilePic);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [form.profilePic]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be 5 MB or less");
      event.target.value = "";
      return;
    }

    setForm((previous) => ({
      ...previous,
      profilePic: file,
    }));
  };

  const cancelEditing = () => {
    setForm({
      name: profile?.name || "",
      email: profile?.email || "",
      password: "",
      profilePic: null,
    });

    setPreview(getProfileImageUrl(profile?.profilePic));
    setEditing(false);
    setShowPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    if (form.password && form.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("email", form.email.trim());

      if (form.password) {
        formData.append("password", form.password);
      }

      if (form.profilePic) {
        formData.append("profilePic", form.profilePic);
      }

      const response = await api.put("/super-admin/update", formData);

      if (response.data?.superAdmin) {
        setProfile((previous) => ({
          ...previous,
          ...response.data.superAdmin,
        }));
      }

      toast.success(
        response.data?.message || "Profile updated successfully"
      );

      setEditing(false);
      setShowPassword(false);

      await fetchProfile();
    } catch (error) {
      console.error("Update Super Admin Profile Error:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-white shadow-sm">
            <RefreshCw
              size={25}
              className="animate-spin text-indigo-600"
            />
          </div>
          <h2 className="mt-5 text-base font-semibold text-slate-800">
            Loading your profile
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Getting your account information ready...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <UserRound size={30} />
          </div>
          <h2 className="mt-6 text-xl font-bold text-slate-900">
            Unable to load profile
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Please check your login session and try again.
          </p>
          <button
            type="button"
            onClick={fetchProfile}
            className={`${primaryButtonClass} mt-6`}
          >
            <RefreshCw size={17} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        {/* Page header */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              Account Settings
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              My Profile
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage your personal information and account security.
            </p>
          </div>

          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`${primaryButtonClass} w-full sm:w-auto`}
            >
              <Pencil size={16} />
              Edit Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className={`${secondaryButtonClass} w-full sm:w-auto`}
            >
              <X size={17} />
              Cancel Editing
            </button>
          )}
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Profile sidebar */}
          <aside className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-28 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-700">
                <div
                  aria-hidden="true"
                  className="absolute -right-5 -top-14 h-40 w-40 rounded-full border border-white/10"
                />
                <div
                  aria-hidden="true"
                  className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full border border-white/10"
                />
                <div className="absolute left-5 top-5 flex items-center gap-2 text-xs font-medium text-indigo-100">
                  <ShieldCheck size={15} />
                  Super Admin Account
                </div>
              </div>

              <div className="px-6 pb-6">
                <div className="relative -mt-12 mb-5 h-24 w-24">
                  <div className="h-full w-full overflow-hidden rounded-2xl border-4 border-white bg-indigo-50 shadow-sm">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Super Admin profile"
                        className="h-full w-full object-cover"
                        onError={() => {
                          if (
                            preview ===
                            getProfileImageUrl(profile.profilePic)
                          ) {
                            setPreview("");
                          }
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-indigo-600">
                        {(profile.name || "S").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <h2 className="break-words text-xl font-bold tracking-tight text-slate-900">
                  {profile.name}
                </h2>
                <p className="mt-1.5 break-all text-sm text-slate-500">
                  {profile.email}
                </p>

                <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                  <ShieldCheck size={14} className="shrink-0" />
                  Super Administrator
                </div>

                {editing && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-3 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 focus-within:ring-4 focus-within:ring-indigo-100">
                      <Camera size={16} />
                      Change Photo
                      <input
                        type="file"
                        accept="image/*"
                        aria-label="Change profile picture"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        onChange={handleImageChange}
                      />
                    </label>
                    <p className="mt-2.5 text-xs leading-5 text-slate-500">
                      Choose an image up to 5 MB. Supported files must
                      be images.
                    </p>
                  </div>
                )}

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="text-xs font-medium text-slate-400">
                    Super Admin ID
                  </p>
                  <p className="mt-1.5 break-all font-mono text-sm font-semibold text-slate-700">
                    {profile.superAdminId || "Not available"}
                  </p>
                </div>
              </div>
            </section>

            <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                <LockKeyhole size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-800">
                  Your account, your control
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Keep your details up to date and use a strong
                  password to help protect your account.
                </p>
              </div>
            </div>
          </aside>

          {/* Profile form */}
          <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <UserRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Personal Information
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Your account identity and contact information.
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    editing
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {editing ? "Editing" : "View only"}
                </span>
              </div>

              <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-7">
                <ProfileField
                  id="profile-name"
                  icon={UserRound}
                  label="Full Name"
                  name="name"
                  type="text"
                  value={editing ? form.name : profile.name || ""}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  required
                />

                <ProfileField
                  id="profile-email"
                  icon={Mail}
                  label="Email Address"
                  name="email"
                  type="email"
                  value={editing ? form.email : profile.email || ""}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  autoComplete="email"
                  placeholder="Enter your email address"
                  required
                />

                <ProfileField
                  id="profile-admin-id"
                  icon={ShieldCheck}
                  label="Super Admin ID"
                  type="text"
                  value={profile.superAdminId || "Not available"}
                  disabled
                  help="Your unique ID cannot be changed here."
                  className="sm:col-span-2"
                />
              </div>
            </section>

            {/* Account metadata */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                <h3 className="text-base font-bold text-slate-900">
                  Account Details
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  A record of your account activity.
                </p>
              </div>

              <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-7">
                <ProfileField
                  id="profile-created-at"
                  icon={CalendarDays}
                  label="Account Created"
                  type="text"
                  value={formatDate(profile.createdAt)}
                  disabled
                />

                <ProfileField
                  id="profile-updated-at"
                  icon={Clock}
                  label="Last Updated"
                  type="text"
                  value={formatDate(profile.updatedAt)}
                  disabled
                />
              </div>
            </section>

            {/* Password */}
            {editing && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <LockKeyhole size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Change Password
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Leave this field empty to keep your current password.
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <div className="max-w-xl">
                    <label
                      htmlFor="profile-password"
                      className="text-sm font-semibold text-slate-700"
                    >
                      New Password
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        Optional
                      </span>
                    </label>

                    <div className="relative mt-2">
                      <input
                        id="profile-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        disabled={saving}
                        autoComplete="new-password"
                        placeholder="Enter a new password"
                        className={`${inputClass} !mt-0 pr-12`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((value) => !value)
                        }
                        className="absolute inset-y-0 right-2 my-auto flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    <p className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <ShieldCheck size={13} className="shrink-0" />
                      Minimum 6 characters.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Save actions */}
            {editing && (
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <p className="text-xs leading-5 text-slate-500">
                  Review your details before saving changes.
                </p>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className={secondaryButtonClass}
                  >
                    <X size={16} />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className={primaryButtonClass}
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;