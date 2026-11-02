'use strict';
const express=require('express'),fs=require('node:fs/promises'),path=require('node:path');
const store=require('./store'),{renderPage}=require('./render'),{kinds}=require('./model'),{builtins}=require('./template');
const admin=express.Router(),publicPages=express.Router();
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(e=>{if(e.status)return res.status(e.status).json({error:e.message});console.error('[cms]',e.code||e.message);res.status(503).json({error:'CMS временно недоступна. Попробуйте ещё раз; введённые данные остаются на экране.'});});
admin.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
admin.get('/documents',wrap(async(_req,res)=>res.json({documents:await store.listDocuments(),kinds})));
admin.get('/documents/:id',wrap(async(req,res)=>res.json(await store.getDocument(req.params.id))));
admin.post('/documents',wrap(async(req,res)=>res.status(201).json(await store.createPage(req.body.slug,req.body.title))));
admin.put('/documents/:id',wrap(async(req,res)=>res.json(await store.saveDocument(req.params.id,req.body.version,req.body.payload))));
admin.post('/documents/:id/publish',wrap(async(req,res)=>res.json(await store.publishDocument(req.params.id,req.body.version))));
admin.post('/documents/:id/restore',wrap(async(req,res)=>res.json(await store.restoreDocument(req.params.id,req.body.version,req.body.revisionId))));
admin.post('/preview',wrap(async(req,res)=>{
 const {id,payload,version}=req.body||{},doc=await store.getDocument(id);if(doc.kind!=='page')throw store.error(400,'Предпросмотр доступен для страницы');if(doc.version!==version)throw store.error(409,'Документ уже изменён. Загрузите свежую версию.');store.checkPayload(doc,payload);res.json({html:renderPage(payload,await store.getPublished(),{preview:true})});
}));
admin.get('/media',wrap(async(_req,res)=>{
 const directory=path.join(__dirname,'..','media');let entries;try{entries=await fs.readdir(directory,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return res.json({files:[]});throw e;}
 const files=[];for(const entry of entries)if(entry.isFile()&&/^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/.test(entry.name)){const stat=await fs.stat(path.join(directory,entry.name));files.push({url:'/media/'+entry.name,name:entry.name,type:entry.name.endsWith('.pdf')?'pdf':'image',size:stat.size});}res.json({files:files.slice(-1000).reverse()});
}));
const rendered=new Map();
async function publicHandler(req,res){
 const route=req.path,builtin=builtins.find(x=>x.route===route),slug=builtin?.slug||req.params.slug;
 const snapshot=await store.getPublished(),record=snapshot['page-'+slug];if(!record||record.kind!=='page')return res.status(404).send('Страница не опубликована');
 const signature=Object.entries(snapshot).map(([id,r])=>id+':'+r.version).join('|'),cacheKey=record.payload.slug+':'+signature;
 let html=rendered.get(cacheKey);if(!html){html=renderPage(record.payload,snapshot);if(rendered.size>=50)rendered.delete(rendered.keys().next().value);rendered.set(cacheKey,html);}
 res.set('Cache-Control','no-store');res.type('html').send(html);
}
publicPages.get(['/','/education.html','/courses/accountants.html','/pages/:slug','/cms-render/:slug'],wrap(publicHandler));
// This non-file route also supports installations where Apache serves the original static paths.
publicPages.get('/api/cms/page',wrap(async(req,res)=>{
 const builtin=builtins.find(x=>x.route===req.query.path);if(!builtin)throw store.error(404,'Страница не найдена');const snapshot=await store.getPublished();const record=snapshot[builtin.id];res.set('Cache-Control','no-store');res.json({html:renderPage(record.payload,snapshot)});
}));
module.exports={admin,publicPages};
