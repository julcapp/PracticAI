'use strict';

const router = require('express').Router();
const db     = require('../db');

/**
 * GET /api/health
 * Проверка состояния сервера и базы данных
 */
router.get('/', async (_req, res) => {
  const status = {
    status:    'ok',
    uptime:    `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    db:        'unknown',
  };

  try {
    await db.execute('SELECT 1');
    status.db = 'connected';
  } catch {
    status.db     = 'disconnected';
    status.status = 'degraded';
  }

  const httpStatus = status.status === 'ok' ? 200 : 503;
  return res.status(httpStatus).json(status);
});

module.exports = router;
