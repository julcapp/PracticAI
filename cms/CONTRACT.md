# Native CMS interfaces (approved 2026-11-02)

All admin requests use `/api/admin/cms` and existing Basic auth + `X-Requested-With: PracticAI-CRM`, Content-Type application/json.
- GET /documents -> {documents:[{id,kind,label,version,publishedVersion,updatedAt}], kinds:['page','course','experts','settings']}
- GET /documents/:id -> {id,kind,label,version,publishedVersion,draft:Payload,published:Payload|null,history:[{id,version,createdAt}]}
- POST /documents body {slug,title} -> new page draft response same as GET. New path /pages/:slug (slug ASCII 2..80 chars).
- PUT /documents/:id body {version,payload} -> current GET response. 409 on stale version. Saving doesn't publish.
- POST /documents/:id/publish body {version} -> current GET response; history stores previous published payload. 409 stale.
- POST /documents/:id/restore body {version,revisionId} -> restores history payload into DRAFT only, returns GET response. 409 stale.
- POST /preview body {id,payload,version} -> {html}; no database write; escape safely. For page only. UI iframe sandbox="" srcdoc html, scripts removed in backend.
- GET /media -> {files:[{url,name,type,size}]} uploaded files only, safe names no deletion.
- POST /media/upload existing endpoint accepts image data URI <=3MB and application/pdf data URI <=10MB, returns {url}; total Express JSON limit becomes 15mb.
Errors {error}; validation errors 400, conflict409, absent404.

Payload page: {slug,title,description,sections:[Section]}. Existing builtin slugs main,education,accountants, new pages use chosen slug. Page sections ordered, can hide/reorder. Structural header/footer stay fixed; their contents and visibility remain editable. Only content sections reorder between them. Existing sections have fixed:boolean metadata.
Section: {id,kind:'existing'|'text'|'image'|'cards'|'faq'|'cta',label,hidden:boolean,fields:[Field],items:[{title,body,image,href,label}]}
Field: {key,label,type:'text'|'image'|'link',value:string,preserveOriginal?:boolean}. For seeded image fields preserveOriginal=true retains inline artwork when value is empty; editing an image sets it false, so clearing then removes the artwork. Existing section field keys are generated immutable metadata; never change keys/types. Text editable <=10000, image/link safe URLs <=2000. New sections use id 'block-'+random UUID (ASCII), fields from makeBlock helper below, items <=30.
New blocks fields: title(text),body(text),image(image),href(link),buttonLabel(text),layout(text: 'left'|'right'|'top'); UI may use textarea/select. All six fields always present. items optional for cards/faq.

Payload course id 'course-accountants': {title,summary,price:19990,lessons:5,accessMonths:3,startRule:'first-monday',time:'17:30',timezone:'Asia/Tomsk',paymentPercent:100,document:'Итоговый документ пока не утверждён.',scheduleNote:'Дни остальных занятий уточняются при записи.',program:[{title,body}]}. price number>=0; lessons/accessMonths positive integers; startRule first-monday|by-agreement, time HH:mm, timezone fixed Asia/Tomsk for first version. title/summary free text. Structured canonical fields drive course page/catalog/system consultant replies. Program may be empty to preserve original program until editor supplies items. No payment integration.
Payload experts id 'experts': {items:[{id,name,role,expertise,description,photo,visible:boolean}]}; ordered, max50, starts6 placeholders. photo safe URL or ''.
Payload settings id 'settings': {menu:[{label,href,visible:boolean}],contacts:{email,phone,address,organization},title,description}; menu ordered max30; contacts plain strings; preserve unknown details on pages (no invented facts).

CMS page templates server rendered. Existing CRM forms/scenarios remain accessible at /admin. CMS editor separately /admin/cms using same authentication and links between panels. CMS JS and CSS assets /cms-admin.js,/cms-admin.css. Public css /cms-public.css. UI never accepts raw HTML and uses textContent. Preview includes current unsaved page fields. Course, experts and settings publishing applies globally; UI explains this. Each tab loads corresponding document. Report writes .superpowers/cms/<task>-report.md. No pushes, deployment, git commits by worker; root integrates.
