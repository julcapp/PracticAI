'use strict';
const directions = ['Для руководителей','Для коучей и тренеров','Для компаний','Для педагогов','Для юристов','Для бухгалтеров и финансистов','Другое направление'];
const personalPattern = /[^\s@]+@[^\s@]+\.[^\s@]+|(?<!\d)\+?\d[\d\s()\-]{8,}\d(?!\d)/;
const normalize = text => String(text).toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function matches(message, phrase) {
 const words=normalize(message).split(' '), parts=normalize(phrase).split(' ');
 return parts.length>0 && words.some((_,i)=>parts.every((part,j)=>part && words[i+j]?.startsWith(part)));
}
const topics=[['руководител',0],['коуч',1],['тренер',1],['компан',2],['корпоратив',2],['бизнес',2],['педагог',3],['учител',3],['юрист',4],['бухгалтер',5],['финанс',5]];
function detect(message){return topics.find(([phrase])=>matches(message,phrase))?.[1];}
function validateScenario(d) {
 return !!d && typeof d.slug==='string' && /^[a-z0-9-]{2,80}$/.test(d.slug) &&
 typeof d.question==='string' && !!d.question.trim() && d.question.length<=200 &&
 typeof d.keywords==='string' && d.keywords.length<=1000 && d.keywords.split(/[\n,;]+/).filter(s=>s.trim()).length<=30 &&
 d.keywords.split(/[\n,;]+/).filter(s=>s.trim()).length>0 && d.keywords.split(/[\n,;]+/).filter(s=>s.trim()).every(s=>/^[\p{L}\p{N}\s-]+$/u.test(s) && normalize(s).length>=2) &&
 typeof d.answer==='string' && !!d.answer.trim() && d.answer.length<=2000 &&
 (d.direction==='' || directions.includes(d.direction)) && [0,1,false,true].includes(d.enabled) &&
 Number.isInteger(d.priority) && Math.abs(d.priority)<=10000;
}
const make=(slug,question,keywords,answer,direction='',priority=0)=>({slug,question,keywords,answer,direction,priority,enabled:1});
const defaults=[
 make('directions','Какие направления есть?','направлен\nкурс\nобучен\nпривет\nздравствуй','Помогу выбрать обучение для себя или компании: руководители, коучи, педагоги, юристы, бухгалтеры и финансисты. Какое направление вас интересует?'),
 make('enrollment','Как записаться?','запис\nзаявк\nоформ\nкупить\nоплатить','Оставьте запрос на запись в форме. Менеджер уточнит условия и наличие мест. Запрос не является подтверждением зачисления.'),
 make('unknown-terms','Каковы условия обучения?','цен\nстоим\nстоит\nдат\nначал\nстарт\nрасписан\nдокумент\nсертификат\nмест\nскидк','Условия этого направления требуют уточнения. Оставьте запрос: менеджер сообщит подтверждённую стоимость, расписание и правила записи.'),
 make('accountants-intro','Расскажите о курсе для бухгалтеров','бухгалтер\nфинанс\nкурс\nпрограмм','Курс «ИИ в работе бухгалтера»: 5 занятий, доступ к материалам на 3 месяца. Стоимость — 19 990 ₽ за участника. Старт — первый понедельник каждого месяца, занятия в 17:30 по Томску. Подробнее: https://practicai.ru/courses/accountants.html',directions[5]),
 make('accountants-price','Сколько стоит курс?','цен\nстоим\nстоит\nоплат\nрассроч','Стоимость курса «ИИ в работе бухгалтера» — 19 990 ₽ за участника. Оплата — 100% полностью. Рассрочка и скидки не утверждены. Хотите оставить запрос на запись?',directions[5],10),
 make('accountants-schedule','Когда начинаются занятия?','дат\nначал\nстарт\nрасписан\nврем\nкогда\nдней\nзанят','Старт — первый понедельник каждого месяца. Всего 5 занятий, время — 17:30 по Томску (UTC+7). Дни занятий после первого уточняются при записи. Доступ к курсу — 3 месяца.',directions[5],10),
 make('accountants-document','Какой документ выдают?','документ\nсертификат\nудостоверен\nдиплом','Итоговый документ курса «ИИ в работе бухгалтера» пока не утверждён. Менеджер уточнит его перед оформлением обучения.',directions[5],10),
 make('companies','Нужна программа для компании','компан\nкорпоратив\nбизнес','Для компаний предусмотрены индивидуальные программы по применению ИИ. Оставьте запрос и укажите задачу команды: менеджер уточнит программу, сроки и стоимость.',directions[2]),
 ...[[0,'руководител'],[1,'коуч\nтренер'],[3,'педагог\nучител'],[4,'юрист']].map(([i,k])=>make('direction-'+i,'Обучение: '+directions[i],k,'Направление «'+directions[i]+'» представлено в PracticAI. Программа, даты и стоимость уточняются. Можно оставить запрос менеджеру.',directions[i])),
];
function answer(message,history=[],scenarios=[],selected='') {
 const explicit=detect(message);
 const previous=[...history].reverse().find(x=>x.role==='user' && detect(x.content)!==undefined);
 const topic=explicit!==undefined?explicit:directions.includes(selected)?directions.indexOf(selected):previous?detect(previous.content):undefined;
 const direction=topic===undefined?'':directions[topic];
 const choices=direction?[{label:'Стоимость',question:'Какова стоимость?'},{label:'Расписание',question:'Какое расписание?'},{label:'Оставить заявку',question:'Хочу записаться'}]:[{label:'Для себя',question:'Какие направления обучения есть?'},{label:'Для компании',question:'Нужна программа для компании'},{label:'Бухгалтерам',question:'Я бухгалтер'}];
 const base={direction,choices,showLead:false,remember:true};
 if(personalPattern.test(message)) return {...base,answer:'Пожалуйста, не отправляйте личные данные в чат. Введите контакты в отдельной форме запроса на запись.',showLead:true,remember:false};
 const enrollment=['запис','заявк','оформ','купить','оплатить'].some(p=>matches(message,p));
 const ranked=scenarios.filter(s=>Number(s.enabled)===1 && (!s.direction || s.direction===direction))
 .map(s=>({s,weight:s.keywords.split(/[\n,;]+/).map(x=>x.trim()).filter(x=>x&&matches(message,x)).reduce((n,x)=>Math.max(n,normalize(x).length),0)}))
 .filter(x=>x.weight>0).sort((a,b)=>Number(!!b.s.direction)-Number(!!a.s.direction)||b.s.priority-a.s.priority||b.weight-a.weight||a.s.slug.localeCompare(b.s.slug));
 const found=ranked[0]?.s;
 return {...base,answer:found?.answer || (direction?'Уточню этот вопрос через менеджера. Оставьте запрос по направлению «'+direction+'».':'Помогу выбрать направление обучения. Что вас интересует? Для уточнения условий можно оставить запрос менеджеру.'),showLead:enrollment};
}
module.exports={answer,validateScenario,defaults,directions};
