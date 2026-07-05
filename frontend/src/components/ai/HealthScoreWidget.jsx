import React, { useEffect, useState } from "react";

// ── Grade config ──────────────────────────────────────────────────────────────

const GRADE_CONFIG = {
  A: { color: "#4ade80", label: "Excellent", ringColor: "#4ade80" },
  B: { color: "#a3e635", label: "Good", ringColor: "#a3e635" },
  C: { color: "#facc15", label: "Fair", ringColor: "#facc15" },
  D: { color: "#fb923c", label: "Needs Work", ringColor: "#fb923c" },
  F: { color: "#f87171", label: "Critical", ringColor: "#f87171" },
};

const DEFAULT_GRADE = { color: "#52525b", label: "—", ringColor: "#52525b" };

// Circumference of the SVG ring (r=44)
const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ── Animated count-up ─────────────────────────────────────────────────────────

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target == null) return;

    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => frame && cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

// ── Component ─────────────────────────────────────────────────────────────────

const HealthScoreWidget = ({ healthScore, loading }) => {
  const score = healthScore?.score ?? null;
  const grade = healthScore?.grade ?? null;
  const summary = healthScore?.summary ?? "";
  const cfg = GRADE_CONFIG[grade] ?? DEFAULT_GRADE;

  const displayed = useCountUp(score ?? 0);
  const strokeDash =
    score != null ? CIRCUMFERENCE * (1 - score / 100) : CIRCUMFERENCE;

  if (loading) {
    return (
      <div
        className="rounded-xl border border-[#27272a] overflow-hidden animate-pulse"
        style={{
          background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
        }}
      >
        <div className="px-5 py-5">
          <div className="h-3 w-32 bg-[#27272a] rounded mb-4" />
          <div className="flex items-center gap-6">
            <div className="w-28 h-28 rounded-full bg-[#27272a]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-full bg-[#27272a] rounded" />
              <div className="h-3 w-3/4 bg-[#27272a] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl border border-[#27272a] overflow-hidden group transition-all duration-200 hover:border-[#3f3f46]"
      style={{
        background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
      }}
    >
      {/* Accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: cfg.ringColor }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${cfg.ringColor}12 0%, transparent 65%)`,
        }}
      />

      <div className="pl-5 pr-5 py-5 relative">
        {/* Section label */}
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-4"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Financial Health Score
        </p>

        <div className="flex items-center gap-6">
          {/* SVG ring */}
          <div className="relative shrink-0 w-28 h-28">
            <svg
              width="112"
              height="112"
              viewBox="0 0 112 112"
              className="-rotate-90"
              aria-hidden="true"
            >
              {/* Track */}
              <circle
                cx="56"
                cy="56"
                r={RADIUS}
                fill="none"
                stroke="#27272a"
                strokeWidth="8"
              />
              {/* Progress arc */}
              <circle
                cx="56"
                cy="56"
                r={RADIUS}
                fill="none"
                stroke={cfg.ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDash}
                style={{
                  transition:
                    "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </svg>

            {/* Centre label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-2xl font-bold tabular-nums leading-none"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: score != null ? cfg.ringColor : "#52525b",
                }}
              >
                {score != null ? displayed : "—"}
              </span>
              {grade && (
                <span
                  className="text-xs font-bold mt-0.5"
                  style={{ color: cfg.color, fontFamily: "'Sora', sans-serif" }}
                >
                  {grade}
                </span>
              )}
            </div>
          </div>

          {/* Text */}
          <div className="min-w-0">
            <p
              className="text-base font-semibold mb-1"
              style={{ color: cfg.color, fontFamily: "'Sora', sans-serif" }}
            >
              {cfg.label}
            </p>
            <p
              className="text-[12px] text-[#71717a] leading-relaxed"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {summary || "No summary available."}
            </p>

            {/* Score breakdown legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
              {[
                { grade: "A", range: "80–100", color: "#4ade80" },
                { grade: "B", range: "65–79", color: "#a3e635" },
                { grade: "C", range: "50–64", color: "#facc15" },
                { grade: "D", range: "35–49", color: "#fb923c" },
                { grade: "F", range: "0–34", color: "#f87171" },
              ].map((g) => (
                <span
                  key={g.grade}
                  className="flex items-center gap-1 text-[10px]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: g.color,
                      opacity: grade === g.grade ? 1 : 0.3,
                    }}
                  />
                  <span
                    style={{ color: grade === g.grade ? g.color : "#3f3f46" }}
                  >
                    {g.grade} {g.range}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthScoreWidget;
