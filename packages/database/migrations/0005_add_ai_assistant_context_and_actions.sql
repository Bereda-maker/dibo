ALTER TABLE "ai_conversations" ADD COLUMN "subject_id" uuid;
--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD COLUMN "is_saved" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "feedback" text;
--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "is_saved" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "is_regeneration" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
