import { body, param } from "express-validator";

export const createChargeValidator = [
  body("orderId")
    .notEmpty()
    .withMessage("Order ID is required")
    .isUUID()
    .withMessage("Order ID must be a valid UUID"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
];

export const chargeIdParamValidator = [
  param("chargeId")
    .notEmpty()
    .withMessage("Charge ID is required")
    .isString()
    .withMessage("Charge ID must be a string"),
];

export const orderIdParamValidator = [
  param("orderId")
    .notEmpty()
    .withMessage("Order ID is required")
    .isUUID()
    .withMessage("Order ID must be a valid UUID"),
];

export const cancelChargeValidator = [
  body("chargeId")
    .notEmpty()
    .withMessage("Charge ID is required")
    .isString()
    .withMessage("Charge ID must be a string"),
];
