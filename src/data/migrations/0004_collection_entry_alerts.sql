-- SQLite refuse d'ajouter une colonne NOT NULL sans valeur par défaut : la
-- table est reconstruite. Les Versions déjà possédées entrent dans la
-- Collection le jour de cette migration (référence des Alertes de prix).
CREATE TABLE `__new_collection_entry` (
	`printing_code` text PRIMARY KEY NOT NULL,
	`quantity` integer NOT NULL,
	`added_at` text NOT NULL,
	`last_alert_price` real,
	`last_alert_source` text,
	`last_alert_at` text,
	CONSTRAINT "collection_entry_quantity_positive" CHECK("quantity" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_collection_entry` (`printing_code`, `quantity`, `added_at`)
	SELECT `printing_code`, `quantity`, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM `collection_entry`;
--> statement-breakpoint
DROP TABLE `collection_entry`;
--> statement-breakpoint
ALTER TABLE `__new_collection_entry` RENAME TO `collection_entry`;
