import { DataSource } from "typeorm";
import config from "./env";
import { User } from "../models/user.model";
import { Product } from "../models/product.model";
import { Review } from "../models/review.model";
import { Cart } from "../models/cart.model";
import { CartItem } from "../models/cart-item.model";
import { Order } from "../models/order.model";
import { WishlistItem } from "../models/wishlist-item.model";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.dbHost,
  port: config.dbPort,
  username: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  synchronize: config.env === "development", // Auto-create tables in development
  logging: false, // Disable query logging
  entities: [User, Product, Review, Cart, CartItem, Order, WishlistItem],
  migrations: ["src/migrations/**/*.ts"],
  subscribers: [],
  // Hosted Postgres providers (eg. Neon) need SSL, but local Postgres usually does not.
  // TypeORM passes this through to the `pg` driver.
  ssl: ["localhost", "127.0.0.1", "::1"].includes(config.dbHost.toLowerCase())
    ? false
    : {
        rejectUnauthorized: false,
      },
  // Pass driver-specific options via `extra` — include a connection timeout
  extra: {
    connectionTimeoutMillis: 10000,
  },
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("✅ PostgreSQL database connected successfully");
  } catch (error) {
    console.error("❌ Error connecting to PostgreSQL database:");
    // Log AggregateError inner errors when present for clearer diagnostics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e: any = error;
    if (e && e.errors && Array.isArray(e.errors)) {
      console.error("Aggregate errors:");
      for (const sub of e.errors) {
        console.error(sub);
      }
    } else {
      console.error(e);
    }
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.destroy();
    console.log("PostgreSQL database disconnected");
  } catch (error) {
    console.error("Error disconnecting from database:", error);
  }
};
