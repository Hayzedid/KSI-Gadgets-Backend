import { Request, Response, NextFunction } from "express";

// Basic request sanitizer to remove script tags and suspicious payload strings
// Lightweight: does not replace a full sanitizer package but prevents common XSS payloads
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (value: any): any => {
    if (typeof value === 'string') {
      return value.replace(/<script.*?>.*?<\/script>/gi, '').replace(/<.*?on.*?=.*?>/gi, '');
    }
    if (Array.isArray(value)) return value.map(sanitize);
    if (value && typeof value === 'object') {
      Object.keys(value).forEach((k) => {
        value[k] = sanitize(value[k]);
      });
      return value;
    }
    return value;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

export default sanitizeRequest;
