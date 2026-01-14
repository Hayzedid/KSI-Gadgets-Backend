import { AppDataSource } from "../config/database";
import { Product, ProductCategory } from "../models/product.model";
import { Review } from "../models/review.model";
import { ApiError } from "../utils/ApiError";
import { ILike, Between, FindOptionsWhere } from "typeorm";

interface IProductFilter {
  category?: ProductCategory;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  featured?: boolean;
}

interface IPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export class ProductService {
  private productRepository = AppDataSource.getRepository(Product);
  private reviewRepository = AppDataSource.getRepository(Review);

  async getAllProducts(
    filters: IProductFilter,
    pagination: IPaginationOptions
  ) {
    const { category, minPrice, maxPrice, search, featured } = filters;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = pagination;

    const where: FindOptionsWhere<Product> = {};

    if (category) where.category = category;
    if (featured !== undefined) where.featured = featured;
    if (search) {
      where.name = ILike(`%${search}%`);
    }
    if (minPrice !== undefined && maxPrice !== undefined) {
      where.price = Between(minPrice, maxPrice) as any;
    } else if (minPrice !== undefined) {
      // Price >= minPrice
      where.price = Between(minPrice, Number.MAX_SAFE_INTEGER) as any;
    } else if (maxPrice !== undefined) {
      // Price <= maxPrice
      where.price = Between(0, maxPrice) as any;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepository.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(productId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }
    return product;
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(productData);
    return await this.productRepository.save(product);
  }

  async updateProduct(
    productId: string,
    updateData: Partial<Product>
  ): Promise<Product> {
    const product = await this.getProductById(productId);

    Object.assign(product, updateData);
    return await this.productRepository.save(product);
  }

  async deleteProduct(productId: string): Promise<void> {
    const product = await this.getProductById(productId);

    // Delete all reviews associated with this product (cascade should handle this)
    await this.reviewRepository.delete({ productId });
    await this.productRepository.remove(product);
  }

  async getProductReviews(productId: string) {
    await this.getProductById(productId); // Check if product exists

    const reviews = await this.reviewRepository.find({
      where: { productId },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });

    return reviews;
  }

  async addProductReview(
    productId: string,
    userId: string,
    rating: number,
    comment: string
  ) {
    const product = await this.getProductById(productId);

    // Check if user already reviewed this product
    const existingReview = await this.reviewRepository.findOne({
      where: { productId, userId },
    });

    if (existingReview) {
      throw new ApiError(400, "You have already reviewed this product");
    }

    // Create review
    const review = this.reviewRepository.create({
      productId,
      userId,
      rating,
      comment,
    });
    await this.reviewRepository.save(review);

    // Update product rating
    const reviews = await this.reviewRepository.find({ where: { productId } });
    const numReviews = reviews.length;
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / numReviews;

    product.rating = Math.round(avgRating * 10) / 10;
    product.numReviews = numReviews;
    await this.productRepository.save(product);

    return review;
  }

  async updateProductReview(
    reviewId: string,
    userId: string,
    rating: number,
    comment: string
  ) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, userId },
    });

    if (!review) {
      throw new ApiError(404, "Review not found or you are not authorized");
    }

    review.rating = rating;
    review.comment = comment;
    await this.reviewRepository.save(review);

    // Recalculate product rating
    const reviews = await this.reviewRepository.find({
      where: { productId: review.productId },
    });
    const numReviews = reviews.length;
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / numReviews;

    await this.productRepository.update(review.productId, {
      rating: Math.round(avgRating * 10) / 10,
      numReviews,
    });

    return review;
  }

  async deleteProductReview(reviewId: string, userId: string) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, userId },
    });

    if (!review) {
      throw new ApiError(404, "Review not found or you are not authorized");
    }

    const productId = review.productId;
    await this.reviewRepository.remove(review);

    // Recalculate product rating
    const reviews = await this.reviewRepository.find({
      where: { productId },
    });
    const numReviews = reviews.length;
    const avgRating =
      numReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / numReviews
        : 0;

    await this.productRepository.update(productId, {
      rating: Math.round(avgRating * 10) / 10,
      numReviews,
    });
  }
}
