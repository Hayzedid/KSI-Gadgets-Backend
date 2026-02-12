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

// Public routes
router.post("/register", registerValidator, validate, AuthController.register);
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
