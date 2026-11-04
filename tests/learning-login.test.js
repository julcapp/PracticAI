'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const express=require('express');
const {createLoginRouter,sessionAuthentication}=require('../learning/login-routes');
test('login requires origin, hides account existence, sets secure cookie and uses server identity',async t=>{
 const sent=[];const auth={issueLink:async()=> 'secret-link',redeem:async v=>v==='valid'?'session':null,identify:async v=>v==='session'?'owner':null,logout:async v=>sent.push(v)};
 const app=express();app.use('/auth',createLoginRouter({auth,origin:'https://school.example',findUser:async email=>email==='a@example.com'?{id:'owner',email}:null,sendLink:async(...v)=>sent.push(v)}));app.get('/me',sessionAuthentication(auth),(q,s)=>s.json(q.learningUser));
 const s=app.listen(0,'127.0.0.1');await new Promise(r=>s.once('listening',r));t.after(()=>new Promise(r=>s.close(r)));const base='http://127.0.0.1:'+s.address().port;
 const post=(path,body,origin='https://school.example',cookie='')=>fetch(base+'/auth/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
 assert.equal((await post('request',{email:'a@example.com'},'https://evil.example')).status,403);
 const a=await post('request',{email:'a@example.com'}),b=await post('request',{email:'none@example.com'});assert.equal(await a.text(),await b.text());assert.equal(sent.length,1);
 assert.equal((await post('redeem',{token:'bad'})).status,401);const login=await post('redeem',{token:'valid'});assert.equal(login.status,200);for(const flag of ['HttpOnly','Secure','SameSite=Strict'])assert.ok(login.headers.get('set-cookie').includes(flag));
 assert.deepEqual(await (await fetch(base+'/me',{headers:{Cookie:'__Host-learning_session=session','X-User-Id':'other'}})).json(),{id:'owner'});assert.equal((await fetch(base+'/me?userId=owner')).status,401);
 const logout=await post('logout',{},undefined,'__Host-learning_session=session');assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Expires=Thu, 01 Jan 1970/);assert.equal(sent.at(-1),'session');
});
