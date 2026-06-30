ALTER TABLE "ship_suggestions" ADD COLUMN "discarded_at" timestamp;--> statement-breakpoint
ALTER TABLE "ship_suggestions" ADD COLUMN "discarded_by_id" integer;--> statement-breakpoint
ALTER TABLE "ship_suggestions" ADD CONSTRAINT "ship_suggestions_discarded_by_id_users_id_fk" FOREIGN KEY ("discarded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;