import { Router } from "express";
import * as productController from "../controllers/product.controller";
import * as productValidator from "../validators/product.validator";
import { validate } from "../middlewares/validation.middleware";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { UserRole } from "../models/user.model";

const router = Router();

// Public routes
router.get(
  "/",
  productValidator.getProductsQueryValidator,
  validate,
  productController.getAllProducts
);

router.get(
  "/:id",
  productValidator.productIdValidator,
  validate,
  productController.getProductById
);

router.get(
  "/:id/reviews",
  productValidator.productIdValidator,
  validate,
  productController.getProductReviews
);

// Protected routes (require authentication)
router.post(
  "/:id/reviews",
  authenticate,
  productValidator.addReviewValidator,
  validate,
  productController.addProductReview
);

router.put(
  "/reviews/:reviewId",
  authenticate,
  productValidator.updateReviewValidator,
  validate,
  productController.updateProductReview
);

router.delete(
  "/reviews/:reviewId",
  authenticate,
  productValidator.reviewIdValidator,
  validate,
  productController.deleteProductReview
);

// Admin routes (require authentication and admin role)
router.post(
  "/",
  authenticate,
  authorize(UserRole.ADMIN),
  productValidator.createProductValidator,
  validate,
  productController.createProduct
);

router.put(
  "/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  productValidator.updateProductValidator,
  validate,
  productController.updateProduct
);

router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  productValidator.productIdValidator,
  validate,
  productController.deleteProduct
);

export default router;
