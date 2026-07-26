import { Router } from "express";
import * as addressController from "../controllers/address.controller";
import * as addressValidator from "../validators/address.validator";
import { validate } from "../middlewares/validation.middleware";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     summary: Get the current user's saved addresses
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of addresses
 */
router.get("/", addressController.listAddresses);

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Save a new address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Address created
 */
router.post(
  "/",
  addressValidator.createAddressValidator,
  validate,
  addressController.createAddress,
);

/**
 * @swagger
 * /api/addresses/{id}:
 *   put:
 *     summary: Update a saved address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Address updated
 */
router.put(
  "/:id",
  addressValidator.updateAddressValidator,
  validate,
  addressController.updateAddress,
);

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: Delete a saved address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Address deleted
 */
router.delete(
  "/:id",
  addressValidator.addressIdValidator,
  validate,
  addressController.deleteAddress,
);

export default router;
