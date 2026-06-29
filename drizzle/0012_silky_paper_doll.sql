CREATE TABLE "ship_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ship_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"user_comment" text,
	"internal_comment" text,
	"adjusted_hours" real,
	"notes_per_hour" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ship_suggestions" ADD CONSTRAINT "ship_suggestions_ship_id_ships_id_fk" FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ship_suggestions" ADD CONSTRAINT "ship_suggestions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill: a ship that is currently REVIEWER_APPROVED holds a pending community
-- review that is now modelled as a suggestion rather than an APPROVAL review.
-- Move the latest APPROVAL of each such ship into ship_suggestions, then drop the
-- APPROVAL review rows so they no longer surface as materialized review events.
INSERT INTO "ship_suggestions" ("ship_id", "reviewer_id", "user_comment", "internal_comment", "adjusted_hours", "notes_per_hour", "created_at", "updated_at")
SELECT DISTINCT ON (sr."ship_id")
	sr."ship_id", sr."reviewer_id", sr."user_comment", sr."internal_comment", sr."adjusted_hours", sr."notes_per_hour", sr."created_at", sr."updated_at"
FROM "ship_reviews" sr
JOIN "ships" s ON s."id" = sr."ship_id"
WHERE sr."type" = 'APPROVAL' AND s."status" = 'REVIEWER_APPROVED'
ORDER BY sr."ship_id", sr."created_at" DESC;--> statement-breakpoint
DELETE FROM "ship_reviews" sr
USING "ships" s
WHERE sr."ship_id" = s."id" AND sr."type" = 'APPROVAL' AND s."status" = 'REVIEWER_APPROVED';