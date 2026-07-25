CREATE TABLE "roles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"role_id" bigint,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255),
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"password_hash" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"customer_id" bigint NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"legal_name" varchar(255),
	"entity_type" varchar(100),
	"pan" varchar(20),
	"gstin" varchar(20),
	"tan" varchar(20),
	"cin" varchar(50),
	"llpin" varchar(50),
	"udyam_no" varchar(50),
	"incorporation_date" date,
	"state" varchar(100),
	"city" varchar(100),
	"pincode" varchar(20),
	"address" text,
	"postal_address" text,
	"directors" text,
	"aadhaar" varchar(20),
	"passport" varchar(50),
	"status" varchar(50) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_fields" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"form_id" bigint NOT NULL,
	"label" varchar(255) NOT NULL,
	"field_key" varchar(255) NOT NULL,
	"field_type" varchar(100) NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"step_name" varchar(255),
	"options" text
);
--> statement-breakpoint
CREATE TABLE "service_forms" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"service_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_subcategories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"category_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subcategory_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"professional_fee" numeric(12, 2) NOT NULL,
	"govt_fee" numeric(12, 2) NOT NULL,
	"gst_percent" numeric(5, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"slug" varchar(255),
	"short_title" varchar(255),
	"authority" varchar(255),
	"form_no" varchar(255),
	"icon" varchar(60),
	"who_can_apply" text,
	"acts_rules" text,
	"validity" varchar(255),
	"nsws_applied" boolean DEFAULT false,
	"acts_rules_pdfs" text,
	"tabs" text,
	"fee_lines" text
);
--> statement-breakpoint
CREATE TABLE "estimates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"professional_fee" numeric(12, 2) NOT NULL,
	"govt_fee" numeric(12, 2) NOT NULL,
	"other_fee" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"gst" numeric(12, 2) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"invoice_no" varchar(100) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'unpaid' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_field_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"field_id" bigint NOT NULL,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_no" varchar(100) NOT NULL,
	"customer_id" bigint NOT NULL,
	"business_id" bigint,
	"service_id" bigint NOT NULL,
	"status" varchar(100) DEFAULT 'pending' NOT NULL,
	"estimated_amount" numeric(12, 2) NOT NULL,
	"final_amount" numeric(12, 2) NOT NULL,
	"payment_status" varchar(50) DEFAULT 'unpaid' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"invoice_id" bigint NOT NULL,
	"payment_mode" varchar(100) NOT NULL,
	"transaction_ref" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'completed' NOT NULL,
	"paid_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"service_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"mandatory" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_documents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"document_type_id" bigint NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" varchar(1024) NOT NULL,
	"verification_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"action" varchar(255) NOT NULL,
	"module" varchar(100) NOT NULL,
	"record_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_calendar" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"service_id" bigint,
	"title" varchar(255) NOT NULL,
	"due_date" date NOT NULL,
	"penalty" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"order_id" bigint,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email_or_phone" varchar(255) NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"customer_id" bigint NOT NULL,
	"order_id" bigint,
	"subject" varchar(255) NOT NULL,
	"status" varchar(100) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ticket_id" bigint NOT NULL,
	"sender_id" bigint NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_documents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"request_id" bigint,
	"user_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"size_bytes" bigint,
	"storage_path" varchar(1024) NOT NULL,
	"mime_type" varchar(255),
	"is_vault" varchar(50) DEFAULT 'false',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"service_slug" varchar(255) NOT NULL,
	"service_title" varchar(255) NOT NULL,
	"authority" varchar(255),
	"form" varchar(255),
	"business_name" varchar(255),
	"contact_name" varchar(255) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(50) NOT NULL,
	"authorised_capital" bigint,
	"paid_capital" bigint,
	"notes" text,
	"form_data" text,
	"status" varchar(100) DEFAULT 'submitted' NOT NULL,
	"reference_no" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_fields" ADD CONSTRAINT "service_fields_form_id_service_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."service_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_forms" ADD CONSTRAINT "service_forms_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_subcategories" ADD CONSTRAINT "service_subcategories_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_subcategory_id_service_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."service_subcategories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_field_values" ADD CONSTRAINT "order_field_values_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_field_values" ADD CONSTRAINT "order_field_values_field_id_service_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."service_fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_documents" ADD CONSTRAINT "order_documents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_documents" ADD CONSTRAINT "order_documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_calendar" ADD CONSTRAINT "compliance_calendar_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_documents" ADD CONSTRAINT "request_documents_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_documents" ADD CONSTRAINT "request_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;