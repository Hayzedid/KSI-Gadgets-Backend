import { Request, Response, NextFunction } from "express";
import userService from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";
import ApiResponse from "../utils/ApiResponse";
import httpStatus from "../constants/httpStatus";

/**
 * Get user profile
 * @route GET /api/users/profile
 * @access Private
 */
export const getProfile = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;

    const user = await userService.getProfile(userId);

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, user, "Profile retrieved successfully")
      );
  }
);

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;
    const { name, phone, address } = req.body;

    const user = await userService.updateProfile(userId, {
      name,
      phone,
      address,
    });

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, user, "Profile updated successfully")
      );
  }
);

/**
 * Delete user account
 * @route DELETE /api/users/account
 * @access Private
 */
export const deleteAccount = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;

    const result = await userService.deleteAccount(userId);

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, result, "Account deleted successfully")
      );
  }
);

/**
 * Get all users (Admin)
 * @route GET /api/users
 * @access Private/Admin
 */
export const getAllUsers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await userService.getAllUsers(page, limit);

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, result, "Users retrieved successfully")
      );
  }
);

/**
 * Get user by ID (Admin)
 * @route GET /api/users/:id
 * @access Private/Admin
 */
export const getUserById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const user = await userService.getUserById(id);

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, user, "User retrieved successfully")
      );
  }
);

/**
 * Update user role (Admin)
 * @route PATCH /api/users/:id/role
 * @access Private/Admin
 */
export const updateUserRole = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { role } = req.body;

    const user = await userService.updateUserRole(id, role);

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, user, "User role updated successfully")
      );
  }
);

/**
 * Delete user (Admin)
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
export const deleteUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const result = await userService.deleteUser(id);

    res
      .status(httpStatus.OK)
      .json(
        new ApiResponse(httpStatus.OK, result, "User deleted successfully")
      );
  }
);
