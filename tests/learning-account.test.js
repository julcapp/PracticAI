'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
test('cabinet loads profile safely and saves contacts without changing email or identity',async()=>{
 const dom=new JSDOM(fs.readFileSync('learning/public/account.html','utf8'),{runScripts:'outside-only',url:'https://c.practicai.ru/account'});
 const w=dom.window,calls=[];const p={name:'<img src=x onerror=alert(1)>',email:'user@example.com',phone:'+79138207050',telegram:'ivan_user',max:'',whatsapp:'',preferredChannel:'telegram'};
 w.fetch=async(url,options={})=>{calls.push({url,options});return {status:200,ok:true,json:async()=>url.endsWith('profile')?p:[]};};
 w.eval(fs.readFileSync('learning/public/account.js','utf8'));await new Promise(r=>setTimeout(r,20));
 const d=w.document,form=d.querySelector('form');assert.equal(d.querySelector('fieldset').disabled,false);assert.equal(form.elements.namedItem('name').value,p.name);assert.equal(d.querySelectorAll('img').length,0);assert.ok(form.elements.namedItem('phone').required);
 form.elements.namedItem('phone').value='+79130000000';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,20));
 const put=calls.find(c=>c.options.method==='PUT');const body=JSON.parse(put.options.body);
 assert.equal(body.phone,'+79130000000');assert.equal('email' in body,false);assert.equal('userId' in body,false);assert.equal('advertisingConsent' in body,false);assert.equal(d.querySelector('#status').textContent,'Профиль сохранён.');w.close();
});
test('anonymous cabinet stays disabled and explains email sign-in',async()=>{
 const dom=new JSDOM(fs.readFileSync('learning/public/account.html','utf8'),{runScripts:'outside-only'});dom.window.fetch=async()=>({status:401});dom.window.eval(fs.readFileSync('learning/public/account.js','utf8'));await new Promise(r=>setTimeout(r,20));
 assert.equal(dom.window.document.querySelector('fieldset').disabled,true);assert.match(dom.window.document.querySelector('#status').textContent,/Войдите/);dom.window.close();
});
