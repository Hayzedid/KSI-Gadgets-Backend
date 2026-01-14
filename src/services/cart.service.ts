import { AppDataSource } from "../config/database";
import { Cart } from "../models/cart.model";
import { CartItem } from "../models/cart-item.model";
import { Product } from "../models/product.model";
import { ApiError } from "../utils/ApiError";

export class CartService {
  private cartRepository = AppDataSource.getRepository(Cart);
  private cartItemRepository = AppDataSource.getRepository(CartItem);
  private productRepository = AppDataSource.getRepository(Product);

  async getCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items", "items.product"],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId, items: [], totalAmount: 0 });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  async addToCart(
    userId: string,
    productId: string,
    quantity: number = 1
  ): Promise<Cart> {
    // Verify product exists and has sufficient stock
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    if (product.stock < quantity) {
      throw new ApiError(400, "Insufficient stock available");
    }

    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items", "items.product"],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId, items: [], totalAmount: 0 });
      cart = await this.cartRepository.save(cart);
    }

    // Check if product already exists in cart
    const existingItem = cart.items.find(
      (item) => item.productId === productId
    );

    if (existingItem) {
      // Update existing item
      const newQuantity = existingItem.quantity + quantity;

      if (product.stock < newQuantity) {
        throw new ApiError(400, "Insufficient stock available");
      }

      existingItem.quantity = newQuantity;
      existingItem.price = Number(product.price);
      await this.cartItemRepository.save(existingItem);
    } else {
      // Add new item
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
        price: Number(product.price),
      });
      await this.cartItemRepository.save(cartItem);
    }

    // Reload cart with updated items
    cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items", "items.product"],
    });

    // Recalculate and save total
    cart!.calculateTotal();
    return await this.cartRepository.save(cart!);
  }

  async updateCartItem(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Cart> {
    if (quantity < 1) {
      throw new ApiError(400, "Quantity must be at least 1");
    }

    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items", "items.product"],
    });

    if (!cart) {
      throw new ApiError(404, "Cart not found");
    }

    const cartItem = cart.items.find((item) => item.productId === productId);

    if (!cartItem) {
      throw new ApiError(404, "Product not found in cart");
    }

    // Verify stock availability
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    if (product.stock < quantity) {
      throw new ApiError(400, "Insufficient stock available");
    }

    cartItem.quantity = quantity;
    cartItem.price = Number(product.price);
    await this.cartItemRepository.save(cartItem);

    // Reload and recalculate
    const updatedCart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items", "items.product"],
    });

    updatedCart!.calculateTotal();
    return await this.cartRepository.save(updatedCart!);
  }

  async removeFromCart(userId: string, productId: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items", "items.product"],
    });

    if (!cart) {
      throw new ApiError(404, "Cart not found");
    }

    const cartItem = cart.items.find((item) => item.productId === productId);

    if (cartItem) {
      await this.cartItemRepository.remove(cartItem);
    }

    // Reload and recalculate
    const updatedCart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items", "items.product"],
    });

    updatedCart!.calculateTotal();
    return await this.cartRepository.save(updatedCart!);
  }

  async clearCart(userId: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items"],
    });

    if (!cart) {
      throw new ApiError(404, "Cart not found");
    }

    // Remove all cart items
    if (cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }

    // Reload and recalculate
    const updatedCart = await this.cartRepository.findOne({
      where: { userId },
      relations: ["items", "items.product"],
    });

    updatedCart!.items = [];
    updatedCart!.totalAmount = 0;
    return await this.cartRepository.save(updatedCart!);
  }
}
