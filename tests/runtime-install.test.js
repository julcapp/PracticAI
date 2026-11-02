'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {installRuntime}=require('../bootstrap-runtime');
test('installs runtime atomically once, retains media and content on archive failure',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cms-runtime-')),source=fs.mkdtempSync(path.join(os.tmpdir(),'cms-package-'));
 try{
  fs.mkdirSync(path.join(root,'media'));fs.writeFileSync(path.join(root,'media','keep.txt'),'user upload');fs.mkdirSync(path.join(root,'node_modules'));fs.writeFileSync(path.join(root,'node_modules','old.txt'),'old');
  fs.mkdirSync(path.join(source,'node_modules','test-package'),{recursive:true});fs.writeFileSync(path.join(source,'node_modules','test-package','index.js'),'module.exports=42;');
  execFileSync('tar',['-czf',path.join(root,'node-runtime.tgz'),'-C',source,'node_modules']);
  assert.equal(installRuntime(root),true);assert.equal(fs.readFileSync(path.join(root,'media','keep.txt'),'utf8'),'user upload');assert.equal(require(path.join(root,'node_modules','test-package')),42);assert.equal(installRuntime(root),false);
  fs.writeFileSync(path.join(root,'node-runtime.tgz'),'bad archive');assert.throws(()=>installRuntime(root));assert.equal(require(path.join(root,'node_modules','test-package')),42);assert.equal(fs.readFileSync(path.join(root,'media','keep.txt'),'utf8'),'user upload');
 }finally{fs.rmSync(root,{recursive:true,force:true});fs.rmSync(source,{recursive:true,force:true});}
});
