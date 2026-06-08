CREATE TYPE "public"."shop_region" AS ENUM('US', 'EU', 'UK', 'INDIA', 'CANADA', 'AUSTRALIA', 'REST_OF_WORLD');--> statement-breakpoint

ALTER TABLE "shop_items" ADD COLUMN "region_prices" jsonb NOT NULL DEFAULT '{}';--> statement-breakpoint
UPDATE "shop_items" SET "region_prices" = jsonb_build_object(
  'US', cost,
  'EU', cost,
  'UK', cost,
  'INDIA', cost,
  'CANADA', cost,
  'AUSTRALIA', cost,
  'REST_OF_WORLD', cost
);--> statement-breakpoint
ALTER TABLE "shop_items" DROP COLUMN "cost";--> statement-breakpoint

ALTER TABLE "deleted_shop_items" ADD COLUMN "region_prices" jsonb NOT NULL DEFAULT '{}';--> statement-breakpoint
UPDATE "deleted_shop_items" SET "region_prices" = jsonb_build_object(
  'US', cost,
  'EU', cost,
  'UK', cost,
  'INDIA', cost,
  'CANADA', cost,
  'AUSTRALIA', cost,
  'REST_OF_WORLD', cost
);--> statement-breakpoint
ALTER TABLE "deleted_shop_items" DROP COLUMN "cost";--> statement-breakpoint

ALTER TABLE "orders" ADD COLUMN "purchased_region" "public"."shop_region";
