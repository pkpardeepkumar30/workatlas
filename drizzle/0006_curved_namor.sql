CREATE TABLE "task_reminder_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reminder_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'claimed' NOT NULL,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "deadline_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reminder_minutes" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reminder_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_reminder_notifications" ADD CONSTRAINT "task_reminder_notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminder_notifications" ADD CONSTRAINT "task_reminder_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_reminder_notifications_task_time_unique" ON "task_reminder_notifications" USING btree ("task_id","reminder_at");--> statement-breakpoint
CREATE INDEX "task_reminder_notifications_user_idx" ON "task_reminder_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_reminder_notifications_status_idx" ON "task_reminder_notifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "tasks_reminder_due_idx" ON "tasks" USING btree ("reminder_at","status");