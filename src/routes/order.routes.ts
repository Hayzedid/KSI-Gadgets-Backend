import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import * as orderValidator from "../validators/order.validator";
import { validate } from "../middlewares/validation.middleware";
import {
  authenticate,
  authorize,
  optionalAuth,
} from "../middlewares/auth.middleware";
import { authRateLimiter } from "../middlewares/rateLimit.middleware";
import { UserRole } from "../models/user.model";

const router = Router();

/**
 * @swagger
 * /api/orders/track:
 *   get:
 *     summary: Track a guest order by order number and email
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: orderNumber
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 */
router.get(
  "/track",
  authRateLimiter,
  orderValidator.trackGuestOrderValidator,
  validate,
  orderController.trackGuestOrder,
);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create new order (authenticated or guest checkout)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: Order created
 */
router.post(
  "/",
  optionalAuth,
  orderValidator.createOrderValidator,
  validate,
  orderController.createOrder,
);

// Everything below requires authentication
router.use(authenticate);

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user orders
 */
router.get(
  "/my-orders",
  orderValidator.getOrdersQueryValidator,
  validate,
  orderController.getMyOrders,
);

/**
 * @swagger
 * /api/orders/my-stats:
 *   get:
 *     summary: Get user order statistics
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order statistics
 */
router.get("/my-stats", orderController.getUserOrderStats);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order cancelled
 */
router.post(
  "/:id/cancel",
  orderValidator.cancelOrderValidator,
  validate,
  orderController.cancelOrder,
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 */
router.get(
  "/",
  authorize(UserRole.ADMIN),
  orderValidator.getOrdersQueryValidator,
  validate,
  orderController.getAllOrders,
);

/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     summary: Get order statistics (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order statistics
 */
router.get("/stats", authorize(UserRole.ADMIN), orderController.getOrderStats);

/**
 * @swagger
 * /api/orders/analytics:
 *   get:
 *     summary: Get sales analytics — revenue over time and top products (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sales analytics
 */
router.get(
  "/analytics",
  authorize(UserRole.ADMIN),
  orderController.getSalesAnalytics,
);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put(
  "/:id/status",
  authorize(UserRole.ADMIN),
  orderValidator.updateOrderStatusValidator,
  validate,
  orderController.updateOrderStatus,
);

/**
 * @swagger
 * /api/orders/{id}/payment-status:
 *   put:
 *     summary: Update payment status (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment status updated
 */
router.put(
  "/:id/payment-status",
  authorize(UserRole.ADMIN),
  orderValidator.updatePaymentStatusValidator,
  validate,
  orderController.updatePaymentStatus,
);

/**
 * @swagger
 * /api/orders/{id}/invoice:
 *   get:
 *     summary: Download a PDF invoice for an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF invoice
 */
router.get(
  "/:id/invoice",
  orderValidator.orderIdValidator,
  validate,
  orderController.downloadInvoice,
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 */
router.get(
  "/:id",
  orderValidator.orderIdValidator,
  validate,
  orderController.getOrderById,
);

export default router;
