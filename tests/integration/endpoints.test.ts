import request from "supertest";
import app from "../../src/app";
import {
  AppDataSource,
  connectDatabase,
  disconnectDatabase,
} from "../../src/config/database";
import { User, UserRole } from "../../src/models/user.model";
import { Product } from "../../src/models/product.model";
import { Order } from "../../src/models/order.model";
import paymentService from "../../src/services/payment.service";
import cryptoPaymentService from "../../src/services/crypto-payment.service";

jest.mock("../../src/services/email.service", () => ({
  __esModule: true,
  default: {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    sendOrderStatusUpdateEmail: jest.fn().mockResolvedValue(undefined),
    sendOrderCancellationEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

const api = request(app);

const makeEmail = (prefix: string): string =>
  `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;

describe("Endpoint integration smoke", () => {
  jest.setTimeout(180000);

  let customerToken = "";
  let adminToken = "";
  let customerRefreshToken = "";

  let customerId = "";
  let adminId = "";
  let extraUserId = "";

  let productId = "";
  let reviewId = "";
  let orderId = "";

  const paymentIntentId = "pi_mock_123";
  const chargeId = "charge_mock_456";

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await connectDatabase();
    }

    jest.spyOn(paymentService, "createPaymentIntent").mockResolvedValue({
      clientSecret: "pi_client_secret_mock",
      paymentIntentId,
    });

    jest.spyOn(paymentService, "confirmPayment").mockResolvedValue({
      success: true,
      order: { id: "mock-order" } as any,
    });

    jest.spyOn(paymentService, "getPaymentStatus").mockResolvedValue({
      status: "succeeded",
      amount: 1,
      currency: "usd",
      metadata: { mocked: true },
    });

    jest.spyOn(paymentService, "cancelPayment").mockResolvedValue(true);

    jest.spyOn(paymentService, "refundPayment").mockResolvedValue({
      success: true,
      refundId: "re_mock_123",
      amount: 1,
    });

    jest.spyOn(paymentService, "handleWebhook").mockResolvedValue({
      received: true,
    });

    jest.spyOn(cryptoPaymentService, "createCharge").mockResolvedValue({
      chargeId,
      hostedUrl: "https://example.com/charge/mock",
      addresses: { bitcoin: "bc1-test" },
      pricing: { local: { amount: "1.00", currency: "USD" } },
    });

    jest.spyOn(cryptoPaymentService, "getCharge").mockResolvedValue({
      id: chargeId,
      status: "NEW",
      hostedUrl: "https://example.com/charge/mock",
    });

    jest.spyOn(cryptoPaymentService, "getChargesForOrder").mockResolvedValue([
      {
        id: chargeId,
        status: "NEW",
      },
    ]);

    jest.spyOn(cryptoPaymentService, "cancelCharge").mockResolvedValue(true);

    jest.spyOn(cryptoPaymentService, "handleWebhook").mockResolvedValue({
      received: true,
    });

    const customerRegister = await api.post("/api/auth/register").send({
      name: "Endpoint Customer",
      email: makeEmail("customer"),
      password: "TestPass123!",
    });

    customerId = customerRegister.body?.data?.user?.id;
    customerToken = customerRegister.body?.data?.accessToken;
    customerRefreshToken = customerRegister.body?.data?.refreshToken;

    const adminRegister = await api.post("/api/auth/register").send({
      name: "Endpoint Admin",
      email: makeEmail("admin"),
      password: "TestPass123!",
    });

    adminId = adminRegister.body?.data?.user?.id;

    await AppDataSource.getRepository(User).update(
      { id: adminId },
      { role: UserRole.ADMIN },
    );

    const adminLogin = await api.post("/api/auth/login").send({
      email: adminRegister.body?.data?.user?.email,
      password: "TestPass123!",
    });

    adminToken = adminLogin.body?.data?.accessToken;

    const extraRegister = await api.post("/api/auth/register").send({
      name: "Delete Me",
      email: makeEmail("delete-me"),
      password: "TestPass123!",
    });

    extraUserId = extraRegister.body?.data?.user?.id;

    const createProductRes = await api
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Endpoint Product",
        description: "Integration test product",
        price: 99.99,
        category: "Electronics",
        brand: "KSI",
        stock: 50,
        images: ["https://example.com/image.png"],
        featured: false,
      });

    productId = createProductRes.body?.data?.id;
  });

  afterAll(async () => {
    jest.restoreAllMocks();

    if (AppDataSource.isInitialized) {
      await disconnectDatabase();
    }
  });

  test("GET /health", async () => {
    const res = await api.get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("POST /api/auth/register", async () => {
    const res = await api.post("/api/auth/register").send({
      name: "Register Route",
      email: makeEmail("register-route"),
      password: "TestPass123!",
    });

    expect(res.status).toBe(201);
    expect(res.body?.data?.accessToken).toBeTruthy();
  });

  test("POST /api/auth/login", async () => {
    const res = await api.post("/api/auth/login").send({
      email: makeEmail("unknown"),
      password: "TestPass123!",
    });

    expect(res.status).toBe(401);
  });

  test("POST /api/auth/refresh", async () => {
    const res = await api.post("/api/auth/refresh").send({
      refreshToken: customerRefreshToken,
    });

    expect(res.status).toBe(200);
    expect(res.body?.data?.accessToken).toBeTruthy();
  });

  test("POST /api/auth/request-password-reset", async () => {
    const res = await api.post("/api/auth/request-password-reset").send({
      email: makeEmail("no-user"),
    });

    expect(res.status).toBe(200);
  });

  test("POST /api/auth/verify-reset-token", async () => {
    const res = await api
      .post("/api/auth/verify-reset-token")
      .send({ token: "invalid-token" });
    expect(res.status).toBe(200);
    expect(res.body?.data?.valid).toBe(false);
  });

  test("POST /api/auth/reset-password", async () => {
    const res = await api.post("/api/auth/reset-password").send({
      token: "invalid-token",
      newPassword: "NextPass123!",
    });

    expect(res.status).toBe(400);
  });

  test("POST /api/auth/logout", async () => {
    const res = await api
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });

  test("POST /api/auth/change-password", async () => {
    const res = await api
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        oldPassword: "WrongPass123!",
        newPassword: "NextPass123!",
      });

    expect(res.status).toBe(401);
  });

  test("GET /api/products", async () => {
    const res = await api.get("/api/products?page=1&limit=10");
    expect(res.status).toBe(200);
  });

  test("GET /api/products/:id", async () => {
    const res = await api.get(`/api/products/${productId}`);
    expect(res.status).toBe(200);
  });

  test("GET /api/products/:id/reviews", async () => {
    const res = await api.get(`/api/products/${productId}/reviews`);
    expect(res.status).toBe(200);
  });

  test("POST /api/products/:id/reviews", async () => {
    const res = await api
      .post(`/api/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ rating: 5, comment: "Great product" });

    expect(res.status).toBe(201);
    reviewId = res.body?.data?.id;
  });

  test("PUT /api/products/reviews/:reviewId", async () => {
    const res = await api
      .put(`/api/products/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ rating: 4, comment: "Updated comment" });

    expect(res.status).toBe(200);
  });

  test("DELETE /api/products/reviews/:reviewId", async () => {
    const res = await api
      .delete(`/api/products/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
  });

  test("PUT /api/products/:id", async () => {
    const res = await api
      .put(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 79.99, stock: 45 });

    expect(res.status).toBe(200);
  });

  test("GET /api/cart", async () => {
    const res = await api
      .get("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });

  test("POST /api/cart/items", async () => {
    const res = await api
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(200);
  });

  test("PUT /api/cart/items/:productId", async () => {
    const res = await api
      .put(`/api/cart/items/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ quantity: 1 });

    expect(res.status).toBe(200);
  });

  test("DELETE /api/cart/items/:productId", async () => {
    const res = await api
      .delete(`/api/cart/items/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
  });

  test("DELETE /api/cart", async () => {
    const res = await api
      .delete("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });

  test("prepare cart and order", async () => {
    const addRes = await api
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 1 });

    expect(addRes.status).toBe(200);

    const orderRes = await api
      .post("/api/orders")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        shippingAddress: "123 Test Street",
        shippingCity: "Test City",
        shippingState: "TS",
        shippingZipCode: "12345",
        shippingCountry: "Testland",
        contactPhone: "+1234567890",
        notes: "Please deliver quickly",
      });

    expect(orderRes.status).toBe(201);
    orderId = orderRes.body?.data?.id;
  });

  test("GET /api/orders/my-orders", async () => {
    const res = await api
      .get("/api/orders/my-orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /api/orders/my-stats", async () => {
    const res = await api
      .get("/api/orders/my-stats")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /api/orders/:id", async () => {
    const res = await api
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /api/orders (admin)", async () => {
    const res = await api
      .get("/api/orders")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /api/orders/stats (admin)", async () => {
    const res = await api
      .get("/api/orders/stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test("PUT /api/orders/:id/status (admin)", async () => {
    const res = await api
      .put(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "processing", trackingNumber: "TRK123" });

    expect(res.status).toBe(200);
  });

  test("PUT /api/orders/:id/payment-status (admin)", async () => {
    const res = await api
      .put(`/api/orders/${orderId}/payment-status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        paymentStatus: "completed",
        paymentTransactionId: paymentIntentId,
      });

    expect(res.status).toBe(200);
  });

  test("POST /api/orders/:id/cancel", async () => {
    const res = await api
      .post(`/api/orders/${orderId}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ reason: "Changed my mind" });

    expect(res.status).toBe(200);
  });

  test("GET /api/users/profile", async () => {
    const res = await api
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });

  test("PUT /api/users/profile", async () => {
    const res = await api
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "Endpoint Customer Updated", address: "Updated Address" });

    expect(res.status).toBe(200);
  });

  test("GET /api/users (admin)", async () => {
    const res = await api
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test("GET /api/users/:userId (admin)", async () => {
    const res = await api
      .get(`/api/users/${customerId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test("PUT /api/users/:userId/deactivate (admin)", async () => {
    const res = await api
      .put(`/api/users/${extraUserId}/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test("PUT /api/users/:userId/reactivate (admin)", async () => {
    const res = await api
      .put(`/api/users/${extraUserId}/reactivate`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test("DELETE /api/users/:userId (admin)", async () => {
    const res = await api
      .delete(`/api/users/${extraUserId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test("GET /api/payments/config", async () => {
    const res = await api.get("/api/payments/config");
    expect(res.status).toBe(200);
  });

  test("POST /api/payments/create-intent", async () => {
    const res = await api
      .post("/api/payments/create-intent")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, currency: "usd" });

    expect(res.status).toBe(200);
    expect(res.body?.data?.paymentIntentId).toBe(paymentIntentId);
  });

  test("POST /api/payments/confirm", async () => {
    const res = await api
      .post("/api/payments/confirm")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ paymentIntentId });

    expect(res.status).toBe(200);
  });

  test("GET /api/payments/status/:paymentIntentId", async () => {
    const res = await api
      .get(`/api/payments/status/${paymentIntentId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
  });

  test("POST /api/payments/cancel", async () => {
    const res = await api
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ paymentIntentId });

    expect(res.status).toBe(200);
  });

  test("POST /api/payments/refund", async () => {
    const res = await api
      .post("/api/payments/refund")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentIntentId, amount: 1, reason: "requested_by_customer" });

    expect(res.status).toBe(200);
  });

  test("POST /api/payments/webhook", async () => {
    const res = await api
      .post("/api/payments/webhook")
      .set("stripe-signature", "test-signature")
      .send({ type: "payment_intent.succeeded" });

    expect(res.status).toBe(200);
    expect(res.body?.received).toBe(true);
  });

  test("POST /api/crypto-payments/create-charge", async () => {
    const res = await api
      .post("/api/crypto-payments/create-charge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, description: "Crypto checkout" });

    expect(res.status).toBe(200);
    expect(res.body?.data?.chargeId).toBe(chargeId);
  });

  test("GET /api/crypto-payments/charge/:chargeId", async () => {
    const res = await api
      .get(`/api/crypto-payments/charge/${chargeId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
  });

  test("GET /api/crypto-payments/order/:orderId/charges", async () => {
    const res = await api
      .get(`/api/crypto-payments/order/${orderId}/charges`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
  });

  test("POST /api/crypto-payments/cancel", async () => {
    const res = await api
      .post("/api/crypto-payments/cancel")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ chargeId });

    expect(res.status).toBe(200);
  });

  test("POST /api/crypto-payments/webhook", async () => {
    const res = await api
      .post("/api/crypto-payments/webhook")
      .set("x-cc-webhook-signature", "test-signature")
      .send({ type: "charge:confirmed" });

    expect(res.status).toBe(200);
    expect(res.body?.received).toBe(true);
  });

  test("DELETE /api/products/:id (admin)", async () => {
    const res = await api
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test("DELETE /api/users/account", async () => {
    const register = await api.post("/api/auth/register").send({
      name: "Self Delete",
      email: makeEmail("self-delete"),
      password: "TestPass123!",
    });

    const token = register.body?.data?.accessToken;

    const res = await api
      .delete("/api/users/account")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  test("auth guard behavior (401)", async () => {
    const res = await api.get("/api/users/profile");
    expect(res.status).toBe(401);
  });

  test("admin role guard behavior (403)", async () => {
    const res = await api
      .get("/api/users")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  test("database sanity for created entities", async () => {
    const userCount = await AppDataSource.getRepository(User).count();
    const productCount = await AppDataSource.getRepository(Product).count();
    const orderCount = await AppDataSource.getRepository(Order).count();

    expect(userCount).toBeGreaterThan(0);
    expect(productCount).toBeGreaterThanOrEqual(0);
    expect(orderCount).toBeGreaterThan(0);
  });
});
