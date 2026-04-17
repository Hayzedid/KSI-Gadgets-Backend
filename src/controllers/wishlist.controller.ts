import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import WishlistService from "../services/wishlist.service";

const wishlistService = new WishlistService();

export const getWishlist = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const items = await wishlistService.getWishlist(userId);
    res
      .status(200)
      .json(new ApiResponse(200, items, "Wishlist retrieved successfully"));
  },
);

export const addToWishlist = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const { productId } = req.body;
    const items = await wishlistService.addItem(userId, productId);

    res
      .status(200)
      .json(new ApiResponse(200, items, "Item added to wishlist successfully"));
  },
);

export const removeFromWishlist = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const { productId } = req.params;
    const items = await wishlistService.removeItem(userId, productId);

    res
      .status(200)
      .json(
        new ApiResponse(200, items, "Item removed from wishlist successfully"),
      );
  },
);

export const clearWishlist = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const items = await wishlistService.clearWishlist(userId);

    res
      .status(200)
      .json(new ApiResponse(200, items, "Wishlist cleared successfully"));
  },
);
