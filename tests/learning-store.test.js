'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createLearningStore}=require('../learning/store');
// Transaction boundary tests with an instrumented connection; real MySQL tests remain mandatory.
function database({status='pending',failInsert=false}={}){
 const writes=[];let committed=false,rolledBack=false,released=false;
 const order={id:'order-1',user_id:'user-1',course_id:'course-1',course_title:'Course',amount_kopecks:1999000,currency:'RUB',access_months:3,status};
 const conn={beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{released=true;},
 execute:async(sql,params)=>{
  if(sql.startsWith('SELECT')&&sql.includes('lrn_payments'))return [[{...order,provider_payment_id:'pay-1',shop_id:'123',test_mode:1}]];
  if(sql.startsWith('SELECT')&&sql.includes('lrn_users'))return [[{email:'learner@example.com'}]];
  if(sql.startsWith('SELECT')&&sql.includes('lrn_access'))return [[{id:'access-1',starts_at:'2026-11-04 10:00:00.000',ends_at:'2027-02-04 10:00:00.000',status:'active'}]];
  if(failInsert&&sql.includes('INSERT INTO lrn_documents'))throw new Error('disk full');
  writes.push({sql,params});return [{affectedRows:1}];
 }};
 return {pool:{getConnection:async()=>conn},writes,state:()=>({committed,rolledBack,released})};
}
const payment={id:'pay-1',status:'succeeded',paid:true,test:true,amount:{value:'19990.00',currency:'RUB'},recipient:{account_id:'123'},metadata:{order_id:'order-1'},captured_at:'2026-11-04T10:00:00Z'};
const policy={shopId:'123',testMode:true,now:new Date('2026-11-05T00:00:00Z')};
test('success commits entitlement, two factual documents, event and one outbox job together',async()=>{
 const db=database();const result=await createLearningStore(db.pool).fulfillPayment(payment,policy);
 assert.equal(result.created,true);assert.deepEqual(db.state(),{committed:true,rolledBack:false,released:true});
 assert.equal(db.writes.filter(x=>x.sql.includes('INSERT INTO lrn_access')).length,1);
 assert.equal(db.writes.filter(x=>x.sql.includes('INSERT INTO lrn_documents')).length,2);
 assert.equal(db.writes.filter(x=>x.sql.includes('INSERT INTO lrn_mail_outbox')).length,1);
 assert.equal(db.writes.find(x=>x.sql.includes('INSERT INTO lrn_access')).params.at(-1),'2027-02-04 10:00:00.000');
});
test('duplicate success does not write, extend expiry or send another letter',async()=>{
 const db=database({status:'paid'});const result=await createLearningStore(db.pool).fulfillPayment(payment,policy);
 assert.equal(result.created,false);assert.equal(db.writes.length,0);assert.equal(db.state().committed,true);
});
test('document failure rolls back all changes and always releases connection',async()=>{
 const db=database({failInsert:true});await assert.rejects(()=>createLearningStore(db.pool).fulfillPayment(payment,policy),/disk full/);
 assert.deepEqual(db.state(),{committed:false,rolledBack:true,released:true});
});
test('pending payment and refunded order cannot grant access',async()=>{
 for(const [status,p] of [['pending',{...payment,status:'pending'}],['refunded',payment]]){
  const db=database({status});await assert.rejects(()=>createLearningStore(db.pool).fulfillPayment(p,policy));
  assert.equal(db.writes.length,0);assert.equal(db.state().rolledBack,true);
 }
});
