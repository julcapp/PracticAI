'use strict';

const router = require('express').Router();
const db     = require('../db');

/**
 * POST /api/contact
 * Тело запроса: { name, phone, email, message }
 * Сохраняет заявку в MySQL таблицу `contacts`
 */
router.post('/', async (req, res) => {
  const { name, phone, email, message } = req.body;

  // ── Валидация ──────────────────────────────
  if (!name || !phone || !message) {
    return res.status(400).json({
      error: 'Заполните обязательные поля: имя, телефон, сообщение',
    });
  }

  if (name.length > 100 || message.length > 2000) {
    return res.status(400).json({ error: 'Слишком длинные данные' });
  }

  // Простая проверка email если передан
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  // ── Сохранение в БД ────────────────────────
  try {
    const [result] = await db.execute(
      `INSERT INTO contacts (name, phone, email, message, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [name.trim(), phone.trim(), email?.trim() || null, message.trim()]
    );

    console.log(`📩 Новая заявка #${result.insertId} от ${name}`);

    return res.status(201).json({
      success: true,
      message: 'Ваша заявка принята! Мы свяжемся с вами в ближайшее время.',
      id: result.insertId,
    });

  } catch (err) {
    console.error('[contact] DB error:', err.message);
    return res.status(500).json({ error: 'Ошибка сохранения. Попробуйте позже.' });
  }
});

/**
 * GET /api/contact
 * Список всех заявок (только для внутреннего использования)
 * TODO: добавить авторизацию перед выводом в продакшн
 */
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, phone, email, message, created_at FROM contacts ORDER BY created_at DESC LIMIT 100'
    );
    return res.json({ contacts: rows });
  } catch (err) {
    console.error('[contact] DB error:', err.message);
    return res.status(500).json({ error: 'Ошибка загрузки данных' });
  }
});

module.exports = router;
