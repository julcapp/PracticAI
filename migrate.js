/**
 * Одноразовый скрипт миграции БД
 * Запустить на сервере: node migrate.js
 * После успешного выполнения — удалить файл
 */
'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');

const SQL = `
CREATE TABLE IF NOT EXISTS \`contacts\` (
  \`id\`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  \`name\`       VARCHAR(100)    NOT NULL COMMENT 'Имя клиента',
  \`phone\`      VARCHAR(30)     NOT NULL COMMENT 'Телефон',
  \`email\`      VARCHAR(150)        NULL COMMENT 'Email (необязательно)',
  \`message\`    TEXT            NOT NULL COMMENT 'Сообщение',
  \`status\`     ENUM('new','read','replied') NOT NULL DEFAULT 'new' COMMENT 'Статус заявки',
  \`created_at\` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_status\`     (\`status\`),
  INDEX \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Заявки с формы обратной связи practicai.ru';
`;

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      user:     process.env.DB_USER     || 'host1688282_practicai',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME     || 'host1688282_practicai',
      port:     process.env.DB_PORT     || 3306,
    });
    console.log('✅ MySQL подключена');
    await conn.execute(SQL);
    console.log('✅ Таблица contacts создана (или уже существует)');

    // Проверяем
    const [rows] = await conn.execute("SHOW TABLES LIKE 'contacts'");
    console.log('✅ Проверка:', rows.length ? 'таблица contacts существует' : '❌ таблица не найдена');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
})();
