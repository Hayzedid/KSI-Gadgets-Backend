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

/**
 * @swagger
 * /api/payments/config:
 *   get:
 *     summary: Get Stripe publishable key
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Publishable key
 */
router.get("/config", PaymentController.getPublishableKey);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Stripe webhook handler
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post("/webhook", PaymentController.handleWebhook);

/**
 * @swagger
 * /api/payments/create-intent:
 *   post:
 *     summary: Create payment intent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment intent created
 */
router.post(
  "/create-intent",
  authenticate,
  createPaymentIntentValidator,
  validate,
  PaymentController.createPaymentIntent
);

/**
 * @swagger
 * /api/payments/confirm:
 *   post:
 *     summary: Confirm payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 */
router.post(
  "/confirm",
  authenticate,
  confirmPaymentValidator,
  validate,
  PaymentController.confirmPayment
);

/**
 * @swagger
 * /api/payments/status/{paymentIntentId}:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentIntentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status
 */
router.get(
  "/status/:paymentIntentId",
  authenticate,
  paymentIntentIdParamValidator,
  validate,
  PaymentController.getPaymentStatus
);

/**
 * @swagger
 * /api/payments/cancel:
 *   post:
 *     summary: Cancel payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment cancelled
 */
router.post(
  "/cancel",
  authenticate,
  cancelPaymentValidator,
  validate,
  PaymentController.cancelPayment
);

/**
 * @swagger
 * /api/payments/refund:
 *   post:
 *     summary: Refund payment (Admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment refunded
 */
router.post(
  "/refund",
  authenticate,
  authorize(UserRole.ADMIN),
  refundPaymentValidator,
  validate,
  PaymentController.refundPayment
);

export default router;
