import { body, param, query } from "express-validator";

export const createOrderValidator = [
  body("shippingAddress")
    .trim()
    .notEmpty()
    .withMessage("Shipping address is required")
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters"),

  body("shippingCity")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters"),

  body("shippingState")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .isLength({ max: 50 })
    .withMessage("State cannot exceed 50 characters"),

  body("shippingZipCode")
    .trim()
    .notEmpty()
    .withMessage("Zip code is required")
    .isLength({ max: 20 })
    .withMessage("Zip code cannot exceed 20 characters"),

  body("shippingCountry")
    .trim()
    .notEmpty()
    .withMessage("Country is required")
    .isLength({ max: 100 })
    .withMessage("Country cannot exceed 100 characters"),

  body("contactPhone")
    .trim()
    .notEmpty()
    .withMessage("Contact phone is required")
    .isLength({ max: 20 })
    .withMessage("Phone cannot exceed 20 characters"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
];

export const orderIdValidator = [
  param("id").isUUID().withMessage("Invalid order ID"),
];

export const cancelOrderValidator = [
  param("id").isUUID().withMessage("Invalid order ID"),

  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Cancellation reason is required")
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
];

export const updateOrderStatusValidator = [
  param("id").isUUID().withMessage("Invalid order ID"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid order status"),

  body("trackingNumber")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Tracking number cannot exceed 50 characters"),
];

export const updatePaymentStatusValidator = [
  param("id").isUUID().withMessage("Invalid order ID"),

  body("paymentStatus")
    .notEmpty()
    .withMessage("Payment status is required")
    .isIn(["pending", "completed", "failed", "refunded"])
    .withMessage("Invalid payment status"),

  body("paymentTransactionId")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Transaction ID cannot exceed 255 characters"),
];

export const getOrdersQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid order status"),

  query("paymentStatus")
    .optional()
    .isIn(["pending", "completed", "failed", "refunded"])
    .withMessage("Invalid payment status"),
];
