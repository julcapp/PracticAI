'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');const {initialDocuments}=require('../cms/template'),{makeBlock}=require('../cms/model');
const {renderPage}=require('../cms/render');
function snapshot(){return Object.fromEntries(initialDocuments().map(x=>[x.id,{kind:x.kind,payload:structuredClone(x.payload),version:1}]))}
test('existing texts render safely; section hiding/order and custom blocks apply',()=>{
 const data=snapshot(),p=data['page-main'].payload;const section=p.sections.find(x=>x.fields.some(f=>f.type==='text'));section.fields.find(f=>f.type==='text').value='<img src=x onerror=alert(1)>';
 const block=makeBlock('text','block-test');block.fields.find(f=>f.key==='title').value='Добавленный заголовок';p.sections.splice(1,0,block);
 p.sections.find(x=>x.id==='about').hidden=true;
 const d=new JSDOM(renderPage(p,data)).window.document;
 assert.match(d.body.textContent,/<img src=x/);assert.equal(d.querySelector('img[onerror]'),null);assert.equal(d.querySelector('#about').hidden,true);assert.match(d.querySelector('#block-test').textContent,/Добавленный/);
 assert.ok(d.querySelector('#contact .contact-form'));assert.ok(d.querySelector('script[src*="assistant-widget.js"]'));
});
test('published course drives price, schedule, catalog and form source, preview cannot run scripts',()=>{
 const data=snapshot();data['course-accountants'].payload.price=23000;data['course-accountants'].payload.time='18:00';
 const html=renderPage(data['page-accountants'].payload,data);assert.match(html,/23 000/);assert.doesNotMatch(html,/19 990|19990/);assert.match(html,/18:00/);
 const page=renderPage(data['page-main'].payload,data);assert.match(page,/23 000/);
 const preview=new JSDOM(renderPage(data['page-accountants'].payload,data,{preview:true})).window.document;assert.equal(preview.querySelector('script'),null);assert.equal(preview.querySelector('form')?.getAttribute('action'),'#');
});
test('new pages render settings menus and expert visibility respects canonical list',()=>{
 const data=snapshot();data.experts.payload.items[0].visible=false;const d=new JSDOM(renderPage(data['page-main'].payload,data)).window.document;assert.equal(d.querySelectorAll('.expert-card').length,5);
 const page={slug:'test',title:'Новая',description:'Описание',sections:[makeBlock('cta','block-one')]};const n=new JSDOM(renderPage(page,data)).window.document;assert.match(n.title,/Новая/);assert.match(n.querySelector('nav').textContent,/Бухгалтерам/);
});
test('render preserves main wrapper placement relative to header and footer',()=>{
 const data=snapshot(),d=new JSDOM(renderPage(data['page-accountants'].payload,data)).window.document,root=d.querySelector('#pa-accountants');const children=[...root.children];assert.ok(children.indexOf(root.querySelector('main'))<children.indexOf(root.querySelector('footer')),'footer must remain after main');
});
test('empty canonical program preserves original modules',()=>{
 const data=snapshot();data['course-accountants'].payload.program=[];const d=new JSDOM(renderPage(data['page-accountants'].payload,data)).window.document;assert.equal(d.querySelectorAll('.pa-module').length,6);
});
test('explicitly clearing an original logo removes it while untouched default preserves it',()=>{
 const data=snapshot(),p=data['page-main'].payload,field=p.sections.flatMap(s=>s.fields).find(f=>f.type==='image');assert.ok(field);field.value='';field.preserveOriginal=false;const d=new JSDOM(renderPage(p,data)).window.document;const target=d.querySelector('[data-cms-field-image="'+field.key+'"]');assert.equal(target?.children.length||0,0);
});
