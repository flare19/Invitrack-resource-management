-- AlterTable
ALTER TABLE "bookings"."resources" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
