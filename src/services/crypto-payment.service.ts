import { Client, resources, Webhook } from "coinbase-commerce-node";
import config from "../config/env";
import { AppDataSource } from "../config/database";
import { Order, PaymentStatus } from "../models/order.model";
import { ApiError } from "../utils/ApiError";
import logger from "../config/logger";

const { Charge } = resources;

interface CreateCryptoChargeData {
  orderId: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface CryptoCharge {
  id: string;
  code: string;
  hosted_url: string;
  pricing: {
    local: { amount: string; currency: string };
    [key: string]: { amount: string; currency: string };
  };
  addresses: {
    bitcoin?: string;
    ethereum?: string;
    litecoin?: string;
    bitcoincash?: string;
    usdc?: string;
  };
}

class CryptoPaymentService {
  private orderRepository = AppDataSource.getRepository(Order);

  constructor() {
    if (!config.coinbaseApiKey) {
      logger.warn("Coinbase Commerce API key not configured");
    } else {
      Client.init(config.coinbaseApiKey);
    }
  }

  /**
   * Create a cryptocurrency charge for an order
   */
  async createCharge(data: CreateCryptoChargeData): Promise<{
    chargeId: string;
    hostedUrl: string;
    addresses: any;
    pricing: any;
  }> {
    try {
      // Find order
      const order = await this.orderRepository.findOne({
        where: { id: data.orderId },
        relations: ["user"],
      });

      if (!order) {
        throw new ApiError(404, "Order not found");
      }

      // Check if order already has a crypto charge
      if (order.paymentTransactionId?.startsWith("coinbase_")) {
        const existingChargeId = order.paymentTransactionId.replace(
          "coinbase_",
          ""
        );
        try {
          const existingCharge = await Charge.retrieve(existingChargeId);
          
          // Return existing charge if still valid
          if (
            existingCharge.timeline?.some(
              (event: any) => event.status === "PENDING" || event.status === "NEW"
            )
          ) {
            return {
              chargeId: existingCharge.id,
              hostedUrl: existingCharge.hosted_url,
              addresses: existingCharge.addresses,
              pricing: existingCharge.pricing,
            };
          }
        } catch (error) {
          // Continue to create new charge if old one is invalid
        }
      }

      // Create charge with Coinbase Commerce
      const chargeData = {
        name: `Order ${order.orderNumber}`,
        description:
          data.description || `Payment for Order ${order.orderNumber}`,
        local_price: {
          amount: order.totalAmount.toFixed(2),
          currency: "USD",
        },
        pricing_type: "fixed_price",
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          customerEmail: order.user?.email,
          ...data.metadata,
        },
        redirect_url: `${config.clientUrl}/orders/${order.id}`,
        cancel_url: `${config.clientUrl}/orders/${order.id}`,
      };

      const charge = await Charge.create(chargeData);

      // Store charge ID with prefix to distinguish from Stripe
      order.paymentTransactionId = `coinbase_${charge.id}`;
      order.paymentMethod = "cryptocurrency";
      await this.orderRepository.save(order);

      logger.info("Crypto charge created", {
        chargeId: charge.id,
        orderId: order.id,
        amount: order.totalAmount,
      });

      return {
        chargeId: charge.id,
        hostedUrl: charge.hosted_url,
        addresses: charge.addresses,
        pricing: charge.pricing,
      };
    } catch (error: any) {
      logger.error("Failed to create crypto charge", { error, data });
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        error.message || "Failed to create crypto charge"
      );
    }
  }

  /**
   * Get charge details
   */
  async getCharge(chargeId: string): Promise<any> {
    try {
      const charge = await Charge.retrieve(chargeId);

      return {
        id: charge.id,
        code: charge.code,
        status: this.getChargeStatus(charge),
        hostedUrl: charge.hosted_url,
        pricing: charge.pricing,
        addresses: charge.addresses,
        timeline: charge.timeline,
        payments: charge.payments,
        metadata: charge.metadata,
      };
    } catch (error: any) {
      logger.error("Failed to get charge", { error, chargeId });
      throw new ApiError(500, error.message || "Failed to get charge");
    }
  }

  /**
   * List all charges for an order
   */
  async getChargesForOrder(orderId: string): Promise<any[]> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order || !order.paymentTransactionId?.startsWith("coinbase_")) {
        return [];
      }

      const chargeId = order.paymentTransactionId.replace("coinbase_", "");
      const charge = await this.getCharge(chargeId);

      return [charge];
    } catch (error: any) {
      logger.error("Failed to get charges for order", { error, orderId });
      return [];
    }
  }

  /**
   * Handle Coinbase Commerce webhooks
   */
  async handleWebhook(
    rawBody: string,
    signature: string
  ): Promise<{ received: boolean }> {
    try {
      // Verify webhook signature
      const event = Webhook.verifyEventBody(
        rawBody,
        signature,
        config.coinbaseWebhookSecret
      );

      logger.info("Coinbase webhook received", { type: event.type });

      // Handle different event types
      switch (event.type) {
        case "charge:created":
          await this.handleChargeCreated(event.data);
          break;

        case "charge:confirmed":
          await this.handleChargeConfirmed(event.data);
          break;

        case "charge:failed":
          await this.handleChargeFailed(event.data);
          break;

        case "charge:delayed":
          await this.handleChargeDelayed(event.data);
          break;

        case "charge:pending":
          await this.handleChargePending(event.data);
          break;

        case "charge:resolved":
          await this.handleChargeResolved(event.data);
          break;

        default:
          logger.info("Unhandled webhook event type", { type: event.type });
      }

      return { received: true };
    } catch (error: any) {
      logger.error("Webhook error", { error });
      throw new ApiError(400, error.message || "Webhook handler failed");
    }
  }

  /**
   * Cancel a pending charge
   */
  async cancelCharge(chargeId: string): Promise<boolean> {
    try {
      // Coinbase Commerce doesn't support programmatic cancellation
      // Mark order as failed
      const order = await this.orderRepository.findOne({
        where: { paymentTransactionId: `coinbase_${chargeId}` },
      });

      if (order) {
        order.paymentStatus = PaymentStatus.FAILED;
        await this.orderRepository.save(order);
      }

      logger.info("Charge marked as cancelled", { chargeId });
      return true;
    } catch (error: any) {
      logger.error("Failed to cancel charge", { error, chargeId });
      throw new ApiError(500, error.message || "Failed to cancel charge");
    }
  }

  // Private helper methods

  private getChargeStatus(charge: any): string {
    const timeline = charge.timeline || [];
    const latestEvent = timeline[timeline.length - 1];
    return latestEvent?.status || "UNKNOWN";
  }

  private async handleChargeCreated(charge: any): Promise<void> {
    logger.info("Charge created", { chargeId: charge.id });
  }

  private async handleChargeConfirmed(charge: any): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { paymentTransactionId: `coinbase_${charge.id}` },
    });

    if (order && order.paymentStatus !== PaymentStatus.COMPLETED) {
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.paymentMethod = "cryptocurrency";
      await this.orderRepository.save(order);

      logger.info("Charge confirmed webhook processed", {
        orderId: order.id,
        chargeId: charge.id,
      });
    }
  }

  private async handleChargeFailed(charge: any): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { paymentTransactionId: `coinbase_${charge.id}` },
    });

    if (order) {
      order.paymentStatus = PaymentStatus.FAILED;
      await this.orderRepository.save(order);

      logger.info("Charge failed webhook processed", {
        orderId: order.id,
        chargeId: charge.id,
      });
    }
  }

  private async handleChargeDelayed(charge: any): Promise<void> {
    logger.info("Charge delayed", { chargeId: charge.id });
    // Payment detected but needs more confirmations
  }

  private async handleChargePending(charge: any): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { paymentTransactionId: `coinbase_${charge.id}` },
    });

    if (order) {
      order.paymentStatus = PaymentStatus.PENDING;
      await this.orderRepository.save(order);

      logger.info("Charge pending webhook processed", {
        orderId: order.id,
        chargeId: charge.id,
      });
    }
  }

  private async handleChargeResolved(charge: any): Promise<void> {
    // Payment completed after being delayed
    await this.handleChargeConfirmed(charge);
  }
}

export default new CryptoPaymentService();
