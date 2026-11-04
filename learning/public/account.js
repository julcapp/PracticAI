'use strict';
(()=>{
 const form=document.querySelector('#profile-form'),fields=document.querySelector('#profile-fields'),status=document.querySelector('#status');
 const say=(text,error=false)=>{status.textContent=text;status.className=error?'error':'';};
 async function request(path,options={}){
  const res=await fetch('/api/learning/me/'+path,{credentials:'same-origin',...options});
  if(res.status===401)throw new Error('Войдите по ссылке из письма, чтобы открыть кабинет.');
  const data=await res.json();if(!res.ok)throw new Error(data.error||'Не удалось загрузить данные. Попробуйте ещё раз.');return data;
 }
 const date=value=>{const iso=/^\d{4}-\d{2}-\d{2} /.test(value)?value.replace(' ','T')+'Z':value;return new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeZone:'Asia/Tomsk'}).format(new Date(iso));};
 function list(id,items,empty,render){const root=document.querySelector(id);root.replaceChildren();if(!items.length){root.textContent=empty;return;}for(const item of items){const card=document.createElement('article');card.className='card';render(card,item);root.append(card);}}
 function text(root,tag,value){const el=document.createElement(tag);el.textContent=value;root.append(el);}
 const labels={active:'Доступ открыт',expired:'Срок доступа истёк',revoked:'Доступ закрыт',scheduled:'Доступ ещё не начался',pending:'Ожидает оплаты',paid:'Оплачен',canceled:'Отменён',refunded:'Возвращён'};
 async function load(){
  try{
   const [p,courses,orders]=await Promise.all([request('profile'),request('courses'),request('orders')]);
   for(const key of ['name','email','phone','telegram','max','whatsapp','preferredChannel'])form.elements.namedItem(key).value=p[key]||'';
   for(const key of ['telegram','max','whatsapp'])document.querySelector('[data-verified="'+key+'"]').textContent=p[key+'_verified_at']?'Контакт подтверждён':'Контакт не подтверждён';
   list('#course-list',courses,'Здесь появятся ваши оплаченные курсы.',(root,c)=>{text(root,'h3',c.title);text(root,'p',labels[c.access_status]||'Статус уточняется');text(root,'p','Доступ до '+date(c.ends_at));if(c.access_status==='active'){const link=document.createElement('a');link.href='course.html?id='+encodeURIComponent(c.course_id);link.textContent='Открыть уроки';root.append(link);}});
   list('#order-list',orders,'У вас пока нет заказов.',(root,o)=>{text(root,'h3',o.course_title);text(root,'p',new Intl.NumberFormat('ru-RU',{style:'currency',currency:o.currency}).format(o.amount_kopecks/100)+' · '+(labels[o.status]||'Статус уточняется'));});
   fields.disabled=false;say('');
  }catch(e){say(e.message,true);}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();const payload=Object.fromEntries(new FormData(form));delete payload.email;
  const button=form.querySelector('button');button.disabled=true;say('Сохраняем…');
  try{await request('profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});await load();if(!status.classList.contains('error'))say('Профиль сохранён.');}catch(e){say(e.message,true);}finally{button.disabled=false;}
 });load();
})();

 document.getElementById("logout")?.addEventListener("click",async()=>{const r=await fetch("/api/learning/auth/logout",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"});if(r.ok)location.replace("/learning/login.html");});
