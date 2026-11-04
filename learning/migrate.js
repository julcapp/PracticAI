'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {databaseConfig}=require('./config');
async function migrate(conn) {
 const sql=fs.readFileSync(path.join(__dirname,'migrations/001_learning.sql'),'utf8');
 const checksum=crypto.createHash('sha256').update(sql).digest('hex');
 const [[lock]]=await conn.query("SELECT GET_LOCK('practicai_learning_migration',10) AS acquired");
 if(Number(lock.acquired)!==1)throw new Error('Migration lock unavailable');
 try {
  await conn.query('CREATE TABLE IF NOT EXISTS lrn_schema_migrations (version INT UNSIGNED PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME(3) NOT NULL) ENGINE=InnoDB');
  const [[existing]]=await conn.execute('SELECT checksum FROM lrn_schema_migrations WHERE version=1');
  if(existing){if(existing.checksum!==checksum)throw new Error('Applied migration checksum mismatch');return {applied:false};}
  // No routines/triggers or semicolons in literals in this versioned DDL.
  for(const statement of sql.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean))await conn.query(statement);
  await conn.execute('INSERT INTO lrn_schema_migrations VALUES (1,?,UTC_TIMESTAMP(3))',[checksum]);
  return {applied:true};
 } finally {await conn.query("SELECT RELEASE_LOCK('practicai_learning_migration')");}
}
async function main(){
 if(process.env.LEARNING_MIGRATE!=='1')throw new Error('Set LEARNING_MIGRATE=1 explicitly');
 const conn=await require('mysql2/promise').createConnection(databaseConfig());
 try {console.log(await migrate(conn));} finally {await conn.end();}
}
if(require.main===module)main().catch(()=>{console.error('Learning migration failed; verify isolated database and schema.');process.exitCode=1;});
module.exports={migrate};
