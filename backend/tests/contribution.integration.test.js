"use strict";

jest.mock("express-rate-limit", () => () => (_req, _res, next) => next());

process.env.JWT_ACCESS_SECRET = "test_access_secret_must_be_32_plus_chars_ok";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_32_plus_chars_ok_xxxxx";
process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:5173";

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import app from "../src/app.js";
import User from "../src/models/User.js";
import Category from "../src/models/Category.js";
import Transaction from "../src/models/Transaction.js";
import Contribution from "../src/models/Contribution.js";
import { Goal } from "../src/models/Goal.js";
import { generateAccessToken } from "../src/utils/generateToken.js";

// ── Fixtures ───────────────────────────────────────────────────────────────────

let mongoServer;
let tokenA, tokenB;
let userAId, userBId;
let incomeCatId;

const FUTURE_DATE = new Date(
  Date.now() + 90 * 24 * 60 * 60 * 1000,
).toISOString();

let _dateSeq = 0;
const uniquePastDate = () => {
  const d = new Date(Date.now() - ++_dateSeq * 60_000);
  return d.toISOString();
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const userA = await User.create({
    name: "Contribution Tester A",
    email: "contrib_a@test.example.com",
    password: "Password123!",
  });
  userAId = userA._id;
  tokenA = generateAccessToken(userA._id);

  const userB = await User.create({
    name: "Contribution Tester B",
    email: "contrib_b@test.example.com",
    password: "Password456!",
  });
  userBId = userB._id;
  tokenB = generateAccessToken(userB._id);

  const incomeCat = await Category.create({
    name: "Salary",
    type: "income",
    user: userAId,
  });
  incomeCatId = incomeCat._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Contribution.deleteMany({});
  await Goal.deleteMany({});
  await Transaction.deleteMany({});
});

// ── Helpers ────────────────────────────────────────────────────────────────────

const createGoal = async (token, overrides = {}) => {
  const res = await request(app)
    .post("/api/goals")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Emergency Fund",
      targetAmount: 10000,
      targetDate: FUTURE_DATE,
      ...overrides,
    });
  return res.body.data;
};

const addContribution = (token, goalId, body) =>
  request(app)
    .post(`/api/goals/${goalId}/contributions`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);

const linkTransaction = (token, goalId, body) =>
  request(app)
    .post(`/api/goals/${goalId}/contributions/link`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);

const getContributions = (token, goalId, query = {}) =>
  request(app)
    .get(`/api/goals/${goalId}/contributions`)
    .set("Authorization", `Bearer ${token}`)
    .query(query);

const undoContribution = (token, goalId, contributionId) =>
  request(app)
    .delete(`/api/goals/${goalId}/contributions/${contributionId}`)
    .set("Authorization", `Bearer ${token}`);

const getMonthlySavings = (token, year) =>
  request(app)
    .get("/api/goals/contributions/monthly")
    .set("Authorization", `Bearer ${token}`)
    .query({ year });

const getRecentContributions = (token, limit) =>
  request(app)
    .get("/api/goals/contributions/recent")
    .set("Authorization", `Bearer ${token}`)
    .query(limit ? { limit } : {});

const createIncomeTransaction = async (token, amount, overrides = {}) => {
  const res = await request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send({
      type: "income",
      amount,
      category: incomeCatId.toString(),
      date: uniquePastDate(),
      ...overrides,
    });
  return res.body.transaction;
};

// ── POST /api/goals/:goalId/contributions ───────────────────────────────────────

