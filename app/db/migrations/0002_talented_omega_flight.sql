CREATE TABLE `segnalazione_acknowledgements` (
	`id` varchar(64) NOT NULL,
	`segnalazione_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`person_id` varchar(64) NOT NULL,
	`acknowledged_at` timestamp NOT NULL,
	CONSTRAINT `segnalazione_acknowledgements_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_segnalazione_ack_unique` UNIQUE(`tenant_id`,`segnalazione_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `segnalazione_attachments` (
	`id` varchar(64) NOT NULL,
	`segnalazione_id` varchar(64) NOT NULL,
	`comment_id` varchar(64),
	`comunicazione_id` varchar(64),
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`mime_type` varchar(160) NOT NULL,
	`file_size` int NOT NULL,
	`attachment_type` enum('Foto','Documento','Altro') NOT NULL DEFAULT 'Altro',
	`description` text,
	`checksum` varchar(128),
	`storage_key` varchar(512),
	`uploaded_by_user_id` varchar(64),
	`uploaded_by_name` varchar(255),
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `segnalazione_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `segnalazione_comments` (
	`id` varchar(64) NOT NULL,
	`segnalazione_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`author_user_id` varchar(64),
	`author_name` varchar(255),
	`body` text NOT NULL,
	`public` boolean NOT NULL DEFAULT true,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `segnalazione_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `segnalazione_workflow_events` (
	`id` varchar(64) NOT NULL,
	`segnalazione_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`event_type` varchar(80) NOT NULL,
	`from_status` enum('Nuova','Presa in carico','In lavorazione','Richiesta integrazione','Integrata','Risolta','Chiusa'),
	`to_status` enum('Nuova','Presa in carico','In lavorazione','Richiesta integrazione','Integrata','Risolta','Chiusa') NOT NULL,
	`actor_user_id` varchar(64),
	`actor_name` varchar(255),
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `segnalazione_workflow_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `segnalazioni` (
	`id` varchar(64) NOT NULL,
	`code` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`contract_id` varchar(64),
	`site_id` varchar(64),
	`plant_id` varchar(64),
	`area_id` varchar(64),
	`reporter_user_id` varchar(64) NOT NULL,
	`reporter_person_id` varchar(64) NOT NULL,
	`reporter_employee_id` varchar(64),
	`reporter_first_name` varchar(120) NOT NULL,
	`reporter_last_name` varchar(120) NOT NULL,
	`reporter_email` varchar(320),
	`reporter_company_id` varchar(64) NOT NULL,
	`reporter_role` varchar(64) NOT NULL,
	`created_by_user_id` varchar(64) NOT NULL,
	`created_by_person_id` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`priority` enum('Bassa','Media','Alta','Critica') NOT NULL DEFAULT 'Media',
	`severity` enum('Bassa','Media','Alta','Critica') NOT NULL DEFAULT 'Media',
	`status` enum('Nuova','Presa in carico','In lavorazione','Richiesta integrazione','Integrata','Risolta','Chiusa') NOT NULL DEFAULT 'Nuova',
	`category` enum('Sicurezza','Ambiente','Attrezzature','Procedura','Altro') NOT NULL,
	`type` enum('Pericolo','Incidente','Near miss','Non conformita','Suggerimento') NOT NULL,
	`assigned_to_user_id` varchar(64),
	`responsible_user_id` varchar(64),
	`closed_at` timestamp,
	`deleted_at` timestamp,
	`deleted_by_user_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `segnalazioni_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_segnalazioni_tenant_code` UNIQUE(`tenant_id`,`code`)
);
--> statement-breakpoint
ALTER TABLE `segnalazione_acknowledgements` ADD CONSTRAINT `fk_segnalazione_ack_report_id` FOREIGN KEY (`segnalazione_id`) REFERENCES `segnalazioni`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `segnalazione_attachments` ADD CONSTRAINT `fk_segnalazione_attachments_report_id` FOREIGN KEY (`segnalazione_id`) REFERENCES `segnalazioni`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `segnalazione_attachments` ADD CONSTRAINT `fk_segnalazione_attachments_comment_id` FOREIGN KEY (`comment_id`) REFERENCES `segnalazione_comments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `segnalazione_comments` ADD CONSTRAINT `fk_segnalazione_comments_report_id` FOREIGN KEY (`segnalazione_id`) REFERENCES `segnalazioni`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `segnalazione_workflow_events` ADD CONSTRAINT `fk_segnalazione_workflow_report_id` FOREIGN KEY (`segnalazione_id`) REFERENCES `segnalazioni`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_segnalazione_ack_user` ON `segnalazione_acknowledgements` (`tenant_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazione_attachments_report` ON `segnalazione_attachments` (`tenant_id`,`segnalazione_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazione_attachments_comment` ON `segnalazione_attachments` (`comment_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazione_attachments_uploader` ON `segnalazione_attachments` (`tenant_id`,`uploaded_by_user_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazione_attachments_deleted` ON `segnalazione_attachments` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_segnalazione_comments_report` ON `segnalazione_comments` (`tenant_id`,`segnalazione_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazione_comments_author` ON `segnalazione_comments` (`tenant_id`,`author_user_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazione_comments_deleted` ON `segnalazione_comments` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_segnalazione_workflow_report` ON `segnalazione_workflow_events` (`tenant_id`,`segnalazione_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_segnalazione_workflow_actor` ON `segnalazione_workflow_events` (`tenant_id`,`actor_user_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazioni_scope` ON `segnalazioni` (`tenant_id`,`company_id`,`contract_id`,`site_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazioni_plant_area` ON `segnalazioni` (`tenant_id`,`company_id`,`plant_id`,`area_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazioni_created_by` ON `segnalazioni` (`tenant_id`,`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazioni_assigned_to` ON `segnalazioni` (`tenant_id`,`assigned_to_user_id`);--> statement-breakpoint
CREATE INDEX `idx_segnalazioni_status` ON `segnalazioni` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_segnalazioni_deleted` ON `segnalazioni` (`deleted_at`);