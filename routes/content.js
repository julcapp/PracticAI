'use strict';
const router=require('express').Router();
const db=require('../db');
const {ensureSchema}=require('./admin');
router.get('/',async(_req,res)=>{
  try{await ensureSchema();const [rows]=await db.execute('SELECT slug,placement,title,body,sort_order FROM site_content WHERE published=1 ORDER BY placement,sort_order,id');const [texts]=await db.execute('SELECT text_key,value FROM site_texts');res.set('Cache-Control','no-store');res.json({sections:rows,texts:Object.fromEntries(texts.map(r=>[r.text_key,r.value]))});}
  catch(e){console.error('[content]',e.message);res.status(503).json({error:'Разделы временно недоступны'});}
});
module.exports=router;
