import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import * as orderValidator from "../validators/order.validator";
import { validate } from "../middlewares/validation.middleware";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { UserRole } from "../models/user.model";

const router = Router();

// All order routes require authentication
router.use(authenticate);

// Customer routes - Get user's own orders
router.get(
  "/my-orders",
  orderValidator.getOrdersQueryValidator,
  validate,
  orderController.getMyOrders
);

// Customer routes - Get user's order statistics
router.get("/my-stats", orderController.getUserOrderStats);

// Customer routes - Get specific order
router.get(
  "/:id",
  orderValidator.orderIdValidator,
  validate,
  orderController.getOrderById
);

// Customer routes - Create new order
router.post(
  "/",
  orderValidator.createOrderValidator,
  validate,
  orderController.createOrder
);

// Customer routes - Cancel order
router.post(
  "/:id/cancel",
  orderValidator.cancelOrderValidator,
  validate,
  orderController.cancelOrder
);

// Admin routes - Get all orders
router.get(
  "/",
  authorize(UserRole.ADMIN),
  orderValidator.getOrdersQueryValidator,
  validate,
  orderController.getAllOrders
);

router.get("/stats", authorize(UserRole.ADMIN), orderController.getOrderStats);

router.put(
  "/:id/status",
  authorize(UserRole.ADMIN),
  orderValidator.updateOrderStatusValidator,
  validate,
  orderController.updateOrderStatus
);

router.put(
  "/:id/payment-status",
  authorize(UserRole.ADMIN),
  orderValidator.updatePaymentStatusValidator,
  validate,
  orderController.updatePaymentStatus
);

export default router;
