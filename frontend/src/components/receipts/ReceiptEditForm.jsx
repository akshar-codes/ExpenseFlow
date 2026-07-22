import React, { useState, useEffect } from "react";
import useCategories from "../../hooks/useCategories";

const inputCls = [
  "w-full bg-[#0f0f11] border border-[#27272a] rounded-lg px-3 py-2.5",
  "text-sm text-[#e4e4e7] placeholder:text-[#52525b]",
  "focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 focus:border-[#6366f1]/60",
  "transition-all duration-150",
].join(" ");

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#52525b] mb-1.5";

const todayStr = () => new Date().toISOString().slice(0, 10);

const ReceiptEditForm = ({ receipt, onConfirm, confirming }) => {
  const { categories } = useCategories();
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [tax, setTax] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!receipt) return;
    const extracted = receipt.extracted ?? {};
    setMerchant(extracted.merchant?.value ?? "");
    setAmount(
      extracted.amount?.value != null ? String(extracted.amount.value) : "",
    );
    setDate(
      extracted.date?.value
        ? new Date(extracted.date.value).toISOString().slice(0, 10)
        : todayStr(),
    );
    setTax(extracted.tax?.value != null ? String(extracted.tax.value) : "");
  }, [receipt]);

  const validate = () => {
    const e = {};
    const parsedAmount = parseFloat(amount);
    if (!isFinite(parsedAmount) || parsedAmount <= 0) {
      e.amount = "Enter a valid amount.";
    }
    if (!date) e.date = "Date is required.";
    else if (date > todayStr()) e.date = "Date cannot be in the future.";
    if (!categoryId) e.categoryId = "Select a category.";
    if (tax) {
      const parsedTax = parseFloat(tax);
      if (!isFinite(parsedTax) || parsedTax < 0) {
        e.tax = "Enter a valid tax amount.";
      }
    }
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});

    await onConfirm({
      categoryId,
      amount: parseFloat(amount),
      date,
      merchant: merchant.trim(),
      tax: tax ? parseFloat(tax) : undefined,
      note: note.trim(),
      paymentMethod,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b]">
        Review &amp; confirm
      </p>

      <div>
        <label className={labelCls}>Merchant</label>
        <input
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g. Swiggy, Big Bazaar…"
          maxLength={150}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
          />
          {errors.amount && (
            <p className="mt-1 text-[11px] text-[#f87171]">{errors.amount}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
          {errors.date && (
            <p className="mt-1 text-[11px] text-[#f87171]">{errors.date}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="">Select…</option>
            {expenseCategories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-[11px] text-[#f87171]">
              {errors.categoryId}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Tax (optional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            className={inputCls}
          />
          {errors.tax && (
            <p className="mt-1 text-[11px] text-[#f87171]">{errors.tax}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Payment method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            className={inputCls}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={confirming}
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
      >
        {confirming ? "Creating transaction…" : "Confirm & create transaction"}
      </button>
    </form>
  );
};

export default ReceiptEditForm;
