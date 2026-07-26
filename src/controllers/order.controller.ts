import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import { OrderService } from "../services/order.service";
import invoiceService from "../services/invoice.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { OrderStatus, PaymentStatus } from "../models/order.model";

const orderService = new OrderService();

export const createOrder = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (userId) {
      const order = await orderService.createOrder(userId, req.body);
      res
        .status(201)
        .json(new ApiResponse(201, order, "Order created successfully"));
      return;
    }

    // No authenticated user — treat as a guest checkout.
    const { guestEmail, guestName, items } = req.body;
    if (!guestEmail || !guestName || !Array.isArray(items)) {
      throw new ApiError(
        400,
        "guestEmail, guestName, and items are required for guest checkout",
      );
    }

    const order = await orderService.createGuestOrder(req.body);
    res
      .status(201)
      .json(new ApiResponse(201, order, "Order created successfully"));
  }
);

export const trackGuestOrder = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const { orderNumber, email } = req.query as {
      orderNumber: string;
      email: string;
    };

    const order = await orderService.trackGuestOrder(orderNumber, email);

    res
      .status(200)
      .json(new ApiResponse(200, order, "Order retrieved successfully"));
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

export const downloadInvoice = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    const order = await orderService.getOrderById(id, userId);
    const customerName = order.user?.name || order.customerName || "Customer";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${order.orderNumber}.pdf"`,
    );

    const doc = invoiceService.generateInvoicePdf(order, customerName);
    doc.pipe(res);
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

export const getSalesAnalytics = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const analytics = await orderService.getSalesAnalytics(days);

    res
      .status(200)
      .json(
        new ApiResponse(200, analytics, "Sales analytics retrieved successfully"),
      );
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
