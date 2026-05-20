import { AppDataSource } from "../config/database";
import { User, UserRole } from "../models/user.model";
import { PasswordService } from "../utils/password";
import { JwtService, ITokenPayload } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import config from "../config/env";
import emailService from "../services/email.service";
import crypto from "crypto";

export interface IRegisterDTO {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface ILoginDTO {
  email: string;
  password: string;
}

export interface IAuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  private async getOrCreateAdminUser(email: string, password: string) {
    const hashedPassword = await PasswordService.hashPassword(password);

    let adminUser = await this.userRepository.findOne({
      where: { email },
    });

    if (!adminUser) {
      adminUser = this.userRepository.create({
        name: "Admin User",
        email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        isActive: true,
      });
    } else {
      adminUser.role = UserRole.ADMIN;
      adminUser.isActive = true;
      adminUser.password = hashedPassword;
      adminUser.updatedAt = new Date();
    }

    return this.userRepository.save(adminUser);
  }

  async register(dto: IRegisterDTO): Promise<IAuthResponse> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ApiError(400, "Email already registered", [
        "This email is already in use",
      ]);
    }

    // Validate password strength
    const passwordValidation = PasswordService.validatePassword(dto.password);
    if (!passwordValidation.isValid) {
      throw new ApiError(
        400,
        "Password does not meet requirements",
        passwordValidation.errors,
      );
    }

    // Hash password
    const hashedPassword = await PasswordService.hashPassword(dto.password);

    // Create user
    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      role: UserRole.CUSTOMER,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Send welcome email (fire-and-forget)
    try {
      await emailService
        .sendWelcomeEmail(savedUser.email, savedUser.name)
        .catch(() => {});
    } catch (e) {
      // swallow email errors to avoid failing registration
    }
    // Generate tokens
    const tokenPayload: ITokenPayload = {
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
    };

    const { accessToken, refreshToken } =
      JwtService.generateTokenPair(tokenPayload);

    return {
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        phone: savedUser.phone,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(dto: ILoginDTO): Promise<IAuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const adminEmail = config.adminLoginEmail.trim().toLowerCase();

    if (
      normalizedEmail === adminEmail &&
      dto.password === config.adminLoginPassword
    ) {
      const adminUser = await this.getOrCreateAdminUser(
        config.adminLoginEmail,
        config.adminLoginPassword,
      );

      const tokenPayload: ITokenPayload = {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      };

      const { accessToken, refreshToken } =
        JwtService.generateTokenPair(tokenPayload);

      return {
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          phone: adminUser.phone,
        },
        accessToken,
        refreshToken,
      };
    }

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ApiError(401, "Invalid credentials", [
        "Email or password is incorrect",
      ]);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(403, "Account deactivated", [
        "Your account has been deactivated",
      ]);
    }

    // Compare password
    const passwordMatch = await PasswordService.comparePassword(
      dto.password,
      user.password,
    );

    if (!passwordMatch) {
      throw new ApiError(401, "Invalid credentials", [
        "Email or password is incorrect",
      ]);
    }

    // Generate tokens
    const tokenPayload: ITokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } =
      JwtService.generateTokenPair(tokenPayload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = JwtService.verifyToken(refreshToken);

      // Find user to ensure they still exist and are active
      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        throw new ApiError(401, "Unauthorized", [
          "User not found or account is inactive",
        ]);
      }

      // Generate new tokens
      const tokenPayload: ITokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      const newAccessToken = JwtService.generateAccessToken(tokenPayload);
      const newRefreshToken = JwtService.generateRefreshToken(tokenPayload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new ApiError(401, "Unauthorized", ["Invalid refresh token"]);
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Compare old password
    const passwordMatch = await PasswordService.comparePassword(
      oldPassword,
      user.password,
    );

    if (!passwordMatch) {
      throw new ApiError(401, "Invalid credentials", [
        "Current password is incorrect",
      ]);
    }

    // Validate new password strength
    const passwordValidation = PasswordService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new ApiError(
        400,
        "Password does not meet requirements",
        passwordValidation.errors,
      );
    }

    // Hash and update password
    user.password = await PasswordService.hashPassword(newPassword);
    user.updatedAt = new Date();

    await this.userRepository.save(user);

    // Send password changed confirmation email (fire-and-forget)
    try {
      await emailService
        .sendPasswordChangedEmail(user.email, user.name)
        .catch(() => {});
    } catch (e) {
      // swallow email errors
    }
  }

  async initiatePasswordReset(email: string): Promise<void> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists for security reasons
      // Return success anyway to prevent email enumeration
      return;
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token and expiration (1 hour from now)
    user.passwordResetToken = tokenHash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepository.save(user);

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken,
      );
    } catch (error) {
      // Log error but don't fail the request
      throw new ApiError(500, "Failed to send reset email", [
        "Please try again later",
      ]);
    }
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    // Hash the token to compare with database
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Find user with matching token and unexpired token
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: tokenHash,
      },
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired reset token", [
        "Please request a new password reset link",
      ]);
    }

    // Check if token is expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new ApiError(400, "Reset token has expired", [
        "Please request a new password reset link",
      ]);
    }

    // Validate new password strength
    const passwordValidation = PasswordService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new ApiError(
        400,
        "Password does not meet requirements",
        passwordValidation.errors,
      );
    }

    // Hash and update password
    user.password = await PasswordService.hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.updatedAt = new Date();

    await this.userRepository.save(user);

    // Send confirmation email (fire-and-forget)
    try {
      await emailService
        .sendPasswordChangedEmail(user.email, user.name)
        .catch(() => {});
    } catch (e) {
      // swallow email errors
    }
  }

  async verifyResetToken(resetToken: string): Promise<boolean> {
    // Hash the token to compare with database
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Find user with matching token and unexpired token
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: tokenHash,
      },
    });

    if (!user || !user.passwordResetExpires) {
      return false;
    }

    // Check if token is expired
    return user.passwordResetExpires > new Date();
  }
}

export const authService = new AuthService();
