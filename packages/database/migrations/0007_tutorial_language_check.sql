DO $$ BEGIN
  ALTER TABLE "tutorial_videos"
    ADD CONSTRAINT "tutorial_videos_language_check" CHECK ("language" IN ('en', 'am'));
EXCEPTION WHEN duplicate_object THEN null; END $$;
