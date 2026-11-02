'use strict';
const formats={
 png:{mime:'image/png',valid:b=>b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))},
 jpg:{mime:'image/jpeg',valid:b=>b[0]===255&&b[1]===216&&b[b.length-2]===255&&b[b.length-1]===217},
 webp:{mime:'image/webp',valid:b=>b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'},
 pdf:{mime:'application/pdf',valid:b=>b.toString('ascii',0,5)==='%PDF-'&&b.subarray(-1024).toString('ascii').includes('%%EOF')},
};
function decodeUpload(data,name){
 const m=typeof data==='string'&&/^data:(image\/(png|jpeg|webp)|application\/(pdf));base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
 const bad=()=>Object.assign(new Error('Выберите PNG, JPEG или WebP до 3 МБ либо PDF до 10 МБ. Проверьте формат файла.'),{status:400});
 if(!m||typeof name!=='string'||!name||name.length>160)throw bad();
 const ext=m[2]==='jpeg'?'jpg':m[2]||'pdf',bytes=Buffer.from(m[4],'base64');
 if(!bytes.length||bytes.length>(ext==='pdf'?10:3)*1024*1024||!formats[ext].valid(bytes))throw bad();return {extension:ext,bytes};
}
module.exports={formats,decodeUpload};
