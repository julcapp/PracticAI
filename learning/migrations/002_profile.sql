CREATE TABLE IF NOT EXISTS lrn_profiles (
 user_id CHAR(36) CHARACTER SET ascii NOT NULL PRIMARY KEY,
 phone VARCHAR(16) CHARACTER SET ascii NOT NULL,
 telegram VARCHAR(32) CHARACTER SET ascii NULL,
 max_url VARCHAR(500) CHARACTER SET ascii NULL,
 whatsapp VARCHAR(16) CHARACTER SET ascii NULL,
 preferred_channel ENUM('email','phone','telegram','max','whatsapp') NOT NULL DEFAULT 'email',
 phone_verified_at DATETIME(3) NULL, telegram_verified_at DATETIME(3) NULL,
 max_verified_at DATETIME(3) NULL, whatsapp_verified_at DATETIME(3) NULL,
 updated_at DATETIME(3) NOT NULL,
 FOREIGN KEY (user_id) REFERENCES lrn_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
