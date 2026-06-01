'use strict';

const express   = require('express');
const path      = require('path');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// ─────────────────────────────────────────────
//  PASSENGER — слушаем переданный сокет/порт
//  Hostland запускает приложение через Passenger,
//  он передаёт PORT или сокет автоматически
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://practicai.ru',
  methods: ['GET', 'POST'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate-limit для API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' },
});
app.use('/api/', apiLimiter);

// Логирование
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─────────────────────────────────────────────
//  СТАТИКА — папка public/
// ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
}));

// ─────────────────────────────────────────────
//  РОУТЫ API
// ─────────────────────────────────────────────
const contactRouter = require('./routes/contact');
const healthRouter  = require('./routes/health');

app.use('/api/contact', contactRouter);
app.use('/api/health',  healthRouter);

// ─────────────────────────────────────────────
//  FALLBACK — отдаём index.html для всех маршрутов
// ─────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────
//  ОБРАБОТКА ОШИБОК
// ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ─────────────────────────────────────────────
//  ЗАПУСК
//  Passenger сам вызывает listen — просто экспортируем app.
//  Для локального запуска (node server.js) слушаем PORT.
// ─────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ PracticAI запущен: http://localhost:${PORT}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DB: ${process.env.DB_NAME || 'не задана'}`);
  });
}

// Passenger требует экспорта приложения
module.exports = app;
