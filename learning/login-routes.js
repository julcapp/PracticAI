'use strict';
const express=require('express');const {rateLimit}=require('express-rate-limit');
const COOKIE='__Host-learning_session';
function sessionToken(req){const entries=(req.headers.cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(COOKIE+'='));return entries.length===1?entries[0].slice(COOKIE.length+1):null;}
function sessionAuthentication(auth){return async(req,res,next)=>{try{const id=await auth.identify(sessionToken(req));if(!id)return res.status(401).json({error:'Требуется вход'});req.learningUser={id};next();}catch(e){next(e);}};}
function createLoginRouter({auth,origin,findUser,sendLink,onDeliveryError=()=>{}}){
 if(new URL(origin).protocol!=='https:'||new URL(origin).origin!==origin)throw new Error('Exact HTTPS origin required');
 const router=express.Router();
 router.use((req,res,next)=>{res.set('Cache-Control','no-store');if(req.method==='POST'&&req.get('Origin')!==origin)return res.status(403).json({error:'Недопустимый источник запроса'});next();});
 router.use(rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-7',legacyHeaders:false}));
 router.use(express.json({limit:'4kb'}));
 const handle=fn=>(q,s,n)=>Promise.resolve(fn(q,s)).catch(n);
 router.post('/request',handle(async(req,res)=>{
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';
  if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Укажите корректную электронную почту'});
  // Same response whether the account exists or delivery fails. Never log link/token.
  try{const user=await findUser(email);if(user)await sendLink(user.email,await auth.issueLink(user.id));}catch{onDeliveryError();}
  res.json({message:'Если аккаунт существует, письмо со ссылкой будет отправлено. Ссылка действует 15 минут.'});
 }));
 router.post('/redeem',handle(async(req,res)=>{const token=await auth.redeem(req.body?.token);if(!token)return res.status(401).json({error:'Ссылка недействительна или срок её действия истёк'});res.cookie(COOKIE,token,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:7*24*60*60*1000});res.json({ok:true});}));
 router.post('/logout',handle(async(req,res)=>{await auth.logout(sessionToken(req));res.clearCookie(COOKIE,{httpOnly:true,secure:true,sameSite:'strict',path:'/'});res.json({ok:true});}));
 return router;
}
module.exports={createLoginRouter,sessionAuthentication};
