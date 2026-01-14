import { DataSource } from "typeorm";
import config from "./env";
import { User } from "../models/user.model";
import { Product } from "../models/product.model";
import { Review } from "../models/review.model";
import { Cart } from "../models/cart.model";
import { CartItem } from "../models/cart-item.model";
import { Order } from "../models/order.model";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.dbHost,
  port: config.dbPort,
  username: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  synchronize: config.env === "development", // Auto-create tables in development
  logging: config.env === "development",
  entities: [User, Product, Review, Cart, CartItem, Order],
  migrations: ["src/migrations/**/*.ts"],
  subscribers: [],
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("✅ PostgreSQL database connected successfully");
  } catch (error) {
    console.error("❌ Error connecting to PostgreSQL database:", error);
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
