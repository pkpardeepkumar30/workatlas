CREATE TABLE "data_transfer_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"format" text NOT NULL,
	"status" text NOT NULL,
	"project_count" integer DEFAULT 0 NOT NULL,
	"task_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "data_transfer_audit_logs" ADD CONSTRAINT "data_transfer_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_transfer_audit_logs_user_idx" ON "data_transfer_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_transfer_audit_logs_created_at_idx" ON "data_transfer_audit_logs" USING btree ("created_at");