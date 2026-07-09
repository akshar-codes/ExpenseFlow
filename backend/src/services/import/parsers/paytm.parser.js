import {
  guessColumnMap,
  buildWalletNormalizer,
  scoreDetection,
} from "./baseParser.js";

const ALIAS_SPEC = {
  date: ["Date", "Transaction Date"],
  description: ["Comment", "Description", "Details"],
  amount: ["Amount", "Amount (in Rs.)"],
  type: ["Type", "Transaction Type", "Debit/Credit"],
  refNo: ["Order ID", "UPI Ref No", "Ref No"],
};

const normalizeRow = buildWalletNormalizer();

export default {
  id: "paytm",
  label: "Paytm",
  aliasSpec: ALIAS_SPEC,

  detect(headers) {
    const hasOrderId = headers.some((h) => /order\s*id/i.test(h));
    return scoreDetection(headers, ALIAS_SPEC, hasOrderId ? 0.1 : 0);
  },

  guessColumnMap(headers) {
    return guessColumnMap(headers, ALIAS_SPEC);
  },

  normalizeRow,
};
