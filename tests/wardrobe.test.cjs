const test=require('node:test'),assert=require('node:assert/strict');
const wardrobe=require('../web/wardrobe-core.js');
test('unknown clothing colors safely use the original sweater',()=>{assert.equal(wardrobe.normalize('missing'),'moss');assert.equal(wardrobe.normalize('river'),'river')});
test('recolor changes only masked clothing and preserves alpha and source pixels',()=>{
 const source=new Uint8ClampedArray([130,109,55,253,243,204,164,255,137,112,62,128]);const before=source.slice();const result=wardrobe.recolor(source,new Uint8Array([1,0,0]),'river');
 assert.deepEqual([...result.slice(0,4)],[113,139,158,253]);assert.deepEqual(result.slice(4),source.slice(4));assert.deepEqual(source,before);
});
test('the original color is an exact reversible copy of the source',()=>{
 const source=new Uint8ClampedArray([130,109,55,253]);assert.deepEqual(wardrobe.recolor(source,new Uint8Array([1]),'moss'),source);
});
test('atlas masks follow fabric connected to clothing seeds, not disconnected leaves',()=>{
 const w=1884,h=836,pixels=new Uint8ClampedArray(w*h*4);
 const fill=(left,top,right,bottom)=>{for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)pixels.set([130,109,55,255],(y*w+x)*4)};
 fill(130,265,160,295);fill(115,315,180,340);const mask=wardrobe.mask(pixels,w,h,'focus');
 assert.equal(mask[280*w+145],1);assert.equal(mask[330*w+145],0);assert.equal(mask[200*w+145],0);
});
test('registered clothing masks use the reviewed source atlases',()=>{
 const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
 const assetRoot=path.join(__dirname,'../web/assets'),contract=JSON.parse(fs.readFileSync(path.join(assetRoot,'wardrobe-mask-contract.json'),'utf8'));
 for(const asset of Object.values(contract.assets))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(assetRoot,asset.file))).digest('hex'),asset.sha256,'Changed artwork needs a reviewed mask contract');
});
