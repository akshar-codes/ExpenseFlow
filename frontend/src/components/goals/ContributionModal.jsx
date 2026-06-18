import React, { useState, useMemo } from "react";
import { useTransactions } from "../../hooks/useTransactions";

const MAX_AMOUNT = 1_000_000_000;

const inputCls = [
  "w-full bg-[#0f0f11] border border-[#27272a] rounded-lg px-3 py-2.5",
  "text-sm text-[#e4e4e7] placeholder:text-[#52525b]",
  "focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 focus:border-[#6366f1]/60",
  "transition-all duration-150",
].join(" ");

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#52525b] mb-1.5";

const inrFmt = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

/**
 * ContributionModal
 *
 * Two modes, toggled by a segmented control:
 *  - "manual": user types an amount directly
 *  - "link":   user picks an existing income/expense transaction and
 *              allocates some (or all) of its amount to the goal
 *
 * Mirrors TransactionModal.jsx's structure (header, error banner, fields,
 * footer actions) and Recurring.jsx's Field/inputCls conventions.
 */
const ContributionModal = ({ goal, onClose, onAdd, onLink }) => {
  const [mode, setMode] = useState("manual");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [overSaveConfirm, setOverSaveConfirm] = useState(null); // { projected, excess }

  const { transactions } = useTransactions();

  const today = new Date().toISOString().slice(0, 10);

  // Only income transactions make sense to "save" toward a goal
  const incomeTransactions = useMemo(
    () => transactions.filter((t) => t.type === "income"),
    [transactions],
  );

  const selectedTransaction = useMemo(
    () => incomeTransactions.find((t) => t._id === transactionId),
    [incomeTransactions, transactionId],
  );

  const remaining = Math.max(
    0,
    Math.round((goal.targetAmount - goal.currentAmount) * 100) / 100,
  );

  const resetOverSaveConfirm = () => setOverSaveConfirm(null);

  const validateAmount = (raw, maxCap) => {
    const parsed = parseFloat(raw);
    if (!isFinite(parsed) || parsed <= 0) {
      return { error: "Enter a valid amount greater than zero." };
    }
    if (parsed > MAX_AMOUNT) {
      return {
        error: `Amount cannot exceed ${inrFmt(MAX_AMOUNT)}.`,
      };
    }
    if (maxCap != null && parsed > maxCap) {
      return {
        error: `Amount cannot exceed the transaction amount (${inrFmt(maxCap)}).`,
      };
    }
    return { parsed };
  };

  const buildPayload = (parsedAmount, allowOverSaving) => {
    if (mode === "manual") {
      return { amount: parsedAmount, note, date, allowOverSaving };
    }
    return {
      transactionId,
      amount: parsedAmount,
      note,
      allowOverSaving,
    };
  };

  const submit = async (allowOverSaving = false) => {
    setError("");

    if (mode === "manual") {
      const { error: amtError, parsed } = validateAmount(amount);
      if (amtError) return setError(amtError);
      if (!date) return setError("Please select a date.");
      return runSubmit(parsed, allowOverSaving);
    }

    // link mode
    if (!transactionId) return setError("Please select a transaction.");
    const cap = selectedTransaction?.amount;
    const { error: amtError, parsed } = validateAmount(
      amount || String(cap ?? ""),
      cap,
    );
    if (amtError) return setError(amtError);
    return runSubmit(parsed, allowOverSaving);
  };

  const runSubmit = async (parsedAmount, allowOverSaving) => {
    // Client-side over-save check so we can show a friendly confirm step
    // instead of bouncing off the server's 422.
    if (!allowOverSaving) {
      const projected =
        Math.round((goal.currentAmount + parsedAmount) * 100) / 100;
      if (projected > goal.targetAmount) {
        setOverSaveConfirm({
          projected,
          excess: Math.round((projected - goal.targetAmount) * 100) / 100,
          parsedAmount,
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = buildPayload(parsedAmount, allowOverSaving);
      if (mode === "manual") {
        await onAdd(payload);
      } else {
        await onLink(payload);
      }
      onClose();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        (mode === "manual"
          ? "Failed to add contribution."
          : "Failed to link transaction.");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit(false);
  };

  const handleConfirmOverSave = () => {
    if (!overSaveConfirm) return;
    runSubmit(overSaveConfirm.parsedAmount, true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[#18181b] w-full max-w-[420px] rounded-xl p-6 border border-[#27272a]"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <div>
            <h2 className="text-xl font-semibold text-[#e4e4e7]">
              Add Contribution
            </h2>
            <p className="text-xs text-[#52525b] mt-0.5">
              Saving toward{" "}
              <span className="text-[#a1a1aa] font-medium">{goal.title}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[#52525b] hover:text-[#a1a1aa] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress context */}
        <div className="mt-4 mb-4 px-3 py-2.5 rounded-lg border border-[#27272a] bg-[#0f0f11]/60 flex items-center justify-between">
          <span className="text-[11px] text-[#52525b]">
            {inrFmt(goal.currentAmount)} of {inrFmt(goal.targetAmount)} saved
          </span>
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{
              color: goal.color || "#6366f1",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {inrFmt(remaining)} left
          </span>
        </div>

        {/* Error Banner */}
        {error && (
          <p className="text-red-500 text-sm mb-3 bg-red-500/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Over-save confirmation banner */}
        {overSaveConfirm && (
          <div className="mb-3 bg-yellow-500/10 border border-yellow-500/30 px-3 py-2.5 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 text-base leading-none mt-0.5 shrink-0">
                ⚠
              </span>
              <div className="min-w-0">
                <p className="text-yellow-400 text-sm leading-snug">
                  This pushes the goal {inrFmt(overSaveConfirm.excess)} past its
                  target ({inrFmt(overSaveConfirm.projected)} total).
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleConfirmOverSave}
                    disabled={submitting}
                    className="text-xs text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/15 px-2.5 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Saving…" : "Save anyway"}
                  </button>
                  <button
                    type="button"
                    onClick={resetOverSaveConfirm}
                    className="text-xs text-[#71717a] hover:text-[#a1a1aa] px-2.5 py-1 rounded transition-colors"
                  >
                    Adjust amount
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode toggle */}
        <div className="mb-4">
          <span className={labelCls}>Source</span>
          <div
            className="flex rounded-lg border border-[#27272a] overflow-hidden"
            style={{ background: "#0f0f11" }}
          >
            {[
              { value: "manual", label: "Manual amount" },
              { value: "link", label: "Link a transaction" },
            ].map((opt) => {
              const active = mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setMode(opt.value);
                    setError("");
                    resetOverSaveConfirm();
                  }}
                  className="flex-1 py-2 text-xs font-medium transition-all duration-150"
                  style={{
                    background: active
                      ? "rgba(99,102,241,0.12)"
                      : "transparent",
                    color: active ? "#a5b4fc" : "#71717a",
                    borderRight:
                      opt.value === "manual" ? "1px solid #27272a" : "none",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {mode === "manual" ? (
          <>
            {/* Amount */}
            <div className="mb-3">
              <span className={labelCls}>Amount (₹)</span>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] text-sm pointer-events-none"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    resetOverSaveConfirm();
                  }}
                  className={inputCls + " pl-7"}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
            </div>

            {/* Date */}
            <div className="mb-3">
              <span className={labelCls}>Date</span>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </>
        ) : (
          <>
            {/* Transaction select */}
            <div className="mb-3">
              <span className={labelCls}>Income transaction</span>
              <select
                value={transactionId}
                onChange={(e) => {
                  setTransactionId(e.target.value);
                  setAmount("");
                  resetOverSaveConfirm();
                }}
                className={inputCls + " cursor-pointer"}
              >
                <option value="">Select…</option>
                {incomeTransactions.map((t) => (
                  <option key={t._id} value={t._id}>
                    {inrFmt(t.amount)} ·{" "}
                    {t.categoryName ||
                      (typeof t.category === "object"
                        ? t.category?.name
                        : "Income")}{" "}
                    · {new Date(t.date).toLocaleDateString("en-IN")}
                  </option>
                ))}
              </select>
              {incomeTransactions.length === 0 && (
                <p className="mt-1.5 text-[11px] text-[#52525b]">
                  No income transactions found. Add one from Transactions first.
                </p>
              )}
            </div>

            {/* Partial amount */}
            {selectedTransaction && (
              <div className="mb-3">
                <span className={labelCls}>
                  Amount to allocate (optional — defaults to full amount)
                </span>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] text-sm pointer-events-none"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder={String(selectedTransaction.amount)}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      resetOverSaveConfirm();
                    }}
                    max={selectedTransaction.amount}
                    className={inputCls + " pl-7"}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Note */}
        <div className="mb-1">
          <span className={labelCls}>Note (optional)</span>
          <input
            type="text"
            placeholder="e.g. Bonus payout, monthly transfer…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            className={inputCls}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-[#27272a] text-sm text-[#a1a1aa] rounded-lg hover:border-[#3f3f46] hover:text-[#e4e4e7] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || Boolean(overSaveConfirm)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            {submitting ? "Saving…" : "Add Contribution"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContributionModal;
