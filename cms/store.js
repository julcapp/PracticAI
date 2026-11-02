'use strict';
const db=require('../db');
const {initialDocuments,getTemplates}=require('./template');
const {validatePayload,makeBlock}=require('./model');
let ready,publicCache,publicAt=0;
const error=(status,message)=>Object.assign(new Error(message),{status});
const decode=row=>({id:row.id,kind:row.kind,label:row.label,version:Number(row.version),publishedVersion:Number(row.published_version),updatedAt:row.updated_at,draft:JSON.parse(row.draft),published:row.published?JSON.parse(row.published):null});
async function legacyRows(conn,table){try{const [rows]=await conn.query('SELECT * FROM '+table);return rows;}catch(e){if(e.code==='ER_NO_SUCH_TABLE')return [];throw e;}}
function importLegacy(docs,texts,blocks){
 const map=Object.fromEntries(texts.map(r=>[r.text_key,r.value]));
 for(const [slug,keys] of [['main',['main_title','main_contact_intro','main_hero_image']],['education',['education_title','education_intro']]]){
  const page=docs.find(x=>x.id==='page-'+slug).payload;
  const {JSDOM}=require('jsdom'),dom=new JSDOM(getTemplates()[slug].html),d=dom.window.document;
  const selectors=slug==='main'?['h1','#contact .contact-info p','.hero [data-cms-field-image]']:['h1','.hero p'];
  for(const [i,k] of keys.entries())if(map[k]){
   const target=d.querySelector(selectors[i]);if(!target)continue;
   const elements=[...(target.matches('[data-cms-field],[data-cms-field-image]')?[target]:target.querySelectorAll('[data-cms-field]'))];
   const fields=elements.map(el=>el.getAttribute('data-cms-field')||el.getAttribute('data-cms-field-image'));
   for(const section of page.sections)for(const f of section.fields)if(fields.includes(f.key))f.value=f.key===fields[0]?String(map[k]).slice(0,10000):'';
  }dom.window.close();
 }
 for(const row of [...blocks].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.id-b.id)){const page=docs.find(x=>x.id==='page-'+row.placement)?.payload;if(!page)continue;const b=makeBlock(row.image_url?'image':'text','legacy-'+row.id);b.label=row.title;b.hidden=!row.published;const vals={title:row.title,body:row.body,image:row.image_url||'',layout:row.layout_style==='text'?'left':row.layout_style||'left'};for(const f of b.fields)if(f.key in vals)f.value=vals[f.key];const at=page.sections.findIndex(x=>x.id===(row.placement==='main'?'contact':'details'));if(at>=0)page.sections.splice(at,0,b);else page.sections.push(b);}
 return docs;
}
function ensureCMS(){
 if(!ready)ready=(async()=>{
  await db.query(`CREATE TABLE IF NOT EXISTS cms_documents (
   id VARCHAR(100) NOT NULL PRIMARY KEY,kind VARCHAR(20) NOT NULL,label VARCHAR(200) NOT NULL,
   draft LONGTEXT NOT NULL,published LONGTEXT NULL,version INT UNSIGNED NOT NULL DEFAULT 1,
   published_version INT UNSIGNED NOT NULL DEFAULT 0,
   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS cms_revisions (
   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,document_id VARCHAR(100) NOT NULL,
   version INT UNSIGNED NOT NULL,payload LONGTEXT NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
   INDEX idx_cms_history(document_id,id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS cms_backups (id TINYINT NOT NULL PRIMARY KEY,payload LONGTEXT NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await db.query(`CREATE TABLE IF NOT EXISTS cms_setup (id TINYINT NOT NULL PRIMARY KEY,seeded TINYINT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const conn=await db.getConnection();try{
   await conn.beginTransaction();await conn.execute('INSERT IGNORE INTO cms_setup (id,seeded) VALUES (1,0)');const [[state]]=await conn.query('SELECT seeded FROM cms_setup WHERE id=1 FOR UPDATE');
   if(!state.seeded){
    const texts=await legacyRows(conn,'site_texts'),blocks=await legacyRows(conn,'site_content');
    await conn.execute('INSERT IGNORE INTO cms_backups (id,payload) VALUES (1,?)',[JSON.stringify({site_texts:texts,site_content:blocks})]);
    for(const doc of importLegacy(initialDocuments(),texts,blocks)){
     const problem=validatePayload(doc.kind,doc.payload);if(problem)throw error(500,'Не удалось перенести содержимое: '+problem);
     const json=JSON.stringify(doc.payload);await conn.execute('INSERT IGNORE INTO cms_documents (id,kind,label,draft,published,version,published_version) VALUES (?,?,?,?,?,1,1)',[doc.id,doc.kind,doc.label,json,json]);
    }
    await conn.execute('UPDATE cms_setup SET seeded=1 WHERE id=1');
   }await conn.commit();
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
 })().catch(e=>{ready=null;throw e;});return ready;
}
async function getDocument(id){await ensureCMS();const [[row]]=await db.execute('SELECT * FROM cms_documents WHERE id=?',[id]);if(!row)throw error(404,'Документ не найден');const [history]=await db.execute('SELECT id,version,created_at AS createdAt FROM cms_revisions WHERE document_id=? ORDER BY id DESC LIMIT 50',[id]);return {...decode(row),history};}
async function listDocuments(){await ensureCMS();const [rows]=await db.query('SELECT id,kind,label,version,published_version AS publishedVersion,updated_at AS updatedAt FROM cms_documents ORDER BY kind,id');return rows;}
async function changeDocument(id,expected,operation){
 await ensureCMS();const conn=await db.getConnection();try{
  await conn.beginTransaction();const [[row]]=await conn.execute('SELECT * FROM cms_documents WHERE id=? FOR UPDATE',[id]);if(!row)throw error(404,'Документ не найден');if(!Number.isInteger(expected)||Number(row.version)!==expected)throw error(409,'Документ изменён в другом окне. Скопируйте свой текст и загрузите свежую версию.');
  const doc=decode(row);await operation(conn,doc);await conn.commit();publicCache=null;
 }catch(e){await conn.rollback();throw e;}finally{conn.release();}
 return getDocument(id);
}
function checkPayload(doc,payload){
 const problem=validatePayload(doc.kind,payload);if(problem)throw error(400,problem);
 if(doc.kind==='page'){
  if(payload.slug!==doc.draft.slug)throw error(400,'Адрес существующей страницы менять нельзя');
  const original=getTemplates()[payload.slug]?.payload;
  if(!original&&payload.sections.some(s=>s.kind==='existing'))throw error(400,'Новая страница не содержит исходных разделов');
  if(original){
   const first=original.sections.findIndex(s=>!s.fixed),last=original.sections.findLastIndex(s=>!s.fixed);
   const prefix=original.sections.slice(0,first).map(s=>s.id),suffix=original.sections.slice(last+1).map(s=>s.id);
   if(prefix.some((id,i)=>payload.sections[i]?.id!==id)||suffix.some((id,i)=>payload.sections[payload.sections.length-suffix.length+i]?.id!==id))throw error(400,'Шапка и подвал сохраняют своё место. Перемещайте содержательные разделы между ними.');
  }
  if(original){for(const s of payload.sections.filter(x=>x.kind==='existing')){const seed=original.sections.find(x=>x.id===s.id);if(!seed)throw error(400,'Неизвестный исходный раздел');for(const f of s.fields){const allowed=seed.fields.find(x=>x.key===f.key&&x.type===f.type);if(!allowed)throw error(400,'Неизвестное поле исходного раздела');}}}
 }
}
async function saveDocument(id,version,payload){return changeDocument(id,version,async(conn,doc)=>{checkPayload(doc,payload);await conn.execute('UPDATE cms_documents SET draft=?,label=?,version=version+1 WHERE id=?',[JSON.stringify(payload),doc.kind==='page'?payload.title:doc.label,id]);});}
async function publishDocument(id,version){return changeDocument(id,version,async(conn,doc)=>{checkPayload(doc,doc.draft);if(doc.published)await conn.execute('INSERT INTO cms_revisions (document_id,version,payload) VALUES (?,?,?)',[id,doc.publishedVersion,JSON.stringify(doc.published)]);await conn.execute('UPDATE cms_documents SET published=draft,published_version=version+1,version=version+1 WHERE id=?',[id]);});}
async function restoreDocument(id,version,revisionId){return changeDocument(id,version,async(conn,doc)=>{const [[r]]=await conn.execute('SELECT payload FROM cms_revisions WHERE id=? AND document_id=?',[revisionId,id]);if(!r)throw error(404,'Редакция не найдена');const payload=JSON.parse(r.payload);checkPayload(doc,payload);await conn.execute('UPDATE cms_documents SET draft=?,version=version+1 WHERE id=?',[JSON.stringify(payload),id]);});}
async function createPage(slug,title){
 await ensureCMS();const payload={slug,title,description:'',sections:[makeBlock('text')]};const problem=validatePayload('page',payload);if(problem)throw error(400,problem);if(['main','education','accountants'].includes(slug))throw error(409,'Такой адрес занят');
 try{await db.execute('INSERT INTO cms_documents (id,kind,label,draft,published,version,published_version) VALUES (?,?,?, ?,NULL,1,0)',['page-'+slug,'page',title,JSON.stringify(payload)]);}catch(e){if(e.code==='ER_DUP_ENTRY')throw error(409,'Такой адрес уже существует');throw e;}return getDocument('page-'+slug);
}
async function getPublished(){await ensureCMS();if(publicCache&&Date.now()-publicAt<2000)return publicCache;const [rows]=await db.query('SELECT id,kind,published,published_version FROM cms_documents WHERE published IS NOT NULL');const docs={};for(const row of rows)docs[row.id]={kind:row.kind,payload:JSON.parse(row.published),version:Number(row.published_version)};publicCache=docs;publicAt=Date.now();return docs;}
module.exports={ensureCMS,listDocuments,getDocument,saveDocument,publishDocument,restoreDocument,createPage,getPublished,checkPayload,importLegacy,error};
