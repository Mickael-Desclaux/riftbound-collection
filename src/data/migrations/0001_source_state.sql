CREATE TABLE `source_state` (
	`source` text PRIMARY KEY NOT NULL,
	`last_success_at` text,
	`last_error_at` text,
	`last_error_message` text
);
