'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const express=require('express');
const {createLessonStore,createLessonRouter}=require('../learning/lessons');
test('lesson store filters paid active ownership in SQL and never exposes draft content',async()=>{
 const calls=[];const store=createLessonStore({execute:async(sql,args)=>{calls.push({sql,args});return [[{id:'lesson',title:'Урок',body:'Текст'}]];}});
 assert.equal((await store.getLesson('owner','course','lesson')).body,'Текст');
 assert.deepEqual(calls[0].args,['course','lesson','owner']);
 for(const expected of ["l.status='published'","o.status='paid'","a.status='active'","a.starts_at<=UTC_TIMESTAMP(3)","a.ends_at>UTC_TIMESTAMP(3)",'a.user_id=?'])assert.ok(calls[0].sql.includes(expected));
 const denied=createLessonStore({execute:async()=>[[]]});assert.equal(await denied.getLesson('other','course','lesson'),null);
});
test('lesson routes use only session identity and deny anonymous and unavailable content',async t=>{
 const seen=[];const store={getLesson:async(...args)=>{seen.push(args);return args[0]==='owner'&&args[2]==='lesson'?{title:'Урок',body:'Текст'}:null;},getLessons:async(...args)=>{seen.push(args);return [];}};
 const app=express();app.use('/courses',createLessonRouter({store,authenticate:(q,s,n)=>{if(q.get('Cookie')==='test=owner')q.learningUser={id:'owner'};n();}}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));const url='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(url+'/courses/course/lessons/lesson?userId=owner')).status,401);assert.equal(seen.length,0);
 const response=await fetch(url+'/courses/course/lessons/lesson?userId=other',{headers:{Cookie:'test=owner'}});assert.equal(response.status,200);const content=await response.json();assert.equal(content.viewerMark,'Личный доступ · owner');assert.ok(Number.isFinite(Date.parse(content.viewedAt)));assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(seen[0],['owner','course','lesson']);
 assert.equal((await fetch(url+'/courses/course/lessons/missing',{headers:{Cookie:'test=owner'}})).status,404);
});
