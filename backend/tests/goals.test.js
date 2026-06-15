"use strict";

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import app from "../../app.js";
import { Goal } from "../models/Goal.js";
import User from "../models/User.js";
import { generateTokens } from "../utils/tokenUtils.js";

// ── Setup ─────────────────────────────────────────────────────────────────────

let mongoServer;
let authToken;
let userId;
let otherToken;
let otherId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const user = await User.create({
    name: "Test User",
    email: "test@goals.com",
    password: "Password123!",
  });
  userId = user._id.toString();
  ({ accessToken: authToken } = generateTokens(userId));

  const other = await User.create({
    name: "Other User",
    email: "other@goals.com",
    password: "Password123!",
  });
  otherId = other._id.toString();
  ({ accessToken: otherToken } = generateTokens(otherId));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Goal.deleteMany({});
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const FUTURE_DATE = new Date(
  Date.now() + 90 * 24 * 60 * 60 * 1000,
).toISOString();

function goalPayload(overrides = {}) {
  return {
    title: "Emergency Fund",
    targetAmount: 10000,
    targetDate: FUTURE_DATE,
    priority: "high",
    category: "Savings",
    icon: "shield",
    color: "#6366f1",
    ...overrides,
  };
}

async function createGoal(overrides = {}, token = authToken) {
  const res = await request(app)
    .post("/api/goals")
    .set("Authorization", `Bearer ${token}`)
    .send(goalPayload(overrides));
  return res;
}

// ── POST /api/goals ───────────────────────────────────────────────────────────

describe("POST /api/goals", () => {
  it("creates a goal and returns 201 with computed fields", async () => {
    const res = await createGoal();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const { data } = res.body;
    expect(data.title).toBe("Emergency Fund");
    expect(data.targetAmount).toBe(10000);
    expect(data.currentAmount).toBe(0);
    expect(data.progressPercentage).toBe(0);
    expect(data.remainingAmount).toBe(10000);
    expect(typeof data.daysRemaining).toBe("number");
    expect(data.daysRemaining).toBeGreaterThan(0);
    expect(data.status).toBe("active");
  });

  it("auto-completes goal when currentAmount >= targetAmount", async () => {
    const res = await createGoal({ targetAmount: 100, currentAmount: 100 });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("completed");
    expect(res.body.data.progressPercentage).toBe(100);
    expect(res.body.data.remainingAmount).toBe(0);
  });

  it("rejects missing required fields", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "No date or amount" });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("rejects past targetDate", async () => {
    const res = await createGoal({
      targetDate: new Date(Date.now() - 86400000).toISOString(),
    });
    expect(res.status).toBe(422);
    expect(res.body.details[0].field).toBe("targetDate");
  });

  it("rejects invalid hex color", async () => {
    const res = await createGoal({ color: "notacolor" });
    expect(res.status).toBe(422);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).post("/api/goals").send(goalPayload());
    expect(res.status).toBe(401);
  });
});

// ── GET /api/goals ────────────────────────────────────────────────────────────

describe("GET /api/goals", () => {
  beforeEach(async () => {
    await Goal.create([
      {
        user: userId,
        title: "Goal A",
        targetAmount: 1000,
        currentAmount: 500,
        targetDate: FUTURE_DATE,
        status: "active",
        priority: "high",
      },
      {
        user: userId,
        title: "Goal B",
        targetAmount: 2000,
        currentAmount: 0,
        targetDate: FUTURE_DATE,
        status: "active",
        priority: "low",
      },
      {
        user: userId,
        title: "Goal C",
        targetAmount: 500,
        currentAmount: 500,
        targetDate: FUTURE_DATE,
        status: "completed",
        priority: "medium",
      },
      {
        user: otherId,
        title: "Other Goal",
        targetAmount: 999,
        currentAmount: 0,
        targetDate: FUTURE_DATE,
      },
    ]);
  });

  it("returns only the authenticated user's goals", async () => {
    const res = await request(app)
      .get("/api/goals")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.every((g) => g.user === userId)).toBe(true);
  });

  it("filters by status", async () => {
    const res = await request(app)
      .get("/api/goals?status=completed")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Goal C");
  });

  it("filters by priority", async () => {
    const res = await request(app)
      .get("/api/goals?priority=high")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Goal A");
  });

  it("paginates results", async () => {
    const res = await request(app)
      .get("/api/goals?page=1&limit=2")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.hasNextPage).toBe(true);
  });

  it("searches by title", async () => {
    const res = await request(app)
      .get("/api/goals?search=Goal A")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("returns enriched computed fields on each goal", async () => {
    const res = await request(app)
      .get("/api/goals")
      .set("Authorization", `Bearer ${authToken}`);
    const goal = res.body.data.find((g) => g.title === "Goal A");
    expect(goal.progressPercentage).toBe(50);
    expect(goal.remainingAmount).toBe(500);
    expect(typeof goal.daysRemaining).toBe("number");
  });
});

