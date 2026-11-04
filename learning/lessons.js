'use strict';
const express=require('express');
const entitlement=`EXISTS (SELECT 1 FROM lrn_access a JOIN lrn_orders o ON o.id=a.order_id
 WHERE a.course_id=l.course_id AND a.user_id=? AND o.user_id=a.user_id AND o.course_id=a.course_id
 AND o.status='paid' AND a.status='active' AND a.starts_at<=UTC_TIMESTAMP(3) AND a.ends_at>UTC_TIMESTAMP(3))`;
function createLessonStore(pool){return {
 async getLessons(userId,courseId){const [rows]=await pool.execute(`SELECT l.id,l.title,l.sort_order FROM lrn_lessons l
 WHERE l.course_id=? AND l.status='published' AND ${entitlement} ORDER BY l.sort_order`,[courseId,userId]);return rows;},
 async getLesson(userId,courseId,lessonId){const [[lesson]]=await pool.execute(`SELECT l.id,l.title,l.body,l.sort_order FROM lrn_lessons l
 WHERE l.course_id=? AND l.id=? AND l.status='published' AND ${entitlement}`,[courseId,lessonId,userId]);return lesson||null;}
};}
function createLessonRouter({store,authenticate}){
 if(typeof authenticate!=='function')throw new Error('Session authentication required');
 const router=express.Router();router.use(authenticate,(q,s,n)=>{s.set('Cache-Control','no-store');if(!q.learningUser?.id)return s.status(401).json({error:'Требуется вход'});n();});
 const handle=fn=>(q,s,n)=>Promise.resolve(fn(q,s)).catch(n);
 router.get('/:courseId/lessons',handle(async(q,s)=>s.json(await store.getLessons(q.learningUser.id,q.params.courseId))));
 router.get('/:courseId/lessons/:lessonId',handle(async(q,s)=>{const lesson=await store.getLesson(q.learningUser.id,q.params.courseId,q.params.lessonId);if(!lesson)return s.status(404).json({error:'Урок недоступен. Проверьте срок доступа в кабинете.'});s.json(lesson);}));
 return router;
}
module.exports={createLessonStore,createLessonRouter};
