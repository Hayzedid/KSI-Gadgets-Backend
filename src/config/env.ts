import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

interface Config {
  env: string;
  port: number;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  jwtSecret: string;
  jwtAccessExpiration: string;
  jwtRefreshExpiration: string;
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPassword: string;
  emailFrom: string;
  clientUrl: string;
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
  coinbaseApiKey: string;
  coinbaseWebhookSecret: string;
  paystackSecretKey: string;
  paystackPublicKey: string;
  paystackWebhookSecret: string;
}

const config: Config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: parseInt(process.env.DB_PORT || "5432", 10),
  dbName: process.env.DB_NAME || "KSI-GADGETS",
  dbUser: process.env.DB_USER || "postgres",
  dbPassword: process.env.DB_PASSWORD || "password",
  jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-this",
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || "15m",
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || "7d",
  emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
  emailPort: parseInt(process.env.EMAIL_PORT || "587", 10),
  emailUser: process.env.EMAIL_USER || "",
  emailPassword: process.env.EMAIL_PASSWORD || "",
  emailFrom: process.env.EMAIL_FROM || "noreply@ksi-gadgets.com",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  coinbaseApiKey: process.env.COINBASE_API_KEY || "",
  coinbaseWebhookSecret: process.env.COINBASE_WEBHOOK_SECRET || "",
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || "",
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || "",
};

export default config;
