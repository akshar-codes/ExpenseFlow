export const normalizeTransaction = (tx) => ({
  ...tx,
  categoryName:
    typeof tx.category === "object" && tx.category !== null
      ? tx.category.name
      : (tx.category ?? "Unknown"),
  categoryId:
    typeof tx.category === "object" && tx.category !== null
      ? tx.category._id
      : tx.category,
});
