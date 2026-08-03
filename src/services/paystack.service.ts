import https from "https";
import crypto from "crypto";
import config from "../config/env";
import { AppDataSource } from "../config/database";
import { Order, PaymentStatus, PaymentMethod } from "../models/order.model";
import { ApiError } from "../utils/ApiError";
import logger from "../config/logger";

// ---------------------------------------------------------------------------
// Paystack Nigeria fee constants
// Source: https://support.paystack.com/en/articles/2130306
//
// Paystack Nigeria charges 1.5% per transaction, capped at NGN 2,000.
// Transactions under NGN 2,500 pay a flat NGN 100 fee instead.
// ---------------------------------------------------------------------------
const PAYSTACK_DECIMAL_FEE = 0.015; // 1.5%
const PAYSTACK_FEE_CAP = 2000; // NGN 2,000 cap
const PAYSTACK_FLAT_FEE_THRESHOLD = 2500; // transactions below this pay flat NGN 100
const PAYSTACK_FLAT_FEE = 100; // NGN 100 flat fee for small transactions

// ---------------------------------------------------------------------------
// Fee mark-up calculation
//
// The goal: you want to RECEIVE exactly `price` (in Naira) after Paystack
// deducts their fee. So we gross up the amount the customer pays so that
// after the fee is deducted, you get your full price.
//
// Three cases:
//
// Case 1: price < NGN 2,500 (flat fee applies)
//   Paystack charges a flat NGN 100.
//   finalAmount = price + 100
//
// Case 2: applicable fees (1.5% * price) >= NGN 2,000 (cap has been hit)
//   Paystack deducts exactly NGN 2,000.
//   finalAmount = price + 2,000
//
// Case 3: standard percentage applies (no cap hit)
//   Paystack charges 1.5% of finalAmount.
//   You need: finalAmount - (0.015 * finalAmount) = price
//   Rearranging: finalAmount * (1 - 0.015) = price
//   Therefore:  finalAmount = price / (1 - 0.015)
//   The +0.01 is a standard rounding buffer to ensure you never receive
//   one kobo less than intended due to floating-point truncation.
// ---------------------------------------------------------------------------
export function calculatePaystackFinalAmount(priceInNaira: number): {
  finalAmountNaira: number;
  finalAmountKobo: number;
  feeChargedNaira: number;
  originalPriceNaira: number;
} {
  let finalAmountNaira: number;

  if (priceInNaira < PAYSTACK_FLAT_FEE_THRESHOLD) {
    // Case 1: flat fee
    finalAmountNaira = priceInNaira + PAYSTACK_FLAT_FEE;
  } else {
    const applicableFees = PAYSTACK_DECIMAL_FEE * priceInNaira;

    if (applicableFees >= PAYSTACK_FEE_CAP) {
      // Case 2: fee cap has been hit, add the cap as a flat amount
      finalAmountNaira = priceInNaira + PAYSTACK_FEE_CAP;
    } else {
      // Case 3: standard percentage gross-up
      finalAmountNaira =
        priceInNaira / (1 - PAYSTACK_DECIMAL_FEE) + 0.01;
    }
  }

  // Round to 2 decimal places so we don't send sub-kobo values
  finalAmountNaira = Math.round(finalAmountNaira * 100) / 100;

  // Paystack API always receives amounts in kobo (NGN cents)
  const finalAmountKobo = Math.round(finalAmountNaira * 100);

  return {
    finalAmountNaira,
    finalAmountKobo,
    feeChargedNaira: Math.round((finalAmountNaira - priceInNaira) * 100) / 100,
    originalPriceNaira: priceInNaira,
  };
}

// ---------------------------------------------------------------------------
// Paystack REST API helper
// We call the API directly with https so we don't need an SDK dependency.
// ---------------------------------------------------------------------------
interface PaystackRequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: Record<string, any>;
}

