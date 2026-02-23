CREATE TABLE `problems` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`difficulty` text NOT NULL,
	`tags` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `problems_user_id_idx` ON `problems` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `problems_user_slug_unique` ON `problems` (`user_id`, `slug`);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`problem_id` text NOT NULL,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` integer NOT NULL,
	`scheduled_days` integer NOT NULL,
	`learning_steps` integer NOT NULL,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`state` integer NOT NULL,
	`last_review` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cards_user_due_idx` ON `cards` (`user_id`, `due`);
--> statement-breakpoint
CREATE INDEX `cards_problem_id_idx` ON `cards` (`problem_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `cards_problem_unique` ON `cards` (`problem_id`);
--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`state` integer NOT NULL,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` integer NOT NULL,
	`last_elapsed_days` integer NOT NULL,
	`scheduled_days` integer NOT NULL,
	`learning_steps` integer NOT NULL,
	`review` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_logs_card_id_idx` ON `review_logs` (`card_id`);
--> statement-breakpoint
CREATE INDEX `review_logs_user_review_idx` ON `review_logs` (`user_id`, `review`);
--> statement-breakpoint
DROP TABLE `todos`;
