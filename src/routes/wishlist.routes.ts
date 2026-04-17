import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import * as wishlistController from "../controllers/wishlist.controller";

const router = Router();

router.use(authenticate);

const addToWishlistValidator = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isUUID()
    .withMessage("Invalid product ID"),
];

const productIdParamValidator = [
  param("productId").isUUID().withMessage("Invalid product ID"),
];

router.get("/", wishlistController.getWishlist);
router.post(
  "/items",
  addToWishlistValidator,
  validate,
  wishlistController.addToWishlist,
);
router.delete(
  "/items/:productId",
  productIdParamValidator,
  validate,
  wishlistController.removeFromWishlist,
);
router.delete("/", wishlistController.clearWishlist);

export default router;
