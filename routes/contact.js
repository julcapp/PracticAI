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
  if (typeof name !== 'string' || typeof phone !== 'string' || typeof message !== 'string' || !name.trim() || !phone.trim() || !message.trim()) {
    return res.status(400).json({
      error: 'Заполните обязательные поля: имя, телефон, сообщение',
    });
  }

  if (name.length > 100 || phone.length > 30 || message.length > 2000 || (email && (typeof email !== 'string' || email.length > 150))) {
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
router.get('/', (_req, res) => res.status(403).json({ error: 'Доступ к обращениям только через CRM' }));

module.exports = router;
