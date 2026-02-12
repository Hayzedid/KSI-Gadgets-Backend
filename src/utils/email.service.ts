import nodemailer from "nodemailer";
import config from "../config/env";
import logger from "../config/logger";

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.emailHost,
      port: config.emailPort,
      secure: config.emailPort === 465, // true for 465, false for other ports
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string, text?: string) {
    const mailOptions = {
      from: config.emailFrom,
      to,
      subject,
      text: text || undefined,
      html,
    } as any;

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId} to ${to}`);
      return info;
    } catch (err) {
      logger.error('Failed to send email', { error: err, to, subject });
      throw err;
    }
  }

  // Simple templated emails
  async sendWelcomeEmail(to: string, name?: string) {
    const subject = 'Welcome to KSI Gadgets';
    const html = `<p>Hi ${name || 'Customer'},</p><p>Welcome to KSI Gadgets — thanks for signing up.</p>`;
    return this.sendMail(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    const subject = 'Password Reset Request';
    const html = `<p>We received a request to reset your password.</p><p>Click here to reset: <a href="${resetUrl}">${resetUrl}</a></p>`;
    return this.sendMail(to, subject, html);
  }

  async sendOrderConfirmation(to: string, orderId: string, detailsHtml: string) {
    const subject = `Order Confirmation - ${orderId}`;
    const html = `<p>Thanks for your order. Order ID: ${orderId}</p>${detailsHtml}`;
    return this.sendMail(to, subject, html);
  }
}

export default new EmailService();
