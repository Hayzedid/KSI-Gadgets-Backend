import cron from "node-cron";
import abandonedCartService from "../services/abandonedCart.service";
import logger from "../config/logger";

// Runs once an hour; each cart is only emailed once (see `abandonedEmailSentAt`).
export const scheduleAbandonedCartJob = (): void => {
  cron.schedule("0 * * * *", async () => {
    try {
      const sentCount = await abandonedCartService.sendReminders();
      if (sentCount > 0) {
        logger.info(`Sent ${sentCount} abandoned cart reminder email(s)`);
      }
    } catch (error) {
      logger.error("Abandoned cart job failed", error);
    }
  });
};
