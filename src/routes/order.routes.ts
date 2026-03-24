import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import * as orderValidator from "../validators/order.validator";
import { validate } from "../middlewares/validation.middleware";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { UserRole } from "../models/user.model";

const router = Router();

// All order routes require authentication
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
 * /api/orders:
 *   post:
 *     summary: Create new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               shippingAddress:
 *                 type: object
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created
 */
router.post(
  "/",
  orderValidator.createOrderValidator,
  validate,
  orderController.createOrder,
);

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
