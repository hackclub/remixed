ALTER TABLE "projects" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
UPDATE "projects"
SET "category" = CASE
	WHEN "category" = 'GAME' THEN 'RHYTHM_GAME'
	ELSE 'WILDCARD'
END;--> statement-breakpoint
DROP TYPE "public"."category";--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('AUDIO_EDITOR', 'RHYTHM_GAME', 'MUSIC_PLAYER', 'WILDCARD');--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "category" SET DATA TYPE "public"."category" USING "category"::"public"."category";
