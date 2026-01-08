import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";
import ApiError from "../utils/ApiError";
import httpStatus from "../constants/httpStatus";

/**
 * Middleware to validate request using express-validator
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const extractedErrors: any[] = [];
    errors.array().forEach((err: any) => {
      extractedErrors.push({
        field: err.path || err.param,
        message: err.msg,
      });
    });

    return next(
      new ApiError(
        httpStatus.UNPROCESSABLE_ENTITY,
        JSON.stringify(extractedErrors)
      )
    );
  };
};
