'use strict';
const router = require('express').Router();
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { authenticate } = require('./admin');

const directory = path.join(__dirname, '..', 'media');
const formats = {
  png: { mime: 'image/png', valid: b => b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) },
  jpg: { mime: 'image/jpeg', valid: b => b[0] === 0xff && b[1] === 0xd8 && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9 },
  webp: { mime: 'image/webp', valid: b => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
};

router.post('/upload', authenticate, async (req, res, next) => {
  const { data, name } = req.body || {};
  const match = typeof data === 'string' && /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match || typeof name !== 'string' || name.length > 160) return res.status(400).json({ error: 'Выберите PNG, JPEG или WebP' });
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 3 * 1024 * 1024 || !formats[extension].valid(bytes)) {
    return res.status(400).json({ error: 'Неверный формат или размер более 3 МБ' });
  }
  try {
    await fs.mkdir(directory, { recursive: true, mode: 0o755 });
    const filename = `${crypto.randomUUID()}.${extension}`;
    await fs.writeFile(path.join(directory, filename), bytes, { flag: 'wx', mode: 0o644 });
    res.status(201).json({ url: `/media/${filename}` });
  } catch (error) { next(error); }
});

router.get('/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(filename)) return res.sendStatus(404);
  const extension = filename.split('.').pop();
  try {
    const bytes = await fs.readFile(path.join(directory, filename));
    res.set({ 'Content-Type': formats[extension].mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    res.send(bytes);
  } catch (error) { if (error.code === 'ENOENT') return res.sendStatus(404); next(error); }
});

module.exports = router;
