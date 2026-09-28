'use strict';

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
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
app.use(['/admin', '/admin.html', '/api/admin'], rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));

// Статика из папки public/
const { router: adminRouter, authenticate } = require('./routes/admin');
const publicDir = path.join(__dirname, 'public');
app.get('/admin', authenticate, (_req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.html')));
app.get('/admin.html', authenticate, (_req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.html')));
app.get('/', (_req, res, next) => {
  fs.readFile(path.join(publicDir, 'index.html'), 'utf8', (error, html) => {
    if (error) return next(error);
    res.type('html').send(html.replace('</body>', '<script src="/site-enhancements.js" defer></script></body>'));
  });
});
app.use(express.static(publicDir, { etag: true, index: false }));

// API
const healthRouter  = require('./routes/health');
const contactRouter = require('./routes/contact');
app.use('/api/health',  healthRouter);
app.use('/api/contact', contactRouter);
app.use('/api/admin', adminRouter);
app.use('/api/content', require('./routes/content'));

// SPA fallback
app.get('*', (_req, res) => {
  res.status(404).send('Страница не найдена');
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
