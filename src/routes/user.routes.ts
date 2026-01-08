import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import * as userValidator from "../validators/user.validator";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get("/profile", userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  validate(userValidator.updateProfileSchema),
  userController.updateProfile
);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete("/account", userController.deleteAccount);

// Admin routes
/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get("/", authorize("admin"), userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private/Admin
 */
router.get("/:id", authorize("admin"), userController.getUserById);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Update user role
 * @access  Private/Admin
 */
router.patch(
  "/:id/role",
  authorize("admin"),
  validate(userValidator.updateRoleSchema),
  userController.updateUserRole
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private/Admin
 */
router.delete("/:id", authorize("admin"), userController.deleteUser);

export default router;
