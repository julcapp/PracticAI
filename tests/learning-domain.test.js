'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {accessEnd,hasAccess,validatePayment}=require('../learning/domain');
test('three calendar months clamp end of month in Tomsk, retaining time',()=>{
 assert.equal(accessEnd('2026-11-30T18:30:00.000Z').toISOString(),'2027-02-28T18:30:00.000Z');
 assert.equal(accessEnd('2023-11-30T18:30:00.000Z').toISOString(),'2024-02-29T18:30:00.000Z');
 assert.equal(accessEnd('2026-01-31T08:30:00.000Z').toISOString(),'2026-04-30T08:30:00.000Z');
 assert.equal(accessEnd('2026-11-04T10:00:00.000Z').toISOString(),'2027-02-04T10:00:00.000Z');
 assert.equal(accessEnd('2023-11-30T08:30:00.000Z').toISOString(),'2024-02-29T08:30:00.000Z');
 assert.throws(()=>accessEnd('garbage'));
});
test('access is end-exclusive, cannot start early, revoked closes immediately',()=>{
 const a={starts_at:'2026-11-04T10:00:00Z',ends_at:'2027-02-04T10:00:00Z',status:'active'};
 assert.equal(hasAccess(a,'2026-11-04T10:00:00Z'),true);
 assert.equal(hasAccess(a,'2027-02-04T10:00:00Z'),false);
 assert.equal(hasAccess(a,'2026-11-04T09:59:59Z'),false);
 assert.equal(hasAccess({...a,status:'revoked'},'2026-11-05T10:00:00Z'),false);
 assert.equal(hasAccess(a,'bad'),false);
});
const order={id:'ord-1',provider_payment_id:'pay-1',amount_kopecks:1999000,currency:'RUB'};
const policy={shopId:'123',testMode:true,now:new Date('2026-11-05T00:00:00Z')};
const payment={id:'pay-1',status:'succeeded',paid:true,test:true,amount:{value:'19990.00',currency:'RUB'},recipient:{account_id:'123'},metadata:{order_id:'ord-1'},captured_at:'2026-11-04T10:00:00Z'};
test('only exact verified payment identity, shop, mode, amount and time accepted',()=>{
 assert.equal(validatePayment(payment,order,policy).toISOString(),'2026-11-04T10:00:00.000Z');
 for(const patch of [{id:'other'},{status:'pending'},{paid:false},{test:false},{test:undefined},{metadata:{order_id:'other'}},{recipient:{account_id:'999'}},{captured_at:'garbage'},{captured_at:'2026-12-04T10:00:00Z'},{amount:{value:'19990.001',currency:'RUB'}},{amount:{value:'1e4',currency:'RUB'}},{amount:{value:'19990.00',currency:'USD'}}]){
  assert.throws(()=>validatePayment({...payment,...patch},order,policy));
 }
 assert.throws(()=>validatePayment(payment,{...order,amount_kopecks:0},policy));
});
test('database DATETIME strings are UTC even on a server in another timezone',()=>{
 const {execFileSync}=require('node:child_process');
 const result=execFileSync(process.execPath,['-e',`const {hasAccess}=require('./learning/domain'); process.stdout.write(String(hasAccess({status:'active',starts_at:'2026-11-04 10:00:00.000',ends_at:'2027-02-04 10:00:00.000'},'2026-11-04T09:00:00Z')))`],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,TZ:'Asia/Tomsk'}}).toString();
 assert.equal(result,'false');
});
