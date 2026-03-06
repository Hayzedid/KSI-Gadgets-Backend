import { Router } from "express";
import CryptoPaymentController from "../controllers/crypto-payment.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  createChargeValidator,
  chargeIdParamValidator,
  orderIdParamValidator,
  cancelChargeValidator,
} from "../validators/crypto-payment.validator";
import { validate } from "../middlewares/validation.middleware";

const router = Router();

/**
 * @swagger
 * /api/crypto-payments/webhook:
 *   post:
 *     summary: Coinbase webhook handler
 *     tags: [Crypto Payments]
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post("/webhook", CryptoPaymentController.handleWebhook);

/**
 * @swagger
 * /api/crypto-payments/create-charge:
 *   post:
 *     summary: Create cryptocurrency charge
 *     tags: [Crypto Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - amount
 *             properties:
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Charge created
 */
router.post(
  "/create-charge",
  authenticate,
  createChargeValidator,
  validate,
  CryptoPaymentController.createCharge
);

/**
 * @swagger
 * /api/crypto-payments/charge/{chargeId}:
 *   get:
 *     summary: Get charge details
 *     tags: [Crypto Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chargeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Charge details
 */
router.get(
  "/charge/:chargeId",
  authenticate,
  chargeIdParamValidator,
  validate,
  CryptoPaymentController.getCharge
);

/**
 * @swagger
 * /api/crypto-payments/order/{orderId}/charges:
 *   get:
 *     summary: Get all charges for order
 *     tags: [Crypto Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of charges
 */
router.get(
  "/order/:orderId/charges",
  authenticate,
  orderIdParamValidator,
  validate,
  CryptoPaymentController.getChargesForOrder
);

/**
 * @swagger
 * /api/crypto-payments/cancel:
 *   post:
 *     summary: Cancel cryptocurrency charge
 *     tags: [Crypto Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chargeId
 *             properties:
 *               chargeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Charge cancelled
 */
router.post(
  "/cancel",
  authenticate,
  cancelChargeValidator,
  validate,
  CryptoPaymentController.cancelCharge
);

export default router;
