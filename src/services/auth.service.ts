import { AppDataSource } from "../config/database";
import { User, UserRole } from "../models/user.model";
import { PasswordService } from "../utils/password";

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

  async register(dto: IRegisterDTO): Promise<IAuthResponse> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ApiError("Email already registered", 400, [
        "This email is already in use",
      ]);
    }

    // Validate password strength
    const passwordValidation = PasswordService.validatePassword(dto.password);
    if (!passwordValidation.isValid) {
      throw new ApiError(
        "Password does not meet requirements",
        400,
        passwordValidation.errors
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
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ApiError("Invalid credentials", 401, [
        "Email or password is incorrect",
      ]);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError("Account deactivated", 403, [
        "Your account has been deactivated",
      ]);
    }

    // Compare password
    const passwordMatch = await PasswordService.comparePassword(
      dto.password,
      user.password
    );

    if (!passwordMatch) {
      throw new ApiError("Invalid credentials", 401, [
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
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = JwtService.verifyToken(refreshToken);

      // Find user to ensure they still exist and are active
      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        throw new ApiError("Unauthorized", 401, [
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
      throw new ApiError("Unauthorized", 401, ["Invalid refresh token"]);
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    // Compare old password
    const passwordMatch = await PasswordService.comparePassword(
      oldPassword,
      user.password
    );

    if (!passwordMatch) {
      throw new ApiError("Invalid credentials", 401, [
        "Current password is incorrect",
      ]);
    }

    // Validate new password strength
    const passwordValidation = PasswordService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new ApiError(
        "Password does not meet requirements",
        400,
        passwordValidation.errors
      );
    }

    // Hash and update password
    user.password = await PasswordService.hashPassword(newPassword);
    user.updatedAt = new Date();

    await this.userRepository.save(user);
  }

  async initiatePasswordReset(email: string): Promise<string> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists for security reasons
      return "If an account exists with this email, a reset link will be sent";
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = JwtService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // In production, store reset token hash in database with expiration
    // For now, just return the token
    return resetToken;
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    try {
      const decoded = JwtService.verifyToken(resetToken);

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new ApiError("User not found", 404);
      }

      // Validate new password strength
      const passwordValidation = PasswordService.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new ApiError(
          "Password does not meet requirements",
          400,
          passwordValidation.errors
        );
      }

      // Hash and update password
      user.password = await PasswordService.hashPassword(newPassword);
      user.updatedAt = new Date();

      await this.userRepository.save(user);
    } catch (error) {
      throw new ApiError("Invalid reset token", 401);
    }
  }
}

export const authService = new AuthService();
