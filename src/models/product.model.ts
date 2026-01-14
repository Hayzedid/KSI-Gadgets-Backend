import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { Review } from "./review.model";

export enum ProductCategory {
  ELECTRONICS = "Electronics",
  SMARTPHONES = "Smartphones",
  LAPTOPS = "Laptops",
  TABLETS = "Tablets",
  ACCESSORIES = "Accessories",
  AUDIO = "Audio",
  GAMING = "Gaming",
  OTHER = "Other",
}

@Entity("products")
@Index(["name", "description"])
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 200 })
  @Index()
  name: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  @Index()
  price: number;

  @Column({
    type: "enum",
    enum: ProductCategory,
    default: ProductCategory.OTHER,
  })
  @Index()
  category: ProductCategory;

  @Column({ type: "varchar", length: 100, nullable: true })
  brand: string;

  @Column({ type: "integer", default: 0 })
  stock: number;

  @Column("simple-array")
  images: string[];

  @Column({ type: "decimal", precision: 2, scale: 1, default: 0 })
  @Index()
  rating: number;

  @Column({ type: "integer", default: 0 })
  numReviews: number;

  @Column({ type: "boolean", default: false })
  featured: boolean;

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
