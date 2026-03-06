import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  changePasswordValidator,
  requestPasswordResetValidator,
  resetPasswordValidator,
  verifyResetTokenValidator,
} from "../validators/auth.validator";
import { validate } from "../middlewares/validation.middleware";

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 */
router.post("/register", registerValidator, validate, AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginValidator, validate, AuthController.login);
router.post(
  "/refresh",
  refreshTokenValidator,
  validate,
  AuthController.refreshToken
);
router.post(
  "/request-password-reset",
  requestPasswordResetValidator,
  validate,
  AuthController.requestPasswordReset
);
router.post(
  "/reset-password",
  resetPasswordValidator,
  validate,
  AuthController.resetPassword
);
router.post(
  "/verify-reset-token",
  verifyResetTokenValidator,
  validate,
  AuthController.verifyResetToken
);

// Protected routes
router.post("/logout", authenticate, AuthController.logout);
router.post(
  "/change-password",
  authenticate,
  changePasswordValidator,
  validate,
  AuthController.changePassword
);

export default router;
