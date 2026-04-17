import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middlewares/validation.middleware";
import * as supportController from "../controllers/support.controller";

const router = Router();

const contactValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("subject").trim().notEmpty().withMessage("Subject is required"),
  body("message")
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Message must be between 10 and 5000 characters"),
];

const chatValidator = [
  body("message")
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Message is required"),
  body("history")
    .optional()
    .isArray({ max: 20 })
    .withMessage("History must be an array with at most 20 items"),
];

router.post(
  "/contact",
  contactValidator,
  validate,
  supportController.submitContactMessage,
);
router.post(
  "/chat",
  chatValidator,
  validate,
  supportController.chatWithSupport,
);

export default router;
