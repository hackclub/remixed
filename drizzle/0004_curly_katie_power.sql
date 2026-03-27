CREATE TYPE "public"."review_type" AS ENUM('APPROVAL', 'REJECTION', 'COMMENT', 'HQ_APPROVAL', 'HQ_REJECTION');--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'HQ';--> statement-breakpoint
ALTER TYPE "public"."ship_status" ADD VALUE 'REVIEWER_APPROVED';--> statement-breakpoint
CREATE TABLE "ship_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"ship_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"type" "review_type" NOT NULL,
	"user_comment" text,
	"internal_comment" text,
	"is_internal" boolean DEFAULT false NOT NULL,
	"adjusted_hours" real,
	"slack_message_ts" text,
	"slack_channel_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "committed_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ships" ADD COLUMN "captured_seconds" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "ship_reviews" ADD CONSTRAINT "ship_reviews_ship_id_ships_id_fk" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ship_reviews" ADD CONSTRAINT "ship_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;