import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import { OrderService } from "../services/order.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { OrderStatus, PaymentStatus } from "../models/order.model";

const orderService = new OrderService();

export const createOrder = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const orderData = req.body;

    const order = await orderService.createOrder(userId, orderData);

    res
      .status(201)
      .json(new ApiResponse(201, order, "Order created successfully"));
  }
);

export const getMyOrders = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await orderService.getUserOrders(userId, page, limit);

    res
      .status(200)
      .json(new ApiResponse(200, result, "Orders retrieved successfully"));
  }
);

export const getOrderById = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    const order = await orderService.getOrderById(id, userId);

    res
      .status(200)
      .json(new ApiResponse(200, order, "Order retrieved successfully"));
  }
);

export const cancelOrder = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const { id } = req.params;
    const { reason } = req.body;

    const order = await orderService.cancelOrder(id, userId, reason);

    res
      .status(200)
      .json(new ApiResponse(200, order, "Order cancelled successfully"));
  }
);

// Admin routes
export const getAllOrders = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const filters = {
      status: req.query.status as OrderStatus,
      paymentStatus: req.query.paymentStatus as PaymentStatus,
      search: req.query.search as string,
    };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await orderService.getAllOrders(filters, page, limit);

    res
      .status(200)
      .json(new ApiResponse(200, result, "Orders retrieved successfully"));
  }
);

export const updateOrderStatus = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const order = await orderService.updateOrderStatus(
      id,
      status,
      trackingNumber
    );

    res
      .status(200)
      .json(new ApiResponse(200, order, "Order status updated successfully"));
  }
);

export const updatePaymentStatus = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;
    const { paymentStatus, paymentTransactionId } = req.body;

    const order = await orderService.updatePaymentStatus(
      id,
      paymentStatus,
      paymentTransactionId
    );

    res
      .status(200)
      .json(new ApiResponse(200, order, "Payment status updated successfully"));
  }
);

export const getOrderStats = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const stats = await orderService.getOrderStats();

    res
      .status(200)
      .json(
        new ApiResponse(200, stats, "Order statistics retrieved successfully")
      );
  }
);

export const getUserOrderStats = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    const stats = await orderService.getOrderStats(userId);

    res
      .status(200)
      .json(
        new ApiResponse(200, stats, "Order statistics retrieved successfully")
      );
  }
);
