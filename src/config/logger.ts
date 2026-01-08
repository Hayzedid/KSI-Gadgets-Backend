import winston from "winston";
import path from "path";
import config from "./env";

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    ({ timestamp, level, message, ...meta }) =>
      `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""}`
  )
);

// Create logger instance
const logger = winston.createLogger({
  level: config.env === "development" ? "debug" : "info",
  format: logFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: config.env === "development" ? consoleFormat : logFormat,
    }),
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "error.log"),
      level: "error",
    }),
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "combined.log"),
    }),
  ],
});

export default logger;
