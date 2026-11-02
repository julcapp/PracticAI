'use strict';
const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const {answer: scenarioAnswer, validateScenario, directions} = require('../consultant/engine');
const {ensureScenarios, loadScenarios} = require('../consultant/store');

const schema = `CREATE TABLE IF NOT EXISTS site_content (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  placement ENUM('main','education') NOT NULL DEFAULT 'main',
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  image_url VARCHAR(120) NULL,
  layout_style ENUM('text','left','right','top') NOT NULL DEFAULT 'text',
  sort_order INT NOT NULL DEFAULT 0,
  published TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_placement_order (placement,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
const textSchema = `CREATE TABLE IF NOT EXISTS site_texts (
  text_key VARCHAR(80) NOT NULL PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
const contactsSchema = `CREATE TABLE IF NOT EXISTS contacts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150) NULL,
  message TEXT NOT NULL,
  status ENUM('new','read','replied') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contacts_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
let initialized;
function ensureSchema() {
  if (!initialized) initialized = (async () => {
    await Promise.all([db.query(schema), db.query(textSchema), db.query(contactsSchema)]);
    const [columns] = await db.query('SHOW COLUMNS FROM site_content');
    const names = new Set(columns.map(column => column.Field));
    if (!names.has('image_url')) await db.query('ALTER TABLE site_content ADD COLUMN image_url VARCHAR(120) NULL');
    if (!names.has('layout_style')) await db.query("ALTER TABLE site_content ADD COLUMN layout_style ENUM('text','left','right','top') NOT NULL DEFAULT 'text'");
  })().catch(e => { initialized = null; throw e; });
  return initialized;
}
function equal(a,b) {
  const x=crypto.createHash('sha256').update(a).digest();
  const y=crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x,y);
}
function authenticate(req,res,next) {
  const user=process.env.ADMIN_USER;
  const pass=process.env.ADMIN_PASSWORD;
  if (!user || !pass || pass.length<9) return res.status(503).json({error:'Доступ администратора ещё не настроен'});
  const header=req.get('authorization')||'';
  let decoded='';
  if (header.startsWith('Basic ')) {
    try { decoded=Buffer.from(header.slice(6),'base64').toString('utf8'); } catch (_) { /* invalid */ }
  }
  const split=decoded.indexOf(':');
  const enteredUser=split<0?'':decoded.slice(0,split);
  const enteredPass=split<0?'':decoded.slice(split+1);
  if (!equal(enteredUser,user) || !equal(enteredPass,pass)) {
    res.set('WWW-Authenticate','Basic realm="PracticAI CRM", charset="UTF-8"');
    return res.status(401).json({error:'Требуется вход администратора'});
  }
  if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
    const origin=req.get('origin');
    const expected=process.env.SITE_ORIGIN || 'https://practicai.ru';
    if (origin && origin!==expected && origin!=='http://localhost:3000') return res.status(403).json({error:'Недопустимый источник запроса'});
    if (!/^application\/json(?:;|$)/i.test(req.get('content-type')||'') || req.get('x-requested-with')!=='PracticAI-CRM') return res.status(415).json({error:'Ожидается запрос CRM в формате JSON'});
  }
  res.set('Cache-Control','no-store');
  next();
}
router.use(authenticate);
router.get('/session',(_req,res)=>res.json({ok:true}));
router.get('/diagnostics',async(_req,res)=>{
  const checks={};
  try { await db.query('SELECT 1');checks.connection='ok'; }
  catch (e) { checks.connection=e.code||'error';return res.json({checks}); }
  for (const [key,query] of [
    ['site_content','SELECT id FROM site_content LIMIT 0'],
    ['site_texts','SELECT text_key FROM site_texts LIMIT 0'],
    ['contacts','SELECT id,status FROM contacts LIMIT 0'],
  ]) {
    try { await db.query(query);checks[key]='ok'; }
    catch (e) { checks[key]=e.code||'error'; }
  }
  try {
    await ensureSchema();
    checks.schema_creation='ok';
    await db.query('SELECT image_url,layout_style FROM site_content LIMIT 0');
    checks.block_layout='ok';
    await db.query('SELECT id,status FROM contacts LIMIT 0');
    checks.contacts='ok';
    await ensureScenarios();
    checks.assistant_scenarios='ok';
  }
  catch (e) { checks.schema_creation=e.code||'error'; }
  return res.json({checks});
});
const editableKeys = ['main_title','main_contact_intro','education_title','education_intro','main_hero_image'];
router.get('/texts',async(_req,res,next)=>{
  try { await ensureSchema();const [rows]=await db.execute('SELECT text_key,value FROM site_texts');res.json({texts:Object.fromEntries(rows.map(r=>[r.text_key,r.value]))}); }catch(e){next(e)}
});
router.put('/texts',async(req,res,next)=>{
  const entries=Object.entries(req.body);
  if (!entries.length || entries.some(([k,v])=>!editableKeys.includes(k)||typeof v!=='string'||v.length>3000||(k==='main_hero_image'&&v!==''&&!/^\/media\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(v))))return res.status(400).json({error:'Недопустимое поле или слишком длинный текст'});
  try { await ensureSchema();for(const [key,value] of entries)await db.execute('INSERT INTO site_texts (text_key,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)',[key,value.trim()]);res.json({ok:true}); }catch(e){next(e)}
});
router.get('/content',async(_req,res,next)=>{
  try { await ensureSchema(); const [rows]=await db.execute('SELECT id,slug,placement,title,body,image_url,layout_style,sort_order,published,updated_at FROM site_content ORDER BY placement,sort_order,id');res.json({sections:rows}); } catch(e){next(e)}
});
function validate(data){
  const {slug,placement,title,body,image_url,layout_style,sort_order,published}=data;
  if(typeof slug!=='string'||!/^[a-z0-9-]{2,80}$/.test(slug)||!['main','education'].includes(placement)||typeof title!=='string'||!title.trim()||title.length>200||typeof body!=='string'||body.length>10000||!Number.isInteger(sort_order)||Math.abs(sort_order)>10000||![0,1,false,true].includes(published)||!['text','left','right','top'].includes(layout_style)||!(image_url===''||image_url==null||/^\/media\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(image_url)))return false;
  return true;
}
router.post('/content',async(req,res,next)=>{
  if(!validate(req.body))return res.status(400).json({error:'Проверьте поля раздела'});
  try{await ensureSchema();const d=req.body;const [r]=await db.execute('INSERT INTO site_content (slug,placement,title,body,image_url,layout_style,sort_order,published) VALUES (?,?,?,?,?,?,?,?)',[d.slug,d.placement,d.title.trim(),d.body.trim(),d.image_url||null,d.layout_style,d.sort_order,Number(d.published)]);res.status(201).json({id:r.insertId});}catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Такой код раздела уже существует'});next(e)}
});
router.put('/content/:id',async(req,res,next)=>{
  if(!validate(req.body))return res.status(400).json({error:'Проверьте поля раздела'});
  try{await ensureSchema();const d=req.body;const [r]=await db.execute('UPDATE site_content SET slug=?,placement=?,title=?,body=?,image_url=?,layout_style=?,sort_order=?,published=? WHERE id=?',[d.slug,d.placement,d.title.trim(),d.body.trim(),d.image_url||null,d.layout_style,d.sort_order,Number(d.published),req.params.id]);if(!r.affectedRows)return res.status(404).json({error:'Раздел не найден'});res.json({ok:true});}catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Такой код раздела уже существует'});next(e)}
});
router.delete('/content/:id',async(req,res,next)=>{
  try{await ensureSchema();await db.execute('DELETE FROM site_content WHERE id=?',[req.params.id]);res.json({ok:true});}catch(e){next(e)}
});
router.get('/contacts',async(_req,res,next)=>{
  try{const [rows]=await db.execute('SELECT id,name,phone,email,message,status,created_at,updated_at FROM contacts ORDER BY created_at DESC LIMIT 200');res.json({contacts:rows});}catch(e){next(e)}
});
router.patch('/contacts/:id',async(req,res,next)=>{
  if(!['new','read','replied'].includes(req.body.status))return res.status(400).json({error:'Недопустимый статус'});
  try{const [r]=await db.execute('UPDATE contacts SET status=? WHERE id=?',[req.body.status,req.params.id]);if(!r.affectedRows)return res.status(404).json({error:'Обращение не найдено'});res.json({ok:true});}catch(e){next(e)}
});

router.get('/scenarios',async(_req,res,next)=>{
  try{res.json({scenarios:await loadScenarios(),directions});}catch(e){next(e);}
});
router.post('/scenarios/preview',async(req,res)=>{
  const {scenario,message}=req.body||{};
  if(!validateScenario(scenario)||typeof message!=='string'||!message.trim()||message.length>800)return res.status(400).json({error:'Проверьте сценарий и тестовый вопрос'});
  res.json(scenarioAnswer(message.trim(),[],[{...scenario,enabled:1}],scenario.direction));
});
function scenarioValues(d){return [d.slug,d.question.trim(),d.keywords.trim(),d.answer.trim(),d.direction,Number(d.enabled),d.priority];}
router.post('/scenarios',async(req,res,next)=>{
  if(!validateScenario(req.body))return res.status(400).json({error:'Проверьте поля сценария. Ключевые фразы: буквы, цифры, пробелы, дефис; одна фраза на строку.'});
  try{await ensureScenarios();const [r]=await db.execute('INSERT INTO assistant_scenarios (slug,question,keywords,answer,direction,enabled,priority) VALUES (?,?,?,?,?,?,?)',scenarioValues(req.body));res.status(201).json({id:r.insertId});}
  catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Такой код сценария уже существует'});next(e);}
});
router.put('/scenarios/:id',async(req,res,next)=>{
  if(!/^[1-9][0-9]{0,9}$/.test(req.params.id)||!validateScenario(req.body))return res.status(400).json({error:'Проверьте поля сценария'});
  try{await ensureScenarios();const [r]=await db.execute('UPDATE assistant_scenarios SET slug=?,question=?,keywords=?,answer=?,direction=?,enabled=?,priority=? WHERE id=?',[...scenarioValues(req.body),req.params.id]);if(!r.affectedRows)return res.status(404).json({error:'Сценарий не найден'});res.json({ok:true});}
  catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Такой код сценария уже существует'});next(e);}
});
router.delete('/scenarios/:id',async(req,res,next)=>{
  if(!/^[1-9][0-9]{0,9}$/.test(req.params.id))return res.status(400).json({error:'Недопустимый номер сценария'});
  try{await ensureScenarios();const [r]=await db.execute('DELETE FROM assistant_scenarios WHERE id=?',[req.params.id]);if(!r.affectedRows)return res.status(404).json({error:'Сценарий не найден'});res.json({ok:true});}catch(e){next(e);}
});
module.exports={router,authenticate,ensureSchema};

