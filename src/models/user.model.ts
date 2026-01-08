import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { hashPassword } from "../utils/password";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50 })
  name: string;

  @Column({ type: "varchar", unique: true, length: 100 })
  email: string;

  @Column({ type: "varchar", select: false })
  password: string;

  @Column({ type: "enum", enum: ["customer", "admin"], default: "customer" })
  role: "customer" | "admin";

  @Column({ type: "varchar", nullable: true })
  phone: string | null;

  @Column({ type: "jsonb", nullable: true })
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  } | null;

  @Column({ type: "boolean", default: false })
  isEmailVerified: boolean;

  @Column({ type: "varchar", nullable: true, select: false })
  resetPasswordToken: string | null;

  @Column({ type: "timestamp", nullable: true, select: false })
  resetPasswordExpires: Date | null;

  @Column({ type: "text", nullable: true, select: false })
  refreshToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Track if password was modified
  private passwordModified: boolean = false;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPasswordBeforeSave() {
    if (this.passwordModified && this.password) {
      this.password = await hashPassword(this.password);
      this.passwordModified = false;
    }
  }

  // Method to mark password as modified
  setPassword(password: string) {
    this.password = password;
    this.passwordModified = true;
  }
}

export default User;
