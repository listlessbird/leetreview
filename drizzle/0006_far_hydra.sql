CREATE TABLE `daily_challenges` (
	`date` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`frontend_id` text,
	`difficulty` text NOT NULL,
	`tags` text NOT NULL,
	`url` text NOT NULL,
	`ingested_at` integer NOT NULL
);
