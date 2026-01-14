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

// Customer routes
router.get("/profile", UserController.getProfile);
router.put(
  "/profile",
  updateProfileValidator,
  validate,
  UserController.updateProfile
);
router.delete("/account", UserController.deleteAccount);

// Admin routes
router.get("/", authorize(UserRole.ADMIN), UserController.getAllUsers);
router.get(
  "/:userId",
  authorize(UserRole.ADMIN),
  userIdValidator,
  validate,
  UserController.getUserById
);
router.put(
  "/:userId/deactivate",
  authorize(UserRole.ADMIN),
  userIdValidator,
  validate,
  UserController.deactivateUser
);
router.put(
  "/:userId/reactivate",
  authorize(UserRole.ADMIN),
  userIdValidator,
  validate,
  UserController.reactivateUser
);
router.delete(
  "/:userId",
  authorize(UserRole.ADMIN),
  userIdValidator,
  validate,
  UserController.deleteUser
);

export default router;
