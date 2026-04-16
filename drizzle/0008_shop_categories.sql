ALTER TABLE "deleted_shop_items" ADD COLUMN "categories" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "categories" text[] DEFAULT '{}';