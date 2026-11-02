'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {answer, validateScenario, defaults, directions} = require('../consultant/engine');
test('accountant terms and follow-up retain direction',()=>{
 const a=answer('Я бухгалтер',[],defaults);
 assert.equal(a.direction,'Для бухгалтеров и финансистов');
 const b=answer('А сколько стоит?',[],defaults,a.direction);
 assert.match(b.answer,/19 990/);assert.equal(b.direction,a.direction);
 assert.match(answer('Какой документ?',[],defaults,a.direction).answer,/не утверждён/);
});
test('explicit new direction replaces previous topic',()=>{
 assert.equal(answer('Для моей компании',[],defaults,directions[5]).direction,'Для компаний');
 assert.equal(answer('Теперь я хочу курс для юриста',[{role:'user',content:'Я бухгалтер'}],defaults,directions[5]).direction,'Для юристов');
});
test('disabled scenarios never answer and empty store does not recreate deleted facts',()=>{
 const only=defaults.filter(x=>x.slug==='accountants-price').map(x=>({...x,enabled:0}));
 assert.doesNotMatch(answer('Цена для бухгалтера',[],only).answer,/19 990/);
 assert.doesNotMatch(answer('Цена для бухгалтера',[],[]).answer,/19 990/);
});
test('personal details are not remembered',()=>{
 const a=answer('Мой телефон +7 999 123-45-67',[],defaults);
 assert.equal(a.remember,false);assert.equal(a.showLead,true);
 assert.doesNotMatch(a.answer,/999/);
});
test('draft preview uses current fields; plain text is preserved',()=>{
 const custom={...defaults[0],slug:'special',question:'Тест',keywords:'тест',answer:'<b>Новый ответ</b>',direction:'',enabled:1};
 assert.equal(answer('Тест',[],[custom]).answer,custom.answer);
});
test('strict validation prevents bad ids, regex and excessive content',()=>{
 assert.equal(validateScenario(defaults[0]),true);
 for(const change of [{answer:''},{enabled:'1'},{direction:'unknown'},{keywords:'.*'},{keywords:'а'},{question:'x'.repeat(201)},{priority:Infinity},{slug:'../x'}])assert.equal(validateScenario({...defaults[0],...change}),false);
});
test('word matching does not treat left within unrelated words as intent',()=>{
 assert.notEqual(answer('оставить отзыв',[],defaults).showLead,true);
});
test('direct course enrollment opens lead and preserves chosen course',()=>{
 const a=answer('Хочу записаться',[],defaults,directions[5]);assert.equal(a.showLead,true);assert.equal(a.direction,directions[5]);
});
test('phone numbers without country prefix and international contacts stay out of chat history',()=>{
 for(const message of ['Мой телефон 9991234567','Номер (999) 123-45-67','Call +49 151 12345678','Почта имя@пример.рф']){
  const a=answer(message,[],defaults);assert.equal(a.remember,false,message);assert.equal(a.showLead,true);
 }
});
