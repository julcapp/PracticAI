'use strict';
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const {safeUrl}=require('./model');
const builtins=[{id:'page-main',slug:'main',label:'Главная',route:'/',file:'index.html'},{id:'page-education',slug:'education',label:'Образование',route:'/education.html',file:'education.html'},{id:'page-accountants',slug:'accountants',label:'Курс для бухгалтеров',route:'/courses/accountants.html',file:'courses/accountants.html'}];
let cached;
function annotate(html,slug){
 const dom=new JSDOM(html),d=dom.window.document;
 for(const icon of d.querySelectorAll('link[rel="icon"]')){icon.href='/favicon.svg';icon.type='image/svg+xml';}
 // Repair stray image-data text left by the former inline-logo migration.
 const junk=d.createTreeWalker(d.body,4);let n;const remove=[];while(n=junk.nextNode())if(!n.parentElement.closest('script,style')&&(/data:image\/[^;]+;base64,/.test(n.nodeValue)||(/^\s*"\s*alt="PracticAI">/.test(n.nodeValue))))remove.push(n);for(const x of remove)x.remove();
 if(slug==='main'&&!d.querySelector('#experts')){const s=d.createElement('section');s.id='experts';s.className='experts-section';s.innerHTML='<div class="container"><h2>Эксперты PracticAI</h2><p>Карточки специалистов появятся после подтверждения данных.</p><div class="experts-grid"></div></div>';d.querySelector('.dates')?.before(s);}
 // Canonical course facts are edited separately from generic page fields.
 const mark=(sel,key)=>{const el=d.querySelector(sel);if(el)el.setAttribute('data-cms-course',key);};
 if(slug==='accountants'){
  mark('.pa-hero h1','title');mark('.pa-intro','summary');mark('.pa-review-banner','banner');mark('.pa-hero .pa-fine','brief');mark('#pa-program .pa-eyebrow','programHeading');mark('.pa-program-note','programNote');
  for(const [i,key] of ['price','start','lessons','access','time','payment'].entries())mark(`.pa-condition:nth-child(${i+1}) b`,key);
  for(const item of d.querySelectorAll('.pa-faq')){const t=item.querySelector('summary')?.textContent||'';if(/Сколько стоит/.test(t))item.querySelector('p')?.setAttribute('data-cms-course','all');if(/Как оплатить/.test(t))item.querySelector('p')?.setAttribute('data-cms-course','paymentLong');if(/документ|сертификат/i.test(t))item.querySelector('p')?.setAttribute('data-cms-course','document');}
  mark('.pa-module-grid','program');
 }else{
  for(const item of d.querySelectorAll('article'))if(item.querySelector('a[href="/courses/accountants.html"]')){
   const heading=item.querySelector('h3');if(heading)heading.setAttribute('data-cms-course','title');
   for(const p of item.querySelectorAll('p'))if(/19 990/.test(p.textContent))p.setAttribute('data-cms-course','all');
   for(const li of item.querySelectorAll('li'))if(/ИИ в работе бухгалтера/.test(li.textContent))li.setAttribute('data-cms-course','title');
  }
 }
 const container=d.querySelector('#pa-accountants')||d.body;
 const groups=[];
 for(const child of [...container.children]){
  if(child.tagName==='MAIN'){for(const inner of [...child.children])if(!['SCRIPT','STYLE'].includes(inner.tagName))groups.push(inner);}
  else if(!['SCRIPT','STYLE'].includes(child.tagName))groups.push(child);
 }
 const sections=[];
 for(const [index,el] of groups.entries()){
  const id=el.getAttribute('data-cms-section')||el.id||`section-${index+1}`;el.setAttribute('data-cms-section',id);
  const heading=el.querySelector('h1,h2,h3');const label=(heading?.textContent||({NAV:'Меню — настройки',HEADER:'Шапка и меню',FOOTER:'Подвал'})[el.tagName]||el.className||'Раздел '+(index+1)).trim().slice(0,200);
  const fields=[];let count=0;
  const blocked=target=>target.closest('script,style,svg,form,nav,[data-cms-course],.nav-links,.expert-card,.experts-grid')||el.tagName==='NAV';
  const walker=d.createTreeWalker(el,4);const nodes=[];let node;
  while(node=walker.nextNode())if(node.nodeValue.trim()&&node.nodeValue.length<=10000&&!blocked(node.parentElement))nodes.push(node);
  for(const node of nodes){const key=`${id}-text-${++count}`,span=d.createElement('span');span.setAttribute('data-cms-field',key);const value=node.nodeValue;span.textContent=value;const label=('Текст: '+value.trim().slice(0,85)).slice(0,200);node.replaceWith(span);fields.push({key,label,type:'text',value});}
  for(const a of el.querySelectorAll('a[href]'))if(!blocked(a)){
   const href=a.getAttribute('href')||'';if(safeUrl(href)){const key=`${id}-link-${++count}`;a.setAttribute('data-cms-field-link',key);fields.push({key,label:'Ссылка: '+a.textContent.trim().slice(0,80),type:'link',value:href});}
  }
  for(const image of el.querySelectorAll('img,.brand-logo'))if(!image.closest('nav,.experts-grid')&&image!==el){const src=image.getAttribute('src')||'';const key=`${id}-image-${++count}`;image.setAttribute('data-cms-field-image',key);fields.push({key,label:'Изображение / логотип',type:'image',value:safeUrl(src)?src:'',preserveOriginal:true});}
  sections.push({id,kind:'existing',label,hidden:false,fields,items:[],fixed:['NAV','HEADER','FOOTER'].includes(el.tagName)||el.classList.contains('pa-review-banner')});
 }
 const payload={slug,title:d.title||labelFor(slug),description:d.querySelector('meta[name="description"]')?.content||'',sections};
 const result={html:dom.serialize(),payload};dom.window.close();return result;
}
function labelFor(slug){return builtins.find(x=>x.slug===slug)?.label||'PracticAI';}
function getTemplates(){
 if(!cached){cached={};for(const b of builtins){const immutable=path.join(__dirname,'templates',b.slug+'.html');const file=fs.existsSync(immutable)?immutable:path.join(__dirname,'..','public',b.file);const html=fs.readFileSync(file,'utf8');
  // Annotated immutable templates keep field IDs stable across code deployments.
  if(html.includes('data-cms-section=')){
   const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'templates',b.slug+'.json'),'utf8'));cached[b.slug]={html,payload:manifest};
  }else cached[b.slug]=annotate(html,b.slug);
 }}return cached;
}
const initialCourse={title:'ИИ в работе бухгалтера',summary:'Практический курс: документы, таблицы, переписка и проверка результатов.',price:19990,lessons:5,accessMonths:3,startRule:'first-monday',time:'17:30',timezone:'Asia/Tomsk',paymentPercent:100,document:'Итоговый документ курса пока не утверждён. Менеджер уточнит его перед оформлением обучения.',scheduleNote:'Дни остальных занятий уточняются при записи.',program:[]};
function initialDocuments(){
 const templates=getTemplates();
 const courseDom=new JSDOM(templates.accountants.html);const program=[...courseDom.window.document.querySelectorAll('.pa-module')].map(x=>({title:x.querySelector('summary strong')?.textContent||'',body:x.querySelector('.pa-module-body')?.textContent.trim()||''}));courseDom.window.close();
 return [...builtins.map(b=>({id:b.id,kind:'page',label:b.label,payload:structuredClone(templates[b.slug].payload)})),
 {id:'course-accountants',kind:'course',label:'Курс «ИИ в работе бухгалтера»',payload:{...initialCourse,program}},
 {id:'experts',kind:'experts',label:'Эксперты',payload:{items:Array.from({length:6},(_,i)=>({id:'expert-'+(i+1),name:'Эксперт '+(i+1),role:'',expertise:'',description:'Данные специалиста будут добавлены позже.',photo:'',visible:true}))}},
 {id:'settings',kind:'settings',label:'Меню и контакты',payload:{title:'PracticAI',description:'Практическое обучение применению ИИ',menu:[['Главная','/'],['Для руководителей','/#leaders'],['Для компаний','/#business'],['Эксперты','/#experts'],['Курсы','/#course-catalog'],['Бухгалтерам','/courses/accountants.html'],['Образование','/education.html'],['Связаться','/#contact']].map(([label,href])=>({label,href,visible:true})),contacts:{email:'practic@practicai.ru',phone:'',address:'Москва · Санкт-Петербург · Онлайн',organization:'ООО «Цифрономика»'}}}];
}
module.exports={builtins,annotate,getTemplates,initialDocuments,initialCourse};
