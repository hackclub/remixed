ALTER TYPE "public"."ship_status" ADD VALUE IF NOT EXISTS 'CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."audit_category" ADD VALUE IF NOT EXISTS 'PROJECT';--> statement-breakpoint

CREATE TABLE "deleted_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_art_url" text,
	"category" "public"."category" NOT NULL,
	"hackatime_projects" text[] NOT NULL,
	"hackatime_seconds" integer,
	"github_url" text,
	"demo_url" text,
	"created_at" timestamp NOT NULL,
	"deleted_at" timestamp DEFAULT now() NOT NULL,
	"deleted_by_user_id" integer NOT NULL,
	CONSTRAINT "deleted_projects_original_id_unique" UNIQUE("original_id")
);--> statement-breakpoint

CREATE TABLE "deleted_ships" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"seconds" integer NOT NULL,
	"status" "public"."ship_status" NOT NULL,
	"submitted_at" timestamp NOT NULL,
	"feedback" text,
	"deleted_at" timestamp DEFAULT now() NOT NULL,
	"deleted_by_user_id" integer NOT NULL,
	CONSTRAINT "deleted_ships_original_id_unique" UNIQUE("original_id")
);--> statement-breakpoint

CREATE TABLE "deleted_shop_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cost" integer NOT NULL,
	"image_url" text,
	"deleted_at" timestamp DEFAULT now() NOT NULL,
	"deleted_by_user_id" integer NOT NULL,
	CONSTRAINT "deleted_shop_items_original_id_unique" UNIQUE("original_id")
);--> statement-breakpoint

ALTER TABLE "deleted_projects" ADD CONSTRAINT "deleted_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deleted_projects" ADD CONSTRAINT "deleted_projects_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deleted_ships" ADD CONSTRAINT "deleted_ships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deleted_ships" ADD CONSTRAINT "deleted_ships_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deleted_shop_items" ADD CONSTRAINT "deleted_shop_items_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
