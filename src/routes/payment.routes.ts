import { Router } from "express";
import PaymentController from "../controllers/payment.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { UserRole } from "../models/user.model";
import {
  createPaymentIntentValidator,
  confirmPaymentValidator,
  paymentIntentIdParamValidator,
  cancelPaymentValidator,
  refundPaymentValidator,
} from "../validators/payment.validator";
import { validate } from "../middlewares/validation.middleware";

const router = Router();

// Public routes
router.get("/config", PaymentController.getPublishableKey);

// Webhook route (no auth - Stripe calls this)
router.post("/webhook", PaymentController.handleWebhook);

// Protected routes (Customer)
router.post(
  "/create-intent",
  authenticate,
  createPaymentIntentValidator,
  validate,
  PaymentController.createPaymentIntent
);

router.post(
  "/confirm",
  authenticate,
  confirmPaymentValidator,
  validate,
  PaymentController.confirmPayment
);

router.get(
  "/status/:paymentIntentId",
  authenticate,
  paymentIntentIdParamValidator,
  validate,
  PaymentController.getPaymentStatus
);

router.post(
  "/cancel",
  authenticate,
  cancelPaymentValidator,
  validate,
  PaymentController.cancelPayment
);

// Admin only routes
router.post(
  "/refund",
  authenticate,
  authorize(UserRole.ADMIN),
  refundPaymentValidator,
  validate,
  PaymentController.refundPayment
);

export default router;
