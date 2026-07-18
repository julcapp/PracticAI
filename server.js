'use strict';

const express  = require('express');
const path     = require('path');
const helmet   = require('helmet');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ['https://practicai.ru', 'http://practicai.ru'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Статика из папки public/
app.use(express.static(path.join(__dirname, 'public'), { etag: true }));

// API
const healthRouter  = require('./routes/health');
const contactRouter = require('./routes/contact');
app.use('/api/health',  healthRouter);
app.use('/api/contact', contactRouter);

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ошибки
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Запуск — Passenger требует и listen() и module.exports
const server = app.listen(PORT, () => {
  console.log(`PracticAI running on port ${PORT}`);
  console.log(`Node: ${process.version}, DIR: ${__dirname}`);
});

module.exports = app;
