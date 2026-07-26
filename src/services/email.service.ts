import nodemailer from "nodemailer";
import { Resend } from "resend";
import config from "../config/env";
import logger from "../config/logger";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface ResolvedRecipients {
  to: string | string[];
  originalTo: string | string[];
}

interface OrderEmailData {
  orderId: string;
  customerName: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  totalAmount: number;
  shippingAddress: string;
  paymentMethod: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null;
  private resendClient: Resend | null;
  private emailProvider: "smtp" | "resend" | "disabled";

  constructor() {
    this.transporter = null;
    this.resendClient = null;
    this.emailProvider = "disabled";

    const provider = (config.emailProvider || "smtp").toLowerCase();
    const shouldUseResend =
      provider === "resend" ||
      (!!config.resendApiKey && (!config.emailUser || !config.emailPassword));

    if (shouldUseResend) {
      if (!config.resendApiKey) {
        logger.warn(
          "EMAIL_PROVIDER is resend but RESEND_API_KEY is missing - emails will be logged only",
        );
        return;
      }

      this.resendClient = new Resend(config.resendApiKey);
      this.emailProvider = "resend";
      logger.info("Email service configured with Resend");
      return;
    }

    // SMTP fallback
    if (!config.emailUser || !config.emailPassword) {
      logger.warn(
        "SMTP credentials not configured - emails will be logged only",
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.emailHost,
      port: config.emailPort,
      secure: config.emailPort === 465, // true for 465, false for other ports
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });
    this.emailProvider = "smtp";

    // Verify transporter configuration on startup (non-blocking)
    this.verifyConnection();
  }

