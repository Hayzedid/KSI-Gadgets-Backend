import { Request, Response, NextFunction } from "express";
import authService from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";
import ApiResponse from "../utils/ApiResponse";
import httpStatus from "../constants/httpStatus";

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const register = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password, phone } = req.body;

    const result = await authService.register({ name, email, password, phone });

    res
      .status(httpStatus.CREATED)
      .json(
        new ApiResponse(httpStatus.CREATED, result, "Registration successful")
      );
  }
);

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
export const login = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    res
      .status(httpStatus.OK)
      .json(new ApiResponse(httpStatus.OK, result, "Login successful"));
  }
);

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshToken(refreshToken);

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, tokens, "Token refreshed successfully")
      );
  }
);

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
export const logout = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;

    const result = await authService.logout(userId);

    res
      .status(httpStatus.OK)
      .json(new ApiResponse(httpStatus.OK, result, "Logout successful"));
  }
);

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, result, "Password reset email sent")
      );
  }
);

/**
 * Reset password with token
 * @route POST /api/auth/reset-password
 * @access Public
 */
export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, newPassword } = req.body;

    const result = await authService.resetPassword(token, newPassword);

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, result, "Password reset successful")
      );
  }
);

/**
 * Change password
 * @route POST /api/auth/change-password
 * @access Private
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(
      userId,
      currentPassword,
      newPassword
    );

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, result, "Password changed successfully")
      );
  }
);

/**
 * Get current user
 * @route GET /api/auth/me
 * @access Private
 */
export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;

    const userService = require("../services/user.service").default;
    const user = await userService.getProfile(userId);

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, user, "User retrieved successfully")
      );
  }
);
