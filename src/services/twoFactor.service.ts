import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import { AppDataSource } from "../config/database";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";

export interface TwoFactorSetup {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export class TwoFactorService {
  private userRepository = AppDataSource.getRepository(User);

  private generateBackupCodes(count = 10): string[] {
    return Array.from({ length: count }, () =>
      crypto.randomBytes(5).toString("hex").toUpperCase(),
    );
  }

  async generateSetup(userId: string): Promise<TwoFactorSetup> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.twoFactorEnabled) {
      throw new ApiError(400, "Two-factor authentication is already enabled");
    }

    const secret = speakeasy.generateSecret({
      name: `KSI Gadgets (${user.email})`,
    });

    const backupCodes = this.generateBackupCodes();

    // Stored but not yet activated — activation happens once the user
    // confirms a valid code via `enableTwoFactor`.
    user.twoFactorSecret = secret.base32;
    user.twoFactorBackupCodes = backupCodes;
    await this.userRepository.save(user);

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || "");

    return { secret: secret.base32, qrCodeDataUrl, backupCodes };
  }

  async enableTwoFactor(userId: string, token: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new ApiError(400, "Two-factor setup has not been initiated");
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!isValid) {
      throw new ApiError(400, "Invalid verification code");
    }

    user.twoFactorEnabled = true;
    await this.userRepository.save(user);
  }

  async disableTwoFactor(userId: string, token: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled) {
      throw new ApiError(400, "Two-factor authentication is not enabled");
    }

    if (!this.verifyCode(user, token)) {
      throw new ApiError(400, "Invalid verification code");
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;
    await this.userRepository.save(user);
  }

  verifyCode(user: User, token: string): boolean {
    if (!user.twoFactorSecret) {
      return false;
    }

    const isValidTotp = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (isValidTotp) {
      return true;
    }

    const backupCodes = user.twoFactorBackupCodes || [];
    const normalizedToken = token.trim().toUpperCase();
    return backupCodes.includes(normalizedToken);
  }

  async consumeBackupCodeIfUsed(user: User, token: string): Promise<void> {
    const normalizedToken = token.trim().toUpperCase();
    const backupCodes = user.twoFactorBackupCodes || [];
    if (!backupCodes.includes(normalizedToken)) {
      return;
    }

    user.twoFactorBackupCodes = backupCodes.filter(
      (code) => code !== normalizedToken,
    );
    await this.userRepository.save(user);
  }
}

export default new TwoFactorService();
