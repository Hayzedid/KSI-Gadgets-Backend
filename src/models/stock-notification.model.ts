import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Product } from "./product.model";

@Entity("stock_notifications")
@Index(["productId"])
export class StockNotification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  productId: string;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "boolean", default: false })
  notified: boolean;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product: Product;

  @CreateDateColumn()
  createdAt: Date;
}

export default StockNotification;
