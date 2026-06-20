import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ─── Tooltip — mirrors ChartTooltip in Chart.jsx ───────────────────────── */
const SavingsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-[#3f3f46] px-3 py-2 text-xs"
      style={{
        background: "#18181b",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {label && (
        <p className="text-[#a1a1aa] mb-1.5 font-sans text-[11px]">{label}</p>
      )}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? "#4ade80" }}>
          Saved: ₹{Number(p.value).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
};

/* ─── Card wrapper — mirrors ChartCard in Chart.jsx ─────────────────────── */
const ChartCard = ({ title, subtitle, children, minH = 280 }) => (
  <div
    className="rounded-xl border border-[#27272a] overflow-hidden"
    style={{ background: "linear-gradient(145deg, #18181b 0%, #141416 100%)" }}
  >
    <div className="px-5 pt-5 pb-0 flex items-start justify-between">
      <div>
        <p
          className="text-sm font-semibold text-[#e4e4e7]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="text-[11px] text-[#52525b] mt-0.5"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
    <div className="px-2 pt-4 pb-4" style={{ minHeight: minH }}>
      {children}
    </div>
  </div>
);

/**
 * MonthlySavingsChart
 *
 * Area chart of total contributions per month, for the current year.
 * Visually consistent with IncomeExpenseBarChart / ExpensePieChart —
 * same card chrome, axis styling, and empty-state treatment.
 */
export const MonthlySavingsChart = ({ data, year }) => {
  const hasData = data?.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <ChartCard
        title="Monthly Savings"
        subtitle={`Contributions toward goals · ${year}`}
      >
        <div className="flex items-center justify-center h-48 text-[#52525b] text-sm">
          No contributions yet this year
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Monthly Savings"
      subtitle={`Contributions toward goals · ${year}`}
      minH={300}
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4ade80" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="1 4"
            stroke="#27272a"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{
              fill: "#52525b",
              fontSize: 10,
              fontFamily: "'Sora', sans-serif",
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{
              fill: "#52525b",
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          />
          <Tooltip
            content={<SavingsTooltip />}
            cursor={{ stroke: "#3f3f46", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Saved"
            stroke="#4ade80"
            strokeWidth={2}
            fill="url(#savingsGrad)"
            dot={{ r: 3, fill: "#4ade80", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#6ee7b7", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default MonthlySavingsChart;
