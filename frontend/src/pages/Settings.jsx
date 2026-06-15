import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import useFonts from "../hooks/useFonts";
import {
  updateUserProfile,
  changePassword,
  deleteAccount,
} from "../api/userApi";

// ─── Shared style fragments ───────────────────────────────────────────────────

const inputCls = [
  "w-full bg-[#0f0f11] border border-[#27272a] rounded-lg px-3 py-2.5",
  "text-sm text-[#e4e4e7] placeholder:text-[#52525b]",
  "focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 focus:border-[#6366f1]/60",
  "transition-all duration-150",
].join(" ");

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#52525b] mb-1.5";

const SectionCard = ({ title, subtitle, children }) => (
  <div
    className="rounded-xl border border-[#27272a] overflow-hidden"
    style={{ background: "linear-gradient(145deg, #18181b 0%, #141416 100%)" }}
  >
    <div className="px-6 py-5 border-b border-[#27272a]/60">
      <p
        className="text-sm font-semibold text-[#e4e4e7]"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          className="text-[12px] text-[#52525b] mt-0.5"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {subtitle}
        </p>
      )}
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

const StatusBanner = ({ type, message, onDismiss }) => {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div
      className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl border text-sm mb-4 ${
        isError
          ? "border-red-500/20 bg-red-500/8 text-red-400"
          : "border-green-500/20 bg-green-500/8 text-[#4ade80]"
      }`}
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <span>
        {isError ? "⚠" : "✓"} {message}
      </span>
      <button
        onClick={onDismiss}
        className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0 text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
};

// ─── ISO 4217 currency options (common subset) ────────────────────────────────

const CURRENCIES = [
  { code: "INR", label: "₹  Indian Rupee" },
  { code: "USD", label: "$  US Dollar" },
  { code: "EUR", label: "€  Euro" },
  { code: "GBP", label: "£  British Pound" },
  { code: "JPY", label: "¥  Japanese Yen" },
  { code: "AUD", label: "A$ Australian Dollar" },
  { code: "CAD", label: "C$ Canadian Dollar" },
  { code: "SGD", label: "S$ Singapore Dollar" },
  { code: "AED", label: "د.إ UAE Dirham" },
];

// ─── Profile section ──────────────────────────────────────────────────────────

const ProfileSection = ({ user, onUpdate }) => {
  const [name, setName] = useState(user?.name ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "INR");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setStatus({
        type: "error",
        message: "Name must be at least 2 characters.",
      });
      return;
    }
    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const updated = await updateUserProfile({
        name: name.trim(),
        currency,
      });
      onUpdate(updated);
      setStatus({ type: "success", message: "Profile updated successfully." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.message || "Failed to update profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Profile"
      subtitle="Update your display name and preferred currency."
    >
      <StatusBanner
        type={status.type}
        message={status.message}
        onDismiss={() => setStatus({ type: "", message: "" })}
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className={inputCls}
            disabled={saving}
          />
        </div>

        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            value={user?.email ?? ""}
            className={inputCls + " opacity-50 cursor-not-allowed"}
            disabled
            aria-readonly="true"
          />
          <p
            className="mt-1 text-[11px] text-[#3f3f46]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Email cannot be changed.
          </p>
        </div>

        <div>
          <label className={labelCls}>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputCls + " cursor-pointer"}
            disabled={saving}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
};

// ─── Password section ─────────────────────────────────────────────────────────

const PasswordSection = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (!currentPassword) {
      setStatus({ type: "error", message: "Current password is required." });
      return;
    }
    if (newPassword.length < 6) {
      setStatus({
        type: "error",
        message: "New password must be at least 6 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }
    if (newPassword === currentPassword) {
      setStatus({
        type: "error",
        message: "New password must differ from the current password.",
      });
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setStatus({
        type: "success",
        message: "Password updated. You will be signed out shortly.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.message || "Failed to change password.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Change Password"
      subtitle="Choose a strong password with at least 6 characters."
    >
      <StatusBanner
        type={status.type}
        message={status.message}
        onDismiss={() => setStatus({ type: "", message: "" })}
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className={inputCls}
            disabled={saving}
          />
        </div>
        <div>
          <label className={labelCls}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className={inputCls}
            disabled={saving}
          />
        </div>
        <div>
          <label className={labelCls}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className={inputCls}
            disabled={saving}
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            {saving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
};

// ─── Danger zone section ──────────────────────────────────────────────────────

const DangerSection = ({ onDeleted }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!password) {
      setError("Password is required to confirm deletion.");
      return;
    }
    setDeleting(true);
    setError("");
    try {
      await deleteAccount(password);
      onDeleted();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to delete account. Please try again.",
      );
      setDeleting(false);
    }
  };

  return (
    <SectionCard title="Danger Zone" subtitle="These actions cannot be undone.">
      {!confirmOpen ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className="text-sm font-medium text-[#e4e4e7]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Delete account
            </p>
            <p
              className="text-[12px] text-[#52525b] mt-0.5"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Permanently removes your account and all associated data.
            </p>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium border border-[#f87171]/30 text-[#f87171] bg-[#f87171]/8 hover:bg-[#f87171]/15 hover:border-[#f87171]/50 transition-all"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Delete account
          </button>
        </div>
      ) : (
        <form onSubmit={handleDelete} className="space-y-4">
          <div className="px-4 py-3 rounded-lg border border-[#f87171]/20 bg-[#f87171]/6">
            <p
              className="text-[12px] text-[#f87171] leading-relaxed"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              This will permanently delete your account, all transactions,
              categories, budgets, and recurring rules. This cannot be undone.
            </p>
          </div>

          {error && (
            <p
              className="text-[12px] text-[#f87171]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              ⚠ {error}
            </p>
          )}

          <div>
            <label className={labelCls}>Enter your password to confirm</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your current password"
              autoComplete="current-password"
              className={inputCls}
              disabled={deleting}
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                setPassword("");
                setError("");
              }}
              disabled={deleting}
              className="px-4 py-2 rounded-lg border border-[#27272a] text-sm text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#e4e4e7] transition-all disabled:opacity-40"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleting || !password}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[#f87171]/40 bg-[#f87171]/12 text-[#f87171] hover:bg-[#f87171]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {deleting ? "Deleting…" : "Yes, delete my account"}
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const Settings = () => {
  useFonts();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleDeleted = async () => {
    await logout();
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0c] text-[#e4e4e7]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {/* Ambient orb */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          className="absolute -top-20 -right-20 w-[360px] h-[360px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            filter: "blur(56px)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 md:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="mb-2">
          <h1
            className="text-2xl font-semibold text-white"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Settings
          </h1>
          <p className="text-sm text-[#52525b] mt-1">
            Manage your account, password, and preferences.
          </p>
        </div>

        {/* Profile */}
        <ProfileSection user={user} onUpdate={() => navigate(0)} />

        {/* Password */}
        <PasswordSection />

        {/* Danger zone */}
        <DangerSection onDeleted={handleDeleted} />
      </div>
    </div>
  );
};

export default Settings;
