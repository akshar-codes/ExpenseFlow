import React from "react";

// ── Config maps ───────────────────────────────────────────────────────────────

const IMPACT_CONFIG = {
  high: {
    color: "#4ade80",
    bg: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.25)",
    label: "High impact",
  },
  medium: {
    color: "#facc15",
    bg: "rgba(250,204,21,0.10)",
    border: "rgba(250,204,21,0.25)",
    label: "Med impact",
  },
  low: {
    color: "#71717a",
    bg: "rgba(113,113,122,0.10)",
    border: "rgba(113,113,122,0.25)",
    label: "Low impact",
  },
};

const EFFORT_CONFIG = {
  easy: { color: "#4ade80", label: "Easy" },
  moderate: { color: "#facc15", label: "Moderate" },
  hard: { color: "#f87171", label: "Hard" },
};

const DEFAULT_IMPACT = IMPACT_CONFIG.medium;
const DEFAULT_EFFORT = EFFORT_CONFIG.moderate;

// ── Sub-components ────────────────────────────────────────────────────────────

const Badge = ({ color, bg, border, label }) => (
  <span
    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
    style={{
      color,
      background: bg,
      borderColor: border,
      fontFamily: "'Sora', sans-serif",
    }}
  >
    {label}
  </span>
);

const Skeleton = () => (
  <div
    className="rounded-xl border border-[#27272a] overflow-hidden animate-pulse"
    style={{ background: "linear-gradient(145deg, #18181b 0%, #141416 100%)" }}
  >
    <div className="px-5 py-5">
      <div className="h-3 w-40 bg-[#27272a] rounded mb-4" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-4 last:mb-0">
          <div className="h-4 w-3/4 bg-[#27272a] rounded mb-2" />
          <div className="h-3 w-full bg-[#27272a] rounded" />
        </div>
      ))}
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────

const RecommendationWidget = ({ recommendations, loading }) => {
  if (loading) return <Skeleton />;

  const items = recommendations ?? [];

  return (
    <div
      className="relative rounded-xl border border-[#27272a] overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
      }}
    >
      {/* Accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: "linear-gradient(180deg, #4ade80, #22c55e)" }}
      />

      <div className="pl-5 pr-5 py-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border"
            style={{
              background: "rgba(74,222,128,0.12)",
              borderColor: "rgba(74,222,128,0.25)",
              color: "#4ade80",
            }}
          >
            ↑
          </span>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            AI Recommendations
          </p>
        </div>

        {items.length === 0 ? (
          <p
            className="text-[12px] text-[#52525b] italic"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            No recommendations available yet.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((rec, idx) => {
              const impactCfg = IMPACT_CONFIG[rec.impact] ?? DEFAULT_IMPACT;
              const effortCfg = EFFORT_CONFIG[rec.effort] ?? DEFAULT_EFFORT;

              return (
                <div
                  key={idx}
                  className="pb-4 border-b border-[#27272a]/50 last:border-0 last:pb-0"
                >
                  {/* Rank + title row */}
                  <div className="flex items-start gap-2.5 mb-1.5">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-px"
                      style={{
                        background: "rgba(99,102,241,0.15)",
                        color: "#818cf8",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <p
                      className="text-sm font-semibold text-[#e4e4e7] leading-snug"
                      style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                      {rec.title}
                    </p>
                  </div>

                  {/* Description */}
                  <p
                    className="text-[12px] text-[#71717a] leading-relaxed mb-2 pl-7"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    {rec.description}
                  </p>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 pl-7">
                    <Badge
                      color={impactCfg.color}
                      bg={impactCfg.bg}
                      border={impactCfg.border}
                      label={impactCfg.label}
                    />
                    <span className="text-[#3f3f46] text-[10px]">·</span>
                    <span
                      className="text-[10px] font-semibold"
                      style={{
                        color: effortCfg.color,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {effortCfg.label} effort
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationWidget;
