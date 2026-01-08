import { AppDataSource } from "../config/database";
import User from "../models/user.model";
import ApiError from "../utils/ApiError";
import httpStatus from "../constants/httpStatus";

interface UpdateProfileData {
  name?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

class UserService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: UpdateProfileData) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    // Update fields
    if (updateData.name) user.name = updateData.name;
    if (updateData.phone) user.phone = updateData.phone;
    if (updateData.address) {
      user.address = {
        ...user.address,
        ...updateData.address,
      };
    }

    await this.userRepository.save(user);

    return user;
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    await this.userRepository.remove(user);

    return { message: "Account deleted successfully" };
  }

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return {
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID (Admin only)
   */
  async getUserById(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    return user;
  }

  /**
   * Update user role (Admin only)
   */
  async updateUserRole(userId: string, role: "customer" | "admin") {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    user.role = role;
    await this.userRepository.save(user);

    return user;
  }

  /**
   * Delete user (Admin only)
   */
  async deleteUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    await this.userRepository.remove(user);

    return { message: "User deleted successfully" };
  }
}

export default new UserService();
