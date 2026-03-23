ALTER TABLE "users" ALTER COLUMN "access_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hack_club_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_hack_club_id_unique" UNIQUE("hack_club_id");