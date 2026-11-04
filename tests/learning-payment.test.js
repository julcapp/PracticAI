'use strict';
const {test}=require('node:test'); const assert=require('node:assert/strict');
const {createPaymentVerifier}=require('../learning/payments');
test('webhook body status cannot grant; authenticated provider object is used',async()=>{
 let applied; let read;
 const providerPayment={id:'pay-1',status:'pending'};
 const verify=createPaymentVerifier({shopId:'123',secretKey:'test_dummy',testMode:true,fetchImpl:async(url,opts)=>{
  read={url,opts}; return {ok:true,json:async()=>providerPayment};
 },store:{fulfillPayment:async(p,policy)=>{applied={p,policy};return 'result';}}});
 assert.equal(await verify('pay-1'),'result');
 assert.equal(read.url,'https://api.yookassa.ru/v3/payments/pay-1');
 assert.equal(read.opts.redirect,'error'); assert.equal(applied.p,providerPayment);
 assert.equal(applied.policy.testMode,true); assert.equal(applied.policy.shopId,'123');
});
test('provider timeout/error and malformed identity never reach database',async()=>{
 for(const response of [{ok:false},{ok:true,json:async()=>({id:'wrong'})}]){
  let calls=0;
  const verify=createPaymentVerifier({shopId:'123',secretKey:'test_dummy',testMode:true,fetchImpl:async()=>response,store:{fulfillPayment:async()=>calls++}});
  await assert.rejects(()=>verify('pay-1'));assert.equal(calls,0);
 }
 assert.throws(()=>createPaymentVerifier({shopId:'123',secretKey:'',testMode:true,store:{}}));
 const verify=createPaymentVerifier({shopId:'123',secretKey:'x',testMode:true,store:{}});
 await assert.rejects(()=>verify('../other'));
});
