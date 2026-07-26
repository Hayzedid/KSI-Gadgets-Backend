import { AppDataSource } from "../config/database";
import { StockNotification } from "../models/stock-notification.model";
import { Product } from "../models/product.model";
import { ApiError } from "../utils/ApiError";
import emailService from "./email.service";

export class StockNotificationService {
  private notificationRepository =
    AppDataSource.getRepository(StockNotification);
  private productRepository = AppDataSource.getRepository(Product);

  async subscribe(productId: string, email: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    if (product.stock > 0) {
      throw new ApiError(400, "Product is already in stock");
    }

    const existing = await this.notificationRepository.findOne({
      where: { productId, email: email.toLowerCase(), notified: false },
    });
    if (existing) {
      return;
    }

    const notification = this.notificationRepository.create({
      productId,
      email: email.toLowerCase(),
    });
    await this.notificationRepository.save(notification);
  }

  // Called whenever a product's stock is increased from zero — notifies everyone waiting.
  async notifyIfBackInStock(productId: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product || product.stock <= 0) {
      return;
    }

    const pending = await this.notificationRepository.find({
      where: { productId, notified: false },
    });

    if (pending.length === 0) {
      return;
    }

    for (const notification of pending) {
      emailService
        .sendBackInStockEmail(notification.email, product.name, product.id)
        .catch(() => {});
    }

    await this.notificationRepository.update(
      { productId, notified: false },
      { notified: true },
    );
  }
}

export default new StockNotificationService();
