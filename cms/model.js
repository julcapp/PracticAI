'use strict';
const {randomUUID}=require('node:crypto');
const kinds=['page','course','experts','settings'];
function safeUrl(value){
 if(typeof value!=='string'||value.length>2000||/[\u0000-\u0020\u007f\\<>"']/.test(value))return false;
 if(value==='')return true;
 if(value.startsWith('//'))return false;
 if(value.startsWith('/')||value.startsWith('#'))return true;
 try{const u=new URL(value);return ['https:','http:','mailto:','tel:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}
}
const str=(v,n=10000)=>typeof v==='string'&&v.length<=n;
const key=v=>str(v,100)&&/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(v);
function makeBlock(kind='text',id='block-'+randomUUID()){
 return {id,kind,label:'Новый блок',hidden:false,fields:[['title','Заголовок','text','Новый блок'],['body','Текст','text',''],['image','Изображение','image',''],['href','Ссылка','link',''],['buttonLabel','Текст кнопки','text','Подробнее'],['layout','Расположение','text','left']].map(([key,label,type,value])=>({key,label,type,value})),items:[]};
}
function validatePayload(kind,d){
 if(!kinds.includes(kind)||!d||typeof d!=='object'||Array.isArray(d)||JSON.stringify(d).length>1500000)return 'Неверное содержимое документа';
 if(kind==='page'){
  if(!str(d.slug,80)||!/^[a-z0-9][a-z0-9-]{1,79}$/.test(d.slug)||!str(d.title,200)||!d.title.trim()||!str(d.description,1000)||!Array.isArray(d.sections)||d.sections.length>100)return 'Проверьте адрес, заголовок и разделы страницы';
  const ids=new Set();for(const s of d.sections){
   if(!s||!key(s.id)||ids.has(s.id)||!['existing','text','image','cards','faq','cta'].includes(s.kind)||!str(s.label,200)||typeof s.hidden!=='boolean'||!Array.isArray(s.fields)||s.fields.length>500)return 'Неверный блок страницы';ids.add(s.id);
   const keys=new Set();for(const f of s.fields){if(!f||!key(f.key)||keys.has(f.key)||!str(f.label,200)||!['text','image','link'].includes(f.type)||!str(f.value)||(['image','link'].includes(f.type)&&!safeUrl(f.value)))return 'Проверьте поля и ссылки блока';keys.add(f.key);}
   if(s.items!=null&&(!Array.isArray(s.items)||s.items.length>30||s.items.some(x=>!x||!str(x.title,200)||!str(x.body)||!str(x.image||'',2000)||!safeUrl(x.image||'')||!safeUrl(x.href||'')||!str(x.label||'',200))))return 'Проверьте карточки блока';
  }
 }
 if(kind==='course'){
  if(!str(d.title,200)||!d.title.trim()||!str(d.summary)||!Number.isFinite(d.price)||d.price<0||d.price>100000000||!Number.isInteger(d.lessons)||d.lessons<1||d.lessons>1000||!Number.isInteger(d.accessMonths)||d.accessMonths<1||d.accessMonths>120||!['first-monday','by-agreement'].includes(d.startRule)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)||d.timezone!=='Asia/Tomsk'||!Number.isInteger(d.paymentPercent)||d.paymentPercent<1||d.paymentPercent>100||!str(d.document)||!str(d.scheduleNote)||!Array.isArray(d.program)||d.program.length>50||d.program.some(x=>!str(x.title,200)||!str(x.body)))return 'Проверьте условия и программу курса';
 }
 if(kind==='experts'){
  if(!Array.isArray(d.items)||d.items.length>50)return 'Не более 50 экспертов';const ids=new Set();for(const x of d.items){if(!x||!key(x.id)||ids.has(x.id)||!str(x.name,200)||!x.name.trim()||!str(x.role,300)||!str(x.expertise,1000)||!str(x.description)||!safeUrl(x.photo)||typeof x.visible!=='boolean')return 'Проверьте карточку специалиста';ids.add(x.id);}
 }
 if(kind==='settings'){
  if(!str(d.title,200)||!str(d.description,1000)||!d.contacts||['email','phone','address','organization'].some(k=>!str(d.contacts[k],1000))||!Array.isArray(d.menu)||d.menu.length>30||d.menu.some(x=>!x||!str(x.label,200)||!x.label.trim()||!safeUrl(x.href)||!x.href||typeof x.visible!=='boolean'))return 'Проверьте меню и контакты';
  if(d.contacts.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.contacts.email))return 'Проверьте email';
 }
 return null;
}
function courseAnswers(c){
 const price=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(c.price).replace(/[\u00a0\u202f]/g,' ');
 const start=c.startRule==='first-monday'?'первый понедельник каждого месяца':'по согласованию';
 return {
 'accountants-intro':`Курс «${c.title}»: ${c.lessons} занятий, доступ к материалам ${c.accessMonths} месяца. Стоимость — ${price} ₽ за участника. Старт — ${start}, занятия в ${c.time} по Томску. Подробнее: https://practicai.ru/courses/accountants.html`,
 'accountants-price':`Стоимость курса «${c.title}» — ${price} ₽ за участника. Оплата — ${c.paymentPercent}%. Условия скидок и рассрочки уточняет менеджер. Хотите оставить запрос на запись?`,
 'accountants-schedule':`Старт — ${start}. Всего ${c.lessons} занятий, время — ${c.time} по Томску (UTC+7). ${c.scheduleNote} Доступ к курсу — ${c.accessMonths} месяца.`,
 'accountants-document':c.document,
 };
}
function withPublishedCourse(scenarios,snapshot){const course=snapshot?.['course-accountants']?.payload;if(!course)return scenarios;const values=courseAnswers(course);return scenarios.map(s=>values[s.slug]?{...s,answer:values[s.slug],managedByCourse:true}:s);}
module.exports={kinds,safeUrl,makeBlock,validatePayload,courseAnswers,withPublishedCourse};
