import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import useInsights from "../hooks/useInsights";
import useFonts from "../hooks/useFonts";
import { PIE_COLORS } from "../constants/colors";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const inrFmt = (v) => `₹${Number(v ?? 0).toLocaleString("en-IN")}`;
const shortFmt = (v) =>
  v >= 1_00_000
    ? `₹${(v / 1_00_000).toFixed(1)}L`
    : v >= 1_000
      ? `₹${(v / 1_000).toFixed(0)}k`
      : `₹${v ?? 0}`;

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-[#3f3f46] px-3 py-2.5 text-xs"
      style={{
        background: "#18181b",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        fontFamily: "'Sora',sans-serif",
        minWidth: 130,
      }}
    >
      {label && <p className="text-[#71717a] mb-1.5 text-[11px]">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color ?? "#a1a1aa" }}>{p.name}</span>
          <span
            className="font-semibold"
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              color: p.color ?? "#e4e4e7",
            }}
          >
            {typeof p.value === "number" && Math.abs(p.value) < 200
              ? `${p.value}%`
              : inrFmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <p
    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-3"
    style={{ fontFamily: "'Sora',sans-serif" }}
  >
    {children}
  </p>
);

const ChartPanel = ({ title, subtitle, children, toolbar, className = "" }) => (
  <div
    className={`rounded-xl border border-[#27272a] overflow-hidden ${className}`}
    style={{ background: "linear-gradient(145deg,#18181b 0%,#141416 100%)" }}
  >
    <div className="px-5 pt-5 pb-0 flex items-start justify-between gap-3 flex-wrap">
      <div>
        <p
          className="text-sm font-semibold text-[#e4e4e7]"
          style={{ fontFamily: "'Sora',sans-serif" }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="text-[11px] text-[#52525b] mt-0.5"
            style={{ fontFamily: "'Sora',sans-serif" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {toolbar}
    </div>
    <div className="px-2 pt-4 pb-4">{children}</div>
  </div>
);

const EmptyChart = ({ msg = "No data for this period" }) => (
  <div className="flex flex-col items-center justify-center h-44 gap-2">
    <span className="text-3xl opacity-20">◉</span>
    <p
      className="text-sm text-[#52525b]"
      style={{ fontFamily: "'Sora',sans-serif" }}
    >
      {msg}
    </p>
  </div>
);

const ErrorBanner = ({ message, onRetry }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl border border-red-500/20 bg-red-500/8 mb-6">
    <p
      className="text-sm text-red-400"
      style={{ fontFamily: "'Sora',sans-serif" }}
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

/* ─── Glanceable pill toggle (3/6/12mo, 30/90/180d) — not a filter panel ──── */

const PillToggle = ({ value, onChange, options }) => (
  <div className="flex items-center gap-1">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
          value === opt.value
            ? "bg-[#6366f1]/15 border-[#6366f1]/40 text-[#a5b4fc]"
            : "border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46]"
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const StatCard = ({ label, value, sub, borderColor, textColor }) => (
  <div
    className="relative rounded-xl border border-[#27272a] overflow-hidden"
    style={{ background: "linear-gradient(145deg,#18181b 0%,#141416 100%)" }}
  >
    <div
      className="absolute left-0 top-0 bottom-0 w-[3px]"
      style={{ background: borderColor }}
    />
    <div className="pl-5 pr-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717a] mb-2">
        {label}
      </p>
      <p
        className="text-xl font-semibold tabular-nums leading-none"
        style={{ fontFamily: "'JetBrains Mono',monospace", color: textColor }}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[11px] text-[#52525b]">{sub}</p>}
    </div>
  </div>
);

const pivotCategorySeries = (categories = [], topN = 5) => {
  const top = [...categories]
    .sort((a, b) => (b.totalAcrossRange ?? 0) - (a.totalAcrossRange ?? 0))
    .slice(0, topN);

  if (top.length === 0) return { data: [], categoryNames: [] };

  const length = top[0]?.series?.length ?? 0;
  const data = Array.from({ length }, (_, idx) => {
    const point = top[0]?.series?.[idx];
    const row = {
      month: point
        ? `${MONTH_LABELS[point.month - 1]} '${String(point.year).slice(2)}`
        : "",
    };
    top.forEach((cat) => {
      row[cat.category] = cat.series?.[idx]?.total ?? 0;
    });
    return row;
  });

  return { data, categoryNames: top.map((c) => c.category) };
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

const Insights = () => {
  useFonts();

  const [categoryMonths, setCategoryMonths] = useState(6);
  const [merchantDays, setMerchantDays] = useState(90);
  const [budgetMonths, setBudgetMonths] = useState(6);
  const [expenseDays, setExpenseDays] = useState(90);

  const {
    categoryTrends,
    topMerchants,
    budgetUtilization,
    largestExpenses,
    velocity,
    incomeExpenseTrend,
    monthEndProjection,
    loading,
    error,
    refresh,
  } = useInsights({
    categoryMonths,
    merchantDays,
    budgetMonths,
    expenseDays,
  });

  const { data: categoryChartData, categoryNames } = useMemo(
    () => pivotCategorySeries(categoryTrends?.categories ?? []),
    [categoryTrends],
  );

  const incomeExpenseChartData = useMemo(() => {
    const series = incomeExpenseTrend?.series ?? [];
    return series.map((p) => ({
      month: `${MONTH_LABELS[(p.month ?? 1) - 1]} '${String(p.year ?? "").slice(2)}`,
      income: p.income ?? 0,
      expense: p.expense ?? 0,
      savingsRate: p.savingsRate ?? 0,
    }));
  }, [incomeExpenseTrend]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-[3px] border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#52525b]">Building your insights…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0a0a0c] text-[#e4e4e7]"
      style={{ fontFamily: "'Sora',sans-serif" }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full opacity-[0.05]"
          style={{
            background: "radial-gradient(circle,#6366f1 0%,transparent 70%)",
            filter: "blur(64px)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 py-8 space-y-8">
        <div>
          <h1
            className="text-2xl font-semibold text-white"
            style={{ fontFamily: "'Sora',sans-serif" }}
          >
            Insights
          </h1>
          <p className="text-sm text-[#52525b] mt-1">
            Deeper trends across categories, merchants, budgets, and spend.
          </p>
        </div>

        {error && <ErrorBanner message={error} onRetry={refresh} />}

        {/* ── Category Trends ─────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Category Trends</SectionLabel>
          <ChartPanel
            title="Top categories over time"
            subtitle="Top 5 by total spend across the selected window"
            toolbar={
              <PillToggle
                value={categoryMonths}
                onChange={setCategoryMonths}
                options={[
                  { value: 3, label: "3mo" },
                  { value: 6, label: "6mo" },
                  { value: 12, label: "12mo" },
                ]}
              />
            }
          >
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={categoryChartData}>
                  <CartesianGrid
                    strokeDasharray="1 4"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={shortFmt}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 11, color: "#71717a" }}
                  />
                  {categoryNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={PIE_COLORS[i % PIE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart msg="No category trend data for this window" />
            )}
          </ChartPanel>
        </div>

        {/* ── Top Merchants + Largest Expenses ────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-5">
          <ChartPanel
            title="Top Merchants"
            subtitle="By total spend in the selected window"
            toolbar={
              <PillToggle
                value={merchantDays}
                onChange={setMerchantDays}
                options={[
                  { value: 30, label: "30d" },
                  { value: 90, label: "90d" },
                  { value: 180, label: "180d" },
                ]}
              />
            }
          >
            {(topMerchants?.merchants ?? []).length > 0 ? (
              <div className="space-y-1">
                {(topMerchants.merchants ?? []).map((m, idx) => {
                  const name =
                    m.merchant ?? m.name ?? m.normalizedMerchant ?? "Unknown";
                  const total = m.totalSpent ?? m.total ?? m.spent ?? 0;
                  const count = m.count ?? m.transactionCount ?? null;
                  return (
                    <div
                      key={`${name}-${idx}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1a1a1e] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: PIE_COLORS[idx % PIE_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-[#e4e4e7] font-medium truncate">
                          {name}
                        </span>
                        {count != null && (
                          <span className="text-[11px] text-[#52525b] shrink-0">
                            · {count}×
                          </span>
                        )}
                      </div>
                      <span
                        className="text-sm font-semibold tabular-nums text-[#f87171] shrink-0 ml-3"
                        style={{ fontFamily: "'JetBrains Mono',monospace" }}
                      >
                        {inrFmt(total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyChart msg="No merchant data for this window" />
            )}
          </ChartPanel>

          <ChartPanel
            title="Largest Expenses"
            subtitle="Top single transactions in the selected window"
            toolbar={
              <PillToggle
                value={expenseDays}
                onChange={setExpenseDays}
                options={[
                  { value: 30, label: "30d" },
                  { value: 90, label: "90d" },
                  { value: 180, label: "180d" },
                ]}
              />
            }
          >
            {(largestExpenses?.expenses ?? []).length > 0 ? (
              <div className="space-y-1">
                {(largestExpenses.expenses ?? []).map((e, idx) => {
                  const catName =
                    e.category?.name ??
                    e.categoryName ??
                    e.category ??
                    "Unknown";
                  const dateLabel = e.date
                    ? new Date(e.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                    : "";
                  return (
                    <div
                      key={e._id ?? idx}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#1a1a1e] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[#e4e4e7] font-medium truncate">
                          {e.merchant || catName}
                        </p>
                        <p className="text-[11px] text-[#52525b]">
                          {catName} · {dateLabel}
                        </p>
                      </div>
                      <span
                        className="text-sm font-semibold tabular-nums text-[#f87171] shrink-0 ml-3"
                        style={{ fontFamily: "'JetBrains Mono',monospace" }}
                      >
                        {inrFmt(e.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyChart msg="No expenses for this window" />
            )}
          </ChartPanel>
        </div>

        {/* ── Budget Utilization Trend ────────────────────────────────────── */}
        <div>
          <SectionLabel>Budget Utilization</SectionLabel>
          <ChartPanel
            title="Spend vs. limit by category"
            subtitle="Average utilization across the selected window"
            toolbar={
              <PillToggle
                value={budgetMonths}
                onChange={setBudgetMonths}
                options={[
                  { value: 3, label: "3mo" },
                  { value: 6, label: "6mo" },
                  { value: 12, label: "12mo" },
                ]}
              />
            }
          >
            {(budgetUtilization?.categories ?? []).length > 0 ? (
              <div className="space-y-3">
                {budgetUtilization.categories.map((cat) => {
                  const avg = cat.avgUtilization ?? 0;
                  const over = avg > 100;
                  return (
                    <div
                      key={cat.categoryId ?? cat.categoryName}
                      className="px-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-[#e4e4e7] font-medium">
                          {cat.categoryName}
                        </span>
                        <span
                          className="text-xs font-semibold tabular-nums"
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            color: over ? "#f87171" : "#4ade80",
                          }}
                        >
                          {avg.toFixed(0)}% avg
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#27272a] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(avg, 100)}%`,
                            background: over ? "#f87171" : "#6366f1",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyChart msg="No budgets set for this window" />
            )}
          </ChartPanel>
        </div>

        {/* ── Spending Velocity + Month-End Projection ────────────────────── */}
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <SectionLabel>Spending Velocity — last 30 days</SectionLabel>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <StatCard
                label="Daily burn rate"
                value={inrFmt(velocity?.dailyBurnRate ?? 0)}
                sub="Average per day"
                borderColor="#f87171"
                textColor="#f87171"
              />
              <StatCard
                label="Total spent"
                value={inrFmt(velocity?.totalSpent ?? 0)}
                sub={`Over ${velocity?.days ?? 30} days`}
                borderColor="#6366f1"
                textColor="#a5b4fc"
              />
            </div>
            {(velocity?.categories ?? []).length > 0 && (
              <div
                className="rounded-xl border border-[#27272a] overflow-hidden"
                style={{
                  background: "linear-gradient(145deg,#18181b 0%,#141416 100%)",
                }}
              >
                {velocity.categories.map((c) => {
                  const days = c.daysUntilExhausted;
                  const urgent = typeof days === "number" && days < 7;
                  return (
                    <div
                      key={c.categoryId ?? c.categoryName}
                      className="flex items-center justify-between px-4 py-2.5 border-b border-[#27272a]/40 last:border-0"
                    >
                      <span className="text-sm text-[#d4d4d8]">
                        {c.categoryName}
                      </span>
                      <span
                        className="text-xs font-semibold tabular-nums"
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          color: urgent ? "#f87171" : "#71717a",
                        }}
                      >
                        {typeof days === "number"
                          ? `${days}d left`
                          : "No budget set"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <SectionLabel>Month-End Projection</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Projected expense"
                value={inrFmt(monthEndProjection?.projectedExpense ?? 0)}
                sub="By end of month"
                borderColor="#f87171"
                textColor="#f87171"
              />
              <StatCard
                label="Projected income"
                value={inrFmt(monthEndProjection?.projectedIncome ?? 0)}
                sub="By end of month"
                borderColor="#4ade80"
                textColor="#4ade80"
              />
              <StatCard
                label="Projected balance"
                value={inrFmt(monthEndProjection?.projectedBalance ?? 0)}
                sub="Income minus expense"
                borderColor="#6366f1"
                textColor="#a5b4fc"
              />
              <StatCard
                label="Days remaining"
                value={monthEndProjection?.daysRemaining ?? "—"}
                sub="In current month"
                borderColor="#facc15"
                textColor="#facc15"
              />
            </div>
          </div>
        </div>

        {/* ── Income/Expense Trend + Savings Rate ─────────────────────────── */}
        <div>
          <SectionLabel>Income vs. Expense — last 12 months</SectionLabel>
          <ChartPanel
            title="Trend & savings rate"
            subtitle="Fixed 12-month window"
          >
            {incomeExpenseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={incomeExpenseChartData}>
                  <defs>
                    <linearGradient
                      id="savingsRateGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#facc15"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="#facc15"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="1 4"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={shortFmt}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 11, color: "#71717a" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#4ade80"
                    strokeWidth={2}
                    fill="transparent"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Expense"
                    stroke="#f87171"
                    strokeWidth={2}
                    fill="transparent"
                  />
                  <Area
                    type="monotone"
                    dataKey="savingsRate"
                    name="Savings rate"
                    stroke="#facc15"
                    strokeWidth={1.5}
                    fill="url(#savingsRateGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart msg="No trend data available" />
            )}
          </ChartPanel>
        </div>
      </div>
    </div>
  );
};

export default Insights;
