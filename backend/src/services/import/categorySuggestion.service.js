import Category from "../../models/Category.js";

const KEYWORD_MAP = [
  {
    category: "Food",
    type: "expense",
    keywords: [
      "swiggy",
      "zomato",
      "restaurant",
      "cafe",
      "food",
      "eatery",
      "dine",
      "dominos",
      "pizza",
    ],
  },
  {
    category: "Transport",
    type: "expense",
    keywords: [
      "uber",
      "ola",
      "rapido",
      "irctc",
      "petrol",
      "fuel",
      "metro",
      "cab",
      "diesel",
    ],
  },
  {
    category: "Shopping",
    type: "expense",
    keywords: ["amazon", "flipkart", "myntra", "ajio", "mall", "nykaa"],
  },
  {
    category: "Bills",
    type: "expense",
    keywords: [
      "electricity",
      "recharge",
      "dth",
      "broadband",
      "jio",
      "airtel",
      "vodafone",
      "gas bill",
      "water bill",
      "wifi",
    ],
  },
  {
    category: "Health",
    type: "expense",
    keywords: [
      "pharmacy",
      "hospital",
      "apollo",
      "medplus",
      "clinic",
      "medical",
      "diagnostic",
    ],
  },
  {
    category: "Salary",
    type: "income",
    keywords: ["salary", "payroll", "wages"],
  },
  {
    category: "Freelance",
    type: "income",
    keywords: ["freelance", "consulting", "invoice", "contract payment"],
  },
];

const FALLBACK_NAME = "Uncategorized";

// Per-process cache so a single import batch doesn't repeatedly hit the DB
// for the same user's fallback category. Keyed by userId+type.
const fallbackCache = new Map();

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findCategoryByName = async (userId, name, type) =>
  Category.findOne({
    user: userId,
    type,
    name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
  });

/**
 * Find-or-create the "Uncategorized" category for a given user + type.
 */
export const ensureFallbackCategory = async (userId, type) => {
  const cacheKey = `${userId}:${type}`;
  if (fallbackCache.has(cacheKey)) return fallbackCache.get(cacheKey);

  let category = await findCategoryByName(userId, FALLBACK_NAME, type);
  if (!category) {
    category = await Category.create({
      user: userId,
      name: FALLBACK_NAME,
      type,
    });
  }

  fallbackCache.set(cacheKey, category._id);
  return category._id;
};

/**
 * Suggest a category for a normalized import row.
 */
export const suggestCategory = async (
  userId,
  { merchant, description, type },
) => {
  const haystack = `${merchant ?? ""} ${description ?? ""}`.toLowerCase();

  const candidates = KEYWORD_MAP.filter((entry) => entry.type === type);

  for (const entry of candidates) {
    if (entry.keywords.some((kw) => haystack.includes(kw))) {
      const existing = await findCategoryByName(userId, entry.category, type);
      if (existing) {
        return {
          categoryId: existing._id,
          categoryName: existing.name,
          autoAssigned: false,
        };
      }
    }
  }

  const fallbackId = await ensureFallbackCategory(userId, type);
  return {
    categoryId: fallbackId,
    categoryName: FALLBACK_NAME,
    autoAssigned: true,
  };
};

/**
 * Clear the in-process fallback-category cache. Exposed for tests.
 */
export const clearSuggestionCache = () => fallbackCache.clear();
