<?php
/**
 * PracticAI — одноразовый скрипт миграции БД
 * Удалить после выполнения!
 */

// Простая защита — запуск только с ключом
$key = $_GET['key'] ?? '';
if ($key !== 'practicai_migrate_2024') {
    die('403 Forbidden');
}

$host   = 'localhost';
$user   = 'host1688282_practicai';
$pass   = 'Fastbreak17!';
$dbname = 'host1688282_practicai';

$mysqli = new mysqli($host, $user, $pass, $dbname);

if ($mysqli->connect_errno) {
    die('❌ MySQL connect error: ' . $mysqli->connect_error);
}

$sql = "
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
";

if ($mysqli->query($sql)) {
    // Проверяем таблицу
    $result = $mysqli->query("SHOW TABLES LIKE 'contacts'");
    if ($result->num_rows > 0) {
        echo '✅ Миграция выполнена успешно! Таблица contacts создана.<br>';
        echo '⚠️ ВАЖНО: удалите этот файл migrate.php с сервера!';
    }
} else {
    echo '❌ Ошибка: ' . $mysqli->error;
}

$mysqli->close();
