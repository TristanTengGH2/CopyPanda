const test=require('node:test'),assert=require('node:assert/strict'),rig=require('../web/panda-rig-core.js');
test('source pixels are owned once and reconstruct without gaps or alpha changes',()=>{
 const w=1884,h=836,pixels=new Uint8ClampedArray(w*h*4),clothing=new Uint8Array(w*h);
 for(const [x,y,color] of [[10,10,[0,0,0,0]],[220,190,[230,131,43,255]],[190,40,[248,221,185,220]],[200,330,[220,194,137,255]],[460,310,[130,109,55,128]]]){pixels.set(color,(y*w+x)*4);if(x===460)clothing[y*w+x]=1;}
 const before=pixels.slice(),labels=rig.label(pixels,w,h,'focus',clothing),reconstructed=new Uint8ClampedArray(pixels.length),seen=new Uint8Array(w*h);
 for(let id=0;id<rig.layers.length;id++){const part=rig.isolate(pixels,labels,id);for(let p=0;p<seen.length;p++)if(part[p*4+3]){seen[p]++;reconstructed.set(part.subarray(p*4,p*4+4),p*4);}}
 assert.deepEqual(reconstructed,pixels);assert.deepEqual(pixels,before);assert.ok(seen.every(n=>n<=1));assert.equal(labels[190*w+220],1);assert.equal(labels[40*w+190],2);assert.equal(labels[330*w+200],3);
});
test('layer visibility cannot leak hidden pixels or accept an invalid part',()=>{
 const source=new Uint8ClampedArray([230,131,43,255,248,221,185,128]);const result=rig.isolate(source,new Uint8Array([1,2]),2);assert.equal(result[3],0);assert.equal(result[7],128);assert.throws(()=>rig.isolate(source,new Uint8Array([1,2]),9),/Invalid/);
});
