CREATE TYPE "public"."audit_category" AS ENUM('ORDER_INFO', 'FULFILL', 'EDIT_USER', 'SHIP_REVIEW', 'SHOP_ITEM');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('GAME', 'WEBSITE', 'DESKTOP_APP', 'CLI', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'FULFILLED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('USER', 'STAFF', 'REVIEWER', 'ORGANIZER');--> statement-breakpoint
CREATE TYPE "public"."ship_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" "audit_category" NOT NULL,
	"data" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"ref_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"country" text NOT NULL,
	"zipcode" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_art_url" text,
	"category" "category" NOT NULL,
	"hackatime_projects" text[] DEFAULT '{}' NOT NULL,
	"hackatime_seconds" integer,
	"github_url" text,
	"demo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ships" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"seconds" integer NOT NULL,
	"status" "ship_status" DEFAULT 'PENDING' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"feedback" text
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cost" integer NOT NULL,
	"imageUrl" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"slack_id" text NOT NULL,
	"username" text NOT NULL,
	"avatar_url" text,
	"access_token" text NOT NULL,
	"notes_balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"roles" "role"[] DEFAULT '{"USER"}' NOT NULL,
	"referrals" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "users_slack_id_unique" UNIQUE("slack_id")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes_ledger" ADD CONSTRAINT "notes_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_item_id_shop_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."shop_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ships" ADD CONSTRAINT "ships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;