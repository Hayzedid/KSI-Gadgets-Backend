import jwt, { SignOptions } from "jsonwebtoken";
import config from "../config/env";

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate JWT access token
 * @param payload - Token payload
 * @returns JWT token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiration,
  } as SignOptions);
};

/**
 * Generate JWT refresh token
 * @param payload - Token payload
 * @returns JWT refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtRefreshExpiration,
  } as SignOptions);
};

/**
 * Verify JWT token
 * @param token - JWT token
 * @returns Decoded token payload
 */
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};

/**
 * Generate both access and refresh tokens
 * @param payload - Token payload
 * @returns Object with access and refresh tokens
 */
export const generateTokens = (payload: TokenPayload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};
