'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createAuthService}=require('../learning/auth');
test('magic links are hashed, single-use, and yield opaque hashed sessions',async()=>{
 let link,session;const store={async saveLink(v){link=v;},async exchangeLink(hash,sessionHash){if(!link||hash!==link.hash)return false;session={hash:sessionHash};link=null;return true;},async findSession(hash){return hash===session.hash?'user-1':null;}};
 const auth=createAuthService({store,origin:'https://c.practicai.ru'});
 const url=await auth.issueLink('user-1');const token=new URL(url).hash.slice(7);
 assert.equal(token.length,43);assert.equal(link.hash.length,64);assert.notEqual(link.hash,token);
 const cookie=await auth.redeem(token);assert.equal(cookie.length,43);assert.equal(await auth.identify(cookie),'user-1');assert.equal(await auth.redeem(token),null);assert.equal(await auth.identify('bad'),null);
});
test('invalid tokens never reach storage',async()=>{const auth=createAuthService({store:{},origin:'https://c.practicai.ru'});assert.equal(await auth.redeem('bad'),null);assert.equal(await auth.identify(undefined),null);});
