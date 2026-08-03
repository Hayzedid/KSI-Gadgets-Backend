import { Router } from "express";
import PaystackController from "../controllers/paystack.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  initializeTransactionValidator,
  verifyTransactionValidator,
} from "../validators/paystack.validator";
import { validate } from "../middlewares/validation.middleware";

const router = Router();

// ------------------------------------------------------------------
// Public routes
// ------------------------------------------------------------------

// Returns the Paystack public key for frontend initialisation.
// No auth needed: the public key is safe to expose.
router.get("/config", PaystackController.getPublicKey);

// Webhook receiver. No auth middleware; Paystack calls this directly.
// Signature verification is handled inside the service with HMAC-SHA512.
// MUST be registered BEFORE any bodyParser middleware transforms req.body,
// so the raw body is still available. See app.ts for rawBody setup.
router.post("/webhook", PaystackController.handleWebhook);

// ------------------------------------------------------------------
// Protected routes (authenticated users only)
// ------------------------------------------------------------------

// Initialize a Paystack transaction for an existing order.
// Returns authorizationUrl + fee breakdown.
router.post(
  "/initialize",
  authenticate,
  initializeTransactionValidator,
  validate,
  PaystackController.initializeTransaction,
);

// Verify a Paystack transaction after the user returns from the payment page.
// The reference is the one we generated during initialization.
router.get(
  "/verify/:reference",
  authenticate,
  verifyTransactionValidator,
  validate,
  PaystackController.verifyTransaction,
);

export default router;
