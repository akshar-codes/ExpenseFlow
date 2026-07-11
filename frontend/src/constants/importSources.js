export const IMPORT_SOURCES = [
  { id: "hdfc", label: "HDFC Bank", group: "Bank" },
  { id: "sbi", label: "State Bank of India", group: "Bank" },
  { id: "icici", label: "ICICI Bank", group: "Bank" },
  { id: "axis", label: "Axis Bank", group: "Bank" },
  { id: "kotak", label: "Kotak Mahindra Bank", group: "Bank" },
  { id: "indusind", label: "Indie by IndusInd Bank", group: "Bank" },
  { id: "googlepay", label: "Google Pay", group: "Wallet" },
  { id: "phonepe", label: "PhonePe", group: "Wallet" },
  { id: "paytm", label: "Paytm", group: "Wallet" },
  { id: "navi", label: "Navi", group: "Wallet" },
];

export const IMPORT_FIELDS = [
  { value: "date", label: "Date", required: true },
  { value: "description", label: "Description / Narration", required: false },
  { value: "amount", label: "Amount", required: false },
  { value: "debit", label: "Debit / Withdrawal", required: false },
  { value: "credit", label: "Credit / Deposit", required: false },
  { value: "type", label: "Type (Debit/Credit)", required: false },
  { value: "refNo", label: "Reference No.", required: false },
  { value: "balance", label: "Balance", required: false },
];
