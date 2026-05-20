import { AppDataSource } from "../config/database";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { UserRole } from "../models/user.model";

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

  private async getActiveAdminCount(excludeUserId?: string): Promise<number> {
    const queryBuilder = this.userRepository
      .createQueryBuilder("user")
      .where("user.role = :role", { role: UserRole.ADMIN })
      .andWhere("user.isActive = :isActive", { isActive: true });

    if (excludeUserId) {
      queryBuilder.andWhere("user.id != :excludeUserId", { excludeUserId });
    }

    return queryBuilder.getCount();
  }

  async getUserById(userId: string): Promise<IUserProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
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
    dto: IUpdateProfileDTO,
  ): Promise<IUserProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
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
    take: number = 10,
    search?: string,
    status?: string,
  ): Promise<{ users: IUserProfile[]; total: number }> {
    const queryBuilder = this.userRepository
      .createQueryBuilder("user")
      .orderBy("user.createdAt", "DESC")
      .skip(skip)
      .take(take);

    if (search?.trim()) {
      queryBuilder.andWhere(
        "(user.name ILIKE :search OR user.email ILIKE :search)",
        { search: `%${search.trim()}%` },
      );
    }

    if (status === "active") {
      queryBuilder.andWhere("user.isActive = :isActive", { isActive: true });
    }

    if (status === "inactive") {
      queryBuilder.andWhere("user.isActive = :isActive", { isActive: false });
    }

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users: users.map((user) => this.formatUserProfile(user)),
      total,
    };
  }

  async deactivateUser(userId: string, actorUserId?: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.role === UserRole.ADMIN && actorUserId === userId) {
      throw new ApiError(400, "Admin cannot deactivate their own account");
    }

    if (user.role === UserRole.ADMIN) {
      const activeAdminCount = await this.getActiveAdminCount(
        user.isActive ? userId : undefined,
      );

      if (activeAdminCount <= 0) {
        throw new ApiError(400, "At least one active admin must remain");
      }
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
      throw new ApiError(404, "User not found");
    }

    user.isActive = true;
    user.updatedAt = new Date();
    await this.userRepository.save(user);
  }

  async deleteUserAccount(userId: string, actorUserId?: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.role === UserRole.ADMIN && actorUserId === userId) {
      throw new ApiError(400, "Admin cannot delete their own account");
    }

    if (user.role === UserRole.ADMIN && user.isActive) {
      const activeAdminCount = await this.getActiveAdminCount(userId);

      if (activeAdminCount <= 0) {
        throw new ApiError(400, "At least one active admin must remain");
      }
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
