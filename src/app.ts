import "reflect-metadata";
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import routes from "./routes";
import { errorHandler } from "./middlewares/error.middleware";
import { rateLimiter } from "./middlewares/rateLimit.middleware";
import { requestLogger } from "./middlewares/requestLogger.middleware";
import sanitizeRequest from "./middlewares/sanitize.middleware";
import setupSwagger from "./docs/swagger";

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Request logging
app.use(requestLogger);

// Basic input sanitization
app.use(sanitizeRequest);

// API routes
app.use("/api", routes);

// Swagger docs
setupSwagger(app);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