describe("POST /api/goals/:goalId/contributions — manual", () => {
  it("returns 201 and creates a contribution", async () => {
    const goal = await createGoal(tokenA);
    const res = await addContribution(tokenA, goal._id, { amount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.data.contribution).toMatchObject({
      amount: 1000,
      source: "manual",
    });
  });

  it("increments the goal's currentAmount", async () => {
    const goal = await createGoal(tokenA);
    const res = await addContribution(tokenA, goal._id, { amount: 2500 });

    expect(res.body.data.goal.currentAmount).toBe(2500);
  });

  it("persists the contribution to the database", async () => {
    const goal = await createGoal(tokenA);
    const res = await addContribution(tokenA, goal._id, { amount: 500 });

    const stored = await Contribution.findById(res.body.data.contribution._id);
    expect(stored).not.toBeNull();
    expect(stored.amount).toBe(500);
    expect(stored.user.toString()).toBe(userAId.toString());
  });

  it("records snapshotBefore and snapshotAfter", async () => {
    const goal = await createGoal(tokenA);
    await addContribution(tokenA, goal._id, { amount: 1000 });
    const res = await addContribution(tokenA, goal._id, { amount: 500 });

    expect(res.body.data.contribution.snapshotBefore).toBe(1000);
    expect(res.body.data.contribution.snapshotAfter).toBe(1500);
  });

  it("accumulates currentAmount across multiple contributions", async () => {
    const goal = await createGoal(tokenA);
    await addContribution(tokenA, goal._id, { amount: 1000 });
    await addContribution(tokenA, goal._id, { amount: 1500 });
    const res = await addContribution(tokenA, goal._id, { amount: 500 });

    expect(res.body.data.goal.currentAmount).toBe(3000);
  });

  it("auto-completes the goal when target is reached exactly", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 1000 });
    const res = await addContribution(tokenA, goal._id, { amount: 1000 });

    expect(res.body.data.goal.status).toBe("completed");
    expect(res.body.data.goal.completedAt).not.toBeNull();
  });

  it("rejects a contribution that would exceed target without allowOverSaving", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 1000 });
    const res = await addContribution(tokenA, goal._id, { amount: 1500 });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/exceed/i);
  });

  it("does not mutate goal when over-save is rejected", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 1000 });
    await addContribution(tokenA, goal._id, { amount: 1500 });

    const stored = await Goal.findById(goal._id);
    expect(stored.currentAmount).toBe(0);
  });

  it("allows exceeding target when allowOverSaving=true", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 1000 });
    const res = await addContribution(tokenA, goal._id, {
      amount: 1500,
      allowOverSaving: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.goal.currentAmount).toBe(1500);
    expect(res.body.data.goal.status).toBe("completed");
  });

  it("does not create a contribution record when rejected for over-saving", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 1000 });
    await addContribution(tokenA, goal._id, { amount: 1500 });

    expect(await Contribution.countDocuments({ goal: goal._id })).toBe(0);
  });

  it("accepts an optional note and date", async () => {
    const res2 = await createGoal(tokenA);
    const res = await addContribution(tokenA, res2._id, {
      amount: 200,
      note: "Birthday gift money",
      date: "2024-01-15",
    });

    expect(res.body.data.contribution.note).toBe("Birthday gift money");
  });

  it("returns 400 for missing amount", async () => {
    const goal = await createGoal(tokenA);
    const res = await addContribution(tokenA, goal._id, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for zero amount", async () => {
    const goal = await createGoal(tokenA);
    expect(
      (await addContribution(tokenA, goal._id, { amount: 0 })).status,
    ).toBe(400);
  });

  it("returns 400 for negative amount", async () => {
    const goal = await createGoal(tokenA);
    expect(
      (await addContribution(tokenA, goal._id, { amount: -100 })).status,
    ).toBe(400);
  });

  it("returns 404 for a non-existent goal", async () => {
    const res = await addContribution(
      tokenA,
      new mongoose.Types.ObjectId().toString(),
      { amount: 100 },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when contributing to another user's goal", async () => {
    const goal = await createGoal(tokenA);
    const res = await addContribution(tokenB, goal._id, { amount: 100 });
    expect(res.status).toBe(404);
  });

  it("does not mutate goal after unauthorized contribution attempt", async () => {
    const goal = await createGoal(tokenA);
    await addContribution(tokenB, goal._id, { amount: 100 });
    const stored = await Goal.findById(goal._id);
    expect(stored.currentAmount).toBe(0);
  });

  it("rejects contributions to a cancelled goal", async () => {
    const goal = await createGoal(tokenA, { status: "active" });
    await request(app)
      .put(`/api/goals/${goal._id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ status: "cancelled" });

    const res = await addContribution(tokenA, goal._id, { amount: 100 });
    expect(res.status).toBe(400);
  });

  it("returns 401 without a token", async () => {
    const goal = await createGoal(tokenA);
    const res = await request(app)
      .post(`/api/goals/${goal._id}/contributions`)
      .send({ amount: 100 });
    expect(res.status).toBe(401);
  });
});

// ── POST /api/goals/:goalId/contributions/link ──────────────────────────────────

describe("POST /api/goals/:goalId/contributions/link — link transaction", () => {
  it("links a transaction and creates a contribution with the full amount", async () => {
    const goal = await createGoal(tokenA);
    const tx = await createIncomeTransaction(tokenA, 5000);

    const res = await linkTransaction(tokenA, goal._id, {
      transactionId: tx._id,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.contribution.amount).toBe(5000);
    expect(res.body.data.contribution.source).toBe("linked");
    expect(res.body.data.contribution.transaction).toBe(tx._id);
    expect(res.body.data.goal.currentAmount).toBe(5000);
  });

  it("supports partial allocation of a transaction", async () => {
    const goal = await createGoal(tokenA);
    const tx = await createIncomeTransaction(tokenA, 5000);

    const res = await linkTransaction(tokenA, goal._id, {
      transactionId: tx._id,
      amount: 2000,
    });

    expect(res.body.data.contribution.amount).toBe(2000);
    expect(res.body.data.goal.currentAmount).toBe(2000);
  });

  it("rejects allocation amount exceeding the transaction amount", async () => {
    const goal = await createGoal(tokenA);
    const tx = await createIncomeTransaction(tokenA, 1000);

    const res = await linkTransaction(tokenA, goal._id, {
      transactionId: tx._id,
      amount: 5000,
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 when transaction does not belong to user", async () => {
    const goal = await createGoal(tokenA);
    const tx = await createIncomeTransaction(tokenA, 1000);

    const res = await linkTransaction(tokenB, goal._id, {
      transactionId: tx._id,
    });

    expect(res.status).toBe(404);
  });

  it("respects the over-saving guard for linked transactions", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 1000 });
    const tx = await createIncomeTransaction(tokenA, 5000);

    const res = await linkTransaction(tokenA, goal._id, {
      transactionId: tx._id,
      amount: 2000,
    });

    expect(res.status).toBe(422);
  });

  it("allows the same transaction to be linked to two different goals", async () => {
    const goalA = await createGoal(tokenA, { title: "Goal A" });
    const goalB = await createGoal(tokenA, { title: "Goal B" });
    const tx = await createIncomeTransaction(tokenA, 5000);

    const resA = await linkTransaction(tokenA, goalA._id, {
      transactionId: tx._id,
      amount: 2000,
    });
    const resB = await linkTransaction(tokenA, goalB._id, {
      transactionId: tx._id,
      amount: 2000,
    });

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
  });

  it("prevents re-linking the same transaction twice to the same goal", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 100000 });
    const tx = await createIncomeTransaction(tokenA, 5000);

    const first = await linkTransaction(tokenA, goal._id, {
      transactionId: tx._id,
      amount: 1000,
    });
    expect(first.status).toBe(201);

    // Duplicate-key error surfaces as 500 via errorHandler -> 400 normalization
    const second = await linkTransaction(tokenA, goal._id, {
      transactionId: tx._id,
      amount: 1000,
    });
    expect([400, 500]).toContain(second.status);
  });

  it("returns 400 for missing transactionId", async () => {
    const goal = await createGoal(tokenA);
    const res = await linkTransaction(tokenA, goal._id, {});
    expect(res.status).toBe(400);
  });

  it("returns 401 without a token", async () => {
    const goal = await createGoal(tokenA);
    const tx = await createIncomeTransaction(tokenA, 1000);
    const res = await request(app)
      .post(`/api/goals/${goal._id}/contributions/link`)
      .send({ transactionId: tx._id });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/goals/:goalId/contributions ────────────────────────────────────────

describe("GET /api/goals/:goalId/contributions — history", () => {
  it("returns contributions sorted by date desc", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 100000 });
    await addContribution(tokenA, goal._id, {
      amount: 100,
      date: "2024-01-01",
    });
    await addContribution(tokenA, goal._id, {
      amount: 200,
      date: "2024-02-01",
    });

    const res = await getContributions(tokenA, goal._id);
    expect(res.status).toBe(200);
    expect(res.body.contributions).toHaveLength(2);
    expect(res.body.contributions[0].amount).toBe(200);
  });

  it("paginates results", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 100000 });
    for (let i = 0; i < 5; i++) {
      await addContribution(tokenA, goal._id, { amount: 100 });
    }

    const res = await getContributions(tokenA, goal._id, { page: 1, limit: 2 });
    expect(res.body.contributions).toHaveLength(2);
    expect(res.body.pagination.total).toBe(5);
    expect(res.body.pagination.totalPages).toBe(3);
  });

  it("excludes undone contributions by default", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 100000 });
    const added = await addContribution(tokenA, goal._id, { amount: 100 });
    await undoContribution(tokenA, goal._id, added.body.data.contribution._id);

    const res = await getContributions(tokenA, goal._id);
    expect(res.body.contributions).toHaveLength(0);
  });

  it("includes undone contributions when includeUndone=true", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 100000 });
    const added = await addContribution(tokenA, goal._id, { amount: 100 });
    await undoContribution(tokenA, goal._id, added.body.data.contribution._id);

    const res = await getContributions(tokenA, goal._id, {
      includeUndone: true,
    });
    expect(res.body.contributions).toHaveLength(1);
    expect(res.body.contributions[0].isUndone).toBe(true);
  });

  it("returns 404 for another user's goal", async () => {
    const goal = await createGoal(tokenA);
    const res = await getContributions(tokenB, goal._id);
    expect(res.status).toBe(404);
  });

  it("returns 401 without a token", async () => {
    const goal = await createGoal(tokenA);
    const res = await request(app).get(`/api/goals/${goal._id}/contributions`);
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/goals/:goalId/contributions/:id — undo ──────────────────────────

describe("DELETE /api/goals/:goalId/contributions/:id — undo", () => {
  it("marks the contribution as undone", async () => {
    const goal = await createGoal(tokenA);
    const added = await addContribution(tokenA, goal._id, { amount: 1000 });

    const res = await undoContribution(
      tokenA,
      goal._id,
      added.body.data.contribution._id,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.contribution.isUndone).toBe(true);
    expect(res.body.data.contribution.undoneAt).not.toBeNull();
  });

  it("subtracts the amount back from the goal's currentAmount", async () => {
    const goal = await createGoal(tokenA);
    await addContribution(tokenA, goal._id, { amount: 1000 });
    const added = await addContribution(tokenA, goal._id, { amount: 500 });

    const res = await undoContribution(
      tokenA,
      goal._id,
      added.body.data.contribution._id,
    );

    expect(res.body.data.goal.currentAmount).toBe(1000);
  });

  it("never drives currentAmount below zero", async () => {
    const goal = await createGoal(tokenA);
    const added = await addContribution(tokenA, goal._id, { amount: 500 });

    // Manually corrupt currentAmount lower than the contribution to simulate
    // a race; undo should still floor at 0, never go negative.
    await Goal.findByIdAndUpdate(goal._id, { currentAmount: 100 });

    const res = await undoContribution(
      tokenA,
      goal._id,
      added.body.data.contribution._id,
    );

    expect(res.body.data.goal.currentAmount).toBe(0);
  });

  it("reopens a completed goal when undo drops currentAmount below target", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 1000 });
    const added = await addContribution(tokenA, goal._id, { amount: 1000 });
    expect(added.body.data.goal.status).toBe("completed");

    const res = await undoContribution(
      tokenA,
      goal._id,
      added.body.data.contribution._id,
    );

    expect(res.body.data.goal.status).toBe("active");
    expect(res.body.data.goal.completedAt).toBeNull();
  });

  it("returns 404 when undoing an already-undone contribution", async () => {
    const goal = await createGoal(tokenA);
    const added = await addContribution(tokenA, goal._id, { amount: 100 });
    await undoContribution(tokenA, goal._id, added.body.data.contribution._id);

    const res = await undoContribution(
      tokenA,
      goal._id,
      added.body.data.contribution._id,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when another user tries to undo a contribution", async () => {
    const goal = await createGoal(tokenA);
    const added = await addContribution(tokenA, goal._id, { amount: 100 });

    const res = await undoContribution(
      tokenB,
      goal._id,
      added.body.data.contribution._id,
    );
    expect(res.status).toBe(404);
  });

  it("does not mutate goal after unauthorized undo attempt", async () => {
    const goal = await createGoal(tokenA);
    const added = await addContribution(tokenA, goal._id, { amount: 100 });
    await undoContribution(tokenB, goal._id, added.body.data.contribution._id);

    const stored = await Goal.findById(goal._id);
    expect(stored.currentAmount).toBe(100);
  });

  it("preserves the undone contribution in the database (audit trail)", async () => {
    const goal = await createGoal(tokenA);
    const added = await addContribution(tokenA, goal._id, { amount: 100 });
    await undoContribution(tokenA, goal._id, added.body.data.contribution._id);

    const stored = await Contribution.findById(
      added.body.data.contribution._id,
    );
    expect(stored).not.toBeNull();
    expect(stored.isUndone).toBe(true);
    expect(stored.amount).toBe(100);
  });

  it("returns 401 without a token", async () => {
    const goal = await createGoal(tokenA);
    const added = await addContribution(tokenA, goal._id, { amount: 100 });
    const res = await request(app).delete(
      `/api/goals/${goal._id}/contributions/${added.body.data.contribution._id}`,
    );
    expect(res.status).toBe(401);
  });
});

// ── GET /api/goals/contributions/monthly ────────────────────────────────────────

describe("GET /api/goals/contributions/monthly — savings chart", () => {
  it("returns 12 zero-filled months when no contributions exist", async () => {
    const res = await getMonthlySavings(tokenA, 2024);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(12);
    expect(res.body.data.every((m) => m.total === 0)).toBe(true);
  });

  it("aggregates contributions by month", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 100000 });
    await addContribution(tokenA, goal._id, {
      amount: 1000,
      date: "2024-01-10",
    });
    await addContribution(tokenA, goal._id, {
      amount: 500,
      date: "2024-01-20",
    });
    await addContribution(tokenA, goal._id, {
      amount: 2000,
      date: "2024-03-05",
    });

    const res = await getMonthlySavings(tokenA, 2024);
    const jan = res.body.data.find((m) => m.month === 1);
    const mar = res.body.data.find((m) => m.month === 3);
    expect(jan.total).toBe(1500);
    expect(mar.total).toBe(2000);
  });

  it("excludes undone contributions from the chart", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 100000 });
    const added = await addContribution(tokenA, goal._id, {
      amount: 1000,
      date: "2024-05-01",
    });
    await undoContribution(tokenA, goal._id, added.body.data.contribution._id);

    const res = await getMonthlySavings(tokenA, 2024);
    const may = res.body.data.find((m) => m.month === 5);
    expect(may.total).toBe(0);
  });

  it("does not include another user's contributions", async () => {
    const goalA = await createGoal(tokenA, { targetAmount: 100000 });
    await addContribution(tokenA, goalA._id, {
      amount: 1000,
      date: "2024-06-01",
    });

    const goalB = await createGoal(tokenB, { targetAmount: 100000 });
    await addContribution(tokenB, goalB._id, {
      amount: 9999,
      date: "2024-06-01",
    });

    const res = await getMonthlySavings(tokenA, 2024);
    const june = res.body.data.find((m) => m.month === 6);
    expect(june.total).toBe(1000);
  });

  it("returns 400 for missing year", async () => {
    const res = await request(app)
      .get("/api/goals/contributions/monthly")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .get("/api/goals/contributions/monthly")
      .query({ year: 2024 });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/goals/contributions/recent ─────────────────────────────────────────

describe("GET /api/goals/contributions/recent — dashboard widget", () => {
  it("returns the most recent contributions across all goals", async () => {
    const goalA = await createGoal(tokenA, {
      title: "Goal A",
      targetAmount: 100000,
    });
    const goalB = await createGoal(tokenA, {
      title: "Goal B",
      targetAmount: 100000,
    });

    await addContribution(tokenA, goalA._id, {
      amount: 100,
      date: "2024-01-01",
    });
    await addContribution(tokenA, goalB._id, {
      amount: 200,
      date: "2024-02-01",
    });

    const res = await getRecentContributions(tokenA);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    // Most recent first
    expect(res.body.data[0].amount).toBe(200);
  });

  it("respects the limit query param", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 100000 });
    for (let i = 0; i < 5; i++) {
      await addContribution(tokenA, goal._id, { amount: 100 });
    }

    const res = await getRecentContributions(tokenA, 2);
    expect(res.body.data).toHaveLength(2);
  });

  it("excludes undone contributions", async () => {
    const goal = await createGoal(tokenA, { targetAmount: 100000 });
    const added = await addContribution(tokenA, goal._id, { amount: 100 });
    await undoContribution(tokenA, goal._id, added.body.data.contribution._id);

    const res = await getRecentContributions(tokenA);
    expect(res.body.data).toHaveLength(0);
  });

  it("populates the goal title and color", async () => {
    const goal = await createGoal(tokenA, {
      title: "Vacation Fund",
      color: "#22c55e",
    });
    await addContribution(tokenA, goal._id, { amount: 100 });

    const res = await getRecentContributions(tokenA);
    expect(res.body.data[0].goal.title).toBe("Vacation Fund");
    expect(res.body.data[0].goal.color).toBe("#22c55e");
  });

  it("does not include another user's contributions", async () => {
    const goalB = await createGoal(tokenB);
    await addContribution(tokenB, goalB._id, { amount: 9999 });

    const res = await getRecentContributions(tokenA);
    expect(res.body.data).toHaveLength(0);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/goals/contributions/recent");
    expect(res.status).toBe(401);
  });
});
