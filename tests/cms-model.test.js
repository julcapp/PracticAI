'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validatePayload,safeUrl,makeBlock,courseAnswers}=require('../cms/model');
const base={slug:'test-page',title:'Страница',description:'',sections:[makeBlock('text','block-one')]};
test('safe payloads accept plain text but reject executable URLs and duplicate section keys',()=>{
 assert.equal(validatePayload('page',base),null);
 assert.equal(safeUrl('javascript:alert(1)'),false);assert.equal(safeUrl('//evil.example/x'),false);assert.equal(safeUrl('/pages/test#x'),true);
 assert.equal(safeUrl('https://example.com/a'),true);assert.equal(safeUrl('data:text/html,x'),false);
 assert.ok(validatePayload('page',{...base,sections:[...base.sections,...base.sections]}));
 const changed=structuredClone(base);changed.sections[0].fields.find(x=>x.key==='href').value='javascript:alert(1)';assert.ok(validatePayload('page',changed));
});
test('course validation and replies use the same published terms',()=>{
 const course={title:'ИИ в работе бухгалтера',summary:'Практика',price:23000,lessons:6,accessMonths:4,startRule:'first-monday',time:'18:00',timezone:'Asia/Tomsk',paymentPercent:100,document:'Уточняется',scheduleNote:'Позже',program:[]};
 assert.equal(validatePayload('course',course),null);assert.ok(validatePayload('course',{...course,price:-1}));
 const replies=courseAnswers(course);assert.match(replies['accountants-price'],/23 000/);assert.match(replies['accountants-schedule'],/18:00/);assert.match(replies['accountants-intro'],/6/);
});
test('expert, menu settings and page size validation',()=>{
 assert.equal(validatePayload('experts',{items:[{id:'expert-1',name:'Имя',role:'Роль',expertise:'ИИ',description:'Текст',photo:'',visible:true}]}),null);
 assert.ok(validatePayload('experts',{items:[{id:'x',name:'Имя',role:'',expertise:'',description:'',photo:'javascript:x',visible:true}]}));
 assert.ok(validatePayload('settings',{title:'Сайт',description:'',contacts:{email:'',phone:'',address:'',organization:''},menu:[{label:'x',href:'javascript:x',visible:true}]}));
});
test('published course replaces only managed responses and respects disabled scenario state',()=>{
 const {withPublishedCourse}=require('../cms/model'),{initialCourse}=require('../cms/template');const data=withPublishedCourse([{slug:'accountants-price',answer:'OLD',enabled:0},{slug:'custom',answer:'Свой ответ',enabled:1}],{'course-accountants':{payload:{...initialCourse,price:31000}}});assert.match(data[0].answer,/31 000/);assert.equal(data[0].enabled,0);assert.equal(data[1].answer,'Свой ответ');
});
