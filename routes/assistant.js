'use strict';
const router=require('express').Router();
const rateLimit=require('express-rate-limit');
const {answer,directions}=require('../consultant/engine');
const {loadScenarios}=require('../consultant/store');
const {getPublished}=require('../cms/store');
const {withPublishedCourse}=require('../cms/model');
router.use(rateLimit({windowMs:15*60*1000,limit:40,standardHeaders:'draft-7',legacyHeaders:false}));
router.post('/',async(req,res)=>{
 const {message,history=[],direction=''}=req.body||{};
 if(typeof message!=='string'||!message.trim()||message.length>800||!Array.isArray(history)||history.length>8||history.some(x=>!x||!['user','assistant'].includes(x.role)||typeof x.content!=='string'||x.content.length>800)||!(direction===''||directions.includes(direction)))return res.status(400).json({error:'Сократите вопрос и попробуйте снова.'});
 const origin=req.get('origin'),expected=process.env.SITE_ORIGIN||'https://practicai.ru';
 if(origin&&origin!==expected&&origin!=='http://localhost:3000')return res.status(403).json({error:'Недопустимый источник запроса.'});
 res.set('Cache-Control','no-store');
 try{const [scenarios,published]=await Promise.all([loadScenarios(),getPublished()]);return res.json({...answer(message.trim(),history,withPublishedCourse(scenarios,published),direction),mode:'guide'});}
 catch(e){console.warn('[assistant] Scenario storage unavailable:',e.code||'error');return res.status(503).json({error:'Консультант временно недоступен. Оставьте запрос через форму ниже.'});}
});
module.exports=router;
