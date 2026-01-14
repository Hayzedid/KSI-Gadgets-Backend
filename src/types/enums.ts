export enum UserRole {
  CUSTOMER = "customer",
  ADMIN = "admin",
}

export enum ProductCategory {
  ELECTRONICS = "electronics",
  COMPUTERS = "computers",
  SMARTPHONES = "smartphones",
  ACCESSORIES = "accessories",
  GAMING = "gaming",
  AUDIO = "audio",
  CAMERAS = "cameras",
  WEARABLES = "wearables",
}

export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  PAYPAL = "paypal",
  BANK_TRANSFER = "bank_transfer",
  CASH_ON_DELIVERY = "cash_on_delivery",
}
