'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {normalizeProfile}=require('../learning/profile');
test('profile normalizes telephone and optional channels without asserting verification',()=>{
 const p=normalizeProfile({name:' Александр ',phone:'+7 (913) 820-70-50',telegram:'@alex_user',max:'https://max.ru/u/alex',whatsapp:'+79138207050',preferredChannel:'telegram'});
 assert.equal(p.phone,'+79138207050');assert.equal(p.name,'Александр');assert.equal(p.telegram,'alex_user');assert.equal(p.preferredChannel,'telegram');
 assert.equal('verified' in p,false);assert.equal(p.advertisingConsent,false);
});
test('phone required, contact validation, preferred channel must be present',()=>{
 for(const patch of [{phone:''},{phone:'89138207050'},{phone:'+123'},{telegram:'javascript:alert(1)'},{max:'https://evil.example/u/a'},{whatsapp:'abc'},{preferredChannel:'max'}])assert.throws(()=>normalizeProfile({name:'Иван',phone:'+79138207050',...patch}));
 const p=normalizeProfile({name:'Иван',phone:'+79138207050',preferredChannel:'email'});assert.equal(p.telegram,null);assert.equal(p.max,null);assert.equal(p.whatsapp,null);
 assert.throws(()=>normalizeProfile({name:'Иван',phone:'+79138207050',advertisingConsent:'yes'}));
});
