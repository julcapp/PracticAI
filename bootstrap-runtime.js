'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
function installRuntime(root=__dirname){
 const archive=path.join(root,'node-runtime.tgz');if(!fs.existsSync(archive))return false;
 const digest=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),marker=path.join(root,'.runtime-revision');
 const installed=()=>fs.existsSync(marker)&&fs.readFileSync(marker,'utf8')===digest&&fs.existsSync(path.join(root,'node_modules'));
 if(installed())return false;
 const lock=path.join(root,'.runtime-install-lock'),started=Date.now();
 for(;;){try{fs.mkdirSync(lock);break;}catch(e){if(e.code!=='EEXIST')throw e;if(installed())return false;let age=0;try{age=Date.now()-fs.statSync(lock).mtimeMs;}catch{continue;}if(age>300000){try{fs.rmdirSync(lock);}catch{}continue;}if(Date.now()-started>25000)throw Error('Runtime installation is still running');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);}}
 const stage=path.join(root,'.runtime-stage-'+crypto.randomUUID()),previous=path.join(root,'.runtime-prev-'+crypto.randomUUID()),modules=path.join(root,'node_modules');let success=false;
 try{
  if(installed())return false;fs.mkdirSync(stage);
  execFileSync('tar',['-xzf',archive,'-C',stage],{stdio:'pipe',timeout:20000});
  if(!fs.statSync(path.join(stage,'node_modules')).isDirectory())throw Error('Invalid runtime archive');
  if(fs.existsSync(modules))fs.renameSync(modules,previous);
  try{fs.renameSync(path.join(stage,'node_modules'),modules);}catch(e){if(fs.existsSync(previous)&&!fs.existsSync(modules))fs.renameSync(previous,modules);throw e;}
  fs.writeFileSync(marker,digest,{mode:0o600});success=true;return true;
 }finally{
  fs.rmSync(stage,{recursive:true,force:true});if(success)fs.rmSync(previous,{recursive:true,force:true});try{fs.rmdirSync(lock);}catch{}
 }
}
module.exports={installRuntime};
