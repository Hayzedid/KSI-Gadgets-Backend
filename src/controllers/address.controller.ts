import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import addressService from "../services/address.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listAddresses = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const addresses = await addressService.listAddresses(userId);

    res
      .status(200)
      .json(new ApiResponse(200, addresses, "Addresses retrieved successfully"));
  },
);

export const createAddress = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const address = await addressService.createAddress(userId, req.body);

    res
      .status(201)
      .json(new ApiResponse(201, address, "Address created successfully"));
  },
);

export const updateAddress = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const address = await addressService.updateAddress(userId, id, req.body);

    res
      .status(200)
      .json(new ApiResponse(200, address, "Address updated successfully"));
  },
);

export const deleteAddress = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    await addressService.deleteAddress(userId, id);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Address deleted successfully"));
  },
);
