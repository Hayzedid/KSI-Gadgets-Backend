import { Request, Response, NextFunction } from "express";
import { JwtService, IDecodedToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";

// Extend Express Request to include user information
export interface IAuthRequest extends Request {
  user?: IDecodedToken;
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = (
  req: IAuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(401, "No authorization token provided", [
        "Missing authorization header",
      ]);
    }

    // Extract token from Bearer scheme
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new ApiError(401, "Invalid authorization header format", [
        "Expected Bearer token",
      ]);
    }

    const token = parts[1];

    // Verify token
    const decoded = JwtService.verifyToken(token);
    req.user = decoded;

    next();
  } catch (error: any) {
    next(
      new ApiError(401, "Unauthorized", [
        error.message || "Invalid or expired token",
      ]),
    );
  }
};

/**
 * Authorization middleware - checks user role
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: IAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new ApiError(401, "Unauthorized", ["User not authenticated"]),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden", ["Insufficient permissions"]));
    }

    next();
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = (
  req: IAuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        const token = parts[1];
        const decoded = JwtService.verifyToken(token);
        req.user = decoded;
      }
    }
  } catch (error) {
    // Silent fail - optional authentication
  }

  next();
};

export default authenticate;