  private resolveRecipients(to: string | string[]): ResolvedRecipients {
    if (config.emailForceTo) {
      return {
        to: config.emailForceTo,
        originalTo: to,
      };
    }

    return {
      to,
      originalTo: to,
    };
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter) {
      return;
    }
    try {
      await this.transporter.verify();
      logger.info("Email service is ready to send emails");
    } catch (error) {
      logger.error("Email service verification failed", { error });
    }
  }

  /**
   * Send email with provided options
   */
  async sendMail(options: EmailOptions): Promise<void> {
    const recipients = this.resolveRecipients(options.to);

    if (this.emailProvider === "resend" && this.resendClient) {
      try {
        const result = await this.resendClient.emails.send({
          from: `KSI Gadgets <${config.emailFrom}>`,
          to: Array.isArray(recipients.to) ? recipients.to : [recipients.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        logger.info("Email sent successfully via Resend", {
          messageId: result.data?.id,
          to: recipients.to,
          originalTo: recipients.originalTo,
          subject: options.subject,
        });
        return;
      } catch (error) {
        logger.error("Failed to send email via Resend", {
          error,
          to: recipients.to,
          originalTo: recipients.originalTo,
          subject: options.subject,
        });
        throw new Error("Failed to send email");
      }
    }

    if (this.emailProvider === "smtp" && this.transporter) {
      const mailOptions = {
        from: `KSI Gadgets <${config.emailFrom}>`,
        to: recipients.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      try {
        const info = await this.transporter.sendMail(mailOptions);
        logger.info("Email sent successfully", {
          messageId: info.messageId,
          to: recipients.to,
          originalTo: recipients.originalTo,
          subject: options.subject,
        });
        return;
      } catch (error) {
        logger.error("Failed to send email", {
          error,
          to: recipients.to,
          originalTo: recipients.originalTo,
          subject: options.subject,
        });
        throw new Error("Failed to send email");
      }
    }

    // If no provider is configured, just log the email
    if (this.emailProvider === "disabled") {
      logger.info("[DEV MODE] Email would be sent", {
        to: recipients.to,
        originalTo: recipients.originalTo,
        subject: options.subject,
        preview:
          options.text?.substring(0, 100) || options.html.substring(0, 100),
      });
      return;
    }
  }

  async sendOrderConfirmation(
    to: string,
    orderId: string,
    detailsHtml: string,
  ): Promise<void> {
    const subject = `Order Confirmation - ${orderId}`;
    const html = `<p>Thanks for your order. Order ID: ${orderId}</p>${detailsHtml}`;
    const text = `Thanks for your order. Order ID: ${orderId}`;

    await this.sendMail({ to, subject, html, text });
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = "Welcome to KSI Gadgets! 🎉";
    const html = this.getWelcomeEmailTemplate(name);
    const text = `Hi ${name},\n\nWelcome to KSI Gadgets! We're thrilled to have you as part of our community.\n\nExplore our wide range of gadgets and enjoy shopping with us!\n\nBest regards,\nThe KSI Gadgets Team`;

    await this.sendMail({ to, subject, html, text });
  }

  /**
   * Send password reset email with token
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
    const subject = "Password Reset Request - KSI Gadgets";
    const html = this.getPasswordResetEmailTemplate(name, resetUrl, resetToken);
    const text = `Hi ${name},\n\nWe received a request to reset your password for your KSI Gadgets account.\n\nClick the link below to reset your password:\n${resetUrl}\n\nOr use this reset token: ${resetToken}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe KSI Gadgets Team`;

    await this.sendMail({ to, subject, html, text });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(
    to: string,
    orderData: OrderEmailData,
  ): Promise<void> {
    const subject = `Order Confirmation #${orderData.orderId} - KSI Gadgets`;
    const html = this.getOrderConfirmationEmailTemplate(orderData);
    const text = `Hi ${orderData.customerName},\n\nThank you for your order!\n\nOrder ID: ${orderData.orderId}\nOrder Date: ${orderData.orderDate}\nTotal Amount: $${orderData.totalAmount.toFixed(2)}\n\nYour order has been received and is being processed. We'll send you another email when your order ships.\n\nBest regards,\nThe KSI Gadgets Team`;

    await this.sendMail({ to, subject, html, text });
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdateEmail(
    to: string,
    customerName: string,
    orderId: string,
    status: string,
  ): Promise<void> {
    const subject = `Order Status Update #${orderId} - KSI Gadgets`;
    const html = this.getOrderStatusUpdateEmailTemplate(
      customerName,
      orderId,
      status,
    );
    const text = `Hi ${customerName},\n\nYour order #${orderId} status has been updated to: ${status.toUpperCase()}\n\nYou can track your order status in your account dashboard.\n\nBest regards,\nThe KSI Gadgets Team`;

    await this.sendMail({ to, subject, html, text });
  }

  /**
   * Send order cancellation email
   */
  async sendOrderCancellationEmail(
    to: string,
    customerName: string,
    orderId: string,
  ): Promise<void> {
    const subject = `Order Cancelled #${orderId} - KSI Gadgets`;
    const html = this.getOrderCancellationEmailTemplate(customerName, orderId);
    const text = `Hi ${customerName},\n\nYour order #${orderId} has been cancelled as requested.\n\nIf you have any questions or concerns, please don't hesitate to contact us.\n\nBest regards,\nThe KSI Gadgets Team`;

    await this.sendMail({ to, subject, html, text });
  }

  /**
   * Send password change confirmation email
   */
  async sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    const subject = "Password Changed Successfully - KSI Gadgets";
    const html = this.getPasswordChangedEmailTemplate(name);
    const text = `Hi ${name},\n\nYour password has been changed successfully.\n\nIf you didn't make this change, please contact us immediately.\n\nBest regards,\nThe KSI Gadgets Team`;

    await this.sendMail({ to, subject, html, text });
  }

  /**
   * Notify a customer that a product they asked about is back in stock
   */
  async sendBackInStockEmail(
    to: string,
    productName: string,
    productId: string,
  ): Promise<void> {
    const productUrl = `${config.clientUrl.split(",")[0]}/product/${productId}`;
    const subject = `${productName} is back in stock! - KSI Gadgets`;
    const html = this.getBackInStockEmailTemplate(productName, productUrl);
    const text = `Good news!\n\n${productName} is back in stock.\n\nGet it before it sells out again: ${productUrl}\n\nBest regards,\nThe KSI Gadgets Team`;

    await this.sendMail({ to, subject, html, text });
  }

  /**
   * Reminder email for a cart left inactive for a while
   */
  async sendAbandonedCartEmail(
    to: string,
    name: string,
    items: Array<{ name: string; quantity: number; price: number }>,
  ): Promise<void> {
    const cartUrl = `${config.clientUrl.split(",")[0]}/cart`;
    const subject = "You left something in your cart - KSI Gadgets";
    const html = this.getAbandonedCartEmailTemplate(name, items, cartUrl);
    const itemLines = items
      .map((i) => `- ${i.name} x${i.quantity} ($${i.price.toFixed(2)})`)
      .join("\n");
    const text = `Hi ${name},\n\nYou left these items in your cart:\n\n${itemLines}\n\nComplete your purchase: ${cartUrl}\n\nBest regards,\nThe KSI Gadgets Team`;

    await this.sendMail({ to, subject, html, text });
  }

  // ================== EMAIL TEMPLATES ==================

  private getEmailLayout(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KSI Gadgets</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 30px 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #666;
      border-top: 1px solid #e9ecef;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }
    th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    .total-row {
      font-weight: 700;
      font-size: 18px;
      background-color: #f8f9fa;
    }
    .info-box {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .warning {
      color: #856404;
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎮 KSI GADGETS</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} KSI Gadgets. All rights reserved.</p>
      <p>
        <a href="${config.clientUrl}">Visit Our Store</a> | 
        <a href="${config.clientUrl}/contact">Contact Us</a> | 
        <a href="${config.clientUrl}/terms">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getWelcomeEmailTemplate(name: string): string {
    const content = `
      <h2>Welcome to KSI Gadgets, ${name}! 🎉</h2>
      <p>We're thrilled to have you join our community of gadget enthusiasts!</p>
      <p>At KSI Gadgets, you'll find the latest and greatest in tech gear, gaming accessories, and innovative gadgets.</p>
      <div class="info-box">
        <h3>Get Started:</h3>
        <ul>
          <li>Browse our extensive product catalog</li>
          <li>Add items to your cart and wishlist</li>
          <li>Enjoy secure checkout and fast shipping</li>
          <li>Track your orders in real-time</li>
        </ul>
      </div>
      <div style="text-align: center;">
        <a href="${config.clientUrl}/products" class="button">Start Shopping</a>
      </div>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Happy shopping!</p>
      <p><strong>The KSI Gadgets Team</strong></p>
    `;
    return this.getEmailLayout(content);
  }

  private getPasswordResetEmailTemplate(
    name: string,
    resetUrl: string,
    resetToken: string,
  ): string {
    const content = `
      <h2>Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password for your KSI Gadgets account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      <div class="info-box">
        <p><strong>Or copy and paste this link into your browser:</strong></p>
        <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
      </div>
      <div class="info-box">
        <p><strong>Reset Token:</strong></p>
        <p style="font-family: monospace; font-size: 16px; background: white; padding: 10px; border-radius: 4px;">${resetToken}</p>
      </div>
      <div class="warning">
        <p><strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.</p>
      </div>
      <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
      <p><strong>The KSI Gadgets Team</strong></p>
    `;
    return this.getEmailLayout(content);
  }

  private getOrderConfirmationEmailTemplate(orderData: OrderEmailData): string {
    const itemsHtml = orderData.items
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="text-align: right;">$${item.subtotal.toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const content = `
      <h2>Order Confirmation</h2>
      <p>Hi ${orderData.customerName},</p>
      <p>Thank you for your order! We've received your order and it's being processed.</p>
      <div class="info-box">
        <p><strong>Order ID:</strong> ${orderData.orderId}</p>
        <p><strong>Order Date:</strong> ${orderData.orderDate}</p>
        <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>
      </div>
      <h3>Order Details:</h3>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td colspan="3">Total Amount</td>
            <td style="text-align: right;">$${orderData.totalAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div class="info-box">
        <h3>Shipping Address:</h3>
        <p>${orderData.shippingAddress.replace(/\n/g, "<br>")}</p>
      </div>
      <p>We'll send you another email when your order ships with tracking information.</p>
      <div style="text-align: center;">
        <a href="${config.clientUrl}/orders/${orderData.orderId}" class="button">Track Order</a>
      </div>
      <p><strong>The KSI Gadgets Team</strong></p>
    `;
    return this.getEmailLayout(content);
  }

  private getOrderStatusUpdateEmailTemplate(
    customerName: string,
    orderId: string,
    status: string,
  ): string {
    const statusMessages: Record<string, { title: string; message: string }> = {
      processing: {
        title: "Order is Being Processed",
        message:
          "Your order is currently being prepared for shipment. We'll notify you once it ships!",
      },
      shipped: {
        title: "Order Has Been Shipped! 📦",
        message:
          "Great news! Your order is on its way. You should receive it soon.",
      },
      delivered: {
        title: "Order Delivered! 🎉",
        message:
          "Your order has been delivered. We hope you enjoy your new gadgets!",
      },
      cancelled: {
        title: "Order Cancelled",
        message:
          "Your order has been cancelled as requested. If this was a mistake, please contact us.",
      },
    };

    const statusInfo =
      statusMessages[status.toLowerCase()] || statusMessages.processing;

    const content = `
      <h2>${statusInfo.title}</h2>
      <p>Hi ${customerName},</p>
      <p>Your order status has been updated.</p>
      <div class="info-box">
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Status:</strong> ${status.toUpperCase()}</p>
      </div>
      <p>${statusInfo.message}</p>
      <div style="text-align: center;">
        <a href="${config.clientUrl}/orders/${orderId}" class="button">View Order Details</a>
      </div>
      <p>If you have any questions about your order, please don't hesitate to contact us.</p>
      <p><strong>The KSI Gadgets Team</strong></p>
    `;
    return this.getEmailLayout(content);
  }

  private getOrderCancellationEmailTemplate(
    customerName: string,
    orderId: string,
  ): string {
    const content = `
      <h2>Order Cancelled</h2>
      <p>Hi ${customerName},</p>
      <p>Your order has been cancelled as requested.</p>
      <div class="info-box">
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Status:</strong> CANCELLED</p>
      </div>
      <p>If you cancelled this order by mistake or have any concerns, please contact our support team immediately.</p>
      <div style="text-align: center;">
        <a href="${config.clientUrl}/products" class="button">Continue Shopping</a>
      </div>
      <p><strong>The KSI Gadgets Team</strong></p>
    `;
    return this.getEmailLayout(content);
  }

  private getPasswordChangedEmailTemplate(name: string): string {
    const content = `
      <h2>Password Changed Successfully ✓</h2>
      <p>Hi ${name},</p>
      <p>This email confirms that your password has been changed successfully.</p>
      <div class="info-box">
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <div class="warning">
        <p><strong>⚠️ Security Alert:</strong> If you didn't make this change, please contact us immediately and secure your account.</p>
      </div>
      <div style="text-align: center;">
        <a href="${config.clientUrl}/profile" class="button">View Account Settings</a>
      </div>
      <p><strong>The KSI Gadgets Team</strong></p>
    `;
    return this.getEmailLayout(content);
  }

  private getBackInStockEmailTemplate(
    productName: string,
    productUrl: string,
  ): string {
    const content = `
      <h2>Good News — It's Back! 🎉</h2>
      <p><strong>${productName}</strong> is back in stock and ready to ship.</p>
      <p>Popular items sell out fast, so grab yours before it's gone again.</p>
      <div style="text-align: center;">
        <a href="${productUrl}" class="button">Shop Now</a>
      </div>
      <p><strong>The KSI Gadgets Team</strong></p>
    `;
    return this.getEmailLayout(content);
  }

  private getAbandonedCartEmailTemplate(
    name: string,
    items: Array<{ name: string; quantity: number; price: number }>,
    cartUrl: string,
  ): string {
    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px 0;">${item.name}</td>
          <td style="padding: 8px 0; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 0; text-align: right;">$${item.price.toFixed(2)}</td>
        </tr>
      `,
      )
      .join("");

    const content = `
      <h2>You left something behind</h2>
      <p>Hi ${name},</p>
      <p>You still have items waiting in your cart. Complete your order before they sell out.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        ${itemsHtml}
      </table>
      <div style="text-align: center;">
        <a href="${cartUrl}" class="button">Complete Your Purchase</a>
      </div>
      <p><strong>The KSI Gadgets Team</strong></p>
    `;
    return this.getEmailLayout(content);
  }
}

export default new EmailService();
