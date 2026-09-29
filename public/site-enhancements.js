'use strict';
(async()=>{
  const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/managed-blocks.css';document.head.append(stylesheet);
  const isEducation=location.pathname==='/education.html';
  if(!isEducation){
    const nav=document.querySelector('nav');
    if(nav && !document.querySelector('#education')){const a=document.createElement('a');a.href='/education.html';a.textContent='Образование и курсы';nav.append(a)}
    const target=document.getElementById('contact');
    if(target && !document.querySelector('#education')){
      const block=document.createElement('section');block.id='education-preview';
      block.style.cssText='padding:70px 24px;background:#eaf4fa;color:#173857;text-align:center';
      const h=document.createElement('h2');h.textContent='Дополнительное образование · ООО «Цифрономика»';
      const p=document.createElement('p');p.textContent='Программы для детей и взрослых, повышение квалификации и профессиональная переподготовка. Направления для педагогов, юристов, бухгалтеров и финансистов.';
      p.style.cssText='max-width:800px;margin:18px auto 26px';
      const a=document.createElement('a');a.href='/education.html';a.textContent='Посмотреть направления';a.style.cssText='display:inline-block;background:#176fba;color:white;padding:14px 22px;border-radius:7px;text-decoration:none;font-weight:700';
      block.append(h,p,a);target.before(block);
    }
    const form=document.querySelector('#contact .contact-form');
    for(const el of document.querySelectorAll('#contact .contact-detail'))if(el.textContent.includes('+7 (495) 000-00-00'))el.remove();
    if(form){
      const inputs=form.querySelectorAll('input,textarea');const button=form.querySelector('button');
      if(inputs.length>=4&&button){
        button.removeAttribute('onclick');
        const consent=document.createElement('label');consent.style.cssText='display:block;font-size:14px;margin:15px 0';
        const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.required=true;checkbox.style.cssText='width:auto;margin-right:8px';
        consent.append(checkbox,document.createTextNode('Согласен на обработку моего имени, телефона, email и сообщения ООО «Цифрономика» для ответа на обращение.'));button.before(consent);
        const status=document.createElement('p');status.setAttribute('role','status');button.after(status);
        button.onclick=async()=>{if(!checkbox.checked){status.textContent='Подтвердите согласие на обработку данных.';return}button.disabled=true;status.textContent='Отправляем...';try{const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:inputs[0].value,phone:inputs[1].value,email:inputs[2].value,message:inputs[3].value,consent:checkbox.checked})});const data=await r.json();if(!r.ok)throw Error(data.error||'Ошибка отправки');status.textContent='Сообщение отправлено. Номер обращения: '+data.id;inputs.forEach(i=>i.value='');checkbox.checked=false}catch(e){status.textContent=e.message}finally{button.disabled=false}};
      }
    }
  }
  try{
    const response=await fetch('/api/content');if(!response.ok)return;
    const {sections,texts}=await response.json();
    const title=document.querySelector('h1');
    if(title && texts[isEducation?'education_title':'main_title']) title.textContent=texts[isEducation?'education_title':'main_title'];
    const intro=isEducation?document.querySelector('.hero p'):document.querySelector('#contact .contact-info p');
    if(intro && texts[isEducation?'education_intro':'main_contact_intro'])intro.textContent=texts[isEducation?'education_intro':'main_contact_intro'];
    if(!isEducation && /^\/media\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(texts.main_hero_image||'')){
      const heroImage=document.querySelector('.hero img');
      if(heroImage)heroImage.src=texts.main_hero_image;
    }
    const items=sections.filter(s=>s.placement===(isEducation?'education':'main'));
    const anchor=isEducation?document.querySelector('#details'):document.querySelector('#contact');
    if(!anchor)return;
    for(const item of items){
      const section=document.createElement('section');section.id='section-'+item.slug;
      const hasImage=/^\/media\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(item.image_url||'');
      section.className='managed-section managed-'+(hasImage&&['left','right','top'].includes(item.layout_style)?item.layout_style:'text');
      const content=document.createElement('div');content.className='managed-copy';
      const h=document.createElement('h2');h.textContent=item.title;
      const body=document.createElement('p');body.textContent=item.body;
      content.append(h,body);
      if(hasImage && item.layout_style!=='text'){
        const img=document.createElement('img');img.src=item.image_url;img.alt=item.title;img.loading='lazy';section.append(img);
      }
      section.append(content);anchor.before(section);
    }
  }catch(e){console.warn('Дополнительные разделы временно недоступны')}
})();
