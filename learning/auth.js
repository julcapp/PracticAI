'use strict';
const crypto=require('node:crypto');
const valid=t=>typeof t==='string'&&/^[A-Za-z0-9_-]{43}$/.test(t);
const digest=t=>crypto.createHash('sha256').update(t).digest('hex');
function createAuthService({store,origin}){
 const base=new URL(origin);if(base.protocol!=='https:'||base.origin!==origin)throw new Error('Exact HTTPS origin required');
 return {
  async issueLink(userId){
   const token=crypto.randomBytes(32).toString('base64url');
   await store.saveLink({hash:digest(token),userId});
   // Fragment is not transmitted in HTTP request URLs or ordinary Referer headers.
   return `${origin}/learning/login.html#token=${token}`;
  },
  async redeem(token){
   if(!valid(token))return null;
   // Storage atomically consumes an unexpired token and creates the session.
   const session=crypto.randomBytes(32).toString('base64url');
   return await store.exchangeLink(digest(token),digest(session))?session:null;
  },
  async identify(token){return valid(token)?store.findSession(digest(token)):null;},
  async logout(token){if(valid(token))await store.deleteSession(digest(token));}
 };
}
function createAuthStore(pool){return {
 async saveLink({hash,userId}){await pool.execute('INSERT INTO lrn_login_tokens (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 15 MINUTE))',[hash,userId]);},
 async exchangeLink(hash,sessionHash){const c=await pool.getConnection();try{
  await c.beginTransaction();const [[row]]=await c.execute('SELECT user_id FROM lrn_login_tokens WHERE token_hash=? AND consumed_at IS NULL AND expires_at>UTC_TIMESTAMP(3) FOR UPDATE',[hash]);
  if(!row){await c.rollback();return false;}
  await c.execute('UPDATE lrn_login_tokens SET consumed_at=UTC_TIMESTAMP(3) WHERE token_hash=?',[hash]);
  await c.execute('INSERT INTO lrn_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 7 DAY))',[sessionHash,row.user_id]);
  await c.commit();return true;
 }catch(e){await c.rollback();throw e;}finally{c.release();}},
 async findSession(hash){const [[row]]=await pool.execute('SELECT user_id FROM lrn_sessions WHERE token_hash=? AND expires_at>UTC_TIMESTAMP(3)',[hash]);return row?.user_id||null;},
 async deleteSession(hash){await pool.execute('DELETE FROM lrn_sessions WHERE token_hash=?',[hash]);}
};}
module.exports={createAuthService,createAuthStore};
