import { AppDataSource } from "../config/database";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";

export interface IUpdateProfileDTO {
  name?: string;
  phone?: string;
  address?: string;
}

export interface IUserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async getUserById(userId: string): Promise<IUserProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    return this.formatUserProfile(user);
  }

  async getUserByEmail(email: string): Promise<IUserProfile | null> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    return user ? this.formatUserProfile(user) : null;
  }

  async updateUserProfile(
    userId: string,
    dto: IUpdateProfileDTO
  ): Promise<IUserProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    // Update allowed fields
    if (dto.name !== undefined) {
      user.name = dto.name;
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }
    if (dto.address !== undefined) {
      user.address = dto.address;
    }

    user.updatedAt = new Date();
    const updatedUser = await this.userRepository.save(user);

    return this.formatUserProfile(updatedUser);
  }

  async getAllUsers(
    skip: number = 0,
    take: number = 10
  ): Promise<{ users: IUserProfile[]; total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take,
      order: { createdAt: "DESC" },
    });

    return {
      users: users.map((user) => this.formatUserProfile(user)),
      total,
    };
  }

  async deactivateUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    user.isActive = false;
    user.updatedAt = new Date();
    await this.userRepository.save(user);
  }

  async reactivateUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    user.isActive = true;
    user.updatedAt = new Date();
    await this.userRepository.save(user);
  }

  async deleteUserAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    // Soft delete by marking as inactive, or hard delete if required
    await this.userRepository.remove(user);
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    return !!user;
  }

  private formatUserProfile(user: User): IUserProfile {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const userService = new UserService();
