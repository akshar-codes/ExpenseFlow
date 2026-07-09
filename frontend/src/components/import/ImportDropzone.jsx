import React, { useState, useCallback, useRef } from "react";
import { IMPORT_SOURCES } from "../../constants/importSources";

const ImportDropzone = ({ onFileSelected, loading }) => {
  const [source, setSource] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (fileList) => {
      const file = fileList?.[0];
      if (file) onFileSelected(file, source);
    },
    [onFileSelected, source],
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-3">
          Select source
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {IMPORT_SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSource(s.id)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                source === s.id
                  ? "bg-[#6366f1]/15 border-[#6366f1]/40 text-[#a5b4fc]"
                  : "border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#e4e4e7]"
              }`}
            >
              <span className="block text-sm">{s.label}</span>
              <span className="block text-[10px] text-[#52525b] mt-0.5">
                {s.group}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (source) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => source && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-all ${
          dragActive
            ? "border-[#6366f1] bg-[#6366f1]/5"
            : "border-[#27272a] hover:border-[#3f3f46]"
        } ${source ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <span className="text-4xl block mb-3 opacity-40" aria-hidden>
          📄
        </span>
        <p className="text-sm font-medium text-[#e4e4e7] mb-1">
          {loading
            ? "Reading file…"
            : source
              ? "Drag & drop your CSV here, or click to browse"
              : "Select a source above to enable upload"}
        </p>
        <p className="text-xs text-[#52525b]">
          Only .csv files exported from your bank or wallet app are supported.
        </p>
      </div>
    </div>
  );
};

export default ImportDropzone;
