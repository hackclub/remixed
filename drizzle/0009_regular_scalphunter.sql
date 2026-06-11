ALTER TABLE "orders" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "user_notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfilled_at" timestamp;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "fulfiller_context" text;