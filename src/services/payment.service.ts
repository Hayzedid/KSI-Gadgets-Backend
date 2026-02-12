import Stripe from "stripe";
import config from "../config/env";
import { AppDataSource } from "../config/database";
import { Order, PaymentStatus } from "../models/order.model";
import { ApiError } from "../utils/ApiError";
import logger from "../config/logger";

interface CreatePaymentIntentData {
  orderId: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}

interface RefundData {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

interface WebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

class PaymentService {
  private stripe: Stripe;
  private orderRepository = AppDataSource.getRepository(Order);

  constructor() {
    if (!config.stripeSecretKey) {
      logger.warn("Stripe secret key not configured");
    }

    this.stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });
  }

  /**
   * Create a payment intent for an order
   */
  async createPaymentIntent(data: CreatePaymentIntentData): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    try {
      // Find order
      const order = await this.orderRepository.findOne({
        where: { id: data.orderId },
        relations: ["user"],
      });

      if (!order) {
        throw new ApiError("Order not found", 404);
      }

      // Use order's total amount
      const amount = order.totalAmount;

      // Check if order already has a payment intent
      if (order.paymentTransactionId) {
        // Retrieve existing payment intent
        try {
          const existingIntent = await this.stripe.paymentIntents.retrieve(
            order.paymentTransactionId
          );

          if (existingIntent.status === "succeeded") {
            throw new ApiError("Order already paid", 400);
          }

          // Return existing intent if still valid
          if (
            existingIntent.status === "requires_payment_method" ||
            existingIntent.status === "requires_confirmation"
          ) {
            return {
              clientSecret: existingIntent.client_secret!,
              paymentIntentId: existingIntent.id,
            };
          }
        } catch (error: any) {
          if (error.type !== "StripeInvalidRequestError") {
            throw error;
          }
          // Continue to create new intent if old one is invalid
        }
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: data.currency || "usd",
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          ...data.metadata,
        },
        description: `Payment for Order ${order.orderNumber}`,
        receipt_email: order.user?.email,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Update order with payment intent ID
      order.paymentTransactionId = paymentIntent.id;
      await this.orderRepository.save(order);

      logger.info("Payment intent created", {
        paymentIntentId: paymentIntent.id,
        orderId: order.id,
        amount: amount,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      logger.error("Failed to create payment intent", { error, data });
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error.message || "Failed to create payment intent",
        500
      );
    }
  }

  /**
   * Confirm a payment was successful
   */
  async confirmPayment(paymentIntentId: string): Promise<{
    success: boolean;
    order: Order;
  }> {
    try {
      // Retrieve payment intent from Stripe
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        throw new ApiError("Payment not completed", 400);
      }

      // Find order by payment intent ID
      const order = await this.orderRepository.findOne({
        where: { paymentTransactionId: paymentIntentId },
      });

      if (!order) {
        throw new ApiError("Order not found", 404);
      }

      // Update order payment status
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.paymentMethod = this.getPaymentMethodType(
        paymentIntent.payment_method
      );

      await this.orderRepository.save(order);

      logger.info("Payment confirmed", {
        paymentIntentId,
        orderId: order.id,
      });

      return {
        success: true,
        order,
      };
    } catch (error: any) {
      logger.error("Failed to confirm payment", { error, paymentIntentId });
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.message || "Failed to confirm payment", 500);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentIntentId: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    metadata: any;
  }> {
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      };
    } catch (error: any) {
      logger.error("Failed to get payment status", { error, paymentIntentId });
      throw new ApiError(error.message || "Failed to get payment status", 500);
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPayment(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(
        paymentIntentId
      );

      // Update order status
      const order = await this.orderRepository.findOne({
        where: { paymentTransactionId: paymentIntentId },
      });

      if (order) {
        order.paymentStatus = PaymentStatus.FAILED;
        await this.orderRepository.save(order);
      }

      logger.info("Payment cancelled", {
        paymentIntentId,
        orderId: order?.id,
      });

      return paymentIntent.status === "canceled";
    } catch (error: any) {
      logger.error("Failed to cancel payment", { error, paymentIntentId });
      throw new ApiError(error.message || "Failed to cancel payment", 500);
    }
  }

  /**
   * Process refund
   */
  async refundPayment(data: RefundData): Promise<{
    success: boolean;
    refundId: string;
    amount: number;
  }> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: data.paymentIntentId,
        amount: data.amount ? Math.round(data.amount * 100) : undefined,
        reason: (data.reason as any) || "requested_by_customer",
      });

      // Update order status
      const order = await this.orderRepository.findOne({
        where: { paymentTransactionId: data.paymentIntentId },
      });

      if (order) {
        order.paymentStatus = PaymentStatus.REFUNDED;
        await this.orderRepository.save(order);
      }

      logger.info("Refund processed", {
        refundId: refund.id,
        paymentIntentId: data.paymentIntentId,
        amount: refund.amount / 100,
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
      };
    } catch (error: any) {
      logger.error("Failed to process refund", { error, data });
      throw new ApiError(error.message || "Failed to process refund", 500);
    }
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(
    rawBody: string,
    signature: string
  ): Promise<{ received: boolean }> {
    try {
      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.stripeWebhookSecret
      );

      logger.info("Webhook received", { type: event.type });

      // Handle different event types
      switch (event.type) {
        case "payment_intent.succeeded":
          await this.handlePaymentSuccess(event.data.object as any);
          break;

        case "payment_intent.payment_failed":
          await this.handlePaymentFailure(event.data.object as any);
          break;

        case "payment_intent.canceled":
          await this.handlePaymentCanceled(event.data.object as any);
          break;

        case "charge.refunded":
          await this.handleRefund(event.data.object as any);
          break;

        default:
          logger.info("Unhandled webhook event type", { type: event.type });
      }

      return { received: true };
    } catch (error: any) {
      logger.error("Webhook error", { error });
      throw new ApiError(error.message || "Webhook handler failed", 400);
    }
  }

  /**
   * Get Stripe publishable key
   */
  getPublishableKey(): string {
    return config.stripePublishableKey;
  }

  // Private helper methods

  private async handlePaymentSuccess(paymentIntent: any): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { paymentTransactionId: paymentIntent.id },
    });

    if (order && order.paymentStatus !== PaymentStatus.COMPLETED) {
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.paymentMethod = this.getPaymentMethodType(
        paymentIntent.payment_method
      );
      await this.orderRepository.save(order);

      logger.info("Payment success webhook processed", {
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
      });
    }
  }

  private async handlePaymentFailure(paymentIntent: any): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { paymentTransactionId: paymentIntent.id },
    });

    if (order) {
      order.paymentStatus = PaymentStatus.FAILED;
      await this.orderRepository.save(order);

      logger.info("Payment failure webhook processed", {
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
      });
    }
  }

  private async handlePaymentCanceled(paymentIntent: any): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { paymentTransactionId: paymentIntent.id },
    });

    if (order) {
      order.paymentStatus = PaymentStatus.FAILED;
      await this.orderRepository.save(order);

      logger.info("Payment canceled webhook processed", {
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
      });
    }
  }

  private async handleRefund(charge: any): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { paymentTransactionId: charge.payment_intent },
    });

    if (order) {
      order.paymentStatus = PaymentStatus.REFUNDED;
      await this.orderRepository.save(order);

      logger.info("Refund webhook processed", {
        orderId: order.id,
        chargeId: charge.id,
      });
    }
  }

  private getPaymentMethodType(paymentMethod: any): string {
    if (typeof paymentMethod === "string") {
      return "card"; // Default
    }
    return paymentMethod?.type || "unknown";
  }
}

export default new PaymentService();