function paystackRequest<T>(options: PaystackRequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const bodyStr = options.body ? JSON.stringify(options.body) : "";

    const reqOptions: https.RequestOptions = {
      hostname: "api.paystack.co",
      port: 443,
      path: options.path,
      method: options.method,
      headers: {
        Authorization: `Bearer ${config.paystackSecretKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data) as T;
          resolve(parsed);
        } catch {
          reject(new Error("Failed to parse Paystack response"));
        }
      });
    });

    req.on("error", reject);

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Service interfaces
// ---------------------------------------------------------------------------
interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string; // "success" | "failed" | "abandoned"
    reference: string;
    amount: number; // in kobo
    currency: string;
    paid_at: string;
    channel: string;
    customer: {
      email: string;
      customer_code: string;
    };
    metadata: Record<string, any>;
  };
}

// ---------------------------------------------------------------------------
// PaystackService
// ---------------------------------------------------------------------------
class PaystackService {
  private orderRepository = AppDataSource.getRepository(Order);

  constructor() {
    if (!config.paystackSecretKey) {
      logger.warn(
        "Paystack secret key not configured - Paystack payment features will be disabled",
      );
    }
  }

  /**
   * Return the public key so the frontend can initialise the Paystack popup.
   */
  getPublicKey(): string {
    return config.paystackPublicKey;
  }

  /**
   * Initialize a Paystack transaction for an order.
   *
   * The amount passed to Paystack is the grossed-up (marked-up) amount so that
   * after Paystack deducts their fee, the merchant receives exactly the order's
   * totalAmount.
   *
   * Returns:
   *   authorization_url - redirect the user here (or open Paystack popup)
   *   reference         - store this; used to verify after payment
   *   fee breakdown     - so the frontend can show a transparent breakdown
   */
  async initializeTransaction(orderId: string, userEmail: string): Promise<{
    authorizationUrl: string;
    reference: string;
    originalAmountNaira: number;
    finalAmountNaira: number;
    feeChargedNaira: number;
    finalAmountKobo: number;
  }> {
    if (!config.paystackSecretKey) {
      throw new ApiError(503, "Paystack payment is not configured");
    }

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["user"],
    });

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      throw new ApiError(400, "Order is already paid");
    }

    // totalAmount is stored in NGN in the orders table
    const priceInNaira = Number(order.totalAmount);

    const { finalAmountKobo, finalAmountNaira, feeChargedNaira } =
      calculatePaystackFinalAmount(priceInNaira);

    // Use existing reference if we previously initialised this order
    const reference =
      order.paymentTransactionId &&
      order.paymentTransactionId.startsWith("PS_")
        ? order.paymentTransactionId
        : `PS_${order.orderNumber}_${Date.now()}`;

    const payload = {
      email: userEmail || order.user?.email,
      amount: finalAmountKobo,
      reference,
      currency: "NGN",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        originalAmountNaira: priceInNaira,
        feeChargedNaira,
        finalAmountNaira,
      },
      callback_url: `${config.clientUrl.split(",")[0]}/payment/verify?reference=${reference}`,
    };

    const response = await paystackRequest<PaystackInitResponse>({
      method: "POST",
      path: "/transaction/initialize",
      body: payload,
    });

    if (!response.status) {
      logger.error("Paystack initialization failed", { response, orderId });
      throw new ApiError(502, response.message || "Paystack initialization failed");
    }

    // Persist the reference on the order so we can look it up on verify
    order.paymentTransactionId = reference;
    await this.orderRepository.save(order);

    logger.info("Paystack transaction initialized", {
      reference,
      orderId,
      originalAmountNaira: priceInNaira,
      finalAmountNaira,
      feeChargedNaira,
    });

    return {
      authorizationUrl: response.data.authorization_url,
      reference,
      originalAmountNaira: priceInNaira,
      finalAmountNaira,
      feeChargedNaira,
      finalAmountKobo,
    };
  }

  /**
   * Verify a Paystack transaction by reference.
   *
   * Called either:
   *   - by the user's browser after Paystack redirects back (callback_url)
   *   - by our webhook handler (more reliable, fires even if browser closes)
   *
   * Always verify server-side. Never trust the frontend alone to say a
   * payment succeeded.
   */
  async verifyTransaction(reference: string): Promise<{
    success: boolean;
    order: Order;
    amountPaidNaira: number;
  }> {
    if (!config.paystackSecretKey) {
      throw new ApiError(503, "Paystack payment is not configured");
    }

    const response = await paystackRequest<PaystackVerifyResponse>({
      method: "GET",
      path: `/transaction/verify/${encodeURIComponent(reference)}`,
    });

    if (!response.status) {
      throw new ApiError(502, response.message || "Paystack verification failed");
    }

    const txData = response.data;

    if (txData.status !== "success") {
      throw new ApiError(
        400,
        `Payment not successful. Status: ${txData.status}`,
      );
    }

    // Look up the order by the reference we stored during initialization
    const order = await this.orderRepository.findOne({
      where: { paymentTransactionId: reference },
    });

    if (!order) {
      throw new ApiError(404, "Order not found for this payment reference");
    }

    // Idempotency guard: if already marked complete, just return success
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      logger.info("Paystack verify called on already-completed order", {
        reference,
        orderId: order.id,
      });
      return { success: true, order, amountPaidNaira: txData.amount / 100 };
    }

    order.paymentStatus = PaymentStatus.COMPLETED;
    order.paymentMethod = PaymentMethod.PAYSTACK;
    await this.orderRepository.save(order);

    logger.info("Paystack payment verified and order updated", {
      reference,
      orderId: order.id,
      amountPaidKobo: txData.amount,
    });

    return {
      success: true,
      order,
      amountPaidNaira: txData.amount / 100,
    };
  }

  /**
   * Handle incoming Paystack webhook events.
   *
   * Paystack sends a POST to your webhook URL whenever a payment event occurs
   * (charge.success, charge.failed, etc.). We verify the request is genuinely
   * from Paystack using HMAC-SHA512 signature verification before processing.
   */
  async handleWebhook(
    rawBody: string,
    paystackSignature: string,
  ): Promise<{ received: boolean }> {
    // Verify the webhook signature
    const expectedSignature = crypto
      .createHmac("sha512", config.paystackWebhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== paystackSignature) {
      logger.warn("Paystack webhook signature mismatch - request rejected");
      throw new ApiError(401, "Invalid Paystack webhook signature");
    }

    let event: { event: string; data: any };
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new ApiError(400, "Invalid webhook payload");
    }

    logger.info("Paystack webhook received", { event: event.event });

    switch (event.event) {
      case "charge.success":
        await this.handleChargeSuccess(event.data);
        break;

      case "charge.failed":
        await this.handleChargeFailed(event.data);
        break;

      default:
        logger.info("Unhandled Paystack webhook event", { event: event.event });
    }

    return { received: true };
  }

  // --------------------------------------------------------------------------
  // Private webhook event handlers
  // --------------------------------------------------------------------------

  private async handleChargeSuccess(data: any): Promise<void> {
    const reference: string = data.reference;
    if (!reference) return;

    const order = await this.orderRepository.findOne({
      where: { paymentTransactionId: reference },
    });

    if (!order) {
      logger.warn("Paystack charge.success: no order found for reference", {
        reference,
      });
      return;
    }

    if (order.paymentStatus === PaymentStatus.COMPLETED) return;

    order.paymentStatus = PaymentStatus.COMPLETED;
    order.paymentMethod = PaymentMethod.PAYSTACK;
    await this.orderRepository.save(order);

    logger.info("Paystack charge.success webhook processed", {
      orderId: order.id,
      reference,
    });
  }

  private async handleChargeFailed(data: any): Promise<void> {
    const reference: string = data.reference;
    if (!reference) return;

    const order = await this.orderRepository.findOne({
      where: { paymentTransactionId: reference },
    });

    if (!order) return;

    order.paymentStatus = PaymentStatus.FAILED;
    await this.orderRepository.save(order);

    logger.info("Paystack charge.failed webhook processed", {
      orderId: order.id,
      reference,
    });
  }
}

export default new PaystackService();
