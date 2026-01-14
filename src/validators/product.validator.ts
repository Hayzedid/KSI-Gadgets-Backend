import { body, param, query } from "express-validator";

export const createProductValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ max: 200 })
    .withMessage("Product name cannot exceed 200 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Product description is required")
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn([
      "Electronics",
      "Smartphones",
      "Laptops",
      "Tablets",
      "Accessories",
      "Audio",
      "Gaming",
      "Other",
    ])
    .withMessage("Invalid category"),

  body("brand").optional().trim(),

  body("stock")
    .notEmpty()
    .withMessage("Stock is required")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),

  body("images")
    .isArray({ min: 1 })
    .withMessage("At least one image is required"),

  body("images.*")
    .isString()
    .withMessage("Each image must be a valid string/URL"),

  body("featured")
    .optional()
    .isBoolean()
    .withMessage("Featured must be a boolean"),
];

export const updateProductValidator = [
  param("id").isUUID().withMessage("Invalid product ID"),

  body("name")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Product name cannot exceed 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("category")
    .optional()
    .isIn([
      "Electronics",
      "Smartphones",
      "Laptops",
      "Tablets",
      "Accessories",
      "Audio",
      "Gaming",
      "Other",
    ])
    .withMessage("Invalid category"),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),

  body("images")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one image is required"),

  body("featured")
    .optional()
    .isBoolean()
    .withMessage("Featured must be a boolean"),
];

export const productIdValidator = [
  param("id").isUUID().withMessage("Invalid product ID"),
];

export const addReviewValidator = [
  param("id").isUUID().withMessage("Invalid product ID"),

  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment is required")
    .isLength({ max: 1000 })
    .withMessage("Comment cannot exceed 1000 characters"),
];

export const updateReviewValidator = [
  param("reviewId").isUUID().withMessage("Invalid review ID"),

  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment is required")
    .isLength({ max: 1000 })
    .withMessage("Comment cannot exceed 1000 characters"),
];

export const reviewIdValidator = [
  param("reviewId").isUUID().withMessage("Invalid review ID"),
];

export const getProductsQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be a positive number"),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be a positive number"),

  query("category")
    .optional()
    .isIn([
      "Electronics",
      "Smartphones",
      "Laptops",
      "Tablets",
      "Accessories",
      "Audio",
      "Gaming",
      "Other",
    ])
    .withMessage("Invalid category"),

  query("sortBy")
    .optional()
    .isIn(["price", "rating", "createdAt", "name"])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["ASC", "DESC", "asc", "desc"])
    .withMessage("Sort order must be ASC or DESC"),
];
