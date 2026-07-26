import { body, param } from "express-validator";

export const createAddressValidator = [
  body("label").trim().notEmpty().isLength({ max: 100 }),
  body("fullName").trim().notEmpty().isLength({ max: 100 }),
  body("phone").trim().notEmpty().isLength({ max: 20 }),
  body("street").trim().notEmpty(),
  body("city").trim().notEmpty().isLength({ max: 100 }),
  body("state").trim().notEmpty().isLength({ max: 50 }),
  body("zipCode").trim().notEmpty().isLength({ max: 20 }),
  body("country").trim().notEmpty().isLength({ max: 100 }),
  body("isDefault").optional().isBoolean(),
];

export const updateAddressValidator = [
  param("id").isUUID().withMessage("Invalid address ID"),
  body("label").optional().trim().notEmpty().isLength({ max: 100 }),
  body("fullName").optional().trim().notEmpty().isLength({ max: 100 }),
  body("phone").optional().trim().notEmpty().isLength({ max: 20 }),
  body("street").optional().trim().notEmpty(),
  body("city").optional().trim().notEmpty().isLength({ max: 100 }),
  body("state").optional().trim().notEmpty().isLength({ max: 50 }),
  body("zipCode").optional().trim().notEmpty().isLength({ max: 20 }),
  body("country").optional().trim().notEmpty().isLength({ max: 100 }),
  body("isDefault").optional().isBoolean(),
];

export const addressIdValidator = [
  param("id").isUUID().withMessage("Invalid address ID"),
];
