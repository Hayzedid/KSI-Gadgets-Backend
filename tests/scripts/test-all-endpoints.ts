import assert from "node:assert/strict";
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
import emailService from "../../src/services/email.service";

const api = request(app);

const makeEmail = (prefix: string): string =>
  `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;

function logStep(step: string): void {
  process.stdout.write(`${step}... `);
}

function logPass(): void {
  console.log("ok");
}

function logFail(error: unknown): void {
  console.log("failed");
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
    return;
  }

  console.error(error);
}

function expectStatus(step: string, status: number, expected: number): void {
  assert.equal(
    status,
    expected,
    `${step} expected ${expected}, received ${status}`,
  );
}

async function main(): Promise<void> {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

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

  try {
    if (!AppDataSource.isInitialized) {
      await connectDatabase();
    }

    (paymentService as any).createPaymentIntent = async () => ({
      clientSecret: "pi_client_secret_mock",
      paymentIntentId,
    });
    (paymentService as any).confirmPayment = async () => ({
      success: true,
      order: { id: "mock-order" },
    });
    (paymentService as any).getPaymentStatus = async () => ({
      status: "succeeded",
      amount: 1,
      currency: "usd",
      metadata: { mocked: true },
    });
    (paymentService as any).cancelPayment = async () => true;
    (paymentService as any).refundPayment = async () => ({
      success: true,
      refundId: "re_mock_123",
      amount: 1,
    });
    (paymentService as any).handleWebhook = async () => ({
      received: true,
    });

    (cryptoPaymentService as any).createCharge = async () => ({
      chargeId,
      hostedUrl: "https://example.com/charge/mock",
      addresses: { bitcoin: "bc1-test" },
      pricing: { local: { amount: "1.00", currency: "USD" } },
    });
    (cryptoPaymentService as any).getCharge = async () => ({
      id: chargeId,
      status: "NEW",
      hostedUrl: "https://example.com/charge/mock",
    });
    (cryptoPaymentService as any).getChargesForOrder = async () => [
      {
        id: chargeId,
        status: "NEW",
      },
    ];
    (cryptoPaymentService as any).cancelCharge = async () => true;
    (cryptoPaymentService as any).handleWebhook = async () => ({
      received: true,
    });

    (emailService as any).sendWelcomeEmail = async () => undefined;
    (emailService as any).sendPasswordResetEmail = async () => undefined;
    (emailService as any).sendPasswordChangedEmail = async () => undefined;
    (emailService as any).sendOrderConfirmationEmail = async () => undefined;
    (emailService as any).sendOrderStatusUpdateEmail = async () => undefined;
    (emailService as any).sendOrderCancellationEmail = async () => undefined;

    logStep("GET /health");
    let response = await api.get("/health");
    expectStatus("GET /health", response.status, 200);
    assert.equal(response.body.status, "OK");
    logPass();

    logStep("POST /api/auth/register (customer)");
    response = await api.post("/api/auth/register").send({
      name: "Endpoint Customer",
      email: makeEmail("customer"),
      password: "TestPass123!",
    });
    expectStatus("POST /api/auth/register (customer)", response.status, 201);
    customerId = response.body?.data?.user?.id ?? "";
    customerToken = response.body?.data?.accessToken ?? "";
    customerRefreshToken = response.body?.data?.refreshToken ?? "";
    assert.ok(customerId);
    assert.ok(customerToken);
    assert.ok(customerRefreshToken);
    logPass();

    logStep("POST /api/auth/register (admin)");
    response = await api.post("/api/auth/register").send({
      name: "Endpoint Admin",
      email: makeEmail("admin"),
      password: "TestPass123!",
    });
    expectStatus("POST /api/auth/register (admin)", response.status, 201);
    adminId = response.body?.data?.user?.id ?? "";
    assert.ok(adminId);
    logPass();

    await AppDataSource.getRepository(User).update(
      { id: adminId },
      { role: UserRole.ADMIN },
    );

    logStep("POST /api/auth/login");
    response = await api.post("/api/auth/login").send({
      email: response.body?.data?.user?.email ?? "",
      password: "TestPass123!",
    });
    expectStatus("POST /api/auth/login", response.status, 200);
    adminToken = response.body?.data?.accessToken ?? "";
    assert.ok(adminToken);
    logPass();

    logStep("POST /api/auth/register (deletable user)");
    response = await api.post("/api/auth/register").send({
      name: "Delete Me",
      email: makeEmail("delete-me"),
      password: "TestPass123!",
    });
    expectStatus(
      "POST /api/auth/register (deletable user)",
      response.status,
      201,
    );
    extraUserId = response.body?.data?.user?.id ?? "";
    assert.ok(extraUserId);
    logPass();

    logStep("POST /api/products");
    response = await api
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
    expectStatus("POST /api/products", response.status, 201);
    productId = response.body?.data?.id ?? "";
    assert.ok(productId);
    logPass();

    logStep("POST /api/auth/refresh");
    response = await api.post("/api/auth/refresh").send({
      refreshToken: customerRefreshToken,
    });
    expectStatus("POST /api/auth/refresh", response.status, 200);
    assert.ok(response.body?.data?.accessToken);
    logPass();

    logStep("POST /api/auth/request-password-reset");
    response = await api.post("/api/auth/request-password-reset").send({
      email: makeEmail("no-user"),
    });
    expectStatus("POST /api/auth/request-password-reset", response.status, 200);
    logPass();

    logStep("POST /api/auth/verify-reset-token");
    response = await api
      .post("/api/auth/verify-reset-token")
      .send({ token: "invalid-token" });
    expectStatus("POST /api/auth/verify-reset-token", response.status, 200);
    assert.equal(response.body?.data?.valid, false);
    logPass();

    logStep("POST /api/auth/reset-password");
    response = await api.post("/api/auth/reset-password").send({
      token: "invalid-token",
      newPassword: "NextPass123!",
    });
    expectStatus("POST /api/auth/reset-password", response.status, 400);
    logPass();

    logStep("POST /api/auth/logout");
    response = await api
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus("POST /api/auth/logout", response.status, 200);
    logPass();

    logStep("POST /api/auth/change-password");
    response = await api
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        oldPassword: "WrongPass123!",
        newPassword: "NextPass123!",
      });
    expectStatus("POST /api/auth/change-password", response.status, 401);
    logPass();

    logStep("GET /api/products");
    response = await api.get("/api/products?page=1&limit=10");
    expectStatus("GET /api/products", response.status, 200);
    logPass();

    logStep("GET /api/products/:id");
    response = await api.get(`/api/products/${productId}`);
    expectStatus("GET /api/products/:id", response.status, 200);
    logPass();

    logStep("GET /api/products/:id/reviews");
    response = await api.get(`/api/products/${productId}/reviews`);
    expectStatus("GET /api/products/:id/reviews", response.status, 200);
    logPass();

    logStep("POST /api/products/:id/reviews");
    response = await api
      .post(`/api/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ rating: 5, comment: "Great product" });
    expectStatus("POST /api/products/:id/reviews", response.status, 201);
    reviewId = response.body?.data?.id ?? "";
    assert.ok(reviewId);
    logPass();

    logStep("PUT /api/products/reviews/:reviewId");
    response = await api
      .put(`/api/products/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ rating: 4, comment: "Updated comment" });
    expectStatus("PUT /api/products/reviews/:reviewId", response.status, 200);
    logPass();

    logStep("DELETE /api/products/reviews/:reviewId");
    response = await api
      .delete(`/api/products/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus(
      "DELETE /api/products/reviews/:reviewId",
      response.status,
      200,
    );
    logPass();

    logStep("PUT /api/products/:id");
    response = await api
      .put(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 79.99, stock: 45 });
    expectStatus("PUT /api/products/:id", response.status, 200);
    logPass();

    logStep("GET /api/cart");
    response = await api
      .get("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus("GET /api/cart", response.status, 200);
    logPass();

    logStep("POST /api/cart/items");
    response = await api
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 2 });
    expectStatus("POST /api/cart/items", response.status, 200);
    logPass();

    logStep("PUT /api/cart/items/:productId");
    response = await api
      .put(`/api/cart/items/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ quantity: 1 });
    expectStatus("PUT /api/cart/items/:productId", response.status, 200);
    logPass();

    logStep("DELETE /api/cart/items/:productId");
    response = await api
      .delete(`/api/cart/items/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus("DELETE /api/cart/items/:productId", response.status, 200);
    logPass();

    logStep("DELETE /api/cart");
    response = await api
      .delete("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus("DELETE /api/cart", response.status, 200);
    logPass();

    logStep("POST /api/cart/items (prepare order)");
    response = await api
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 1 });
    expectStatus("POST /api/cart/items (prepare order)", response.status, 200);
    logPass();

    logStep("POST /api/orders");
    response = await api
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
    expectStatus("POST /api/orders", response.status, 201);
    orderId = response.body?.data?.id ?? "";
    assert.ok(orderId);
    logPass();

    logStep("GET /api/orders/my-orders");
    response = await api
      .get("/api/orders/my-orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus("GET /api/orders/my-orders", response.status, 200);
    logPass();

    logStep("GET /api/orders/my-stats");
    response = await api
      .get("/api/orders/my-stats")
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus("GET /api/orders/my-stats", response.status, 200);
    logPass();

    logStep("GET /api/orders/:id");
    response = await api
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus("GET /api/orders/:id", response.status, 200);
    logPass();

    logStep("GET /api/orders (admin)");
    response = await api
      .get("/api/orders")
      .set("Authorization", `Bearer ${adminToken}`);
    expectStatus("GET /api/orders (admin)", response.status, 200);
    logPass();

    logStep("GET /api/orders/stats (admin)");
    response = await api
      .get("/api/orders/stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expectStatus("GET /api/orders/stats (admin)", response.status, 200);
    logPass();

    logStep("PUT /api/orders/:id/status (admin)");
    response = await api
      .put(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "processing", trackingNumber: "TRK123" });
    expectStatus("PUT /api/orders/:id/status (admin)", response.status, 200);
    logPass();

    logStep("PUT /api/orders/:id/payment-status (admin)");
    response = await api
      .put(`/api/orders/${orderId}/payment-status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        paymentStatus: "completed",
        paymentTransactionId: paymentIntentId,
      });
    expectStatus(
      "PUT /api/orders/:id/payment-status (admin)",
      response.status,
      200,
    );
    logPass();

    logStep("POST /api/orders/:id/cancel");
    response = await api
      .post(`/api/orders/${orderId}/cancel`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ reason: "Changed my mind" });
    expectStatus("POST /api/orders/:id/cancel", response.status, 200);
    logPass();

    logStep("GET /api/users/profile");
    response = await api
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus("GET /api/users/profile", response.status, 200);
    logPass();

    logStep("PUT /api/users/profile");
    response = await api
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "Endpoint Customer Updated", address: "Updated Address" });
    expectStatus("PUT /api/users/profile", response.status, 200);
    logPass();

    logStep("GET /api/users (admin)");
    response = await api
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expectStatus("GET /api/users (admin)", response.status, 200);
    logPass();

    logStep("GET /api/users/:userId (admin)");
    response = await api
      .get(`/api/users/${customerId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expectStatus("GET /api/users/:userId (admin)", response.status, 200);
    logPass();

    logStep("PUT /api/users/:userId/deactivate (admin)");
    response = await api
      .put(`/api/users/${extraUserId}/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`);
    expectStatus(
      "PUT /api/users/:userId/deactivate (admin)",
      response.status,
      200,
    );
    logPass();

    logStep("PUT /api/users/:userId/reactivate (admin)");
    response = await api
      .put(`/api/users/${extraUserId}/reactivate`)
      .set("Authorization", `Bearer ${adminToken}`);
    expectStatus(
      "PUT /api/users/:userId/reactivate (admin)",
      response.status,
      200,
    );
    logPass();

    logStep("DELETE /api/users/:userId (admin)");
    response = await api
      .delete(`/api/users/${extraUserId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expectStatus("DELETE /api/users/:userId (admin)", response.status, 200);
    logPass();

    logStep("GET /api/payments/config");
    response = await api.get("/api/payments/config");
    expectStatus("GET /api/payments/config", response.status, 200);
    logPass();

    logStep("POST /api/payments/create-intent");
    response = await api
      .post("/api/payments/create-intent")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, currency: "usd" });
    expectStatus("POST /api/payments/create-intent", response.status, 200);
    assert.equal(response.body?.data?.paymentIntentId, paymentIntentId);
    logPass();

    logStep("POST /api/payments/confirm");
    response = await api
      .post("/api/payments/confirm")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ paymentIntentId });
    expectStatus("POST /api/payments/confirm", response.status, 200);
    logPass();

    logStep("GET /api/payments/status/:paymentIntentId");
    response = await api
      .get(`/api/payments/status/${paymentIntentId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus(
      "GET /api/payments/status/:paymentIntentId",
      response.status,
      200,
    );
    logPass();

    logStep("POST /api/payments/cancel");
    response = await api
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ paymentIntentId });
    expectStatus("POST /api/payments/cancel", response.status, 200);
    logPass();

    logStep("POST /api/payments/refund");
    response = await api
      .post("/api/payments/refund")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentIntentId, amount: 1, reason: "requested_by_customer" });
    expectStatus("POST /api/payments/refund", response.status, 200);
    logPass();

    logStep("POST /api/payments/webhook");
    response = await api
      .post("/api/payments/webhook")
      .set("stripe-signature", "test-signature")
      .send({ type: "payment_intent.succeeded" });
    expectStatus("POST /api/payments/webhook", response.status, 200);
    assert.equal(response.body?.received, true);
    logPass();

    logStep("POST /api/crypto-payments/create-charge");
    response = await api
      .post("/api/crypto-payments/create-charge")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, description: "Crypto checkout" });
    expectStatus(
      "POST /api/crypto-payments/create-charge",
      response.status,
      200,
    );
    assert.equal(response.body?.data?.chargeId, chargeId);
    logPass();

    logStep("GET /api/crypto-payments/charge/:chargeId");
    response = await api
      .get(`/api/crypto-payments/charge/${chargeId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus(
      "GET /api/crypto-payments/charge/:chargeId",
      response.status,
      200,
    );
    logPass();

    logStep("GET /api/crypto-payments/order/:orderId/charges");
    response = await api
      .get(`/api/crypto-payments/order/${orderId}/charges`)
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus(
      "GET /api/crypto-payments/order/:orderId/charges",
      response.status,
      200,
    );
    logPass();

    logStep("POST /api/crypto-payments/cancel");
    response = await api
      .post("/api/crypto-payments/cancel")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ chargeId });
    expectStatus("POST /api/crypto-payments/cancel", response.status, 200);
    logPass();

    logStep("POST /api/crypto-payments/webhook");
    response = await api
      .post("/api/crypto-payments/webhook")
      .set("x-cc-webhook-signature", "test-signature")
      .send({ type: "charge:confirmed" });
    expectStatus("POST /api/crypto-payments/webhook", response.status, 200);
    assert.equal(response.body?.received, true);
    logPass();

    logStep("DELETE /api/products/:id (admin)");
    response = await api
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expectStatus("DELETE /api/products/:id (admin)", response.status, 200);
    logPass();

    logStep("DELETE /api/users/account");
    const selfDelete = await api.post("/api/auth/register").send({
      name: "Self Delete",
      email: makeEmail("self-delete"),
      password: "TestPass123!",
    });
    expectStatus(
      "POST /api/auth/register (self delete)",
      selfDelete.status,
      201,
    );
    const selfDeleteToken = selfDelete.body?.data?.accessToken ?? "";
    assert.ok(selfDeleteToken);

    response = await api
      .delete("/api/users/account")
      .set("Authorization", `Bearer ${selfDeleteToken}`);
    expectStatus("DELETE /api/users/account", response.status, 200);
    logPass();

    logStep("GET /api/users/profile without token");
    response = await api.get("/api/users/profile");
    expectStatus("GET /api/users/profile without token", response.status, 401);
    logPass();

    logStep("GET /api/users as customer");
    response = await api
      .get("/api/users")
      .set("Authorization", `Bearer ${customerToken}`);
    expectStatus("GET /api/users as customer", response.status, 403);
    logPass();

    logStep("Database sanity check");
    const userCount = await AppDataSource.getRepository(User).count();
    const productCount = await AppDataSource.getRepository(Product).count();
    const orderCount = await AppDataSource.getRepository(Order).count();

    assert.ok(userCount > 0);
    assert.ok(productCount >= 0);
    assert.ok(orderCount > 0);
    logPass();

    console.log("All endpoint checks passed.");
  } catch (error) {
    logFail(error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await disconnectDatabase();
    }

    process.env.NODE_ENV = originalNodeEnv;
  }
}

void main();
