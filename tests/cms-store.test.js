'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
let seeded=false,docs=new Map(),revisions=[],backup;
const clone=x=>structuredClone(x);
async function sql(query,args=[]){
 if(query.startsWith('CREATE TABLE'))return [{}];
 if(query.startsWith('SELECT * FROM site_'))return [[]];
 if(query==='SELECT seeded FROM cms_setup WHERE id=1 FOR UPDATE')return [[{seeded:Number(seeded)}]];
 if(query.startsWith('INSERT IGNORE INTO cms_setup'))return [{}];
 if(query.startsWith('INSERT IGNORE INTO cms_backups')){backup??=args[0];return [{}];}
 if(query.startsWith('UPDATE cms_setup')){seeded=true;return [{}];}
 if(query.startsWith('INSERT IGNORE INTO cms_documents')){const [id,kind,label,draft,published]=args;if(!docs.has(id))docs.set(id,{id,kind,label,draft,published,version:1,published_version:1});return [{}];}
 if(query.startsWith('INSERT INTO cms_documents')){const [id,kind,label,draft]=args;if(docs.has(id))throw Object.assign(Error('duplicate'),{code:'ER_DUP_ENTRY'});docs.set(id,{id,kind,label,draft,published:null,version:1,published_version:0});return [{}];}
 if(query.startsWith('SELECT * FROM cms_documents'))return [[...docs.values()].filter(x=>x.id===args[0]).map(clone)];
 if(query.startsWith('SELECT id,version,created_at'))return [revisions.filter(x=>x.document_id===args[0]).map(x=>({id:x.id,version:x.version,createdAt:'2026-11-02'})).reverse()];
 if(query.startsWith('SELECT payload FROM cms_revisions'))return [revisions.filter(x=>x.id===Number(args[0])&&x.document_id===args[1]).map(clone)];
 if(query.startsWith('SELECT id,kind,label'))return [[...docs.values()].map(x=>({id:x.id,kind:x.kind,label:x.label,version:x.version,publishedVersion:x.published_version}))];
 if(query.startsWith('SELECT id,kind,published'))return [[...docs.values()].filter(x=>x.published).map(clone)];
 if(query.startsWith('UPDATE cms_documents SET draft=?,label=?')){const row=docs.get(args[2]);row.draft=args[0];row.label=args[1];row.version++;return [{}];}
 if(query.startsWith('UPDATE cms_documents SET draft=?')){const row=docs.get(args[1]);row.draft=args[0];row.version++;return [{}];}
 if(query.startsWith('UPDATE cms_documents SET published=')){const row=docs.get(args[0]);row.published=row.draft;row.published_version=row.version+1;row.version++;return [{}];}
 if(query.startsWith('INSERT INTO cms_revisions')){revisions.push({id:revisions.length+1,document_id:args[0],version:args[1],payload:args[2]});return [{}];}
 throw Error('Unexpected SQL: '+query);
}
const dbPath=require.resolve('../db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:sql,execute:sql,getConnection:async()=>{let snap;return {query:sql,execute:sql,beginTransaction:async()=>{snap={docs:clone(docs),revisions:clone(revisions),seeded,backup}},commit:async()=>{},rollback:async()=>{({docs,revisions,seeded,backup}=snap)},release:()=>{}}}}};
const store=require('../cms/store');
test('initialization snapshots legacy once and does not overwrite existing content',async()=>{
 await store.ensureCMS();assert.equal((await store.listDocuments()).length,6);assert.ok(backup);const d=await store.getDocument('page-main');d.draft.title='Наш заголовок';const saved=await store.saveDocument(d.id,d.version,d.draft);assert.equal(saved.version,2);await store.ensureCMS();assert.equal((await store.getDocument(d.id)).draft.title,'Наш заголовок');assert.notEqual((await store.getPublished())[d.id].payload.title,'Наш заголовок');
});
test('stale save and publish rejected, publish creates revision, restore is draft-only',async()=>{
 let d=await store.getDocument('page-main');await assert.rejects(store.saveDocument(d.id,d.version-1,d.draft),e=>e.status===409);await assert.rejects(store.publishDocument(d.id,d.version-1),e=>e.status===409);
 d=await store.publishDocument(d.id,d.version);assert.equal(d.publishedVersion,d.version);assert.equal(d.history.length,1);assert.equal((await store.getPublished())[d.id].payload.title,'Наш заголовок');
 const originalTitle=JSON.parse(revisions[0].payload).title;d=await store.restoreDocument(d.id,d.version,d.history[0].id);assert.equal(d.draft.title,originalTitle);assert.equal((await store.getPublished())[d.id].payload.title,'Наш заголовок');
});
test('new page stays private until publish, bad keys and script URLs rejected',async()=>{
 let d=await store.createPage('new-course','Новая страница');assert.equal((await store.getPublished())[d.id],undefined);await assert.rejects(store.createPage('new-course','Дубль'),e=>e.status===409);
 const dangerous=clone(d.draft);dangerous.sections[0].fields.find(f=>f.key==='href').value='javascript:x';await assert.rejects(store.saveDocument(d.id,d.version,dangerous),e=>e.status===400);
 d=await store.publishDocument(d.id,d.version);assert.equal((await store.getPublished())[d.id].payload.title,'Новая страница');
 const original=await store.getDocument('page-main');const bad=clone(original.draft);bad.sections.find(s=>s.kind==='existing'&&s.fields.length).fields[0].key='forged';await assert.rejects(store.saveDocument(original.id,original.version,bad),e=>e.status===400);
});
test('HTTP routes protect admin content and preview does not save changes',async()=>{
 const express=require('express'),app=express();app.use(express.json());process.env.ADMIN_USER='cms-test';process.env.ADMIN_PASSWORD='cms-test-only-password';const {authenticate}=require('../routes/admin');const routes=require('../cms/routes');app.use('/api/admin/cms',authenticate,routes.admin);app.use(routes.publicPages);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;const headers={Authorization:'Basic '+Buffer.from('cms-test:cms-test-only-password').toString('base64'),'Content-Type':'application/json','X-Requested-With':'PracticAI-CRM',Origin:'https://practicai.ru'};
 try{
  assert.equal((await fetch(base+'/api/admin/cms/documents')).status,401);
  const d=await store.getDocument('page-main'),version=d.version;d.draft.title='Тестовый черновик';
  const r=await fetch(base+'/api/admin/cms/preview',{method:'POST',headers,body:JSON.stringify({id:d.id,version,payload:d.draft})});assert.equal(r.status,200);const preview=await r.json();assert.match(preview.html,/Тестовый черновик/);assert.doesNotMatch(preview.html,/<script/);assert.equal((await store.getDocument(d.id)).version,version);
  const page=await fetch(base+'/cms-render/main');assert.equal(page.status,200);assert.match(await page.text(),/data-practicai-cms/);
  assert.equal((await fetch(base+'/pages/private-draft')).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
test('rejects structural header/footer moves but permits content section reorder',async()=>{
 const d=await store.getDocument('page-accountants');const bad=clone(d.draft);[bad.sections[1],bad.sections[2]]=[bad.sections[2],bad.sections[1]];await assert.rejects(store.saveDocument(d.id,d.version,bad),e=>e.status===400);
 const good=clone(d.draft);[good.sections[2],good.sections[3]]=[good.sections[3],good.sections[2]];const saved=await store.saveDocument(d.id,d.version,good);assert.equal(saved.draft.sections[2].id,good.sections[2].id);
});
