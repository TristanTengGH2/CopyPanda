/* Rebuild textures only on clothing changes; CSS keeps the existing animation clock. */
(function(root){
 'use strict';
 const paths={focus:'assets/panda-focus-coherent.png',break:'assets/panda-break-matched.png'};
 const sources=new Map();let request=0,currentURLs=[],currentColor='moss';
 function source(kind){
  if(!sources.has(kind))sources.set(kind,new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>{
    try{if(image.naturalWidth!==1883||image.naturalHeight!==835)throw new Error('The clothing artwork needs a matching mask.');const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);resolve({width:canvas.width,height:canvas.height,data:pixels.data,mask:CopyPandaWardrobe.mask(pixels.data,canvas.width,canvas.height,kind)})}catch(error){reject(error)}
   };image.onerror=()=>reject(new Error('The clothing artwork could not load.'));image.src=paths[kind];
  }).catch(error=>{sources.delete(kind);throw error}));
  return sources.get(kind);
 }
 async function texture(kind,color){
  const original=await source(kind),canvas=document.createElement('canvas');canvas.width=original.width;canvas.height=original.height;
  canvas.getContext('2d').putImageData(new ImageData(CopyPandaWardrobe.recolor(original.data,original.mask,color),original.width,original.height),0,0);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(URL.createObjectURL(blob)):reject(new Error('The clothing preview could not be drawn.')),'image/png'));
 }
 async function apply(value){
  const color=CopyPandaWardrobe.normalize(value),epoch=++request;if(color===currentColor)return true;
  let urls=[];
  try{
   if(color!=='moss'){
    const results=await Promise.allSettled([texture('focus',color),texture('break',color)]);
    urls=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
    if(results.some(r=>r.status==='rejected'))throw new Error('The clothing preview could not load.');
    // Decode both textures before switching, so changing modes cannot flash an empty panda.
    await Promise.all(urls.map(url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=url})));
   }
   if(epoch!==request){urls.forEach(URL.revokeObjectURL);return false;}
   const previous=currentURLs;
   document.documentElement.style.setProperty('--panda-focus-sheet',`url("${urls[0]||paths.focus}")`);
   document.documentElement.style.setProperty('--panda-break-sheet',`url("${urls[1]||paths.break}")`);
   currentURLs=urls;currentColor=color;
   // Existing nodes switch in the same style update. Retire the previous variant afterward.
   requestAnimationFrame(()=>previous.forEach(URL.revokeObjectURL));
   return true;
  }catch(error){urls.forEach(URL.revokeObjectURL);if(epoch===request)throw error;return false;}
 }
 root.CopyPandaWardrobeRenderer={apply};
})(window);
