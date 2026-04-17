import { AppDataSource } from "../config/database";
import { Product } from "../models/product.model";
import { WishlistItem } from "../models/wishlist-item.model";
import { ApiError } from "../utils/ApiError";

export class WishlistService {
  private wishlistRepository = AppDataSource.getRepository(WishlistItem);
  private productRepository = AppDataSource.getRepository(Product);

  async getWishlist(userId: string): Promise<WishlistItem[]> {
    return this.wishlistRepository.find({
      where: { userId },
      relations: ["product"],
      order: { createdAt: "DESC" },
    });
  }

  async addItem(userId: string, productId: string): Promise<WishlistItem[]> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    const existing = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    if (!existing) {
      const item = this.wishlistRepository.create({ userId, productId });
      await this.wishlistRepository.save(item);
    }

    return this.getWishlist(userId);
  }

  async removeItem(userId: string, productId: string): Promise<WishlistItem[]> {
    const item = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    if (item) {
      await this.wishlistRepository.remove(item);
    }

    return this.getWishlist(userId);
  }

  async clearWishlist(userId: string): Promise<WishlistItem[]> {
    await this.wishlistRepository.delete({ userId });
    return [];
  }
}

export default WishlistService;
