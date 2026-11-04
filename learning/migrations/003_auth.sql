CREATE TABLE IF NOT EXISTS lrn_login_tokens (
 token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 user_id CHAR(36) NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 consumed_at DATETIME(3) NULL,
 FOREIGN KEY (user_id) REFERENCES lrn_users(id),
 INDEX (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS lrn_sessions (
 token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 user_id CHAR(36) NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 FOREIGN KEY (user_id) REFERENCES lrn_users(id),
 INDEX (expires_at)
) ENGINE=InnoDB;
