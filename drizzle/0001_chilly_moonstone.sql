ALTER TABLE "users" ALTER COLUMN "access_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hca_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_hca_id_unique" UNIQUE("hca_id");
