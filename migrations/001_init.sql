-- ─────────────────────────────────────────────
--  PracticAI — миграция базы данных
--  Запустить один раз через phpMyAdmin или CLI:
--  mysql -u host1688282_practicai -p host1688282_practicai < migrations/001_init.sql
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `contacts` (
  `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(100)    NOT NULL COMMENT 'Имя клиента',
  `phone`      VARCHAR(30)     NOT NULL COMMENT 'Телефон',
  `email`      VARCHAR(150)        NULL COMMENT 'Email (необязательно)',
  `message`    TEXT            NOT NULL COMMENT 'Сообщение',
  `status`     ENUM('new','read','replied') NOT NULL DEFAULT 'new' COMMENT 'Статус заявки',
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status`     (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Заявки с формы обратной связи practicai.ru';
