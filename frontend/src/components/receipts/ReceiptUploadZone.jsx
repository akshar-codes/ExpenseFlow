import React, { useState, useCallback, useRef } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

const ReceiptUploadZone = ({ onFileSelected, loading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState("");
  const inputRef = useRef(null);

  const validateAndSelect = useCallback(
    (file) => {
      if (!file) return;
      setLocalError("");

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setLocalError("Only JPEG, PNG, and WEBP images are supported.");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setLocalError("Image must be smaller than 8MB.");
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    validateAndSelect(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!loading) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
          dragActive
            ? "border-[#6366f1] bg-[#6366f1]/5"
            : "border-[#27272a] hover:border-[#3f3f46]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => validateAndSelect(e.target.files?.[0])}
        />
        <span className="text-4xl block mb-3 opacity-40" aria-hidden>
          🧾
        </span>
        <p className="text-sm font-medium text-[#e4e4e7] mb-1">
          {loading
            ? "Reading receipt…"
            : "Drag & drop a receipt photo here, or click to browse"}
        </p>
        <p className="text-xs text-[#52525b]">
          JPEG, PNG, or WEBP — max 8MB.
        </p>
      </div>

      {localError && <p className="text-xs text-[#f87171] px-1">{localError}</p>}
    </div>
  );
};

export default ReceiptUploadZone;
