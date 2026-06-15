import {
  getUserProfileService,
  updateUserProfileService,
  changePasswordService,
  deleteAccountService,
} from "../services/user.service.js";
import { ServiceError } from "../utils/ServiceError.js";

const isProd = process.env.NODE_ENV === "production";

const clearRefreshCookie = (res) =>
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "strict",
  });

const handleServiceError = (error, res, next) => {
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  next(error);
};

// ─── GET /users/profile ───────────────────────────────────────────────────────

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await getUserProfileService(req.user._id);
    res.status(200).json(user);
  } catch (error) {
    handleServiceError(error, res, next);
  }
};

// ─── PUT /users/profile ───────────────────────────────────────────────────────

export const updateUserProfile = async (req, res, next) => {
  try {
    const updated = await updateUserProfileService(req.user._id, req.body);
    res.status(200).json(updated);
  } catch (error) {
    handleServiceError(error, res, next);
  }
};

// ─── PUT /users/change-password ───────────────────────────────────────────────

export const changePassword = async (req, res, next) => {
  try {
    await changePasswordService(req.user._id, req.body);

    clearRefreshCookie(res)
      .status(200)
      .json({ message: "Password updated. Please log in again." });
  } catch (error) {
    handleServiceError(error, res, next);
  }
};

// ─── POST /users/close-account ────────────────────────────────────────────────

export const deleteAccount = async (req, res, next) => {
  try {
    await deleteAccountService(req.user._id, req.body.currentPassword);

    clearRefreshCookie(res)
      .status(200)
      .json({ message: "Account deleted successfully" });
  } catch (error) {
    handleServiceError(error, res, next);
  }
};
