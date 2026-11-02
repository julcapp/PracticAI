'use strict';
const {JSDOM}=require('jsdom');
const {getTemplates}=require('./template');
const {courseAnswers,safeUrl}=require('./model');
function element(d,tag,text,cls){const el=d.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;}
function customBlock(d,s){
 const values=Object.fromEntries(s.fields.map(f=>[f.key,f.value]));const section=element(d,'section',null,'cms-block');section.id=s.id;section.setAttribute('data-cms-section',s.id);section.hidden=s.hidden;
 const inner=element(d,'div',null,'cms-block-inner');section.append(inner);
 if(values.title)inner.append(element(d,'h2',values.title));
 const copy=element(d,'div',null,'cms-copy');if(values.body)copy.append(element(d,'p',values.body));
 if(values.image&&safeUrl(values.image)){
  const img=element(d,'img');img.src=values.image;img.alt=values.title||'';img.loading='lazy';
  if(s.kind==='image'){section.classList.add('cms-image-layout','cms-layout-'+(['left','right','top'].includes(values.layout)?values.layout:'left'));inner.append(img,copy);}else inner.append(img,copy);
 }else inner.append(copy);
 if(s.kind==='cards'||s.kind==='faq'){
  const grid=element(d,'div',null,s.kind==='cards'?'cms-grid':'cms-faq');
  for(const item of s.items||[]){const card=element(d,s.kind==='faq'?'details':'article',null,'cms-card');card.append(element(d,s.kind==='faq'?'summary':'h3',item.title));card.append(element(d,'p',item.body));if(item.image){const img=element(d,'img');img.src=item.image;img.alt=item.title;card.append(img);}if(item.href){const a=element(d,'a',item.label||'Подробнее');a.href=item.href;card.append(a);}grid.append(card);}inner.append(grid);
 }
 if(values.href){const a=element(d,'a',values.buttonLabel||'Подробнее','cms-button');a.href=values.href;inner.append(a);}
 return section;
}
function applyCourse(d,c){
 if(!c)return;const price=new Intl.NumberFormat('ru-RU').format(c.price).replace(/[\u00a0\u202f]/g,' '),start=c.startRule==='first-monday'?'Первый понедельник каждого месяца':'По согласованию';
 const replies=courseAnswers(c),all=`${price} ₽ за участника · ${c.lessons} занятий · доступ ${c.accessMonths} месяца. Старт — ${start.toLowerCase()}, ${c.time} по Томску (UTC+7). Оплата — ${c.paymentPercent}%. ${c.scheduleNote}`;
 const values={title:c.title,summary:c.summary,banner:`${c.title} · старт: ${start.toLowerCase()}`,brief:`${price} ₽ за участника · ${c.lessons} занятий · доступ ${c.accessMonths} месяца.`,programHeading:`${c.lessons} занятий · практическая программа`,programNote:`Курс состоит из ${c.lessons} занятий. Доступ к курсу — ${c.accessMonths} месяца. ${c.scheduleNote}`,price:price+' ₽',start,lessons:c.lessons+' занятий',access:c.accessMonths+' месяца',time:c.time+' · Томск (UTC+7)',payment:c.paymentPercent+'% стоимости',all,paymentLong:`Оплата — ${c.paymentPercent}% стоимости курса, ${price} ₽ за участника. Менеджер уточнит порядок оформления и оплаты. Онлайн-оплата на странице пока не подключена.`,document:c.document};
 for(const el of d.querySelectorAll('[data-cms-course]')){const key=el.getAttribute('data-cms-course');if(key==='program'){
   if(!c.program?.length)continue;
   el.replaceChildren();for(const [i,item] of (c.program||[]).entries()){const detail=element(d,'details',null,'pa-module');const summary=element(d,'summary');summary.append(element(d,'span',String(i+1).padStart(2,'0'),'pa-module-no'),element(d,'strong',item.title));detail.append(summary,element(d,'div',item.body,'pa-module-body'));el.append(detail);}
  }else if(key in values)el.textContent=values[key];}
 let meta=d.querySelector('meta[name="cms-course-summary"]');if(!meta){meta=element(d,'meta');meta.name='cms-course-summary';d.head.append(meta);}meta.content=all;
 for(const script of d.querySelectorAll('script:not([src])'))if(script.textContent.includes("fields.get('interest')"))script.textContent=script.textContent.replace(/message: 'Курс[^\n]+/g,"message: (document.querySelector('meta[name=\"cms-course-summary\"]')?.content || 'Запрос на курс') + ' Интерес: ' + fields.get('interest') + '. Источник: /courses/accountants.html. Запрос на запись, без подтверждения зачисления.',");
 return replies;
}
function applyExperts(d,experts){
 const grid=d.querySelector('#experts .experts-grid');if(!grid||!experts)return;grid.replaceChildren();
 for(const [i,x] of experts.items.filter(x=>x.visible).entries()){
  const card=element(d,'article',null,'expert-card');const avatar=element(d,'div',null,'expert-avatar');if(x.photo){const img=element(d,'img');img.src=x.photo;img.alt=x.name;img.loading='lazy';avatar.append(img);}else avatar.textContent=String(i+1).padStart(2,'0');
  const copy=element(d,'div');copy.append(element(d,'h3',x.name));for(const value of [x.role,x.expertise,x.description])if(value)copy.append(element(d,'p',value));card.append(avatar,copy);grid.append(card);
 }
}
function applySettings(d,settings){
 if(!settings)return;
 let menu=d.querySelector('.nav-links')||d.querySelector('header nav')||d.querySelector('.cms-site-nav');
 if(menu){menu.replaceChildren();for(const item of settings.menu.filter(x=>x.visible)){const a=element(d,'a',item.label);a.href=item.href;if(menu.tagName==='UL'){const li=element(d,'li');li.append(a);menu.append(li);}else menu.append(a);}}
 for(const link of d.querySelectorAll('a[href^="mailto:"]'))if(settings.contacts.email){link.href='mailto:'+settings.contacts.email;link.textContent=settings.contacts.email;}
 for(const row of d.querySelectorAll('.contact-detail')){const text=row.textContent;if(text.includes('📍')){row.replaceChildren(element(d,'span',settings.contacts.address));}if(text.includes('📞')){if(settings.contacts.phone)row.replaceChildren(element(d,'span',settings.contacts.phone));else row.remove();}}
 let footer=d.querySelector('footer');if(!footer){footer=element(d,'footer');d.body.append(footer);}
 const contacts=element(d,'div',null,'cms-contact-info');for(const value of [settings.contacts.organization,settings.contacts.address,settings.contacts.phone,settings.contacts.email])if(value)contacts.append(element(d,'p',value));footer.append(contacts);
}
function renderPage(page,snapshot={},options={}){
 const template=getTemplates()[page.slug];
 const dom=new JSDOM(template?.html||'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><header><a class="cms-brand" href="/">PracticAI</a><nav class="cms-site-nav"></nav></header><main id="cms-content"></main><footer></footer><script src="/assistant-widget.js?v=20261102-scenarios" defer></script></body></html>');
 const d=dom.window.document;if(!template){const h=element(d,'h1',page.title);d.querySelector('main').prepend(h);}
 if(!d.querySelector('script[src*="assistant-widget"]')){const script=element(d,'script');script.src='/assistant-widget.js?v=20261102-scenarios';script.defer=true;d.body.append(script);}
 d.documentElement.setAttribute('data-practicai-cms','1');d.title=page.title;
 let description=d.querySelector('meta[name="description"]');if(!description){description=element(d,'meta');description.name='description';d.head.append(description);}description.content=page.description||snapshot.settings?.payload.description||'';
 const siteTitle=snapshot.settings?.payload.title;if(siteTitle&&!d.title.includes(siteTitle))d.title+=' | '+siteTitle;
 for(const script of d.querySelectorAll('script[src]'))if(script.getAttribute('src').startsWith('/site-enhancements.js'))script.setAttribute('src','/site-enhancements.js?v=20261102-cms');
 for(const href of ['/cms-public.css?v=20261102','/managed-blocks.css','/responsive-brand.css']){const style=element(d,'link');style.rel='stylesheet';style.href=href;d.head.append(style);}
 const oldSections=new Map([...d.querySelectorAll('[data-cms-section]')].map(el=>[el.getAttribute('data-cms-section'),el]));
 for(const [id,el] of oldSections)if(!page.sections.some(s=>s.id===id))el.remove();
 const byParent=new Map();
 for(const s of page.sections){
  let el=oldSections.get(s.id);
  if(s.kind==='existing'&&el){
   el.hidden=s.hidden;
   for(const f of s.fields){if(f.type==='text'){const target=el.querySelector(`[data-cms-field="${f.key}"]`);if(target)target.textContent=f.value;}
    if(f.type==='link'){const target=el.querySelector(`[data-cms-field-link="${f.key}"]`);if(target)target.setAttribute('href',f.value||'#');}
    if(f.type==='image'){const target=el.querySelector(`[data-cms-field-image="${f.key}"]`);if(target){if(f.value){if(target.tagName==='IMG')target.src=f.value;else{const img=element(d,'img');img.src=f.value;img.alt='PracticAI';target.replaceChildren(img);}}else if(f.preserveOriginal!==true){if(target.tagName==='IMG')target.remove();else target.replaceChildren();}}}
   }
  }else if(s.kind!=='existing')el=customBlock(d,s);else continue;
  const parent=el.parentNode||d.querySelector('main')||d.body;if(!byParent.has(parent))byParent.set(parent,[]);byParent.get(parent).push(el);
 }
 for(const [parent,items] of byParent){
  // Keep non-section wrappers (notably <main>) in place. Each original section
  // supplies a stable slot; added blocks are inserted before the next old slot.
  const originals=[...parent.children].filter(el=>oldSections.has(el.getAttribute('data-cms-section'))&&items.includes(el));
  const slots=originals.map(el=>{const marker=d.createComment('cms slot');parent.insertBefore(marker,el);return marker;});
  for(const el of originals)el.remove();
  let index=0;let last;
  for(const marker of slots){
   while(index<items.length){const next=items[index++];parent.insertBefore(next,marker);last=next;if(originals.includes(next))break;}
   marker.remove();
  }
  while(index<items.length){const next=items[index++];if(last&&last.parentNode===parent)last.after(next);else parent.append(next);last=next;}
 }
 applyCourse(d,snapshot['course-accountants']?.payload);applyExperts(d,snapshot.experts?.payload);applySettings(d,snapshot.settings?.payload);
 if(options.preview){for(const script of d.querySelectorAll('script'))script.remove();for(const form of d.querySelectorAll('form')){form.setAttribute('action','#');for(const control of form.querySelectorAll('input,button,textarea,select'))control.disabled=true;}for(const el of d.querySelectorAll('*'))for(const attr of [...el.attributes])if(attr.name.startsWith('on'))el.removeAttribute(attr.name);}
 const html=dom.serialize();dom.window.close();return html;
}
module.exports={renderPage,applyCourse};
