'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {decodeUpload}=require('../cms/media');
test('PDF upload checks signature, EOF and size; disguised files rejected',()=>{
 const pdf=Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');assert.equal(decodeUpload('data:application/pdf;base64,'+pdf.toString('base64'),'file.pdf').extension,'pdf');
 assert.throws(()=>decodeUpload('data:application/pdf;base64,'+Buffer.from('<html></html>').toString('base64'),'file.pdf'));
 assert.throws(()=>decodeUpload('data:application/pdf;base64,'+Buffer.from('%PDF-1.7 no ending').toString('base64'),'file.pdf'));
 assert.throws(()=>decodeUpload('data:text/html;base64,Zm9v','file.pdf'));
 const huge=Buffer.alloc(10*1024*1024+1,32);pdf.copy(huge);assert.throws(()=>decodeUpload('data:application/pdf;base64,'+huge.toString('base64'),'big.pdf'));
});
