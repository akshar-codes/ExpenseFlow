import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import DeletionTombstone from "../models/DeletionTombstone.js";
import { ServiceError } from "../utils/ServiceError.js";

// ─── Transactional cascade delete ────────────────────────────────────────────

const deleteUserData = async (userId) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Transaction.deleteMany({ user: userId }, { session });
      await Category.deleteMany({ user: userId }, { session });
      await Budget.deleteMany({ user: userId }, { session });
      await RecurringTransaction.deleteMany({ user: userId }, { session });
      await User.findByIdAndDelete(userId, { session });
    });
  } catch (err) {
    if (
      err.codeName === "CommandNotSupportedOnStandalone" ||
      err.message?.includes("Transaction numbers") ||
      err.message?.includes("standalone")
    ) {
      console.warn(
        "[deleteUserData] Transactions not available on this deployment — " +
          "falling back to sequential deletes.  Consider using a replica set " +
          "or Atlas for production.",
      );
      await Transaction.deleteMany({ user: userId });
      await Category.deleteMany({ user: userId });
      await Budget.deleteMany({ user: userId });
      await RecurringTransaction.deleteMany({ user: userId });
      await User.findByIdAndDelete(userId);
    } else {
      throw err;
    }
  } finally {
    session.endSession();
  }
};

// ─── GET PROFILE ──────────────────────────────────────────────────────────────

export const getUserProfileService = async (userId) => {
  const user = await User.findById(userId).select(
    "-password -refreshTokenHash",
  );

  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  return user;
};

// ─── UPDATE PROFILE ────────────────────────────────────────────────────────────

export const updateUserProfileService = async (userId, { name, currency }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  if (name) user.name = name;
  if (currency) user.currency = currency.toUpperCase();

  const updatedUser = await user.save();

  return {
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    currency: updatedUser.currency,
  };
};

// ─── CHANGE PASSWORD ───────────────────────────────────────────────────────────

export const changePasswordService = async (
  userId,
  { currentPassword, newPassword },
) => {
  if (!currentPassword || !newPassword) {
    throw new ServiceError("Both passwords required", 400);
  }

  const user = await User.findById(userId).select(
    "+password +refreshTokenHash",
  );

  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ServiceError("Current password incorrect", 400);
  }

  user.password = newPassword;
  user.refreshTokenHash = null;
  await user.save();
};

// ─── DELETE ACCOUNT ─────────────────────────────────────────────────────────────

export const deleteAccountService = async (userId, currentPassword) => {
  if (!currentPassword) {
    throw new ServiceError(
      "currentPassword is required to delete your account",
      400,
    );
  }

  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ServiceError("Incorrect password", 401);
  }

  await DeletionTombstone.findOneAndUpdate(
    { userId },
    {
      $set: { requestedAt: new Date(), status: "pending", completedAt: null },
    },
    { upsert: true },
  );

  await deleteUserData(userId);

  await DeletionTombstone.findOneAndUpdate(
    { userId },
    { $set: { status: "completed", completedAt: new Date() } },
  );
};
