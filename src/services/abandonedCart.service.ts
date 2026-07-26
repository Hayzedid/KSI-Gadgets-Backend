import { LessThan, IsNull } from "typeorm";
import { AppDataSource } from "../config/database";
import { Cart } from "../models/cart.model";
import { User } from "../models/user.model";
import emailService from "./email.service";
import logger from "../config/logger";

const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours of inactivity

export class AbandonedCartService {
  private cartRepository = AppDataSource.getRepository(Cart);
  private userRepository = AppDataSource.getRepository(User);

  async sendReminders(): Promise<number> {
    const cutoff = new Date(Date.now() - ABANDONED_AFTER_MS);

    const abandonedCarts = await this.cartRepository.find({
      where: {
        updatedAt: LessThan(cutoff),
        abandonedEmailSentAt: IsNull(),
      },
      relations: ["items"],
    });

    const eligibleCarts = abandonedCarts.filter(
      (cart) => cart.items && cart.items.length > 0,
    );

    let sentCount = 0;

    for (const cart of eligibleCarts) {
      const user = await this.userRepository.findOne({
        where: { id: cart.userId },
      });
      if (!user) continue;

      try {
        await emailService.sendAbandonedCartEmail(
          user.email,
          user.name,
          cart.items.map((item) => ({
            name: item.product?.name || "Product",
            quantity: item.quantity,
            price: Number(item.price),
          })),
        );
        sentCount += 1;
      } catch (error) {
        logger.error("Failed to send abandoned cart email", error);
        continue;
      }

      await this.cartRepository.update(
        { id: cart.id },
        { abandonedEmailSentAt: new Date() },
      );
    }

    return sentCount;
  }
}

export default new AbandonedCartService();
