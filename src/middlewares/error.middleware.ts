import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError";
import httpStatus from "../constants/httpStatus";
import config from "../config/env";
import logger from "../config/logger";

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  // Convert non-ApiError errors to ApiError
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || error.status || httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, false, error.stack);
  }

  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  // Prepare response
  const response = {
    statusCode: error.statusCode,
    message: error.message,
    ...(config.env === "development" && { stack: error.stack }),
  };

  res.status(error.statusCode).json(response);
};
