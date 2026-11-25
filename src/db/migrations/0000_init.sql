CREATE TABLE `validations` (
	`id` text PRIMARY KEY NOT NULL,
	`image_number` integer NOT NULL,
	`pixels` integer NOT NULL,
	`steps` integer NOT NULL,
	`validated_at` text NOT NULL,
	`synced` integer DEFAULT false NOT NULL
);
