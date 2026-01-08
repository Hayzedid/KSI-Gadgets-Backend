import { body } from "express-validator";

/**
 * Validation schema for updating user profile
 */
export const updateProfileSchema = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("phone")
    .optional()
    .trim()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number"),

  body("address.street")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Street address cannot exceed 100 characters"),

  body("address.city")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("City name cannot exceed 50 characters"),

  body("address.state")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("State name cannot exceed 50 characters"),

  body("address.zipCode")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Zip code cannot exceed 20 characters"),

  body("address.country")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Country name cannot exceed 50 characters"),
];

/**
 * Validation schema for updating user role
 */
export const updateRoleSchema = [
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["customer", "admin"])
    .withMessage("Role must be either customer or admin"),
];
