import { Router } from "express";
import UserController from "../controllers/user.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import {
  updateProfileValidator,
  userIdValidator,
} from "../validators/user.validator";
import { validate } from "../middlewares/validation.middleware";
import { UserRole } from "../models/user.model";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get("/profile", UserController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put(
  "/profile",
  updateProfileValidator,
  validate,
  UserController.updateProfile
);

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete("/account", UserController.deleteAccount);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", authorize(UserRole.ADMIN), UserController.getAllUsers);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get user by ID (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 */
router.get(
  "/:userId",
  authorize(UserRole.ADMIN),
  userIdValidator,
  validate,
  UserController.getUserById
);

/**
 * @swagger
 * /api/users/{userId}/deactivate:
 *   put:
 *     summary: Deactivate user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
 */
router.put(
  "/:userId/deactivate",
  authorize(UserRole.ADMIN),
  userIdValidator,
  validate,
  UserController.deactivateUser
);

/**
 * @swagger
 * /api/users/{userId}/reactivate:
 *   put:
 *     summary: Reactivate user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User reactivated
 */
router.put(
  "/:userId/reactivate",
  authorize(UserRole.ADMIN),
  userIdValidator,
  validate,
  UserController.reactivateUser
);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: Delete user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete(
  "/:userId",
  authorize(UserRole.ADMIN),
  userIdValidator,
  validate,
  UserController.deleteUser
);

export default router;
