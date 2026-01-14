import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import { CartService } from "../services/cart.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

const cartService = new CartService();

export const getCart = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const cart = await cartService.getCart(userId);

    res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart retrieved successfully"));
  }
);

export const addToCart = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const { productId, quantity } = req.body;

    const cart = await cartService.addToCart(userId, productId, quantity);

    res
      .status(200)
      .json(new ApiResponse(200, cart, "Item added to cart successfully"));
  }
);

export const updateCartItem = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const { productId } = req.params;
    const { quantity } = req.body;

    const cart = await cartService.updateCartItem(userId, productId, quantity);

    res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart item updated successfully"));
  }
);

export const removeFromCart = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const { productId } = req.params;

    const cart = await cartService.removeFromCart(userId, productId);

    res
      .status(200)
      .json(new ApiResponse(200, cart, "Item removed from cart successfully"));
  }
);

export const clearCart = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const cart = await cartService.clearCart(userId);

    res
      .status(200)
      .json(new ApiResponse(200, cart, "Cart cleared successfully"));
  }
);
