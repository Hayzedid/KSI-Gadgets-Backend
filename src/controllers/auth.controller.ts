import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import { authService } from "../services/auth.service";
import twoFactorService from "../services/twoFactor.service";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler" ;

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

    if ("twoFactorRequired" in result) {
      return res.status(200).json(
        new ApiResponse(
          200,
          { twoFactorRequired: true, userId: result.userId },
          "Two-factor authentication code required"
        )
      );
    }

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
          refreshToken: result.refreshToken, // Also return in body for frontend storage
        },
        "Login successful"
      )
    );
  });

  static verifyTwoFactorLogin = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { userId, token } = req.body;

      const result = await authService.verifyTwoFactorLogin(userId, token);

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          },
          "Login successful"
        )
      );
    }
  );

  static setupTwoFactor = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const userId = req.user?.id;
      if (!userId) throw new ApiError(401, "Unauthorized");

      const setup = await twoFactorService.generateSetup(userId);

      return res
        .status(200)
        .json(new ApiResponse(200, setup, "Scan the QR code with your authenticator app"));
    }
  );

  static enableTwoFactor = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const userId = req.user?.id;
      if (!userId) throw new ApiError(401, "Unauthorized");

      const { token } = req.body;
      await twoFactorService.enableTwoFactor(userId, token);

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Two-factor authentication enabled"));
    }
  );

  static disableTwoFactor = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const userId = req.user?.id;
      if (!userId) throw new ApiError(401, "Unauthorized");

      const { token } = req.body;
      await twoFactorService.disableTwoFactor(userId, token);

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Two-factor authentication disabled"));
    }
  );

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

  static requestPasswordReset = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { email } = req.body;

      await authService.initiatePasswordReset(email);

      return res.status(200).json(
        new ApiResponse(
          200,
          null,
          "If an account exists with this email, a password reset link will be sent"
        )
      );
    }
  );

  static resetPassword = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { token, newPassword } = req.body;

      await authService.resetPassword(token, newPassword);

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Password reset successfully"));
    }
  );

  static verifyResetToken = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { token } = req.body;

      const isValid = await authService.verifyResetToken(token);

      return res.status(200).json(
        new ApiResponse(
          200,
          { valid: isValid },
          isValid ? "Token is valid" : "Token is invalid or expired"
        )
      );
    }
  );
}

export default AuthController;
