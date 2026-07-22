import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useFonts from "../hooks/useFonts";
import useReceiptScan from "../hooks/useReceiptScan";
import ReceiptUploadZone from "../components/receipts/ReceiptUploadZone";
import ReceiptProcessingProgress from "../components/receipts/ReceiptProcessingProgress";
import ReceiptOCRPreview from "../components/receipts/ReceiptOCRPreview";
import ReceiptEditForm from "../components/receipts/ReceiptEditForm";

const ScanReceipt = () => {
  useFonts();
  const navigate = useNavigate();
  const {
    receipt,
    imageUrl,
    scanning,
    confirming,
    error,
    setError,
    scan,
    confirm,
    reset,
  } = useReceiptScan();

  const [confirmedTxId, setConfirmedTxId] = useState(null);

  const handleFileSelected = async (file) => {
    try {
      await scan(file);
    } catch {
      // error state already set by the hook
    }
  };

  const handleConfirm = async (payload) => {
    try {
      const result = await confirm(payload);
      setConfirmedTxId(result.transaction._id);
    } catch {
      // error state already set by the hook
    }
  };

  const handleStartOver = () => {
    setConfirmedTxId(null);
    reset();
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0c] text-[#e4e4e7]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          className="absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full opacity-[0.05]"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            filter: "blur(64px)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Scan Receipt</h1>
          <p className="text-sm text-[#52525b] mt-1">
            Upload a photo of a receipt to auto-extract transaction details.
          </p>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#f87171]/20 bg-[#f87171]/8">
            <p className="text-sm text-[#f87171]">{error}</p>
            <button
              onClick={() => setError("")}
              className="text-[#f87171]/60 hover:text-[#f87171] text-xs shrink-0"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <div
          className="rounded-2xl border border-[#27272a] p-6"
          style={{
            background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
          }}
        >
          {confirmedTxId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <span className="text-5xl">✓</span>
              <p className="text-lg font-semibold text-[#e4e4e7]">
                Transaction created
              </p>
              <p className="text-sm text-[#52525b]">
                Your receipt has been converted into a transaction.
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => navigate("/transactions")}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  }}
                >
                  View transaction
                </button>
                <button
                  onClick={handleStartOver}
                  className="px-4 py-2 rounded-lg border border-[#27272a] text-sm text-[#a1a1aa] hover:border-[#3f3f46]"
                >
                  Scan another receipt
                </button>
              </div>
            </div>
          ) : !receipt ? (
            <ReceiptUploadZone
              onFileSelected={handleFileSelected}
              loading={scanning}
            />
          ) : scanning ? (
            <ReceiptProcessingProgress />
          ) : (
            <div className="space-y-6">
              <ReceiptOCRPreview receipt={receipt} imageUrl={imageUrl} />
              <div className="pt-4 border-t border-[#27272a]">
                <ReceiptEditForm
                  receipt={receipt}
                  onConfirm={handleConfirm}
                  confirming={confirming}
                />
              </div>
              <div className="text-center">
                <button
                  onClick={reset}
                  className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
                >
                  Cancel and start over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanReceipt;
