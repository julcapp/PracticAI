'use strict';
const express=require('express');
/** Authentication must validate a server-side session and set req.learningUser.id.
 * No user IDs are accepted from query/body/header values. Denies access by default. */
function createPortalRouter({store,authenticate,origin}){
 if(typeof authenticate!=='function'||!origin||new URL(origin).protocol!=='https:')throw new Error('HTTPS origin and session authentication required');
 const router=express.Router();
 router.use(authenticate,(req,res,next)=>{
  res.set('Cache-Control','no-store');
  if(typeof req.learningUser?.id!=='string'||!req.learningUser.id)return res.status(401).json({error:'Требуется вход'});
  next();
 });
 const handle=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(e=>{
  if([400,404].includes(e.status))return res.status(e.status).json({error:e.message});next(e);
 });
 router.get('/profile',handle(async(req,res)=>{const p=await store.getProfile(req.learningUser.id);if(!p)return res.status(404).json({error:'Профиль не найден'});res.json(p);}));
 router.put('/profile',(req,res,next)=>{
  if(req.get('Origin')!==origin)return res.status(403).json({error:'Недопустимый источник запроса'});
  next();
 },express.json({limit:'8kb'}),handle(async(req,res)=>res.json(await store.saveProfile(req.learningUser.id,req.body))));
 router.get('/courses',handle(async(req,res)=>res.json(await store.getCourses(req.learningUser.id))));
 router.get('/orders',handle(async(req,res)=>res.json(await store.getOrders(req.learningUser.id))));
 return router;
}
module.exports={createPortalRouter};
