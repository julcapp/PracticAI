'use strict';
const bad=()=>{throw Object.assign(new Error('Проверьте телефон и контакты каналов связи'),{status:400});};
function phone(value){
 if(typeof value!=='string')bad();const result=value.replace(/[\s().-]/g,'');
 if(!/^\+[1-9]\d{7,14}$/.test(result))bad();return result;
}
function normalizeProfile(input){
 if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.length>200)bad();
 const p={name:input.name.trim(),phone:phone(input.phone),telegram:null,max:null,whatsapp:null,preferredChannel:input.preferredChannel||'email',advertisingConsent:false};
 if(input.telegram){if(typeof input.telegram!=='string')bad();p.telegram=input.telegram.replace(/^@/,'');if(!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(p.telegram))bad();}
 if(input.max){try{const u=new URL(input.max);if(u.protocol!=='https:'||u.hostname!=='max.ru'||u.port||u.username||u.password||u.search||u.hash||u.pathname==='/'||u.href.length>500)bad();p.max=u.href;}catch{bad();}}
 if(input.whatsapp)p.whatsapp=phone(input.whatsapp);
 if(!['email','phone','telegram','max','whatsapp'].includes(p.preferredChannel)||(['telegram','max','whatsapp'].includes(p.preferredChannel)&&!p[p.preferredChannel]))bad();
 if(input.advertisingConsent!==undefined&&typeof input.advertisingConsent!=='boolean')bad();
 // Marketing enrolment requires a separate versioned consent flow, not this profile form.
 if(input.advertisingConsent===true)throw Object.assign(new Error('Согласие на рекламу оформляется отдельно'),{status:400});
 return p;
}
module.exports={normalizeProfile};
