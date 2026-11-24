'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const express=require('express');
const {createPortalRouter}=require('../learning/portal-routes');
async function server(t,authenticate){
 const seen=[];const store={getProfile:async id=>{seen.push(id);return {name:'Иван',email:'a@example.com'};},saveProfile:async(id,p)=>{seen.push(id);return p;},getCourses:async id=>{seen.push(id);return [];},getOrders:async id=>{seen.push(id);return [];}};
 const app=express();app.use('/api/learning/me',createPortalRouter({store,authenticate,origin:'https://c.practicai.ru'}));
 const s=app.listen(0,'127.0.0.1');await new Promise(r=>s.once('listening',r));t.after(()=>new Promise(r=>s.close(r)));
 return {url:'http://127.0.0.1:'+s.address().port+'/api/learning/me',seen};
}
test('anonymous requests denied; caller cannot supply another user identity',async t=>{
 const a=await server(t,(_q,_s,next)=>next());assert.equal((await fetch(a.url+'/profile?userId=other')).status,401);assert.equal(a.seen.length,0);
 const b=await server(t,(q,_s,next)=>{q.learningUser={id:'session-owner'};next();});
 const r=await fetch(b.url+'/courses?userId=other',{headers:{'X-User-Id':'other'}});assert.equal(r.status,200);assert.deepEqual(b.seen,['session-owner']);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('cross-site profile updates rejected, same-origin uses only authenticated owner',async t=>{
 const b=await server(t,(q,_s,next)=>{q.learningUser={id:'session-owner'};next();});
 for(const origin of ['https://evil.example',''])assert.equal((await fetch(b.url+'/profile',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal(b.seen.length,0);
 assert.equal((await fetch(b.url+'/profile',{method:'PUT',headers:{Origin:'https://c.practicai.ru','Content-Type':'application/json'},body:JSON.stringify({userId:'other',name:'Иван'})})).status,200);
 assert.deepEqual(b.seen,['session-owner']);
});
