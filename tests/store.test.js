'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
let seeded=false,insertions=0,released=0,fail=false,rollbacks=0;
const dbPath=require.resolve('../db');
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{query:async()=>[[]],getConnection:async()=>({
 beginTransaction:async()=>{},query:async()=>[[{seeded:Number(seeded)}]],
 execute:async sql=>{if(sql.startsWith('INSERT IGNORE INTO assistant_scenarios')){if(fail)throw Error('transient');insertions++;}if(sql.startsWith('UPDATE assistant_setup'))seeded=true;return [{}];},
 commit:async()=>{},rollback:async()=>{rollbacks++;},release:()=>{released++;}
})}};
function fresh(){delete require.cache[require.resolve('../consultant/store')];return require('../consultant/store');}
test('seed runs once across process restarts and preserves deleted/edited data',async()=>{
 const {defaults}=require('../consultant/engine');const store=fresh();await Promise.all([store.ensureScenarios(),store.ensureScenarios()]);assert.equal(insertions,defaults.length);assert.equal(released,1);
 await fresh().ensureScenarios();assert.equal(insertions,defaults.length);assert.equal(released,2);
});
test('failed setup rolls back, releases connection and retries',async()=>{
 seeded=false;fail=true;const store=fresh();await assert.rejects(store.ensureScenarios(),/transient/);assert.equal(rollbacks,1);assert.equal(released,3);fail=false;await store.ensureScenarios();assert.equal(seeded,true);assert.equal(released,4);
});
