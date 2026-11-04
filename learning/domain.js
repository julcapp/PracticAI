'use strict';
const TOMSK_OFFSET = 7 * 60 * 60 * 1000;
function parsedDate(value) {
 const normalized=typeof value==='string'&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/.test(value)?value.replace(' ','T')+'Z':value;
 const date=new Date(normalized);
 if (!Number.isFinite(date.getTime())) throw new Error('Invalid timestamp');
 return date;
}
function accessEnd(paidAt) {
 const local=new Date(parsedDate(paidAt).getTime()+TOMSK_OFFSET);
 const day=local.getUTCDate();
 local.setUTCDate(1);
 local.setUTCMonth(local.getUTCMonth()+3);
 const lastDay=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()+1,0)).getUTCDate();
 local.setUTCDate(Math.min(day,lastDay));
 return new Date(local.getTime()-TOMSK_OFFSET);
}
function hasAccess(access,now=new Date()) {
 if(!access||access.status!=='active')return false;
 try{return parsedDate(access.starts_at)<=parsedDate(now)&&parsedDate(now)<parsedDate(access.ends_at);}catch{return false;}
}
function validatePayment(payment,order,{shopId,testMode,now=new Date()}) {
 const reject=()=>{throw new Error('Payment verification failed');};
 if(!shopId||typeof testMode!=='boolean')reject();
 if(!payment||payment.id!==order.provider_payment_id||payment.status!=='succeeded'||payment.paid!==true||payment.test!==testMode)reject();
 if(String(payment.recipient?.account_id)!==String(shopId)||payment.metadata?.order_id!==order.id)reject();
 const value=payment.amount?.value;
 if(typeof value!=='string'||!/^\d{1,9}\.\d{2}$/.test(value))reject();
 const [whole,cents]=value.split('.'); const amount=Number(whole)*100+Number(cents);
 if(!Number.isSafeInteger(order.amount_kopecks)||order.amount_kopecks<=0||amount!==order.amount_kopecks||payment.amount.currency!==order.currency)reject();
 if(typeof payment.captured_at!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(payment.captured_at))reject();
 const paidAt=parsedDate(payment.captured_at);
 if(paidAt>parsedDate(now))reject();
 return paidAt;
}
module.exports={accessEnd,hasAccess,validatePayment};
