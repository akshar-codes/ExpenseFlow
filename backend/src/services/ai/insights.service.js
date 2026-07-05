import { collectFinancialData } from "./dataCollector.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "./promptBuilder.js";
import { getAIProvider, getActiveProviderName } from "./AIProviderFactory.js";
import logger from "../../config/logger.js";
import cache from "../../utils/cache.js";

// Insights are cached per user per month so repeated requests within the
// same session don't burn API quota.
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── Fallback structure returned when the AI call fails ─────────────────────────

const FALLBACK_INSIGHTS = (snapshot) => ({
  healthScore: {
    score: null,
    grade: null,
    summary: "AI analysis unavailable — showing raw data only.",
  },
  monthlySummary: {
    headline: `Your finances for ${snapshot.period.month}/${snapshot.period.year}`,
    narrative:
      `Income: ₹${snapshot.current.income.toLocaleString("en-IN")}, ` +
      `Expense: ₹${snapshot.current.expense.toLocaleString("en-IN")}, ` +
      `Balance: ₹${snapshot.current.balance.toLocaleString("en-IN")}.`,
  },
  insights: [],
  recommendations: [],
  monthEndPrediction: {
    projectedExpense: null,
    projectedIncome: null,
    projectedBalance: null,
    confidence: "low",
    note: "Projection unavailable.",
  },
});

// ── Response normaliser / validator ────────────────────────────────────────────

function normaliseResponse(parsed) {
  // If the provider returned a fallback raw text object, return an empty shell
  if (parsed?._rawFallback) {
    return null; // signal to the service that we should use the fallback
  }

  const safe = (val, fallback) =>
    val !== undefined && val !== null ? val : fallback;

  const validSeverities = new Set(["high", "medium", "low", "positive"]);
  const validTypes = new Set([
    "spending_anomaly",
    "budget_recommendation",
    "saving_opportunity",
    "category_overuse",
    "goal_progress",
    "positive_trend",
  ]);

  const insights = (parsed?.insights ?? [])
    .filter((i) => i && typeof i === "object")
    .map((i) => ({
      type: validTypes.has(i.type) ? i.type : "spending_anomaly",
      severity: validSeverities.has(i.severity) ? i.severity : "medium",
      title: String(i.title ?? "").slice(0, 60),
      body: String(i.body ?? "").slice(0, 200),
      category: i.category ?? null,
      amount: typeof i.amount === "number" ? i.amount : null,
      actionLabel: i.actionLabel ? String(i.actionLabel).slice(0, 30) : null,
    }))
    .slice(0, 7);

  const validImpact = new Set(["high", "medium", "low"]);
  const validEffort = new Set(["easy", "moderate", "hard"]);

  const recommendations = (parsed?.recommendations ?? [])
    .filter((r) => r && typeof r === "object")
    .map((r) => ({
      title: String(r.title ?? "").slice(0, 60),
      description: String(r.description ?? "").slice(0, 200),
      impact: validImpact.has(r.impact) ? r.impact : "medium",
      effort: validEffort.has(r.effort) ? r.effort : "moderate",
    }))
    .slice(0, 3);

  const validConf = new Set(["high", "medium", "low"]);
  const pred = parsed?.monthEndPrediction ?? {};

  const validGrades = new Set(["A", "B", "C", "D", "F"]);
  const hs = parsed?.healthScore ?? {};

  return {
    healthScore: {
      score:
        typeof hs.score === "number"
          ? Math.min(100, Math.max(0, Math.round(hs.score)))
          : null,
      grade: validGrades.has(hs.grade) ? hs.grade : null,
      summary: String(safe(hs.summary, "")).slice(0, 120),
    },
    monthlySummary: {
      headline: String(safe(parsed?.monthlySummary?.headline, "")).slice(
        0,
        140,
      ),
      narrative: String(safe(parsed?.monthlySummary?.narrative, "")).slice(
        0,
        400,
      ),
    },
    insights,
    recommendations,
    monthEndPrediction: {
      projectedExpense:
        typeof pred.projectedExpense === "number"
          ? pred.projectedExpense
          : null,
      projectedIncome:
        typeof pred.projectedIncome === "number" ? pred.projectedIncome : null,
      projectedBalance:
        typeof pred.projectedBalance === "number"
          ? pred.projectedBalance
          : null,
      confidence: validConf.has(pred.confidence) ? pred.confidence : "low",
      note: String(safe(pred.note, "")).slice(0, 120),
    },
  };
}

// ── Public service methods ─────────────────────────────────────────────────────

export async function generateInsights(userId, options = {}) {
  const now = new Date();
  const month = options.month ?? now.getUTCMonth() + 1;
  const year = options.year ?? now.getUTCFullYear();
  const force = options.force ?? false;

  const cacheKey = cache.buildKey(userId, "aiInsights", { month, year });

  // Return cached insights unless force-refresh requested
  if (!force) {
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.debug({ userId, month, year }, "aiInsights: cache hit");
      return { ...cached, fromCache: true };
    }
  }

  // Step 1: Collect financial data
  let snapshot;
  try {
    snapshot = await collectFinancialData(userId, { month, year });
  } catch (dataErr) {
    logger.error(
      { err: dataErr, userId },
      "aiInsights: data collection failed",
    );
    throw new Error(`Failed to collect financial data: ${dataErr.message}`);
  }

  // Step 2: Build prompts
  const userPrompt = buildUserPrompt(snapshot);

  // Step 3: Call AI provider
  let aiResult;
  let providerError = null;

  try {
    const provider = getAIProvider();
    logger.info(
      { provider: provider.name, userId, month, year },
      "aiInsights: calling AI provider",
    );
    aiResult = await provider.generateInsights(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 2048,
      temperature: 0.3,
    });
  } catch (aiErr) {
    providerError = aiErr;
    logger.error({ err: aiErr, userId }, "aiInsights: AI provider call failed");
  }

  // Step 4: Normalise or fall back
  let insights;
  let aiAvailable = false;

  if (aiResult?.success && aiResult.parsed) {
    const normalised = normaliseResponse(aiResult.parsed);
    if (normalised) {
      insights = normalised;
      aiAvailable = true;
    }
  }

  if (!insights) {
    logger.warn(
      { userId, providerError: providerError?.message },
      "aiInsights: using fallback",
    );
    insights = FALLBACK_INSIGHTS(snapshot);
  }

  const result = {
    success: true,
    aiAvailable,
    provider: getActiveProviderName(),
    period: { month, year },
    snapshot: {
      current: snapshot.current,
      savingsRate: snapshot.savingsRate,
      expenseByCategory: snapshot.expenseByCategory,
      budgets: snapshot.budgets,
      activeGoals: snapshot.activeGoals,
      spendingAnomalies: snapshot.spendingAnomalies,
    },
    ...insights,
    meta: aiResult?.meta ?? null,
    fromCache: false,
  };

  // Cache successful results (even fallback ones — data collection was fine)
  cache.set(cacheKey, result, CACHE_TTL_MS);

  return result;
}

export function invalidateInsightsCache(userId) {
  return cache.invalidateUser(userId);
}

export async function checkProviderHealth() {
  try {
    const provider = getAIProvider();
    return provider.healthCheck();
  } catch (err) {
    return { ok: false, error: err.message, provider: getActiveProviderName() };
  }
}
