import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Product } from "./product.model";
import { User } from "./user.model";

@Entity("reviews")
@Index(["productId", "userId"], { unique: true })
export class Review {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  productId: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "integer", width: 1 })
  rating: number;

  @Column({ type: "varchar", length: 1000 })
  comment: string;

  @ManyToOne(() => Product, (product) => product.reviews, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "productId" })
  product: Product;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
