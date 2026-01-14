import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import { authService } from "../services/auth.service";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export class AuthController {
  static register = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { name, email, password, phone } = req.body;

    const result = await authService.register({
      name,
      email,
      password,
      phone,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, result, "User registered successfully"));
  });

  static login = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { email, password } = req.body;

    const result = await authService.login({
      email,
      password,
    });

    // Set refresh token as httpOnly cookie (optional)
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: result.user,
          accessToken: result.accessToken,
        },
        "Login successful"
      )
    );
  });

  static refreshToken = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        // Try to get from cookie
        const cookieToken = req.cookies?.refreshToken;
        if (!cookieToken) {
          throw new Error("Refresh token required");
        }

        const tokens = await authService.refreshAccessToken(cookieToken);
        return res
          .status(200)
          .json(new ApiResponse(200, tokens, "Token refreshed successfully"));
      }

      const tokens = await authService.refreshAccessToken(refreshToken);

      return res
        .status(200)
        .json(new ApiResponse(200, tokens, "Token refreshed successfully"));
    }
  );

  static changePassword = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const userId = req.user?.id;
      const { oldPassword, newPassword } = req.body;

      if (!userId) {
        throw new Error("User ID not found");
      }

      await authService.changePassword(userId, oldPassword, newPassword);

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Password changed successfully"));
    }
  );

  static logout = asyncHandler(async (req: IAuthRequest, res: Response) => {
    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Logout successful"));
  });
}

export default AuthController;
