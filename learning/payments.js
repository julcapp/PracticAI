'use strict';
/** The webhook payload is never trusted as a payment object. */
function createPaymentVerifier({shopId,secretKey,testMode,store,fetchImpl=fetch}) {
 if(!shopId||!secretKey||typeof testMode!=='boolean')throw new Error('Explicit YooKassa credentials and mode required');
 return async function confirmPayment(paymentId) {
  if(typeof paymentId!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(paymentId))throw new Error('Invalid payment id');
  const response=await fetchImpl('https://api.yookassa.ru/v3/payments/'+paymentId,{
   method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),
   headers:{Authorization:'Basic '+Buffer.from(String(shopId)+':'+secretKey).toString('base64'),Accept:'application/json'}
  });
  if(!response.ok)throw new Error('YooKassa verification unavailable');
  const payment=await response.json();
  if(payment?.id!==paymentId)throw new Error('Provider payment identity mismatch');
  return store.fulfillPayment(payment,{shopId:String(shopId),testMode,now:new Date()});
 };
}
module.exports={createPaymentVerifier};
