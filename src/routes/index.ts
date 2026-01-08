import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
// Import other routes as they are created
// import productRoutes from "./product.routes";
// import cartRoutes from "./cart.routes";
// import orderRoutes from "./order.routes";

const router = Router();

// Register routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// Register other routes as they are created
// router.use("/products", productRoutes);
// router.use("/cart", cartRoutes);
// router.use("/orders", orderRoutes);

export default router;
