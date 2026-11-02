'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const {defaults}=require('../consultant/engine');
const dbPath=require.resolve('../db'),storePath=require.resolve('../consultant/store');
let rows=[],calls=0;
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{
 execute:async(sql,args)=>{
  calls++;
  if(sql.startsWith('INSERT INTO assistant_scenarios')){rows.push({...defaults[0],id:1,slug:args[0],question:args[1],keywords:args[2],answer:args[3],direction:args[4],enabled:args[5],priority:args[6]});return [{insertId:1}];}
  if(sql.startsWith('UPDATE assistant_scenarios')){const r=rows.find(x=>x.id===Number(args[7]));if(r)Object.assign(r,{slug:args[0],question:args[1],keywords:args[2],answer:args[3],direction:args[4],enabled:args[5],priority:args[6]});return [{affectedRows:r?1:0}];}
  if(sql.startsWith('DELETE FROM assistant_scenarios')){const n=rows.length;rows=rows.filter(x=>x.id!==Number(args[0]));return [{affectedRows:n-rows.length}];}
  throw Error('Unexpected SQL');
 }
}};
require.cache[storePath]={id:storePath,filename:storePath,loaded:true,exports:{ensureScenarios:async()=>{},loadScenarios:async()=>rows}};
process.env.ADMIN_USER='testadmin';process.env.ADMIN_PASSWORD='test-password-only';
const app=express();app.use(express.json());app.use('/api/admin',require('../routes/admin').router);app.use('/api/assistant',require('../routes/assistant'));
let server,base;
before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(()=>new Promise(r=>server.close(r)));
async function request(path,method='GET',body,auth=true){return fetch(base+path,{method,headers:{...(auth?{Authorization:'Basic '+Buffer.from('testadmin:test-password-only').toString('base64')}:{}),'Content-Type':'application/json','X-Requested-With':'PracticAI-CRM',Origin:'https://practicai.ru'},body:body===undefined?undefined:JSON.stringify(body)});}
test('admin CRUD, preview and public response respect stored edits',async()=>{
 assert.equal((await request('/api/admin/scenarios','GET',undefined,false)).status,401);
 const d={...defaults[0],slug:'custom',question:'Тест',keywords:'тест',answer:'Первый ответ'};
 assert.equal((await request('/api/admin/scenarios','POST',{...d,answer:''})).status,400);
 assert.equal((await request('/api/admin/scenarios','POST',d)).status,201);
 assert.equal((await (await request('/api/admin/scenarios')).json()).scenarios.length,1);
 const response=await request('/api/assistant','POST',{message:'тест'},false);assert.equal(response.status,200);assert.equal((await response.json()).answer,d.answer);
 const before=calls;
 const preview=await request('/api/admin/scenarios/preview','POST',{scenario:{...d,answer:'Несохранённый текст',enabled:0},message:'тест'});
 assert.equal(preview.status,200);assert.equal((await preview.json()).answer,'Несохранённый текст');assert.equal(calls,before);
 assert.equal(rows[0].answer,d.answer);
 assert.equal((await request('/api/admin/scenarios/1','PUT',{...d,answer:'Изменено',enabled:0})).status,200);
 assert.notEqual((await (await request('/api/assistant','POST',{message:'тест'},false)).json()).answer,'Изменено');
 assert.equal((await request('/api/admin/scenarios/bad','DELETE')).status,400);
 assert.equal((await request('/api/admin/scenarios/1','DELETE')).status,200);
 assert.equal((await request('/api/admin/scenarios/1','DELETE')).status,404);
 assert.equal((await (await request('/api/admin/scenarios')).json()).scenarios.length,0);
});
test('reject untrusted origin, oversized history, invalid direction and invalid preview',async()=>{
 const r=await fetch(base+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:JSON.stringify({message:'курс'})});assert.equal(r.status,403);
 assert.equal((await request('/api/assistant','POST',{message:'курс',direction:'invalid'},false)).status,400);
 assert.equal((await request('/api/assistant','POST',{message:'курс',history:Array(9).fill({role:'user',content:'курс'})},false)).status,400);
 assert.equal((await request('/api/admin/scenarios/preview','POST',{scenario:defaults[0],message:''})).status,400);
});
