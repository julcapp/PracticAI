'use strict';

const mysql = require('mysql2/promise');

// Пул соединений — эффективнее одиночного connection
const pool = mysql.createPool({
  host:              process.env.DB_HOST     || 'localhost',
  user:              process.env.DB_USER     || 'host1688282_practicai',
  password:          process.env.DB_PASSWORD,
  database:          process.env.DB_NAME     || 'host1688282_practicai',
  port:              process.env.DB_PORT     || 3306,
  waitForConnections: true,
  connectionLimit:   10,   // максимум 10 одновременных соединений
  queueLimit:        0,
  timezone:          '+03:00', // Москва
  charset:           'utf8mb4',
});

// Проверка соединения при старте
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL подключена:', process.env.DB_NAME || 'host1688282_practicai');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL ошибка подключения:', err.message);
  });

module.exports = pool;
