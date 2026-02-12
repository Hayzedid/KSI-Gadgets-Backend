import { body, param } from "express-validator";

export const createPaymentIntentValidator = [
  body("orderId")
    .notEmpty()
    .withMessage("Order ID is required")
    .isUUID()
    .withMessage("Order ID must be a valid UUID"),

  body("currency")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-letter code (e.g., USD, EUR)")
    .toLowerCase(),
];

export const confirmPaymentValidator = [
  body("paymentIntentId")
    .notEmpty()
    .withMessage("Payment intent ID is required")
    .isString()
    .withMessage("Payment intent ID must be a string"),
];

export const paymentIntentIdParamValidator = [
  param("paymentIntentId")
    .notEmpty()
    .withMessage("Payment intent ID is required")
    .isString()
    .withMessage("Payment intent ID must be a string"),
];

export const cancelPaymentValidator = [
  body("paymentIntentId")
    .notEmpty()
    .withMessage("Payment intent ID is required")
    .isString()
    .withMessage("Payment intent ID must be a string"),
];

export const refundPaymentValidator = [
  body("paymentIntentId")
    .notEmpty()
    .withMessage("Payment intent ID is required")
    .isString()
    .withMessage("Payment intent ID must be a string"),

  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Refund amount must be greater than 0"),

  body("reason")
    .optional()
    .isString()
    .isIn(["duplicate", "fraudulent", "requested_by_customer"])
    .withMessage(
      "Reason must be one of: duplicate, fraudulent, requested_by_customer"
    ),
];
