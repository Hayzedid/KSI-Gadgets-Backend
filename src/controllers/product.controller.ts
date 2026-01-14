import { Response } from "express";
import { IAuthRequest } from "../middlewares/auth.middleware";
import { ProductService } from "../services/product.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

const productService = new ProductService();

export const getAllProducts = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const filters = {
      category: req.query.category as string,
      minPrice: req.query.minPrice
        ? parseFloat(req.query.minPrice as string)
        : undefined,
      maxPrice: req.query.maxPrice
        ? parseFloat(req.query.maxPrice as string)
        : undefined,
      search: req.query.search as string,
      featured: req.query.featured === "true" ? true : undefined,
    };

    const pagination = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    };

    const result = await productService.getAllProducts(filters, pagination);

    res
      .status(200)
      .json(new ApiResponse(200, result, "Products retrieved successfully"));
  }
);

export const getProductById = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const product = await productService.getProductById(req.params.id);

    res
      .status(200)
      .json(new ApiResponse(200, product, "Product retrieved successfully"));
  }
);

export const createProduct = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const product = await productService.createProduct(req.body);

    res
      .status(201)
      .json(new ApiResponse(201, product, "Product created successfully"));
  }
);

export const updateProduct = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const product = await productService.updateProduct(req.params.id, req.body);

    res
      .status(200)
      .json(new ApiResponse(200, product, "Product updated successfully"));
  }
);

export const deleteProduct = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    await productService.deleteProduct(req.params.id);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Product deleted successfully"));
  }
);

export const getProductReviews = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const reviews = await productService.getProductReviews(req.params.id);

    res
      .status(200)
      .json(new ApiResponse(200, reviews, "Reviews retrieved successfully"));
  }
);

export const addProductReview = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const { rating, comment } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const review = await productService.addProductReview(
      req.params.id,
      userId,
      rating,
      comment
    );

    res
      .status(201)
      .json(new ApiResponse(201, review, "Review added successfully"));
  }
);

export const updateProductReview = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const { rating, comment } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    const review = await productService.updateProductReview(
      req.params.reviewId,
      userId,
      rating,
      comment
    );

    res
      .status(200)
      .json(new ApiResponse(200, review, "Review updated successfully"));
  }
);

export const deleteProductReview = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    await productService.deleteProductReview(req.params.reviewId, userId);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Review deleted successfully"));
  }
);
