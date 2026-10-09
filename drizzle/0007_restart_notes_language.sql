DROP INDEX `review_logs_user_card_review_idx`;--> statement-breakpoint
ALTER TABLE `review_logs` ADD `language` text;--> statement-breakpoint
ALTER TABLE `problems` ADD `notes` text;