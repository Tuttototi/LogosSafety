CREATE TABLE `audit_log_entries` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64),
	`event_type` varchar(120) NOT NULL,
	`module` varchar(80) NOT NULL,
	`action` varchar(80) NOT NULL,
	`entity_type` varchar(80) NOT NULL,
	`entity_id` varchar(64) NOT NULL,
	`actor_user_id` varchar(64) NOT NULL,
	`actor_person_id` varchar(64),
	`actor_role` varchar(80),
	`occurred_at` timestamp NOT NULL,
	`correlation_id` varchar(128) NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_outbox` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64),
	`event_type` varchar(120) NOT NULL,
	`module` varchar(80) NOT NULL,
	`entity_type` varchar(80) NOT NULL,
	`entity_id` varchar(64) NOT NULL,
	`actor_user_id` varchar(64),
	`occurred_at` timestamp NOT NULL,
	`payload` json NOT NULL,
	`status` enum('pending','processing','processed','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`available_at` timestamp NOT NULL,
	`processed_at` timestamp,
	`last_error_code` varchar(120),
	`correlation_id` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_outbox_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_audit_entries_tenant_occurred` ON `audit_log_entries` (`tenant_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_entries_entity` ON `audit_log_entries` (`tenant_id`,`module`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_entries_correlation` ON `audit_log_entries` (`correlation_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_entries_actor` ON `audit_log_entries` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `idx_notification_outbox_status_available` ON `notification_outbox` (`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `idx_notification_outbox_tenant_status` ON `notification_outbox` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_notification_outbox_correlation` ON `notification_outbox` (`correlation_id`);--> statement-breakpoint
CREATE INDEX `idx_notification_outbox_entity` ON `notification_outbox` (`entity_type`,`entity_id`);