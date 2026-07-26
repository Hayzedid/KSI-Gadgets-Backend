import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1785054008539 implements MigrationInterface {
    name = 'InitialSchema1785054008539'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "addresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "label" character varying(100) NOT NULL, "fullName" character varying(100) NOT NULL, "phone" character varying(20) NOT NULL, "street" text NOT NULL, "city" character varying(100) NOT NULL, "state" character varying(50) NOT NULL, "zipCode" character varying(20) NOT NULL, "country" character varying(100) NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_745d8f43d3af10ab8247465e450" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_95c93a584de49f0b0e13f75363" ON "addresses" ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."coupons_type_enum" AS ENUM('percentage', 'fixed')`);
        await queryRunner.query(`CREATE TABLE "coupons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(50) NOT NULL, "type" "public"."coupons_type_enum" NOT NULL, "value" numeric(10,2) NOT NULL, "minOrderAmount" numeric(10,2), "maxDiscountAmount" numeric(10,2), "usageLimit" integer, "usageCount" integer NOT NULL DEFAULT '0', "expiresAt" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e025109230e82925843f2a14c48" UNIQUE ("code"), CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "stock_notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL, "email" character varying(255) NOT NULL, "notified" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c0f4c0af55afa3f986ec6fcd129" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c2afc33b49f0e288e95692d0ad" ON "stock_notifications" ("productId") `);
        await queryRunner.query(`ALTER TABLE "users" ADD "twoFactorEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "twoFactorSecret" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "twoFactorBackupCodes" text`);
        await queryRunner.query(`ALTER TABLE "products" ADD "lowStockThreshold" integer NOT NULL DEFAULT '10'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "discountAmount" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "couponCode" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "addresses" ADD CONSTRAINT "FK_95c93a584de49f0b0e13f753630" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_notifications" ADD CONSTRAINT "FK_c2afc33b49f0e288e95692d0ad8" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_notifications" DROP CONSTRAINT "FK_c2afc33b49f0e288e95692d0ad8"`);
        await queryRunner.query(`ALTER TABLE "addresses" DROP CONSTRAINT "FK_95c93a584de49f0b0e13f753630"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "couponCode"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "discountAmount"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "lowStockThreshold"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "twoFactorBackupCodes"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "twoFactorSecret"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "twoFactorEnabled"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c2afc33b49f0e288e95692d0ad"`);
        await queryRunner.query(`DROP TABLE "stock_notifications"`);
        await queryRunner.query(`DROP TABLE "coupons"`);
        await queryRunner.query(`DROP TYPE "public"."coupons_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95c93a584de49f0b0e13f75363"`);
        await queryRunner.query(`DROP TABLE "addresses"`);
    }

}
