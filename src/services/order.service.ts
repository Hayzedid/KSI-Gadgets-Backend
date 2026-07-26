import { AppDataSource } from "../config/database";
import {
  Order,
  OrderStatus,
  PaymentStatus,
  OrderItem,
} from "../models/order.model";
import { Cart } from "../models/cart.model";
import { CartItem } from "../models/cart-item.model";
import { Product } from "../models/product.model";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import emailService from "./email.service";
import couponService from "./coupon.service";
import { EntityManager } from "typeorm";

interface CreateOrderInput {
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  contactPhone: string;
  notes?: string;
  couponCode?: string;
}

interface GuestOrderItemInput {
  productId: string;
  quantity: number;
}

interface GuestCreateOrderInput extends CreateOrderInput {
  guestEmail: string;
  guestName: string;
  items: GuestOrderItemInput[];
}

export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private cartRepository = AppDataSource.getRepository(Cart);
  private cartItemRepository = AppDataSource.getRepository(CartItem);
  private productRepository = AppDataSource.getRepository(Product);
  private userRepository = AppDataSource.getRepository(User);

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORD-${timestamp}-${random}`;
  }

  private async lockAndReserveStock(
    manager: EntityManager,
    items: Array<{ productId: string; quantity: number; price: number }>,
  ): Promise<{ orderItems: OrderItem[]; subtotal: number }> {
    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    // Lock rows in a stable order to avoid deadlocks between concurrent checkouts.
    const sortedItems = [...items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    );

    for (const item of sortedItems) {
      const product = await manager
        .getRepository(Product)
        .createQueryBuilder("product")
        .setLock("pessimistic_write")
        .where("product.id = :id", { id: item.productId })
        .getOne();

      if (!product) {
        throw new ApiError(404, `Product ${item.productId} not found`);
      }

      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      const itemSubtotal = item.price * item.quantity;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: itemSubtotal,
      });

      subtotal += itemSubtotal;

      product.stock -= item.quantity;
      await manager.getRepository(Product).save(product);
    }

    return { orderItems, subtotal };
  }

  private buildEmailPayload(
    order: Order,
    customerName: string,
    orderData: CreateOrderInput,
  ) {
    return {
      orderId: order.orderNumber,
      customerName,
      orderDate: order.createdAt.toLocaleDateString(),
      items: order.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      })),
      totalAmount: order.totalAmount,
      shippingAddress: `${orderData.shippingAddress}\n${orderData.shippingCity}, ${orderData.shippingState} ${orderData.shippingZipCode}\n${orderData.shippingCountry}`,
      paymentMethod: order.paymentMethod || "Pending",
    };
  }

  async createOrder(
    userId: string,
    orderData: CreateOrderInput,
  ): Promise<Order> {
    const savedOrder = await AppDataSource.transaction(async (manager) => {
      const cart = await manager.getRepository(Cart).findOne({
        where: { userId },
        relations: ["items"],
      });

      if (!cart || cart.items.length === 0) {
        throw new ApiError(400, "Cart is empty");
      }

      const { orderItems, subtotal } = await this.lockAndReserveStock(
        manager,
        cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: Number(i.price),
        })),
      );

      const order = await this.finalizeOrder(
        manager,
        userId,
        orderItems,
        subtotal,
        orderData,
      );

      await manager.getRepository(CartItem).delete({ cartId: cart.id });
      await manager
        .getRepository(Cart)
        .update({ id: cart.id }, { totalAmount: 0 });

      return order;
    });

    await this.sendConfirmationEmail(userId, savedOrder, orderData);

    return savedOrder;
  }

  async createGuestOrder(orderData: GuestCreateOrderInput): Promise<Order> {
    if (!orderData.items || orderData.items.length === 0) {
      throw new ApiError(400, "No items provided for guest order");
    }

    const savedOrder = await AppDataSource.transaction(async (manager) => {
      const productIds = orderData.items.map((i) => i.productId);
      const products = await manager.getRepository(Product).find({
        where: productIds.map((id) => ({ id })),
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const itemsWithPrice = orderData.items.map((i) => {
        const product = productMap.get(i.productId);
        if (!product) {
          throw new ApiError(404, `Product ${i.productId} not found`);
        }
        return {
          productId: i.productId,
          quantity: i.quantity,
          price: Number(product.price),
        };
      });

      const { orderItems, subtotal } = await this.lockAndReserveStock(
        manager,
        itemsWithPrice,
      );

      return this.finalizeOrder(
        manager,
        null,
        orderItems,
        subtotal,
        orderData,
        orderData.guestEmail,
        orderData.guestName,
      );
    });

    try {
      const emailPayload = this.buildEmailPayload(
        savedOrder,
        orderData.guestName,
        orderData,
      );
      await emailService
        .sendOrderConfirmationEmail(orderData.guestEmail, emailPayload)
        .catch(() => {});
    } catch (e) {
      // swallow email errors
    }

    return savedOrder;
  }

  private async finalizeOrder(
    manager: EntityManager,
    userId: string | null,
    orderItems: OrderItem[],
    subtotal: number,
    orderData: CreateOrderInput,
    guestEmail?: string,
    guestName?: string,
  ): Promise<Order> {
    let discountAmount = 0;
    let couponCode: string | null = null;

    if (orderData.couponCode) {
      const { coupon, discountAmount: discount } =
        await couponService.validateCoupon(
          orderData.couponCode,
          subtotal,
          manager,
        );
      discountAmount = discount;
      couponCode = coupon.code;
      await couponService.incrementUsage(coupon.id, manager);
    }

    const discountedSubtotal = subtotal - discountAmount;
    const shippingCost = discountedSubtotal > 100 ? 0 : 10; // Free shipping over $100
    const tax = discountedSubtotal * 0.1; // 10% tax
    const totalAmount = discountedSubtotal + shippingCost + tax;

    const orderRepo = manager.getRepository(Order);
    const order = orderRepo.create({
      userId: userId ?? undefined,
      orderNumber: this.generateOrderNumber(),
      items: orderItems,
      subtotal,
      shippingCost,
      tax,
      discountAmount,
      couponCode,
      totalAmount,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      shippingAddress: orderData.shippingAddress,
      shippingCity: orderData.shippingCity,
      shippingState: orderData.shippingState,
      shippingZipCode: orderData.shippingZipCode,
      shippingCountry: orderData.shippingCountry,
      contactPhone: orderData.contactPhone,
      notes: orderData.notes,
      customerEmail: guestEmail,
      customerName: guestName,
    } as Partial<Order>);

    return orderRepo.save(order);
  }

  private async sendConfirmationEmail(
    userId: string,
    savedOrder: Order,
    orderData: CreateOrderInput,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        const orderEmailData = this.buildEmailPayload(
          savedOrder,
          user.name,
          orderData,
        );

        await emailService
          .sendOrderConfirmationEmail(user.email, orderEmailData)
          .catch(() => {});
      }
    } catch (e) {
      // swallow email errors
    }
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

  async trackGuestOrder(orderNumber: string, email: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber: orderNumber.trim() },
    });

    if (
      !order ||
      (order.customerEmail || "").toLowerCase() !== email.trim().toLowerCase()
    ) {
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
        { search: `%${search}%` },
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
    trackingNumber?: string,
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

    const updatedOrder = await this.orderRepository.save(order);

    // Send order status update email (fire-and-forget)
    try {
      const user = order.userId
        ? await this.userRepository.findOne({ where: { id: order.userId } })
        : null;
      const recipientEmail = user?.email || order.customerEmail;
      const recipientName = user?.name || order.customerName || "Customer";

      if (recipientEmail) {
        await emailService
          .sendOrderStatusUpdateEmail(
            recipientEmail,
            recipientName,
            order.orderNumber,
            status,
          )
          .catch(() => {});
      }
    } catch (e) {
      // swallow email errors
    }

    return updatedOrder;
  }

  async cancelOrder(
    orderId: string,
    userId: string,
    reason: string,
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

    const cancelledOrder = await AppDataSource.transaction(async (manager) => {
      // Restore product stock, locking rows to stay consistent with checkout locking
      const sortedItems = [...order.items].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );

      for (const item of sortedItems) {
        const product = await manager
          .getRepository(Product)
          .createQueryBuilder("product")
          .setLock("pessimistic_write")
          .where("product.id = :id", { id: item.productId })
          .getOne();

        if (product) {
          product.stock += item.quantity;
          await manager.getRepository(Product).save(product);
        }
      }

      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.cancellationReason = reason;

      return manager.getRepository(Order).save(order);
    });

    // Send order cancellation email (fire-and-forget)
    try {
      const user = order.userId
        ? await this.userRepository.findOne({ where: { id: order.userId } })
        : null;
      const recipientEmail = user?.email || order.customerEmail;
      const recipientName = user?.name || order.customerName || "Customer";

      if (recipientEmail) {
        await emailService
          .sendOrderCancellationEmail(
            recipientEmail,
            recipientName,
            order.orderNumber,
          )
          .catch(() => {});
      }
    } catch (e) {
      // swallow email errors
    }

    return cancelledOrder;
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentTransactionId?: string,
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

  async getSalesAnalytics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const revenueByDay = await this.orderRepository
      .createQueryBuilder("order")
      .select("DATE(order.createdAt)", "date")
      .addSelect("SUM(order.totalAmount)", "revenue")
      .addSelect("COUNT(*)", "orders")
      .where("order.createdAt >= :since", { since })
      .andWhere("order.status != :cancelled", {
        cancelled: OrderStatus.CANCELLED,
      })
      .groupBy("DATE(order.createdAt)")
      .orderBy("DATE(order.createdAt)", "ASC")
      .getRawMany();

    const orders = await this.orderRepository
      .createQueryBuilder("order")
      .where("order.createdAt >= :since", { since })
      .andWhere("order.status != :cancelled", {
        cancelled: OrderStatus.CANCELLED,
      })
      .getMany();

    const productTotals = new Map<
      string,
      { productName: string; quantity: number; revenue: number }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const existing = productTotals.get(item.productId) || {
          productName: item.productName,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.subtotal;
        productTotals.set(item.productId, existing);
      }
    }

    const topProducts = [...productTotals.entries()]
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      revenueByDay: revenueByDay.map((row) => ({
        date: row.date,
        revenue: Number(row.revenue) || 0,
        orders: Number(row.orders) || 0,
      })),
      topProducts,
    };
  }
}
