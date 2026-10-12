CREATE TABLE IF NOT EXISTS "affiliate_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" text NOT NULL,
	"currency" text NOT NULL,
	"commission_base_minor" integer NOT NULL,
	"commission_percentage" numeric(5, 2) NOT NULL,
	"deduction_minor" integer NOT NULL,
	"notes" text,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_deduction_month_currency_uq" ON "affiliate_deductions" USING btree ("month", "currency");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "affiliate_deduction_month_idx" ON "affiliate_deductions" USING btree ("month");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "affiliate_deductions" ADD CONSTRAINT "affiliate_deductions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stewardship_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" text NOT NULL,
	"currency" text NOT NULL,
	"calculation_base_minor" integer NOT NULL,
	"percentage" numeric(5, 2) DEFAULT '10.00' NOT NULL,
	"suggested_amount_minor" integer NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stewardship_reminder_month_currency_uq" ON "stewardship_reminders" USING btree ("month", "currency");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stewardship_reminder_status_idx" ON "stewardship_reminders" USING btree ("status");
