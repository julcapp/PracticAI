'use strict';
/** transport is an authenticated nodemailer SMTP transport configured outside Git. */
function createLinkSender({transport,from,origin}){
 if(!transport||typeof transport.sendMail!=='function'||!from)throw new Error('SMTP transport and sender required');
 return async(email,link)=>{
  const url=new URL(link);if(url.origin!==origin||url.pathname!=='/learning/login.html')throw new Error('Invalid login URL');
  await transport.sendMail({from,to:email,subject:'Вход в PracticAI',text:`Для входа в личный кабинет откройте ссылку:\n${link}\n\nСсылка действует 15 минут и используется один раз. Если вы не запрашивали вход, проигнорируйте письмо.`,disableFileAccess:true,disableUrlAccess:true});
 };
}
module.exports={createLinkSender};
