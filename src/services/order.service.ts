import { AppDataSource } from "../config/database";
import {
  Order,
  OrderStatus,
  PaymentStatus,
  OrderItem,
} from "../models/order.model";
import { Cart } from "../models/cart.model";
import { Product } from "../models/product.model";
import { ApiError } from "../utils/ApiError";

interface CreateOrderInput {
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  contactPhone: string;
  notes?: string;
}

export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private cartRepository = AppDataSource.getRepository(Cart);
  private productRepository = AppDataSource.getRepository(Product);

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORD-${timestamp}-${random}`;
  }

  async createOrder(
    userId: string,
    orderData: CreateOrderInput
  ): Promise<Order> {
    // Get user's cart
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items", "items.product"],
    });

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, "Cart is empty");
    }

    // Validate stock availability and prepare order items
    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      const product = await this.productRepository.findOne({
        where: { id: cartItem.productId },
      });

      if (!product) {
        throw new ApiError(404, `Product ${cartItem.productId} not found`);
      }

      if (product.stock < cartItem.quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      const itemSubtotal = Number(cartItem.price) * cartItem.quantity;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: cartItem.quantity,
        price: Number(cartItem.price),
        subtotal: itemSubtotal,
      });

      subtotal += itemSubtotal;

      // Reduce stock
      product.stock -= cartItem.quantity;
      await this.productRepository.save(product);
    }

    // Calculate totals (you can customize shipping and tax calculation)
    const shippingCost = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const tax = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + shippingCost + tax;

    // Create order
    const order = this.orderRepository.create({
      userId,
      orderNumber: this.generateOrderNumber(),
      items: orderItems,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      ...orderData,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Clear cart
    await this.cartRepository.update({ userId }, { items: [], totalAmount: 0 });

    return savedOrder;
  }

  async getOrderById(orderId: string, userId?: string): Promise<Order> {
    const where: any = { id: orderId };
    if (userId) {
      where.userId = userId;
    }

    const order = await this.orderRepository.findOne({
      where,
      relations: ["user"],
    });

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    return order;
  }

  async getUserOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip,
      take: limit,
      relations: ["user"],
    });

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAllOrders(filters: any = {}, page = 1, limit = 10) {
    const { status, paymentStatus, search } = filters;
    const skip = (page - 1) * limit;

    const queryBuilder = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.user", "user");

    if (status) {
      queryBuilder.andWhere("order.status = :status", { status });
    }

    if (paymentStatus) {
      queryBuilder.andWhere("order.paymentStatus = :paymentStatus", {
        paymentStatus,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        "(order.orderNumber LIKE :search OR user.name LIKE :search OR user.email LIKE :search)",
        { search: `%${search}%` }
      );
    }

    queryBuilder.orderBy("order.createdAt", "DESC").skip(skip).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    trackingNumber?: string
  ): Promise<Order> {
    const order = await this.getOrderById(orderId);

    if (order.status === OrderStatus.CANCELLED) {
      throw new ApiError(400, "Cannot update cancelled order");
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new ApiError(400, "Order already delivered");
    }

    order.status = status;

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    return await this.orderRepository.save(order);
  }

  async cancelOrder(
    orderId: string,
    userId: string,
    reason: string
  ): Promise<Order> {
    const order = await this.getOrderById(orderId, userId);

    if (order.status === OrderStatus.CANCELLED) {
      throw new ApiError(400, "Order is already cancelled");
    }

    if (
      order.status === OrderStatus.SHIPPED ||
      order.status === OrderStatus.DELIVERED
    ) {
      throw new ApiError(400, "Cannot cancel shipped or delivered order");
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });

      if (product) {
        product.stock += item.quantity;
        await this.productRepository.save(product);
      }
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = reason;

    return await this.orderRepository.save(order);
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentTransactionId?: string
  ): Promise<Order> {
    const order = await this.getOrderById(orderId);

    order.paymentStatus = paymentStatus;

    if (paymentTransactionId) {
      order.paymentTransactionId = paymentTransactionId;
    }

    if (
      paymentStatus === PaymentStatus.COMPLETED &&
      order.status === OrderStatus.PENDING
    ) {
      order.status = OrderStatus.PROCESSING;
    }

    return await this.orderRepository.save(order);
  }

  async getOrderStats(userId?: string) {
    const queryBuilder = this.orderRepository.createQueryBuilder("order");

    if (userId) {
      queryBuilder.where("order.userId = :userId", { userId });
    }

    const [total, pending, processing, shipped, delivered, cancelled] =
      await Promise.all([
        queryBuilder.getCount(),
        queryBuilder
          .clone()
          .where("order.status = :status", { status: OrderStatus.PENDING })
          .getCount(),
        queryBuilder
          .clone()
          .where("order.status = :status", { status: OrderStatus.PROCESSING })
          .getCount(),
        queryBuilder
          .clone()
          .where("order.status = :status", { status: OrderStatus.SHIPPED })
          .getCount(),
        queryBuilder
          .clone()
          .where("order.status = :status", { status: OrderStatus.DELIVERED })
          .getCount(),
        queryBuilder
          .clone()
          .where("order.status = :status", { status: OrderStatus.CANCELLED })
          .getCount(),
      ]);

    const totalRevenue = await queryBuilder
      .clone()
      .select("SUM(order.totalAmount)", "total")
      .where("order.status != :status", { status: OrderStatus.CANCELLED })
      .getRawOne();

    return {
      total,
      pending,
      processing,
      shipped,
      delivered,
      cancelled,
      totalRevenue: totalRevenue?.total || 0,
    };
  }
}
