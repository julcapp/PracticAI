'use strict';
const {randomUUID}=require('node:crypto');
const {accessEnd,validatePayment}=require('./domain');
const sqlDate=date=>date.toISOString().slice(0,23).replace('T',' ');
/** pool must use timezone: 'Z'; no connection to the production CMS database. */
function createLearningStore(pool) {
 async function fulfillPayment(payment,policy) {
  const conn=await pool.getConnection();
  try {
   await conn.beginTransaction();
   const [[order]]=await conn.execute(`SELECT o.*,p.provider_payment_id,p.shop_id,p.test_mode
    FROM lrn_payments p JOIN lrn_orders o ON o.id=p.order_id
    WHERE p.provider_payment_id=? FOR UPDATE`,[payment.id]);
   if(!order)throw new Error('Unknown payment');
   if(order.shop_id!==String(policy.shopId)||Boolean(order.test_mode)!==policy.testMode)throw new Error('Payment environment mismatch');
   const paidAt=validatePayment(payment,order,policy);
   if(order.access_months!==3)throw new Error('Unsupported access term');
   if(order.status==='paid'){
    const [[existing]]=await conn.execute('SELECT * FROM lrn_access WHERE order_id=?',[order.id]);
    if(!existing)throw new Error('Paid order has no access record');
    await conn.commit();return {created:false,access:existing};
   }
   if(order.status!=='pending')throw new Error('Order is not payable');
   const [[user]]=await conn.execute('SELECT email FROM lrn_users WHERE id=?',[order.user_id]);
   if(!user)throw new Error('Order user missing');
   const end=accessEnd(paidAt),starts=sqlDate(paidAt),ends=sqlDate(end),now=sqlDate(policy.now);
   const access={id:randomUUID(),user_id:order.user_id,course_id:order.course_id,starts_at:starts,ends_at:ends,status:'active'};
   await conn.execute('UPDATE lrn_orders SET status=?,paid_at=? WHERE id=?',['paid',starts,order.id]);
   await conn.execute('UPDATE lrn_payments SET status=?,verified_at=? WHERE order_id=?',['succeeded',now,order.id]);
   await conn.execute(`INSERT INTO lrn_access (id,order_id,user_id,course_id,starts_at,ends_at) VALUES (?,?,?,?,?,?)`,
    [access.id,order.id,order.user_id,order.course_id,starts,ends]);
   const facts={orderId:order.id,courseId:order.course_id,courseTitle:order.course_title,userId:order.user_id,
    amountKopecks:order.amount_kopecks,currency:order.currency,providerPaymentId:payment.id,
    paidAt:paidAt.toISOString(),startsAt:paidAt.toISOString(),endsAt:end.toISOString(),testMode:policy.testMode};
   await conn.execute('INSERT INTO lrn_events (order_id,event_key,event_type,payload,created_at) VALUES (?,?,?,?,?)',
    [order.id,'yookassa:'+payment.id+':succeeded','payment_verified',JSON.stringify(facts),now]);
   for(const kind of ['payment_confirmation','access_granted']){
    await conn.execute('INSERT INTO lrn_documents (id,order_id,kind,status,snapshot,created_at) VALUES (?,?,?,?,?,?)',
     [randomUUID(),order.id,kind,'issued',JSON.stringify(facts),now]);
   }
   // A worker will create a short-lived, single-use login link. No public material URL or secret in this payload.
   await conn.execute('INSERT INTO lrn_mail_outbox (id,order_id,template,recipient,payload,available_at) VALUES (?,?,?,?,?,?)',
    [randomUUID(),order.id,'course_access',user.email,JSON.stringify(facts),now]);
   await conn.commit();return {created:true,access};
  } catch(error) {
   await conn.rollback();throw error;
  } finally {conn.release();}
 }
 return {fulfillPayment};
}
module.exports={createLearningStore};
