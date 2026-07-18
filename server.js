'use strict';

// Загружаем .env если есть
try {
  require('dotenv').config();
} catch(e) {}

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Статика
app.use(express.static(path.join(__dirname, 'public')));

// API health (простейший, без БД)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time:   new Date().toISOString(),
    node:   process.version,
    env:    process.env.NODE_ENV || 'unknown',
    dir:    __dirname,
  });
});

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ВАЖНО для Passenger: вызываем listen()
const server = app.listen(PORT, () => {
  console.log('PracticAI started port=' + PORT + ' node=' + process.version);
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
});

module.exports = app;
