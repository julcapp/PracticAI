'use strict';
(()=>{
 const form=document.getElementById('login'),button=document.getElementById('redeem'),message=document.getElementById('message');
 const token=new URLSearchParams(location.hash.slice(1)).get('token');
 // Remove secret before the user follows any other link. GET does not consume it.
 if(location.hash)history.replaceState(null,'',location.pathname);
 if(token){form.hidden=true;button.hidden=false;message.textContent='Нажмите кнопку, чтобы подтвердить вход.';}
 async function post(action,body){const r=await fetch('/api/learning/auth/'+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Попробуйте позже');return data;}
 form.addEventListener('submit',async e=>{e.preventDefault();const submit=form.querySelector('button');submit.disabled=true;try{const data=await post('request',{email:document.getElementById('email').value});message.textContent=data.message;}catch(e){message.textContent=e.message;}finally{submit.disabled=false;}});
 button.addEventListener('click',async()=>{button.disabled=true;try{await post('redeem',{token});location.replace('/learning/account.html');}catch(e){message.textContent=e.message;form.hidden=false;button.hidden=true;}});
})();
