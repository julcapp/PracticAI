'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {databaseConfig}=require('./config');
async function migrate(conn) {
 const [[lock]]=await conn.query("SELECT GET_LOCK('practicai_learning_migration',10) AS acquired");
 if(Number(lock.acquired)!==1)throw new Error('Migration lock unavailable');
 try {
  await conn.query('CREATE TABLE IF NOT EXISTS lrn_schema_migrations (version INT UNSIGNED PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME(3) NOT NULL) ENGINE=InnoDB');
  let applied=false;
  for(const filename of ['001_learning.sql','002_profile.sql']) {
   const version=Number(filename.slice(0,3));
   const sql=fs.readFileSync(path.join(__dirname,'migrations',filename),'utf8');
   const checksum=crypto.createHash('sha256').update(sql).digest('hex');
   const [[existing]]=await conn.execute('SELECT checksum FROM lrn_schema_migrations WHERE version=?',[version]);
   if(existing){if(existing.checksum!==checksum)throw new Error('Applied migration checksum mismatch');continue;}
   for(const statement of sql.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean))await conn.query(statement);
   await conn.execute('INSERT INTO lrn_schema_migrations VALUES (?,?,UTC_TIMESTAMP(3))',[version,checksum]);
   applied=true;
  }
  return {applied};
 } finally {await conn.query("SELECT RELEASE_LOCK('practicai_learning_migration')");}
}
async function main(){
 if(process.env.LEARNING_MIGRATE!=='1')throw new Error('Set LEARNING_MIGRATE=1 explicitly');
 const conn=await require('mysql2/promise').createConnection(databaseConfig());
 try {console.log(await migrate(conn));} finally {await conn.end();}
}
if(require.main===module)main().catch(()=>{console.error('Learning migration failed; verify isolated database and schema.');process.exitCode=1;});
module.exports={migrate};
