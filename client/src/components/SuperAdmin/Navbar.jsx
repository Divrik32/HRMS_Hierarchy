import { Menu, X, LogOut, ChevronDown, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const Navbar = ({
  sidebarOpen,
  setSidebarOpen,
  superAdmin,
  onLogout,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [imageError, setImageError] = useState(false);

  const displayName = superAdmin?.name || "Super Administrator";

const profilePicture =
  superAdmin?.profilePic && !imageError
    ? `${
        import.meta.env.MODE === "production"
          ? "https://api.hrms.wsdstech.com"
          : "http://localhost:5003"
      }/uploads/${superAdmin.profilePic}`
    : "";

const handleLogout = async () => {
  if (!onLogout || loggingOut) return;

  setLoggingOut(true);

  const toastId = toast.loading("Signing out...");

  try {
    await onLogout();

    toast.update(toastId, {
      render: "Signed out successfully.",
      type: "success",
      isLoading: false,
      autoClose: 2500,
    });
  } catch (err) {
    toast.update(toastId, {
      render:
        err.response?.data?.message ||
        err.message ||
        "Unable to sign out. Please try again.",
      type: "error",
      isLoading: false,
      autoClose: 4000,
    });
  } finally {
    setLoggingOut(false);
    setProfileOpen(false);
  }
};

  return (
    <nav className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 px-3 sm:px-6 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

<h1 className="truncate text-base font-semibold text-black">
  Company Administration
</h1>
      </div>

      {/* Right Section */}
      <div className="relative ml-3 shrink-0">
        <button
          type="button"
          onClick={() => setProfileOpen((prev) => !prev)}
          aria-expanded={profileOpen}
          aria-label="Open administrator profile menu"
          className="flex items-center gap-2 sm:gap-3 rounded-xl p-1.5 hover:bg-slate-50 transition"
        >
          <div className="hidden sm:block text-right max-w-48">
            <h3 className="font-semibold text-sm text-slate-800 truncate">
              {displayName}
            </h3>

            <p className="text-xs text-slate-500 truncate">
              ID: {superAdmin?.superAdminId || "—"}
            </p>
          </div>

          {profilePicture ? (
            <img
              src={profilePicture}
              alt={`${displayName}'s profile`}
              onError={() => setImageError(true)}
              className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center">
              <UserRound size={22} />
            </div>
          )}

          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${
              profileOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Profile Dropdown */}
        {profileOpen && (
          <>
            <button
              type="button"
              aria-label="Close profile menu"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setProfileOpen(false)}
            />

            <div className="absolute right-0 top-full mt-3 z-20 bg-white shadow-xl w-64 rounded-xl border border-slate-200 p-3">
              {/* Profile Information */}
              <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-100">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={`${displayName}'s profile`}
                    onError={() => setImageError(true)}
                    className="w-11 h-11 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-11 h-11 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                    <UserRound size={22} />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">
                    {displayName}
                  </p>

                  <p className="text-xs text-slate-500 truncate">
                    {superAdmin?.email || ""}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    Super Administrator
                  </p>
                </div>
              </div>

              {/* My Profile */}
              <Link
                to="/super-admin/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 w-full px-3 py-2.5 mt-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                <UserRound size={18} />
                My Profile
              </Link>

              {/* Sign Out */}
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 mt-1 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
              >
                <LogOut size={18} />
                <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;