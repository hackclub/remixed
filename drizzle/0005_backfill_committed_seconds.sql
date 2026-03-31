UPDATE "projects" AS p
SET "committed_seconds" = COALESCE(
	(
		SELECT SUM(s."seconds")::integer
		FROM "ships" AS s
		WHERE s."project_id" = p."id" AND s."status" = 'APPROVED'
	),
	0
);
