import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum CouponType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

@Entity("coupons")
export class Coupon {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50, unique: true })
  code: string;

  @Column({ type: "enum", enum: CouponType })
  type: CouponType;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  value: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  minOrderAmount: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  maxDiscountAmount: number | null;

  @Column({ type: "integer", nullable: true })
  usageLimit: number | null;

  @Column({ type: "integer", default: 0 })
  usageCount: number;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export default Coupon;
