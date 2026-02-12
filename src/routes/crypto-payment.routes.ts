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

// Webhook route (no auth - Coinbase calls this)
router.post("/webhook", CryptoPaymentController.handleWebhook);

// Protected routes (Customer)
router.post(
  "/create-charge",
  authenticate,
  createChargeValidator,
  validate,
  CryptoPaymentController.createCharge
);

router.get(
  "/charge/:chargeId",
  authenticate,
  chargeIdParamValidator,
  validate,
  CryptoPaymentController.getCharge
);

router.get(
  "/order/:orderId/charges",
  authenticate,
  orderIdParamValidator,
  validate,
  CryptoPaymentController.getChargesForOrder
);

router.post(
  "/cancel",
  authenticate,
  cancelChargeValidator,
  validate,
  CryptoPaymentController.cancelCharge
);

export default router;
