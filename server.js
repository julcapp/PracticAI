'use strict';

const express  = require('express');
const path     = require('path');
const helmet   = require('helmet');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: ['https://practicai.ru', 'http://practicai.ru'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Логирование
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Статика ────────────────────────────────────────
// ВАЖНО: статику отдаём из папки public/
// Passenger смотрит на public/ как DocumentRoot
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: '1h',
}));

// ── API роуты ──────────────────────────────────────
const healthRouter  = require('./routes/health');
const contactRouter = require('./routes/contact');

app.use('/api/health',  healthRouter);
app.use('/api/contact', contactRouter);

// ── SPA fallback ───────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Обработка ошибок ───────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.stack || err.message);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ── Запуск ─────────────────────────────────────────
// Passenger: требует экспорта app И вызова listen
// При работе через Passenger порт игнорируется,
// но listen() вызвать необходимо
app.listen(PORT, () => {
  console.log(`✅ PracticAI запущен на порту ${PORT}`);
  console.log(`   NODE_ENV:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Node.js:   ${process.version}`);
  console.log(`   __dirname: ${__dirname}`);
});

// Экспорт для Passenger
module.exports = app;
