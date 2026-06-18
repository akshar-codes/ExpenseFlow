import API from "./axios";

// ─── Per-goal contributions ───────────────────────────────────────────────────

export const addContribution = async (goalId, data) => {
  const res = await API.post(`/goals/${goalId}/contributions`, data);
  return res.data;
};

export const linkTransactionToGoal = async (goalId, data) => {
  const res = await API.post(`/goals/${goalId}/contributions/link`, data);
  return res.data;
};

export const getContributions = async (goalId, params = {}) => {
  const res = await API.get(`/goals/${goalId}/contributions`, { params });
  return res.data;
};

export const undoContribution = async (goalId, contributionId) => {
  const res = await API.delete(
    `/goals/${goalId}/contributions/${contributionId}`,
  );
  return res.data;
};

// ─── Aggregate / cross-goal ───────────────────────────────────────────────────

export const getMonthlySavings = async (year) => {
  const res = await API.get("/goals/contributions/monthly", {
    params: { year },
  });
  return res.data;
};

export const getRecentContributions = async (limit = 5) => {
  const res = await API.get("/goals/contributions/recent", {
    params: { limit },
  });
  return res.data;
};
