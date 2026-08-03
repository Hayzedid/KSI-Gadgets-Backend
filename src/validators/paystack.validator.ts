import { body, param } from "express-validator";

/**
 * Validates the request body for POST /api/paystack/initialize
 */
export const initializeTransactionValidator = [
  body("orderId")
    .notEmpty()
    .withMessage("Order ID is required")
    .isUUID()
    .withMessage("Order ID must be a valid UUID"),
];

/**
 * Validates the reference param for GET /api/paystack/verify/:reference
 */
export const verifyTransactionValidator = [
  param("reference")
    .notEmpty()
    .withMessage("Payment reference is required")
    .isString()
    .withMessage("Payment reference must be a string")
    .matches(/^PS_/)
    .withMessage("Invalid Paystack reference format"),
];
