import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import paystackService from "../services/paystack.service";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export class PaystackController {
  /**
   * GET /api/paystack/config
   *
   * Returns the Paystack public key so the React frontend can initialize
   * the Paystack inline popup or Paystack.js without hardcoding keys.
   */
  static getPublicKey = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const publicKey = paystackService.getPublicKey();

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { publicKey },
            "Paystack public key retrieved successfully",
          ),
        );
    },
  );

  /**
   * POST /api/paystack/initialize
   * Body: { orderId: string }
   *
   * Initializes a Paystack transaction for an order.
   *
   * The returned `finalAmountNaira` is the grossed-up amount the customer
   * will actually pay (original price + Paystack's transaction fee).
   * The `feeChargedNaira` shows how much of that is the Paystack fee,
   * which the frontend should display at checkout for transparency.
   *
   * The `authorizationUrl` can be used in two ways on the frontend:
   *   1. Redirect the user to it directly (Paystack hosted page)
   *   2. Pass it to the Paystack inline popup via the `key` + `ref` approach
   */
  static initializeTransaction = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { orderId } = req.body;
      const userId = req.user?.id;
      const userEmail = req.user?.email as string | undefined;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!orderId) {
        throw new ApiError(400, "Order ID is required");
      }

      const result = await paystackService.initializeTransaction(
        orderId,
        userEmail || "",
      );

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Paystack transaction initialized successfully",
          ),
        );
    },
  );

  /**
   * GET /api/paystack/verify/:reference
   *
   * Verifies a completed Paystack payment by its reference string.
   *
   * The frontend calls this after Paystack redirects back to the
   * callback_url with ?reference=... in the query string.
   *
   * This is our own additional client-triggered verification. The webhook
   * (below) is the primary, more reliable verification path since it fires
   * even if the user closes their browser before the redirect completes.
   */
  static verifyTransaction = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const { reference } = req.params;

      if (!reference) {
        throw new ApiError(400, "Payment reference is required");
      }

      const result = await paystackService.verifyTransaction(reference);

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            {
              success: result.success,
              orderId: result.order.id,
              orderNumber: result.order.orderNumber,
              amountPaidNaira: result.amountPaidNaira,
              paymentStatus: result.order.paymentStatus,
            },
            "Payment verified successfully",
          ),
        );
    },
  );

  /**
   * POST /api/paystack/webhook
   *
   * Paystack webhook receiver. No authentication middleware here because
   * Paystack calls this endpoint directly (not a user browser request).
   * Instead we verify Paystack's HMAC-SHA512 signature inside the service.
   *
   * IMPORTANT: In app.ts the raw body must be preserved for this route
   * before express.json() consumes it. See the rawBody middleware setup.
   */
  static handleWebhook = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
      const paystackSignature = req.headers[
        "x-paystack-signature"
      ] as string;

      if (!paystackSignature) {
        throw new ApiError(400, "Missing x-paystack-signature header");
      }

      // Raw body is preserved by the rawBody middleware registered in app.ts
      const rawBody =
        (req as any).rawBody || JSON.stringify(req.body);

      const result = await paystackService.handleWebhook(
        rawBody,
        paystackSignature,
      );

      // Paystack expects a 200 back quickly. Return immediately.
      return res.status(200).json(result);
    },
  );
}

export default PaystackController;
