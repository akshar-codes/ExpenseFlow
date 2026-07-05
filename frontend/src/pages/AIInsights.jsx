import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAIInsights from "../hooks/useAIInsights";
import useFonts from "../hooks/useFonts";
import { ROUTES } from "../constants/routes";

import HealthScoreWidget from "../components/ai/HealthScoreWidget";
import MonthlyAIReport from "../components/ai/MonthlyAIReport";
import InsightCard from "../components/ai/InsightCard";
import RecommendationWidget from "../components/ai/RecommendationWidget";
import MonthEndPredictionCard from "../components/ai/MonthEndPredictionCard";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, positive: 3 };

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <p
    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-3"
    style={{ fontFamily: "'Sora', sans-serif" }}
  >
    {children}
  </p>
);

const ErrorBanner = ({ message, onRetry }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl border border-red-500/20 bg-red-500/8 mb-6">
    <p
      className="text-sm text-red-400"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {message}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-xs text-red-400 border border-red-500/30 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
      >
        Retry
      </button>
    )}
  </div>
);

const AIStatusBadge = ({ aiAvailable, fromCache, provider }) => {
  if (aiAvailable) {
    return (
      <div className="flex items-center gap-1.5">
        {fromCache && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#27272a] text-[#52525b]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            cached
          </span>
        )}
        <span
          className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border"
          style={{
            background: "rgba(74,222,128,0.08)",
            borderColor: "rgba(74,222,128,0.25)",
            color: "#4ade80",
            fontFamily: "'Sora', sans-serif",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
          AI · {provider ?? "active"}
        </span>
      </div>
    );
  }

  return (
    <span
      className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border"
      style={{
        background: "rgba(250,204,21,0.08)",
        borderColor: "rgba(250,204,21,0.25)",
        color: "#facc15",
        fontFamily: "'Sora', sans-serif",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#facc15]" />
      Fallback mode
    </span>
  );
};

// Pill filter for insight severity
const FilterPill = ({ value, active, count, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
      active
        ? "bg-[#6366f1]/15 border-[#6366f1]/40 text-[#a5b4fc]"
        : "border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46]"
    }`}
  >
    {value}
    {count != null && (
      <span
        className={`text-[10px] rounded-full px-1.5 py-px font-semibold tabular-nums ${
          active
            ? "bg-[#6366f1]/30 text-[#a5b4fc]"
            : "bg-[#27272a] text-[#52525b]"
        }`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {count}
      </span>
    )}
  </button>
);

// Anomaly mini-table shown below the insight grid when anomalies exist
const AnomalyTable = ({ anomalies }) => {
  if (!anomalies?.length) return null;

  return (
    <div
      className="rounded-xl border border-[#27272a] overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
      }}
    >
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#27272a] bg-[#0f0f11]/60">
        {["Category", "This month", "Rolling avg", "Spike"].map((h) => (
          <p
            key={h}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {h}
          </p>
        ))}
      </div>
      {anomalies.map((a, idx) => {
        const spikeColor =
          a.spikePercent >= 100
            ? "#f87171"
            : a.spikePercent >= 60
              ? "#fb923c"
              : "#facc15";
        return (
          <div
            key={a.category ?? idx}
            className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-[#27272a]/40 last:border-0 hover:bg-[#1a1a1e] transition-colors ${idx % 2 !== 0 ? "bg-white/[0.01]" : ""}`}
          >
            <span
              className="text-sm text-[#e4e4e7] font-medium truncate"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {a.category}
            </span>
            <span
              className="text-sm font-semibold tabular-nums text-[#f87171]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ₹{Number(a.currentSpend).toLocaleString("en-IN")}
            </span>
            <span
              className="text-sm tabular-nums text-[#71717a]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ₹{Number(a.averageSpend).toLocaleString("en-IN")}
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: spikeColor,
              }}
            >
              +{a.spikePercent}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Budget utilization mini-list
const BudgetStatusList = ({ budgets }) => {
  if (!budgets?.length) return null;

  return (
    <div
      className="rounded-xl border border-[#27272a] overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
      }}
    >
      <div className="px-5 pt-4 pb-2 border-b border-[#27272a]/60">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Budget Utilization
        </p>
      </div>
      <div className="px-5 py-3 space-y-3">
        {budgets.map((b) => {
          const pct = b.percentage ?? 0;
          const barColor = b.exceeded
            ? "#f87171"
            : pct >= 80
              ? "#fb923c"
              : "#6366f1";
          const labelColor = b.exceeded
            ? "#f87171"
            : pct >= 80
              ? "#fb923c"
              : "#a1a1aa";

          return (
            <div key={b.category}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[12px] font-medium text-[#d4d4d8] truncate max-w-[160px]"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {b.category}
                </span>
                <span
                  className="text-[11px] font-semibold tabular-nums ml-3 shrink-0"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: labelColor,
                  }}
                >
                  ₹{Number(b.spent).toLocaleString("en-IN")} / ₹
                  {Number(b.limit).toLocaleString("en-IN")}
                  {b.exceeded && <span className="ml-1 text-[10px]">⚡</span>}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#27272a] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: barColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

const PageSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Health + report row */}
    <div className="grid lg:grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#27272a] h-40"
          style={{ background: "#18181b" }}
        />
      ))}
    </div>
    {/* Insight cards */}
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#27272a] h-36"
          style={{ background: "#18181b" }}
        />
      ))}
    </div>
    {/* Bottom row */}
    <div className="grid lg:grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#27272a] h-48"
          style={{ background: "#18181b" }}
        />
      ))}
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const AIInsights = () => {
  useFonts();
  const navigate = useNavigate();

  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [severityFilter, setSeverityFilter] = useState("all");

  const {
    data,
    loading,
    error,
    refresh,
    invalidateAndRefresh,
    insights,
    recommendations,
    healthScore,
    monthlySummary,
    monthEndPrediction,
    snapshot,
    aiAvailable,
    fromCache,
    provider,
  } = useAIInsights(month, year);

  // Sort + filter insights
  const filteredInsights = useMemo(() => {
    const sorted = [...insights].sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99),
    );
    if (severityFilter === "all") return sorted;
    return sorted.filter((i) => i.severity === severityFilter);
  }, [insights, severityFilter]);

  // Count per severity for filter pills
  const severityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0, positive: 0 };
    insights.forEach((i) => {
      if (counts[i.severity] != null) counts[i.severity]++;
    });
    return counts;
  }, [insights]);

  // Handle action button clicks on insight cards — navigate to relevant page
  const handleInsightAction = (insight) => {
    switch (insight.type) {
      case "budget_recommendation":
      case "category_overuse":
        navigate(ROUTES.CATEGORIES);
        break;
      case "spending_anomaly":
        navigate(ROUTES.TRANSACTIONS);
        break;
      case "saving_opportunity":
      case "goal_progress":
        navigate(ROUTES.GOALS);
        break;
      default:
        navigate(ROUTES.REPORTS);
    }
  };

  const anomalies = snapshot?.spendingAnomalies ?? [];
  const budgets = snapshot?.budgets ?? [];

  return (
    <div
      className="min-h-screen bg-[#0a0a0c] text-[#e4e4e7]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {/* Ambient orb */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            filter: "blur(64px)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, #4ade80 0%, transparent 70%)",
            filter: "blur(56px)",
          }}
        />
      </div>

      {/* ── Sticky toolbar ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-[#27272a] bg-[#0a0a0c]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-3 flex flex-wrap items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {MONTH_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setMonth(i + 1)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 border transition-all ${
                  month === i + 1
                    ? "bg-[#6366f1]/15 border-[#6366f1]/40 text-[#a5b4fc]"
                    : "border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46]"
                }`}
              >
                {label.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Year selector */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-[#0f0f11] border border-[#27272a] rounded-lg px-3 py-1.5 text-sm text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          {/* AI status badge */}
          {!loading && data && (
            <AIStatusBadge
              aiAvailable={aiAvailable}
              fromCache={fromCache}
              provider={provider}
            />
          )}

          {/* Refresh button */}
          <button
            onClick={() => invalidateAndRefresh()}
            disabled={loading}
            title="Regenerate insights (bypasses cache)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading ? "animate-spin" : ""}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 py-8 space-y-8">
        {/* Page header */}
        <div>
          <h1
            className="text-2xl font-semibold text-white"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            AI Insights
          </h1>
          <p className="text-sm text-[#52525b] mt-1">
            {MONTH_LABELS[month - 1]} {year} · AI-powered financial analysis
          </p>
        </div>

        {/* Error banner */}
        {error && <ErrorBanner message={error} onRetry={() => refresh()} />}

        {/* ── Content (loading / skeleton / data) ─────────────────────── */}
        {loading ? (
          <PageSkeleton />
        ) : (
          <>
            {/* ── Row 1: Health score + monthly report ──────────────────── */}
            <div className="grid lg:grid-cols-2 gap-4">
              <HealthScoreWidget healthScore={healthScore} loading={false} />
              <MonthlyAIReport
                monthlySummary={monthlySummary}
                snapshot={snapshot}
                period={data?.period}
                loading={false}
              />
            </div>

            {/* ── Insight cards ─────────────────────────────────────────── */}
            {insights.length > 0 && (
              <div>
                {/* Severity filter pills */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <SectionLabel>Insights</SectionLabel>
                  <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                    <FilterPill
                      value="All"
                      active={severityFilter === "all"}
                      count={insights.length}
                      onClick={() => setSeverityFilter("all")}
                    />
                    {severityCounts.high > 0 && (
                      <FilterPill
                        value="High"
                        active={severityFilter === "high"}
                        count={severityCounts.high}
                        onClick={() => setSeverityFilter("high")}
                      />
                    )}
                    {severityCounts.medium > 0 && (
                      <FilterPill
                        value="Medium"
                        active={severityFilter === "medium"}
                        count={severityCounts.medium}
                        onClick={() => setSeverityFilter("medium")}
                      />
                    )}
                    {severityCounts.positive > 0 && (
                      <FilterPill
                        value="Positive"
                        active={severityFilter === "positive"}
                        count={severityCounts.positive}
                        onClick={() => setSeverityFilter("positive")}
                      />
                    )}
                    {severityCounts.low > 0 && (
                      <FilterPill
                        value="Low"
                        active={severityFilter === "low"}
                        count={severityCounts.low}
                        onClick={() => setSeverityFilter("low")}
                      />
                    )}
                  </div>
                </div>

                {/* Insight card grid */}
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredInsights.map((insight, idx) => (
                    <InsightCard
                      key={`${insight.type}-${idx}`}
                      insight={insight}
                      onAction={handleInsightAction}
                    />
                  ))}
                </div>

                {filteredInsights.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <span className="text-4xl opacity-20">◉</span>
                    <p className="text-sm text-[#52525b]">
                      No insights match this filter.
                    </p>
                    <button
                      onClick={() => setSeverityFilter("all")}
                      className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
                    >
                      Show all →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty state — AI not available + no insights */}
            {!aiAvailable && insights.length === 0 && (
              <div
                className="flex flex-col items-center justify-center py-20 text-center gap-3 rounded-xl border border-[#27272a]"
                style={{
                  background:
                    "linear-gradient(145deg, #18181b 0%, #141416 100%)",
                }}
              >
                <span className="text-5xl opacity-20">◎</span>
                <p
                  className="text-sm font-medium text-[#a1a1aa]"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  AI insights unavailable
                </p>
                <p
                  className="text-xs text-[#52525b] max-w-xs"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Configure{" "}
                  <code className="text-[#6366f1] bg-[#6366f1]/10 px-1 rounded">
                    ANTHROPIC_API_KEY
                  </code>{" "}
                  or{" "}
                  <code className="text-[#6366f1] bg-[#6366f1]/10 px-1 rounded">
                    OPENAI_API_KEY
                  </code>{" "}
                  in your backend
                  <code className="text-[#6366f1] bg-[#6366f1]/10 px-1 rounded">
                    .env
                  </code>{" "}
                  to enable AI analysis.
                </p>
              </div>
            )}

            {/* ── Row 3: Recommendations + Prediction ───────────────────── */}
            <div className="grid lg:grid-cols-2 gap-4">
              <RecommendationWidget
                recommendations={recommendations}
                loading={false}
              />
              <MonthEndPredictionCard
                prediction={monthEndPrediction}
                period={data?.period}
                loading={false}
              />
            </div>

            {/* ── Row 4: Anomaly table + Budget status ──────────────────── */}
            {(anomalies.length > 0 || budgets.length > 0) && (
              <div className="grid lg:grid-cols-2 gap-4">
                {anomalies.length > 0 && (
                  <div>
                    <SectionLabel>Spending Anomalies Detected</SectionLabel>
                    <AnomalyTable anomalies={anomalies} />
                  </div>
                )}
                {budgets.length > 0 && (
                  <div>
                    <SectionLabel>Budget Status</SectionLabel>
                    <BudgetStatusList budgets={budgets} />
                  </div>
                )}
              </div>
            )}

            {/* ── Meta footer ───────────────────────────────────────────── */}
            {data?.meta && (
              <p
                className="text-center text-[10px] text-[#3f3f46]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {data.meta.provider} · {data.meta.model} ·{" "}
                {data.meta.inputTokens != null &&
                  `${data.meta.inputTokens} in / ${data.meta.outputTokens} out tokens · `}
                {data.meta.latencyMs}ms
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AIInsights;
