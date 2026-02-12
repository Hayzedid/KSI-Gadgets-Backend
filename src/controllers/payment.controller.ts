import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import paymentService from "../services/payment.service";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export class PaymentController {
  /**
   * Get Stripe publishable key for frontend
   */
  static getPublishableKey = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const publishableKey = paymentService.getPublishableKey();

      return res.status(200).json(
        new ApiResponse(
          200,
          { publishableKey },
          "Publishable key retrieved successfully"
        )
      );
    }
  );

  /**
   * Create payment intent for an order
   */
  static createPaymentIntent = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { orderId, currency } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      // Amount will be retrieved from the order
      const result = await paymentService.createPaymentIntent({
        orderId,
        amount: 0, // Will be set from order in service
        currency: currency || "usd",
        metadata: {
          userId,
        },
      });

      return res.status(200).json(
        new ApiResponse(
          200,
          result,
          "Payment intent created successfully"
        )
      );
    }
  );

  /**
   * Confirm payment was successful
   */
  static confirmPayment = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { paymentIntentId } = req.body;

      const result = await paymentService.confirmPayment(paymentIntentId);

      return res.status(200).json(
        new ApiResponse(
          200,
          result,
          "Payment confirmed successfully"
        )
      );
    }
  );

  /**
   * Get payment status
   */
  static getPaymentStatus = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { paymentIntentId } = req.params;

      const status = await paymentService.getPaymentStatus(paymentIntentId);

      return res.status(200).json(
        new ApiResponse(
          200,
          status,
          "Payment status retrieved successfully"
        )
      );
    }
  );

  /**
   * Cancel payment
   */
  static cancelPayment = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { paymentIntentId } = req.body;

      const result = await paymentService.cancelPayment(paymentIntentId);

      return res.status(200).json(
        new ApiResponse(
          200,
          { cancelled: result },
          "Payment cancelled successfully"
        )
      );
    }
  );

  /**
   * Process refund (Admin only)
   */
  static refundPayment = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { paymentIntentId, amount, reason } = req.body;

      const result = await paymentService.refundPayment({
        paymentIntentId,
        amount,
        reason,
      });

      return res.status(200).json(
        new ApiResponse(
          200,
          result,
          "Refund processed successfully"
        )
      );
    }
  );

  /**
   * Handle Stripe webhook events
   */
  static handleWebhook = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const signature = req.headers["stripe-signature"] as string;

      if (!signature) {
        throw new ApiError(400, "Missing stripe signature");
      }

      // Raw body is needed for webhook verification
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const result = await paymentService.handleWebhook(rawBody, signature);

      return res.status(200).json(result);
    }
  );
}

export default PaymentController;
