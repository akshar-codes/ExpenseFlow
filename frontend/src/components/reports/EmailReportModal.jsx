import React, { useState } from "react";

const EmailReportModal = ({ report, onClose, onSend }) => {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      return setError("Enter a valid email address.");
    }

    setSending(true);
    try {
      await onSend(report._id, to.trim());
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[#18181b] w-full max-w-sm rounded-2xl p-6 border border-[#27272a]"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#e4e4e7]">
            Email Report
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#52525b] hover:text-[#a1a1aa]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {success ? (
          <p className="text-sm text-[#4ade80] py-4 text-center">
            ✓ Report sent successfully.
          </p>
        ) : (
          <>
            {error && (
              <p className="text-sm text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/20 px-3 py-2 rounded-lg mb-3">
                {error}
              </p>
            )}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#52525b] mb-1.5">
              Recipient Email
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="w-full bg-[#0f0f11] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-[#e4e4e7] mb-4 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2 rounded-lg border border-[#27272a] text-sm text-[#a1a1aa] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                }}
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default EmailReportModal;
