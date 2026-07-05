const MONTH_NAMES = [
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

// ─── System prompt (static, defines AI persona and output contract) ────────────

export const SYSTEM_PROMPT = `You are a sharp, empathetic personal finance analyst for an Indian household budgeting app called ExpenseTracker. Your tone is direct, actionable, and warm — like a knowledgeable friend, not a formal report.

You will receive a JSON financial snapshot and must return a SINGLE valid JSON object (no prose, no markdown outside the fence) conforming EXACTLY to this schema:

\`\`\`json
{
  "healthScore": {
    "score": <integer 0-100>,
    "grade": <"A" | "B" | "C" | "D" | "F">,
    "summary": <one sentence, max 120 chars>
  },
  "monthlySummary": {
    "headline": <one punchy sentence about this month, max 140 chars>,
    "narrative": <2-3 sentences of plain-language analysis, max 400 chars>
  },
  "insights": [
    {
      "type": <"spending_anomaly" | "budget_recommendation" | "saving_opportunity" | "category_overuse" | "goal_progress" | "positive_trend">,
      "severity": <"high" | "medium" | "low" | "positive">,
      "title": <max 60 chars>,
      "body": <max 200 chars, specific and actionable>,
      "category": <category name or null>,
      "amount": <number or null>,
      "actionLabel": <max 30 chars, e.g. "Review budget" or null>
    }
  ],
  "recommendations": [
    {
      "title": <max 60 chars>,
      "description": <max 200 chars>,
      "impact": <"high" | "medium" | "low">,
      "effort": <"easy" | "moderate" | "hard">
    }
  ],
  "monthEndPrediction": {
    "projectedExpense": <number>,
    "projectedIncome": <number>,
    "projectedBalance": <number>,
    "confidence": <"high" | "medium" | "low">,
    "note": <max 120 chars>
  }
}
\`\`\`

Rules:
- insights array: 3–7 items, prioritise high-severity first.
- recommendations: exactly 3 items, ordered high → low impact.
- All rupee amounts are in INR. Do not add currency symbols inside JSON strings.
- healthScore: 80-100 = A (excellent), 65-79 = B (good), 50-64 = C (fair), 35-49 = D (needs work), 0-34 = F (critical).
- Be specific: cite actual numbers and category names from the data.
- Never invent data not present in the snapshot.
- Return ONLY the JSON object inside a \`\`\`json fence. No other text.`;

// ─── User prompt (dynamic, embeds the financial snapshot) ─────────────────────

/**
 * Build the user-side prompt from a FinancialSnapshot.
 *
 * @param {object} snapshot  Output of dataCollector.collectFinancialData()
 * @returns {string}
 */
export function buildUserPrompt(snapshot) {
  const {
    period,
    current,
    prior,
    deltas,
    averages,
    savingsRate,
    expenseByCategory,
    incomeByCategory,
    priorExpenseByCategory,
    budgets,
    largestExpenses,
    activeGoals,
    spendingAnomalies,
    rolling6Months,
  } = snapshot;

  const monthName = MONTH_NAMES[period.month - 1];
  const priorMonthName = MONTH_NAMES[period.priorMonth - 1];

  // Days elapsed in current month (for projection context)
  const daysInMonth = new Date(
    Date.UTC(period.year, period.month, 0),
  ).getUTCDate();
  const today = new Date();
  const dayOfMonth = today.getUTCDate();
  const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);

  const data = {
    reportPeriod: `${monthName} ${period.year}`,
    daysElapsedInMonth: dayOfMonth,
    daysRemainingInMonth: daysRemaining,

    currentMonth: {
      income: current.income,
      expense: current.expense,
      netBalance: current.balance,
      savingsRatePct: savingsRate,
      transactionCount: current.transactionCount,
    },

    priorMonth: {
      label: `${priorMonthName} ${period.priorYear}`,
      income: prior.income,
      expense: prior.expense,
      balance: prior.balance,
    },

    monthOnMonthChangePct: {
      expense: deltas.expenseMoM,
      income: deltas.incomeMoM,
    },

    sixMonthAverages: {
      monthlyIncome: averages.income,
      monthlyExpense: averages.expense,
    },

    expenseByCategory: expenseByCategory.map((c) => ({
      category: c.category,
      spent: c.total,
      txCount: c.count,
    })),

    incomeByCategory: incomeByCategory.map((c) => ({
      source: c.category,
      amount: c.total,
    })),

    priorMonthExpenseByCategory: priorExpenseByCategory.map((c) => ({
      category: c.category,
      spent: c.total,
    })),

    spendingAnomalies: spendingAnomalies.map((a) => ({
      category: a.category,
      currentSpend: a.currentSpend,
      rollingAverage: a.averageSpend,
      spikePercent: a.spikePercent,
    })),

    budgetStatus: budgets.map((b) => ({
      category: b.category,
      limit: b.limit,
      spent: b.spent,
      usedPct: b.percentage,
      exceeded: b.exceeded,
    })),

    largestExpenses: largestExpenses.map((e) => ({
      amount: e.amount,
      category: e.category,
      note: e.note || null,
    })),

    activeGoals: activeGoals.map((g) => ({
      title: g.title,
      target: g.targetAmount,
      saved: g.currentAmount,
      progressPct: g.progressPct,
      daysRemaining: g.daysRemaining,
      priority: g.priority,
    })),

    rolling6MonthsTrend: rolling6Months.map((m) => ({
      month: `${MONTH_NAMES[m.month - 1]} ${m.year}`,
      income: m.income,
      expense: m.expense,
      net: m.net,
    })),
  };

  return `Analyse this financial snapshot and return insights as instructed:\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}
