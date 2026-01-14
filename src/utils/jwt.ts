import jwt from "jsonwebtoken";
import config from "../config/env";

export interface ITokenPayload {
  id: string;
  email: string;
  role: string;
}

export interface IDecodedToken extends ITokenPayload {
  iat: number;
  exp: number;
}

export class JwtService {
  static generateAccessToken(payload: ITokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtAccessExpiration,
    });
  }

  static generateRefreshToken(payload: ITokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtRefreshExpiration,
    });
  }

  static verifyToken(token: string): IDecodedToken {
    try {
      return jwt.verify(token, config.jwtSecret) as IDecodedToken;
    } catch (error: any) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  static decodeToken(token: string): IDecodedToken | null {
    try {
      return jwt.decode(token) as IDecodedToken;
    } catch (error) {
      return null;
    }
  }

  static generateTokenPair(payload: ITokenPayload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }
}

// Backwards compatibility
export const generateAccessToken = (payload: ITokenPayload) =>
  JwtService.generateAccessToken(payload);
export const generateRefreshToken = (payload: ITokenPayload) =>
  JwtService.generateRefreshToken(payload);
export const verifyToken = (token: string) => JwtService.verifyToken(token);
export const generateTokens = (payload: ITokenPayload) =>
  JwtService.generateTokenPair(payload);
