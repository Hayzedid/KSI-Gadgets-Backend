import { MigrationInterface, QueryRunner } from "typeorm";

export class GuestCheckoutAndCartReminders1785055483593 implements MigrationInterface {
    name = 'GuestCheckoutAndCartReminders1785055483593'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "carts" ADD "abandonedEmailSentAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "customerEmail" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "customerName" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "customerName"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "customerEmail"`);
        await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "abandonedEmailSentAt"`);
    }

}
