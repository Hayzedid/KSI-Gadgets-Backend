import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Cart } from "./cart.model";
import { Product } from "./product.model";

@Entity("cart_items")
export class CartItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  cartId: string;

  @Column({ type: "uuid" })
  productId: string;

  @Column({ type: "integer", default: 1 })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cartId" })
  cart: Cart;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: "productId" })
  product: Product;
}
