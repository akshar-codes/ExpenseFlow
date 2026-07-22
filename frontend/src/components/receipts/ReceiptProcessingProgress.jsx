import React from "react";

const ReceiptProcessingProgress = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-8 h-8 border-[3px] border-[#6366f1] border-t-transparent rounded-full animate-spin" />
    <p className="text-sm text-[#a1a1aa]">Reading your receipt…</p>
    <p className="text-xs text-[#52525b]">
      Extracting merchant, amount, date, and tax details.
    </p>
  </div>
);

export default ReceiptProcessingProgress;
