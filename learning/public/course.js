'use strict';
(async()=>{
 const course=new URLSearchParams(location.search).get('id');const message=document.getElementById('message');
 async function request(path){const response=await fetch('/api/learning/courses/'+encodeURIComponent(course)+'/lessons'+path,{credentials:'same-origin'});if(response.status===401)throw new Error('Для просмотра войдите в личный кабинет.');if(!response.ok)throw new Error('Урок недоступен. Проверьте срок доступа в кабинете.');return response.json();}
 try{
  if(!course)throw new Error('Выберите курс в личном кабинете.');
  const lessons=await request('');if(!lessons.length){message.textContent='Уроки пока не опубликованы или срок доступа истёк. Проверьте информацию в кабинете.';return;}
  let selected=0;
  async function open(id){const version=++selected;document.getElementById('title').textContent='';document.getElementById('body').textContent='';document.getElementById('watermark').replaceChildren();message.textContent='Загружаем урок…';try{const lesson=await request('/'+encodeURIComponent(id));if(version!==selected)return;document.getElementById('title').textContent=lesson.title;document.getElementById('body').textContent=lesson.body;const mark=document.getElementById('watermark');for(let i=0;i<8;i++){const line=document.createElement('span');line.textContent=lesson.viewerMark+' · '+new Date(lesson.viewedAt).toLocaleString('ru-RU');mark.append(line);}message.textContent='';}catch(e){if(version===selected)message.textContent=e.message;}}
  for(const lesson of lessons){const button=document.createElement('button');button.type='button';button.textContent=lesson.title;button.addEventListener('click',()=>open(lesson.id));document.getElementById('lessons').append(button);}
  await open(lessons[0].id);
 }catch(e){message.textContent=e.message;}
})();
