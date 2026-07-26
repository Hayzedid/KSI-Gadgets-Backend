import { body, param } from "express-validator";
import { CouponType } from "../models/coupon.model";

export const validateCouponValidator = [
  body("code").trim().notEmpty().withMessage("Coupon code is required"),
  body("subtotal")
    .isFloat({ min: 0 })
    .withMessage("A valid subtotal is required"),
];

export const createCouponValidator = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ max: 50 })
    .withMessage("Coupon code cannot exceed 50 characters"),

  body("type")
    .isIn(Object.values(CouponType))
    .withMessage("Type must be 'percentage' or 'fixed'"),

  body("value")
    .isFloat({ min: 0.01 })
    .withMessage("Value must be a positive number"),

  body("minOrderAmount")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Minimum order amount must be a positive number"),

  body("maxDiscountAmount")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Max discount amount must be a positive number"),

  body("usageLimit")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Usage limit must be a positive integer"),

  body("expiresAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Expiry date must be a valid date"),

  body("isActive").optional().isBoolean(),
];

export const updateCouponValidator = [
  param("id").isUUID().withMessage("Invalid coupon ID"),

  body("code")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage("Coupon code cannot exceed 50 characters"),

  body("type")
    .optional()
    .isIn(Object.values(CouponType))
    .withMessage("Type must be 'percentage' or 'fixed'"),

  body("value")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Value must be a positive number"),

  body("minOrderAmount")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Minimum order amount must be a positive number"),

  body("maxDiscountAmount")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Max discount amount must be a positive number"),

  body("usageLimit")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Usage limit must be a positive integer"),

  body("expiresAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Expiry date must be a valid date"),

  body("isActive").optional().isBoolean(),
];

export const couponIdValidator = [
  param("id").isUUID().withMessage("Invalid coupon ID"),
];
