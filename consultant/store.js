'use strict';
const db=require('../db');
const {defaults}=require('./engine');
let ready;
function ensureScenarios(){
 if(!ready)ready=(async()=>{
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_scenarios (
   id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
   slug VARCHAR(80) NOT NULL UNIQUE, question VARCHAR(200) NOT NULL,
   keywords TEXT NOT NULL, answer TEXT NOT NULL, direction VARCHAR(100) NOT NULL DEFAULT '',
   enabled TINYINT NOT NULL DEFAULT 0, priority INT NOT NULL DEFAULT 0,
   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_setup (
   id TINYINT NOT NULL PRIMARY KEY, seeded TINYINT NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const conn=await db.getConnection();
  try{
   await conn.beginTransaction();
   await conn.execute('INSERT IGNORE INTO assistant_setup (id,seeded) VALUES (1,0)');
   const [rows]=await conn.query('SELECT seeded FROM assistant_setup WHERE id=1 FOR UPDATE');
   if(!rows[0].seeded){
    for(const d of defaults)await conn.execute('INSERT IGNORE INTO assistant_scenarios (slug,question,keywords,answer,direction,enabled,priority) VALUES (?,?,?,?,?,?,?)',[d.slug,d.question,d.keywords,d.answer,d.direction,1,d.priority]);
    await conn.execute('UPDATE assistant_setup SET seeded=1 WHERE id=1');
   }
   await conn.commit();
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
 })().catch(e=>{ready=null;throw e;});
 return ready;
}
async function loadScenarios(){await ensureScenarios();const [rows]=await db.query('SELECT id,slug,question,keywords,answer,direction,enabled,priority,updated_at FROM assistant_scenarios ORDER BY priority DESC,id');return rows;}
module.exports={ensureScenarios,loadScenarios};
