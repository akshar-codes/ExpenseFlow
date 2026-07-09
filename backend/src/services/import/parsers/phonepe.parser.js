import {
  guessColumnMap,
  buildWalletNormalizer,
  scoreDetection,
} from "./baseParser.js";

const ALIAS_SPEC = {
  date: ["Date", "Transaction Date"],
  description: ["Transaction Details", "Description", "Details"],
  amount: ["Amount", "Debit/Credit Amount"],
  type: ["Type", "Debit/Credit"],
  refNo: ["Transaction ID", "UTR No", "Ref No"],
};

const normalizeRow = buildWalletNormalizer();

export default {
  id: "phonepe",
  label: "PhonePe",
  aliasSpec: ALIAS_SPEC,

  detect(headers) {
    const hasUtr = headers.some((h) => /utr/i.test(h));
    return scoreDetection(headers, ALIAS_SPEC, hasUtr ? 0.1 : 0);
  },

  guessColumnMap(headers) {
    return guessColumnMap(headers, ALIAS_SPEC);
  },

  normalizeRow,
};
