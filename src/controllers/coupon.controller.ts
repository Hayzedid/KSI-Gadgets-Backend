import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import couponService from "../services/coupon.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

export const validateCoupon = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const { code, subtotal } = req.body;

    const result = await couponService.validateCoupon(code, Number(subtotal));

    res
      .status(200)
      .json(new ApiResponse(200, result, "Coupon is valid"));
  },
);

export const listCoupons = asyncHandler(
  async (_req: IAuthRequest, res: Response) => {
    const coupons = await couponService.listCoupons();

    res
      .status(200)
      .json(new ApiResponse(200, coupons, "Coupons retrieved successfully"));
  },
);

export const createCoupon = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const coupon = await couponService.createCoupon(req.body);

    res
      .status(201)
      .json(new ApiResponse(201, coupon, "Coupon created successfully"));
  },
);

export const updateCoupon = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;
    const coupon = await couponService.updateCoupon(id, req.body);

    res
      .status(200)
      .json(new ApiResponse(200, coupon, "Coupon updated successfully"));
  },
);

export const deleteCoupon = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;
    await couponService.deleteCoupon(id);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Coupon deleted successfully"));
  },
);
