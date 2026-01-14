import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import { userService } from "../services/user.service";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export class UserController {
  static getProfile = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User ID not found");
    }

    const user = await userService.getUserById(userId);

    return res
      .status(200)
      .json(new ApiResponse(200, user, "User profile retrieved successfully"));
  });

  static updateProfile = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const userId = req.user?.id;

      if (!userId) {
        throw new Error("User ID not found");
      }

      const { name, phone, address } = req.body;

      const updatedUser = await userService.updateUserProfile(userId, {
        name,
        phone,
        address,
      });

      return res
        .status(200)
        .json(
          new ApiResponse(200, updatedUser, "Profile updated successfully")
        );
    }
  );

  static deleteAccount = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const userId = req.user?.id;

      if (!userId) {
        throw new Error("User ID not found");
      }

      await userService.deleteUserAccount(userId);

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Account deleted successfully"));
    }
  );

  // Admin endpoints
  static getAllUsers = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { skip = 0, take = 10 } = req.query;

      const result = await userService.getAllUsers(Number(skip), Number(take));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Users retrieved successfully"));
    }
  );

  static getUserById = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { userId } = req.params;

      const user = await userService.getUserById(userId);

      return res
        .status(200)
        .json(new ApiResponse(200, user, "User retrieved successfully"));
    }
  );

  static deactivateUser = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { userId } = req.params;

      await userService.deactivateUser(userId);

      return res
        .status(200)
        .json(new ApiResponse(200, null, "User deactivated successfully"));
    }
  );

  static reactivateUser = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { userId } = req.params;

      await userService.reactivateUser(userId);

      return res
        .status(200)
        .json(new ApiResponse(200, null, "User reactivated successfully"));
    }
  );

  static deleteUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { userId } = req.params;

    await userService.deleteUserAccount(userId);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "User deleted successfully"));
  });
}

export default UserController;
