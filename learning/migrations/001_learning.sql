-- Isolated learning database only. All DATETIME values are UTC.
-- Additive and restart-safe for an empty/partially migrated schema; never drops data.
CREATE TABLE IF NOT EXISTS lrn_users (
 id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY,
 email VARCHAR(254) NOT NULL, name VARCHAR(200) NOT NULL DEFAULT '',
 email_verified_at DATETIME(3) NULL, created_at DATETIME(3) NOT NULL,
 UNIQUE KEY uq_lrn_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS lrn_courses (
 id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY,
 slug VARCHAR(120) CHARACTER SET ascii NOT NULL,
 title VARCHAR(200) NOT NULL, description TEXT NOT NULL,
 amount_kopecks INT UNSIGNED NOT NULL, currency CHAR(3) CHARACTER SET ascii NOT NULL DEFAULT 'RUB',
 access_months TINYINT UNSIGNED NOT NULL DEFAULT 3,
 status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
 UNIQUE KEY uq_lrn_course_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS lrn_lessons (
 id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY,
 course_id CHAR(36) CHARACTER SET ascii NOT NULL,
 title VARCHAR(200) NOT NULL, body LONGTEXT NOT NULL, sort_order INT UNSIGNED NOT NULL,
 status ENUM('draft','published') NOT NULL DEFAULT 'draft',
 created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
 UNIQUE KEY uq_lrn_lesson_order (course_id,sort_order),
 UNIQUE KEY uq_lrn_lesson_course (id,course_id),
 FOREIGN KEY (course_id) REFERENCES lrn_courses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS lrn_materials (
 id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY,
 lesson_id CHAR(36) CHARACTER SET ascii NOT NULL, course_id CHAR(36) CHARACTER SET ascii NOT NULL,
 title VARCHAR(200) NOT NULL, kind ENUM('pdf','video','presentation','file') NOT NULL,
 storage_key VARCHAR(200) CHARACTER SET ascii NOT NULL,
 original_name VARCHAR(255) NOT NULL, mime_type VARCHAR(120) NOT NULL,
 byte_size BIGINT UNSIGNED NOT NULL, sha256 CHAR(64) CHARACTER SET ascii NOT NULL,
 created_at DATETIME(3) NOT NULL,
 UNIQUE KEY uq_lrn_storage_key (storage_key),
 FOREIGN KEY (lesson_id,course_id) REFERENCES lrn_lessons(id,course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS lrn_orders (
 id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY,
 user_id CHAR(36) CHARACTER SET ascii NOT NULL, course_id CHAR(36) CHARACTER SET ascii NOT NULL,
 course_title VARCHAR(200) NOT NULL, amount_kopecks INT UNSIGNED NOT NULL,
 currency CHAR(3) CHARACTER SET ascii NOT NULL DEFAULT 'RUB', access_months TINYINT UNSIGNED NOT NULL DEFAULT 3,
 status ENUM('pending','paid','canceled','refunded') NOT NULL DEFAULT 'pending',
 offer_version VARCHAR(80) NOT NULL, consent_version VARCHAR(80) NOT NULL,
 created_at DATETIME(3) NOT NULL, paid_at DATETIME(3) NULL,
 UNIQUE KEY uq_lrn_order_owner (id,user_id,course_id),
 FOREIGN KEY (user_id) REFERENCES lrn_users(id), FOREIGN KEY (course_id) REFERENCES lrn_courses(id),
 KEY idx_lrn_orders_user (user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS lrn_payments (
 id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY,
 order_id CHAR(36) CHARACTER SET ascii NOT NULL,
 provider_payment_id VARCHAR(64) CHARACTER SET ascii NULL,
 idempotence_key CHAR(36) CHARACTER SET ascii NOT NULL,
 shop_id VARCHAR(32) CHARACTER SET ascii NOT NULL, test_mode TINYINT UNSIGNED NOT NULL,
 status ENUM('created','pending','waiting_for_capture','succeeded','canceled','refunded') NOT NULL DEFAULT 'created',
 created_at DATETIME(3) NOT NULL, verified_at DATETIME(3) NULL,
 UNIQUE KEY uq_lrn_payment_order (order_id), UNIQUE KEY uq_lrn_provider_id (provider_payment_id),
 UNIQUE KEY uq_lrn_payment_key (idempotence_key),
 FOREIGN KEY (order_id) REFERENCES lrn_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS lrn_access (
 id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY,
 order_id CHAR(36) CHARACTER SET ascii NOT NULL, user_id CHAR(36) CHARACTER SET ascii NOT NULL,
 course_id CHAR(36) CHARACTER SET ascii NOT NULL,
 starts_at DATETIME(3) NOT NULL, ends_at DATETIME(3) NOT NULL,
 status ENUM('active','revoked') NOT NULL DEFAULT 'active',
 first_opened_at DATETIME(3) NULL,
 UNIQUE KEY uq_lrn_access_order (order_id), KEY idx_lrn_access_lookup(user_id,course_id,status,ends_at),
 FOREIGN KEY (order_id,user_id,course_id) REFERENCES lrn_orders(id,user_id,course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS lrn_events (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 order_id CHAR(36) CHARACTER SET ascii NOT NULL,
 event_key VARCHAR(180) CHARACTER SET ascii NOT NULL, event_type VARCHAR(40) CHARACTER SET ascii NOT NULL,
 payload JSON NOT NULL, created_at DATETIME(3) NOT NULL,
 UNIQUE KEY uq_lrn_event_key (event_key), FOREIGN KEY (order_id) REFERENCES lrn_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS lrn_documents (
 id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY, order_id CHAR(36) CHARACTER SET ascii NOT NULL,
 kind ENUM('payment_confirmation','access_granted','acceptance_act') NOT NULL,
 status ENUM('draft','issued','void') NOT NULL,
 snapshot JSON NOT NULL, created_at DATETIME(3) NOT NULL,
 UNIQUE KEY uq_lrn_document (order_id,kind), FOREIGN KEY (order_id) REFERENCES lrn_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS lrn_mail_outbox (
 id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY,
 order_id CHAR(36) CHARACTER SET ascii NOT NULL, template VARCHAR(60) CHARACTER SET ascii NOT NULL,
 recipient VARCHAR(254) NOT NULL, payload JSON NOT NULL,
 status ENUM('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
 attempts INT UNSIGNED NOT NULL DEFAULT 0, available_at DATETIME(3) NOT NULL,
 locked_at DATETIME(3) NULL, sent_at DATETIME(3) NULL, last_error VARCHAR(500) NULL,
 UNIQUE KEY uq_lrn_mail (order_id,template), KEY idx_lrn_outbox(status,available_at),
 FOREIGN KEY (order_id) REFERENCES lrn_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
