import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import cryptoPaymentService from "../services/crypto-payment.service";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export class CryptoPaymentController {
  /**
   * Create cryptocurrency charge for an order
   */
  static createCharge = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { orderId, description } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const result = await cryptoPaymentService.createCharge({
        orderId,
        description,
        metadata: {
          userId,
        },
      });

      return res.status(200).json(
        new ApiResponse(
          200,
          result,
          "Crypto charge created successfully"
        )
      );
    }
  );

  /**
   * Get charge details
   */
  static getCharge = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { chargeId } = req.params;

      const charge = await cryptoPaymentService.getCharge(chargeId);

      return res.status(200).json(
        new ApiResponse(
          200,
          charge,
          "Charge details retrieved successfully"
        )
      );
    }
  );

  /**
   * Get charges for an order
   */
  static getChargesForOrder = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { orderId } = req.params;

      const charges = await cryptoPaymentService.getChargesForOrder(orderId);

      return res.status(200).json(
        new ApiResponse(
          200,
          { charges },
          "Order charges retrieved successfully"
        )
      );
    }
  );

  /**
   * Cancel a crypto charge
   */
  static cancelCharge = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { chargeId } = req.body;

      const result = await cryptoPaymentService.cancelCharge(chargeId);

      return res.status(200).json(
        new ApiResponse(
          200,
          { cancelled: result },
          "Charge cancelled successfully"
        )
      );
    }
  );

  /**
   * Handle Coinbase Commerce webhook events
   */
  static handleWebhook = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const signature = req.headers["x-cc-webhook-signature"] as string;

      if (!signature) {
        throw new ApiError(400, "Missing webhook signature");
      }

      // Raw body is needed for webhook verification
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const result = await cryptoPaymentService.handleWebhook(
        rawBody,
        signature
      );

      return res.status(200).json(result);
    }
  );
}

export default CryptoPaymentController;
