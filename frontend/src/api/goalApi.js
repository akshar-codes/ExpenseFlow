import API from "./axios";

// ─── Goals CRUD ───────────────────────────────────────────────────────────────

export const getGoals = async (params = {}, { signal } = {}) => {
  // Strip empty-string filters — the backend's Joi schema rejects
  // status: "" / priority: "" / search: "" (no .allow("") on those fields).
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined,
    ),
  );
  const res = await API.get("/goals", { params: cleanParams, signal });
  return res.data;
};

export const getGoalById = async (id) => {
  const res = await API.get(`/goals/${id}`);
  return res.data;
};

export const createGoal = async (data) => {
  const res = await API.post("/goals", data);
  return res.data;
};

export const updateGoal = async (id, data) => {
  const res = await API.put(`/goals/${id}`, data);
  return res.data;
};

export const deleteGoal = async (id) => {
  const res = await API.delete(`/goals/${id}`);
  return res.data;
};

// ─── Aggregate views ──────────────────────────────────────────────────────────

export const getGoalStatistics = async () => {
  const res = await API.get("/goals/statistics");
  return res.data;
};

export const getGoalDashboard = async () => {
  const res = await API.get("/goals/dashboard");
  return res.data;
};
