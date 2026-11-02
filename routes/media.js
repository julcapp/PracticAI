'use strict';
const router = require('express').Router();
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { authenticate } = require('./admin');

const directory = path.join(__dirname, '..', 'media');
const {formats,decodeUpload}=require('../cms/media');

router.post('/upload', authenticate, async (req, res, next) => {
  const { data, name } = req.body || {};
  let extension,bytes;
  try { ({extension,bytes}=decodeUpload(data,name)); } catch(e) { return res.status(400).json({error:e.message}); }
  try {
    await fs.mkdir(directory, { recursive: true, mode: 0o755 });
    const filename = `${crypto.randomUUID()}.${extension}`;
    await fs.writeFile(path.join(directory, filename), bytes, { flag: 'wx', mode: 0o644 });
    res.status(201).json({ url: `/media/${filename}` });
  } catch (error) { next(error); }
});

router.get('/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/.test(filename)) return res.sendStatus(404);
  const extension = filename.split('.').pop();
  try {
    const bytes = await fs.readFile(path.join(directory, filename));
    res.set({ 'Content-Type': formats[extension].mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    if(extension==='pdf')res.set('Content-Disposition','attachment; filename="'+filename+'"');
    res.send(bytes);
  } catch (error) { if (error.code === 'ENOENT') return res.sendStatus(404); next(error); }
});

module.exports = router;

