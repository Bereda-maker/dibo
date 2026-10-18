CREATE TABLE IF NOT EXISTS "tutorial_videos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "youtube_video_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "language" text DEFAULT 'en' NOT NULL,
  "difficulty" "difficulty",
  "thumbnail_url" text,
  "status" "content_status" DEFAULT 'DRAFT' NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tutorial_videos_youtube_id_uq" ON "tutorial_videos" USING btree ("youtube_video_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutorial_videos_status_idx" ON "tutorial_videos" USING btree ("status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutorial_videos_created_by_idx" ON "tutorial_videos" USING btree ("created_by");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tutorial_video_topics" (
  "tutorial_video_id" uuid NOT NULL,
  "topic_id" uuid NOT NULL,
  CONSTRAINT "tutorial_video_topics_tutorial_video_id_topic_id_pk" PRIMARY KEY("tutorial_video_id", "topic_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutorial_video_topics_topic_idx" ON "tutorial_video_topics" USING btree ("topic_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tutorial_videos" ADD CONSTRAINT "tutorial_videos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tutorial_video_topics" ADD CONSTRAINT "tutorial_video_topics_tutorial_video_id_fk" FOREIGN KEY ("tutorial_video_id") REFERENCES "public"."tutorial_videos"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tutorial_video_topics" ADD CONSTRAINT "tutorial_video_topics_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
