CREATE TABLE `binder_entry` (
	`printing_code` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `card` (
	`oracle_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`subtype` text,
	`domains` text NOT NULL,
	`text` text
);
--> statement-breakpoint
CREATE TABLE `collection_entry` (
	`printing_code` text PRIMARY KEY NOT NULL,
	`quantity` integer NOT NULL,
	CONSTRAINT "collection_entry_quantity_positive" CHECK("collection_entry"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE `current_price` (
	`printing_code` text NOT NULL,
	`source` text NOT NULL,
	`finish` text NOT NULL,
	`reference_value` real,
	`metrics` text NOT NULL,
	`currency` text NOT NULL,
	`published_at` text NOT NULL,
	PRIMARY KEY(`printing_code`, `source`, `finish`)
);
--> statement-breakpoint
CREATE TABLE `exchange_rate` (
	`date` text NOT NULL,
	`base_currency` text NOT NULL,
	`quote_currency` text NOT NULL,
	`rate` real NOT NULL,
	`source` text NOT NULL,
	PRIMARY KEY(`base_currency`, `quote_currency`, `date`)
);
--> statement-breakpoint
CREATE TABLE `expansion` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`released_at` text,
	`is_promo` integer NOT NULL,
	`card_count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `price_record` (
	`printing_code` text NOT NULL,
	`source` text NOT NULL,
	`finish` text NOT NULL,
	`recorded_at` text NOT NULL,
	`value` real NOT NULL,
	PRIMARY KEY(`printing_code`, `source`, `finish`, `recorded_at`)
);
--> statement-breakpoint
CREATE TABLE `printing` (
	`code` text PRIMARY KEY NOT NULL,
	`card_oracle_id` text NOT NULL,
	`expansion_code` text NOT NULL,
	`collector_number` text NOT NULL,
	`rarity` text NOT NULL,
	`variant` text NOT NULL,
	`finishes` text NOT NULL,
	`image_small` text,
	`image_normal` text,
	`image_large` text,
	`artist` text,
	`rifthunt_printing_id` text NOT NULL,
	`tcg_id` integer,
	`cardmarket_product_id` integer,
	FOREIGN KEY (`card_oracle_id`) REFERENCES `card`(`oracle_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`expansion_code`) REFERENCES `expansion`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `printing_rifthunt_printing_id_unique` ON `printing` (`rifthunt_printing_id`);--> statement-breakpoint
CREATE INDEX `printing_expansion_idx` ON `printing` (`expansion_code`,`collector_number`);--> statement-breakpoint
CREATE INDEX `printing_card_idx` ON `printing` (`card_oracle_id`);--> statement-breakpoint
CREATE TABLE `setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wishlist_entry` (
	`printing_code` text PRIMARY KEY NOT NULL,
	`added_at` text NOT NULL,
	`last_alert_price` real,
	`last_alert_at` text
);
