import { AppDataSource } from "../config/database";
import { Coupon, CouponType } from "../models/coupon.model";
import { ApiError } from "../utils/ApiError";
import { EntityManager } from "typeorm";

export interface CouponValidationResult {
  coupon: Coupon;
  discountAmount: number;
}

export class CouponService {
  private couponRepository = AppDataSource.getRepository(Coupon);

  async validateCoupon(
    code: string,
    subtotal: number,
    manager?: EntityManager,
  ): Promise<CouponValidationResult> {
    const repo = manager ? manager.getRepository(Coupon) : this.couponRepository;

    const coupon = await repo.findOne({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      throw new ApiError(400, "Invalid or inactive coupon code");
    }

    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new ApiError(400, "This coupon has expired");
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new ApiError(400, "This coupon has reached its usage limit");
    }

    if (coupon.minOrderAmount !== null && subtotal < Number(coupon.minOrderAmount)) {
      throw new ApiError(
        400,
        `This coupon requires a minimum order of $${Number(coupon.minOrderAmount).toFixed(2)}`,
      );
    }

    let discountAmount =
      coupon.type === CouponType.PERCENTAGE
        ? (subtotal * Number(coupon.value)) / 100
        : Number(coupon.value);

    if (coupon.maxDiscountAmount !== null) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
    }

    discountAmount = Math.min(discountAmount, subtotal);

    return { coupon, discountAmount: Math.round(discountAmount * 100) / 100 };
  }

  async incrementUsage(couponId: string, manager: EntityManager): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(Coupon)
      .set({ usageCount: () => '"usageCount" + 1' })
      .where("id = :id", { id: couponId })
      .execute();
  }

  async listCoupons() {
    return this.couponRepository.find({ order: { createdAt: "DESC" } });
  }

  async createCoupon(data: Partial<Coupon>): Promise<Coupon> {
    const existing = await this.couponRepository.findOne({
      where: { code: String(data.code).trim().toUpperCase() },
    });
    if (existing) {
      throw new ApiError(409, "A coupon with this code already exists");
    }

    const coupon = this.couponRepository.create({
      ...data,
      code: String(data.code).trim().toUpperCase(),
    });
    return this.couponRepository.save(coupon);
  }

  async updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new ApiError(404, "Coupon not found");
    }

    if (data.code) {
      data.code = String(data.code).trim().toUpperCase();
    }

    Object.assign(coupon, data);
    return this.couponRepository.save(coupon);
  }

  async deleteCoupon(id: string): Promise<void> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new ApiError(404, "Coupon not found");
    }
    await this.couponRepository.remove(coupon);
  }
}

export default new CouponService();
