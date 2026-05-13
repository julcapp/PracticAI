'use strict';

const express    = require('express');
const path       = require('path');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────

// Безопасность: HTTP-заголовки
app.use(helmet({
  contentSecurityPolicy: false, // отключаем CSP чтобы не ломать inline-стили/скрипты в index.html
}));

// CORS — разрешаем только свой домен
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://practicai.ru',
  methods: ['GET', 'POST'],
}));

// Парсинг JSON и form-data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ограничение запросов для API (защита от спама)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 20,                   // не более 20 запросов с одного IP
  message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' },
});
app.use('/api/', apiLimiter);

// Логирование запросов
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url} — ${req.ip}`);
  next();
});

// ─────────────────────────────────────────────
//  СТАТИКА — папка public/
// ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',          // браузер кэширует статику на 1 день
  etag:   true,
}));

// ─────────────────────────────────────────────
//  РОУТЫ API
// ─────────────────────────────────────────────
const contactRouter = require('./routes/contact');
const healthRouter  = require('./routes/health');

app.use('/api/contact', contactRouter); // POST /api/contact — форма обратной связи
app.use('/api/health',  healthRouter);  // GET  /api/health  — статус сервера + БД

// ─────────────────────────────────────────────
//  SPA FALLBACK — всегда отдаём index.html
//  (нужно если добавим React/Vue Router)
// ─────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────
//  ГЛОБАЛЬНАЯ ОБРАБОТКА ОШИБОК
// ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ─────────────────────────────────────────────
//  ЗАПУСК
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ PracticAI сервер запущен: http://localhost:${PORT}`);
  console.log(`   Режим: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
