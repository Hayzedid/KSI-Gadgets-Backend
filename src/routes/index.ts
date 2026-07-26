import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import productRoutes from "./product.routes";
import cartRoutes from "./cart.routes";
import orderRoutes from "./order.routes";
import paymentRoutes from "./payment.routes";
import cryptoPaymentRoutes from "./crypto-payment.routes";
import wishlistRoutes from "./wishlist.routes";
import supportRoutes from "./support.routes";
import couponRoutes from "./coupon.routes";
import addressRoutes from "./address.routes";

const router = Router();

// Register routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/crypto-payments", cryptoPaymentRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/support", supportRoutes);
router.use("/coupons", couponRoutes);
router.use("/addresses", addressRoutes);

export default router;
