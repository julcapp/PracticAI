'use strict';
const {normalizeProfile}=require('./profile');
function createPortalStore(pool){
 async function getProfile(userId){
  const [[row]]=await pool.execute(`SELECT u.name,u.email,p.phone,p.telegram,p.max_url AS max,p.whatsapp,
   COALESCE(p.preferred_channel,'email') AS preferredChannel,p.phone_verified_at,p.telegram_verified_at,p.max_verified_at,p.whatsapp_verified_at
   FROM lrn_users u LEFT JOIN lrn_profiles p ON p.user_id=u.id WHERE u.id=?`,[userId]);
  return row||null;
 }
 async function saveProfile(userId,input){
  const p=normalizeProfile(input),conn=await pool.getConnection();
  try{
   await conn.beginTransaction();
   const [[user]]=await conn.execute('SELECT id FROM lrn_users WHERE id=? FOR UPDATE',[userId]);
   if(!user)throw Object.assign(new Error('Пользователь не найден'),{status:404});
   const [[old]]=await conn.execute('SELECT * FROM lrn_profiles WHERE user_id=?',[userId]);
   await conn.execute('UPDATE lrn_users SET name=? WHERE id=?',[p.name,userId]);
   // Reset only the verification of contacts that changed. Client cannot set verification flags.
   const verified=(key,value,column)=>old&&old[key]===value?old[column]:null;
   await conn.execute(`INSERT INTO lrn_profiles (user_id,phone,telegram,max_url,whatsapp,preferred_channel,
    phone_verified_at,telegram_verified_at,max_verified_at,whatsapp_verified_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE
    phone=VALUES(phone),telegram=VALUES(telegram),max_url=VALUES(max_url),whatsapp=VALUES(whatsapp),
    preferred_channel=VALUES(preferred_channel),phone_verified_at=VALUES(phone_verified_at),
    telegram_verified_at=VALUES(telegram_verified_at),max_verified_at=VALUES(max_verified_at),
    whatsapp_verified_at=VALUES(whatsapp_verified_at),updated_at=VALUES(updated_at)`,[
     userId,p.phone,p.telegram,p.max,p.whatsapp,p.preferredChannel,
     verified('phone',p.phone,'phone_verified_at'),verified('telegram',p.telegram,'telegram_verified_at'),
     verified('max_url',p.max,'max_verified_at'),verified('whatsapp',p.whatsapp,'whatsapp_verified_at')]);
   await conn.commit();return p;
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
 }
 async function getCourses(userId){
  const [rows]=await pool.execute(`SELECT a.id,a.course_id,c.title,a.starts_at,a.ends_at,
   CASE WHEN a.status='revoked' THEN 'revoked' WHEN UTC_TIMESTAMP(3)<a.starts_at THEN 'scheduled'
   WHEN UTC_TIMESTAMP(3)>=a.ends_at THEN 'expired' ELSE 'active' END AS access_status
   FROM lrn_access a JOIN lrn_courses c ON c.id=a.course_id WHERE a.user_id=? ORDER BY a.starts_at DESC`,[userId]);return rows;
 }
 async function getOrders(userId){
  const [rows]=await pool.execute('SELECT id,course_title,amount_kopecks,currency,status,created_at,paid_at FROM lrn_orders WHERE user_id=? ORDER BY created_at DESC',[userId]);return rows;
 }
 return {getProfile,saveProfile,getCourses,getOrders};
}
module.exports={createPortalStore};
