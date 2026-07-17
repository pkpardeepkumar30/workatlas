ALTER TABLE "tasks" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
WITH "ranked_tasks" AS (
	SELECT "id", ROW_NUMBER() OVER (PARTITION BY "owner_id", "status" ORDER BY "created_at", "id") - 1 AS "new_position"
	FROM "tasks"
)
UPDATE "tasks"
SET "position" = "ranked_tasks"."new_position"
FROM "ranked_tasks"
WHERE "tasks"."id" = "ranked_tasks"."id";--> statement-breakpoint
CREATE INDEX "tasks_owner_status_position_idx" ON "tasks" USING btree ("owner_id","status","position");
