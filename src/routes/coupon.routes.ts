import { Router } from "express";
import * as couponController from "../controllers/coupon.controller";
import * as couponValidator from "../validators/coupon.validator";
import { validate } from "../middlewares/validation.middleware";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { UserRole } from "../models/user.model";

const router = Router();

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate a coupon code against an order subtotal
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Coupon is valid
 *       400:
 *         description: Invalid or inactive coupon
 */
router.post(
  "/validate",
  couponValidator.validateCouponValidator,
  validate,
  couponController.validateCoupon,
);

router.use(authenticate, authorize(UserRole.ADMIN));

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: List all coupons (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of coupons
 */
router.get("/", couponController.listCoupons);

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Create a coupon (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Coupon created
 */
router.post(
  "/",
  couponValidator.createCouponValidator,
  validate,
  couponController.createCoupon,
);

/**
 * @swagger
 * /api/coupons/{id}:
 *   put:
 *     summary: Update a coupon (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon updated
 */
router.put(
  "/:id",
  couponValidator.updateCouponValidator,
  validate,
  couponController.updateCoupon,
);

/**
 * @swagger
 * /api/coupons/{id}:
 *   delete:
 *     summary: Delete a coupon (Admin)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon deleted
 */
router.delete(
  "/:id",
  couponValidator.couponIdValidator,
  validate,
  couponController.deleteCoupon,
);

export default router;
