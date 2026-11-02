'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const widget=fs.readFileSync('public/assistant-widget.js','utf8');
function page(respond){const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://practicai.ru',runScripts:'outside-only'});dom.window.fetch=respond;dom.window.eval(widget);return dom;}
async function settle(){await new Promise(r=>setImmediate(r));}
test('selected course fills lead and prevents simultaneous requests and personal history',async()=>{
 const sent=[];let resolve;
 const dom=page((url,options)=>{sent.push(JSON.parse(options.body));return new Promise(r=>{resolve=r;});});
 const {document:d}=dom.window;d.querySelector('.pa-chat-button').click();
 const ask=q=>{d.querySelector('.pa-chat-form input').value=q;d.querySelector('.pa-chat-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));};
 ask('Я бухгалтер');ask('Повторный запрос');assert.equal(sent.length,1);
 resolve({ok:true,json:async()=>({answer:'Условия',direction:'Для бухгалтеров и финансистов',choices:[{label:'Записаться',question:'Хочу записаться'}],showLead:true,remember:true})});await settle();
 assert.equal(d.querySelector('[name="direction"]').value,'Для бухгалтеров и финансистов');assert.equal(d.querySelector('.pa-lead').open,true);
 d.querySelector('.pa-chat-choices button').click();assert.equal(sent[1].direction,'Для бухгалтеров и финансистов');
 resolve({ok:true,json:async()=>({answer:'Контакты только в форме',remember:false,choices:[]})});await settle();
 ask('Другой вопрос');assert.equal(sent[2].history.length,2);dom.window.close();
});
test('failed lead keeps fields; success requires saved id and consent',async()=>{
 let success=false;let payload;
 const dom=page(async(url,options)=>{payload=JSON.parse(options.body);return success?{ok:true,json:async()=>({success:true,id:42})}:{ok:false,json:async()=>({error:'Ошибка сохранения'})};});
 const d=dom.window.document,form=d.querySelector('.pa-lead form');
 form.querySelector('[name="direction"]').value='Для бухгалтеров и финансистов';form.querySelector('[name="name"]').value='Тест';form.querySelector('[name="phone"]').value='+7 999 000-00-00';form.querySelector('[name="consent"]').checked=true;
 const submit=()=>form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
 submit();await settle();assert.equal(form.querySelector('[name="name"]').value,'Тест');assert.match(d.querySelector('.pa-lead-status').textContent,/Ошибка/);assert.equal(payload.consent,true);
 success=true;submit();await settle();assert.match(d.querySelector('.pa-lead-status').textContent,/42/);assert.equal(form.querySelector('[name="name"]').value,'');dom.window.close();
});
