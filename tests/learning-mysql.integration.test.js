'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {databaseConfig}=require('../learning/config');const {migrate}=require('../learning/migrate');const {createLearningStore}=require('../learning/store');
test('isolated MySQL: migration, foreign keys, concurrency, rollback, persistence',{skip:process.env.LEARNING_INTEGRATION!=='1'},async()=>{
 const mysql=require('mysql2/promise');const pool=mysql.createPool(databaseConfig());const conn=await pool.getConnection();
 try {
  await migrate(conn);assert.equal((await migrate(conn)).applied,false);
  const user=randomUUID(),course=randomUUID();
  await conn.execute('INSERT INTO lrn_users (id,email,created_at) VALUES (?,?,UTC_TIMESTAMP(3))',[user,user+'@example.com']);
  await conn.execute(`INSERT INTO lrn_courses (id,slug,title,description,amount_kopecks,created_at,updated_at) VALUES (?,?,?, ?,1999000,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`,[course,course,'Test course','Description']);
  async function makeOrder(){
   const id=randomUUID(),pid=randomUUID();
   await conn.execute(`INSERT INTO lrn_orders (id,user_id,course_id,course_title,amount_kopecks,offer_version,consent_version,created_at) VALUES (?,?,?,'Test course',1999000,'v1','v1',UTC_TIMESTAMP(3))`,[id,user,course]);
   await conn.execute(`INSERT INTO lrn_payments (id,order_id,provider_payment_id,idempotence_key,shop_id,test_mode,created_at) VALUES (?,?,?,?,'123',1,UTC_TIMESTAMP(3))`,[randomUUID(),id,pid,randomUUID()]);
   return {id,pid};
  }
  const {id,pid}=await makeOrder();const store=createLearningStore(pool);
  const payment={id:pid,status:'succeeded',paid:true,test:true,amount:{value:'19990.00',currency:'RUB'},recipient:{account_id:'123'},metadata:{order_id:id},captured_at:'2026-01-31T08:30:00Z'};
  const policy={shopId:'123',testMode:true,now:new Date('2026-11-04T12:00:00Z')};
  const results=await Promise.all(Array.from({length:5},()=>store.fulfillPayment(payment,policy)));
  assert.equal(results.filter(r=>r.created).length,1);
  const [[access]]=await conn.execute('SELECT * FROM lrn_access WHERE order_id=?',[id]);
  assert.equal(access.ends_at,'2026-04-30 08:30:00.000');
  for(const [table,count] of [['lrn_access',1],['lrn_documents',2],['lrn_mail_outbox',1],['lrn_events',1]]){
   const [[row]]=await conn.execute(`SELECT COUNT(*) n FROM ${table} WHERE order_id=?`,[id]);assert.equal(row.n,count);
  }
  // Inject a document uniqueness failure before fulfillment: every preceding update must roll back.
  const retry=await makeOrder();
  await conn.execute(`INSERT INTO lrn_documents (id,order_id,kind,status,snapshot,created_at) VALUES (?,?,'payment_confirmation','draft','{}',UTC_TIMESTAMP(3))`,[randomUUID(),retry.id]);
  const retryPayment={...payment,id:retry.pid,metadata:{order_id:retry.id}};
  await assert.rejects(()=>store.fulfillPayment(retryPayment,policy));
  const [[unpaid]]=await conn.execute('SELECT status FROM lrn_orders WHERE id=?',[retry.id]);assert.equal(unpaid.status,'pending');
  const [[empty]]=await conn.execute('SELECT COUNT(*) n FROM lrn_access WHERE order_id=?',[retry.id]);assert.equal(empty.n,0);
  await conn.execute('DELETE FROM lrn_documents WHERE order_id=?',[retry.id]);
  assert.equal((await store.fulfillPayment(retryPayment,policy)).created,true);
  const lesson=randomUUID();
  await assert.rejects(()=>conn.execute(`INSERT INTO lrn_lessons (id,course_id,title,body,sort_order,created_at,updated_at) VALUES (?,?,'Orphan','',1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`,[lesson,randomUUID()]));
 } finally {conn.release();await pool.end();}
});
