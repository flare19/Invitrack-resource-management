-- This is an empty migration.

-- Drop the unconditional unique index Prisma created
DROP INDEX IF EXISTS "inventory"."items_sku_key";

-- Partial unique index: SKU must be unique only among active items
CREATE UNIQUE INDEX "items_sku_active_unique"
ON "inventory"."items" ("sku")
WHERE "is_active" = true;