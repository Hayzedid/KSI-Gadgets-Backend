import { Router } from "express";
import * as cartController from "../controllers/cart.controller";
import { body, param } from "express-validator";
import { validate } from "../middlewares/validation.middleware";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All cart routes require authentication
router.use(authenticate);

const addToCartValidator = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isUUID()
    .withMessage("Invalid product ID"),
  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

const updateCartItemValidator = [
  param("productId").isUUID().withMessage("Invalid product ID"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

const productIdParamValidator = [
  param("productId").isUUID().withMessage("Invalid product ID"),
];

router.get("/", cartController.getCart);

router.post("/items", addToCartValidator, validate, cartController.addToCart);

router.put(
  "/items/:productId",
  updateCartItemValidator,
  validate,
  cartController.updateCartItem
);

router.delete(
  "/items/:productId",
  productIdParamValidator,
  validate,
  cartController.removeFromCart
);

router.delete("/", cartController.clearCart);

export default router;
