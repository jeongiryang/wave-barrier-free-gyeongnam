CREATE TABLE `itineraries` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `place_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`place_id` text NOT NULL,
	`place_name` text NOT NULL,
	`field` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`created_at` integer NOT NULL
);
