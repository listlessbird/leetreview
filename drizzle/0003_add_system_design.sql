PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_problems` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`type` text DEFAULT 'leetcode' NOT NULL,
	`title` text NOT NULL,
	`difficulty` text NOT NULL,
	`tags` text NOT NULL,
	`url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_problems` (
	`id`,
	`user_id`,
	`slug`,
	`type`,
	`title`,
	`difficulty`,
	`tags`,
	`url`,
	`created_at`
)
SELECT
	`id`,
	`user_id`,
	`slug`,
	'leetcode',
	`title`,
	`difficulty`,
	`tags`,
	`url`,
	`created_at`
FROM `problems`;
--> statement-breakpoint
DROP TABLE `problems`;
--> statement-breakpoint
ALTER TABLE `__new_problems` RENAME TO `problems`;
--> statement-breakpoint
CREATE INDEX `problems_user_id_idx` ON `problems` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `problems_user_slug_unique` ON `problems` (`user_id`,`slug`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE TABLE `problem_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`problem_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`sort_order` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `problem_resources_problem_id_idx` ON `problem_resources` (`problem_id`);
