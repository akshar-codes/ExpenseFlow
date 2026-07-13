import React, { useState, useEffect } from "react";
import useFonts from "../hooks/useFonts";
import useNotificationPreferences from "../hooks/useNotificationPreferences";
import {
  CONFIGURABLE_EMAIL_TYPE_META,
  SUMMARY_FREQUENCY_OPTIONS,
} from "../constants/notificationTypes";

// ─── Shared style fragments (mirrors Settings.jsx) ────────────────────────────

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

// Mirrors StatusToggle in Recurring.jsx for a consistent switch control.
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    disabled={disabled}
    role="switch"
    aria-checked={checked}
    className={`relative w-9 h-5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
      checked ? "bg-[#6366f1]" : "bg-[#27272a]"
    }`}
  >
    <span
      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
        checked ? "left-[calc(100%-18px)]" : "left-0.5"
      }`}
    />
  </button>
);

const EmailTypeRow = ({ label, description, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-[#27272a]/40 last:border-0">
    <div className="min-w-0">
      <p
        className="text-sm font-medium text-[#e4e4e7]"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {label}
      </p>
      {description && (
        <p
          className="text-[12px] text-[#52525b] mt-0.5"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {description}
        </p>
      )}
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const NotificationSettings = () => {
  useFonts();
  const { preferences, loading, saving, error, setError, save } =
    useNotificationPreferences();

  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (preferences) setForm(preferences);
  }, [preferences]);

  if (loading || !form) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-[3px] border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#52525b]">
            Loading notification settings…
          </p>
        </div>
      </div>
    );
  }

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setEmailType = (type, value) =>
    setForm((prev) => ({
      ...prev,
      emailTypes: { ...prev.emailTypes, [type]: value },
    }));

  const handleSave = async () => {
    setStatus({ type: "", message: "" });
    setError("");
    try {
      await save({
        emailEnabled: form.emailEnabled,
        summaryFrequency: form.summaryFrequency,
        emailTypes: form.emailTypes,
        goalReminderLeadDays: Number(form.goalReminderLeadDays),
        recurringReminderLeadDays: Number(form.recurringReminderLeadDays),
      });
      setStatus({ type: "success", message: "Notification settings saved." });
    } catch {
      // error state is already set by the hook
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0c] text-[#e4e4e7]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {/* Ambient orb — matches Settings.jsx */}
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
            Notification Settings
          </h1>
          <p className="text-sm text-[#52525b] mt-1">
            Control which emails ExpenseTracker sends you, and how often.
          </p>
        </div>

        <StatusBanner
          type={error ? "error" : status.type}
          message={error || status.message}
          onDismiss={() => {
            setError("");
            setStatus({ type: "", message: "" });
          }}
        />

        {/* Master switch */}
        <SectionCard
          title="Email notifications"
          subtitle="Turn all ExpenseTracker emails on or off."
        >
          <EmailTypeRow
            label="Enable email notifications"
            description="When off, you won't receive any emails except transactional account messages."
            checked={form.emailEnabled}
            onChange={(v) => setField("emailEnabled", v)}
            disabled={saving}
          />
        </SectionCard>

        {/* Frequency */}
        <SectionCard
          title="Summary frequency"
          subtitle="Choose how often you'd like income/expense summary emails."
        >
          <div>
            <label className={labelCls}>Frequency</label>
            <select
              value={form.summaryFrequency}
              onChange={(e) => setField("summaryFrequency", e.target.value)}
              disabled={saving || !form.emailEnabled}
              className={`${inputCls} cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {SUMMARY_FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </SectionCard>

        {/* Per-type toggles */}
        <SectionCard
          title="Email types"
          subtitle="Fine-tune exactly which events trigger an email."
        >
          <div>
            {CONFIGURABLE_EMAIL_TYPE_META.map((meta) => (
              <EmailTypeRow
                key={meta.type}
                label={meta.label}
                description={meta.description}
                checked={Boolean(form.emailTypes?.[meta.type])}
                onChange={(v) => setEmailType(meta.type, v)}
                disabled={saving || !form.emailEnabled}
              />
            ))}
          </div>
        </SectionCard>

        {/* Reminder lead time */}
        <SectionCard
          title="Reminder timing"
          subtitle="How far in advance should reminder emails go out?"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Goal reminder (days before)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={form.goalReminderLeadDays}
                onChange={(e) =>
                  setField("goalReminderLeadDays", e.target.value)
                }
                disabled={saving || !form.emailEnabled}
                className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              />
            </div>
            <div>
              <label className={labelCls}>
                Recurring reminder (days before)
              </label>
              <input
                type="number"
                min={0}
                max={7}
                value={form.recurringReminderLeadDays}
                onChange={(e) =>
                  setField("recurringReminderLeadDays", e.target.value)
                }
                disabled={saving || !form.emailEnabled}
                className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              />
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
