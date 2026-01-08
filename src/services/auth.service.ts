import { AppDataSource } from "../config/database";
import User from "../models/user.model";
import { comparePassword } from "../utils/password";
import { generateTokens, verifyToken } from "../utils/jwt";
import ApiError from "../utils/ApiError";
import httpStatus from "../constants/httpStatus";
import crypto from "crypto";
import { MoreThan } from "typeorm";

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Register a new user
   */
  async register(userData: RegisterData) {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });
    if (existingUser) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Email already registered");
    }

    // Create new user
    const user = this.userRepository.create(userData);
    user.setPassword(userData.password);
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await this.userRepository.save(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(loginData: LoginData) {
    // Find user with password field
    const user = await this.userRepository.findOne({
      where: { email: loginData.email },
      select: ["id", "name", "email", "password", "role"],
    });

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      loginData.password,
      user.password
    );
    if (!isPasswordValid) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await this.userRepository.save(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = verifyToken(refreshToken);

      // Find user and check if refresh token matches
      const user = await this.userRepository.findOne({
        where: { id: payload.userId },
        select: ["id", "email", "role", "refreshToken"],
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
      }

      // Generate new tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Update refresh token
      user.refreshToken = tokens.refreshToken;
      await this.userRepository.save(user);

      return tokens;
    } catch (error) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    user.refreshToken = null;
    await this.userRepository.save(user);

    return { message: "Logged out successfully" };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal that user doesn't exist
      return { message: "If the email exists, a reset link has been sent" };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await this.userRepository.save(user);

    // TODO: Send email with reset token
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      message: "If the email exists, a reset link has been sent",
      resetToken, // In production, only send via email
    };
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await this.userRepository.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: MoreThan(new Date()),
      },
      select: ["id", "email", "resetPasswordToken", "resetPasswordExpires"],
    });

    if (!user) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid or expired reset token"
      );
    }

    // Update password
    user.setPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.refreshToken = null; // Invalidate all sessions
    await this.userRepository.save(user);

    return { message: "Password reset successfully" };
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "email", "password"],
    });

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Current password is incorrect"
      );
    }

    // Update password
    user.setPassword(newPassword);
    user.refreshToken = null; // Invalidate all sessions
    await this.userRepository.save(user);

    return { message: "Password changed successfully" };
  }
}

export default new AuthService();