// ── GET /api/goals/:id ────────────────────────────────────────────────────────

describe("GET /api/goals/:id", () => {
  it("returns a single goal by id", async () => {
    const { body } = await createGoal();
    const goalId = body.data._id;

    const res = await request(app)
      .get(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(goalId);
  });

  it("returns 404 for non-existent goal", async () => {
    const res = await request(app)
      .get(`/api/goals/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 when accessing another user's goal", async () => {
    const { body } = await createGoal();
    const goalId = body.data._id;

    const res = await request(app)
      .get(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/goals/:id ────────────────────────────────────────────────────────

describe("PUT /api/goals/:id", () => {
  it("updates a goal", async () => {
    const { body } = await createGoal();
    const goalId = body.data._id;

    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Updated Title", currentAmount: 5000 });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated Title");
    expect(res.body.data.currentAmount).toBe(5000);
    expect(res.body.data.progressPercentage).toBe(50);
  });

  it("auto-completes when currentAmount reaches targetAmount", async () => {
    const { body } = await createGoal({ targetAmount: 1000 });
    const goalId = body.data._id;

    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ currentAmount: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("completed");
    expect(res.body.data.completedAt).not.toBeNull();
  });

  it("reopens completed goal if currentAmount drops below target", async () => {
    const { body } = await createGoal({
      targetAmount: 100,
      currentAmount: 100,
    });
    const goalId = body.data._id;
    expect(body.data.status).toBe("completed");

    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ currentAmount: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("active");
    expect(res.body.data.completedAt).toBeNull();
  });

  it("rejects update on another user's goal", async () => {
    const { body } = await createGoal();
    const goalId = body.data._id;

    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hijacked" });
    expect(res.status).toBe(404);
  });

  it("returns 422 for invalid update payload", async () => {
    const { body } = await createGoal();
    const res = await request(app)
      .put(`/api/goals/${body.data._id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ color: "bad-color" });
    expect(res.status).toBe(422);
  });
});

// ── DELETE /api/goals/:id ─────────────────────────────────────────────────────

describe("DELETE /api/goals/:id", () => {
  it("deletes a goal", async () => {
    const { body } = await createGoal();
    const goalId = body.data._id;

    const res = await request(app)
      .delete(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await Goal.findById(goalId);
    expect(check).toBeNull();
  });

  it("returns 404 for non-existent goal", async () => {
    const res = await request(app)
      .delete(`/api/goals/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(404);
  });

  it("cannot delete another user's goal", async () => {
    const { body } = await createGoal();
    const goalId = body.data._id;

    const res = await request(app)
      .delete(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});

// ── GET /api/goals/statistics ─────────────────────────────────────────────────

describe("GET /api/goals/statistics", () => {
  beforeEach(async () => {
    await Goal.create([
      {
        user: userId,
        title: "G1",
        targetAmount: 1000,
        currentAmount: 500,
        targetDate: FUTURE_DATE,
        status: "active",
      },
      {
        user: userId,
        title: "G2",
        targetAmount: 2000,
        currentAmount: 2000,
        targetDate: FUTURE_DATE,
        status: "completed",
      },
      {
        user: userId,
        title: "G3",
        targetAmount: 3000,
        currentAmount: 0,
        targetDate: FUTURE_DATE,
        status: "paused",
      },
    ]);
  });

  it("returns statistics for the authenticated user", async () => {
    const res = await request(app)
      .get("/api/goals/statistics")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.overall.totalGoals).toBe(3);
    expect(data.overall.totalTarget).toBe(6000);
    expect(data.overall.totalCurrent).toBe(2500);
    expect(data.byStatus.active.count).toBe(1);
    expect(data.byStatus.completed.count).toBe(1);
    expect(data.byStatus.paused.count).toBe(1);
    expect(data.overall.overallProgress).toBeCloseTo(41.67, 1);
  });
});

// ── GET /api/goals/dashboard ──────────────────────────────────────────────────

describe("GET /api/goals/dashboard", () => {
  it("returns activeGoals, recentlyCompleted, and statistics", async () => {
    await Goal.create([
      {
        user: userId,
        title: "Active",
        targetAmount: 500,
        currentAmount: 100,
        targetDate: FUTURE_DATE,
        status: "active",
      },
      {
        user: userId,
        title: "Done",
        targetAmount: 200,
        currentAmount: 200,
        targetDate: FUTURE_DATE,
        status: "completed",
        completedAt: new Date(),
      },
    ]);

    const res = await request(app)
      .get("/api/goals/dashboard")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(Array.isArray(data.activeGoals)).toBe(true);
    expect(Array.isArray(data.recentlyCompleted)).toBe(true);
    expect(data.statistics).toBeDefined();
    expect(data.activeGoals[0].title).toBe("Active");
    expect(data.recentlyCompleted[0].title).toBe("Done");
  });
});
