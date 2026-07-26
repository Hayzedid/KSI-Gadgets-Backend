import PDFDocument from "pdfkit";
import { Order } from "../models/order.model";

export class InvoiceService {
  generateInvoicePdf(order: Order, customerName: string): PDFKit.PDFDocument {
    const doc = new PDFDocument({ margin: 50 });

    doc.fontSize(20).text("KSI Gadgets", { align: "left" });
    doc.fontSize(10).text("Invoice", { align: "left" });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice #: ${order.orderNumber}`);
    doc.text(`Date: ${order.createdAt.toLocaleDateString()}`);
    doc.text(`Customer: ${customerName}`);
    doc.text(
      `Shipping Address: ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingState} ${order.shippingZipCode}, ${order.shippingCountry}`,
    );
    doc.moveDown();

    doc.fontSize(12).text("Items", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.fontSize(10);
    doc.text("Item", 50, tableTop);
    doc.text("Qty", 300, tableTop);
    doc.text("Price", 370, tableTop);
    doc.text("Subtotal", 450, tableTop);
    doc.moveDown();

    for (const item of order.items) {
      const y = doc.y;
      doc.text(item.productName, 50, y, { width: 240 });
      doc.text(String(item.quantity), 300, y);
      doc.text(`$${item.price.toFixed(2)}`, 370, y);
      doc.text(`$${item.subtotal.toFixed(2)}`, 450, y);
      doc.moveDown();
    }

    doc.moveDown();
    doc.text(`Subtotal: $${Number(order.subtotal).toFixed(2)}`, {
      align: "right",
    });
    if (Number(order.discountAmount) > 0) {
      doc.text(
        `Discount${order.couponCode ? ` (${order.couponCode})` : ""}: -$${Number(order.discountAmount).toFixed(2)}`,
        { align: "right" },
      );
    }
    doc.text(`Shipping: $${Number(order.shippingCost).toFixed(2)}`, {
      align: "right",
    });
    doc.text(`Tax: $${Number(order.tax).toFixed(2)}`, { align: "right" });
    doc
      .fontSize(12)
      .text(`Total: $${Number(order.totalAmount).toFixed(2)}`, {
        align: "right",
      });

    doc.moveDown(2);
    doc
      .fontSize(9)
      .text("Thank you for shopping with KSI Gadgets.", { align: "center" });

    doc.end();
    return doc;
  }
}

export default new InvoiceService();
