ALTER TYPE "public"."payment_status" ADD VALUE 'VERIFYING';--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'VERIFIED';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "transaction_reference" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "receipt_path" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "verify_request_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "verification_result" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_event_uq" ON "payment_webhook_events" USING btree ("event_id");