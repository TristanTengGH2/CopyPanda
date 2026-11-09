/* Rebuild textures only on clothing changes; CSS keeps the existing animation clock. */
(function(root){
 'use strict';
 const paths={focus:'assets/panda-focus-coherent.png',break:'assets/panda-break-matched.png'};
 const sources=new Map();let request=0,currentVariant=null,currentKey='moss/none',hatPromise=null;
 function source(kind){
  if(!sources.has(kind))sources.set(kind,new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>{
    try{if(image.naturalWidth!==1883||image.naturalHeight!==835)throw new Error('The clothing artwork needs a matching mask.');const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);resolve({width:canvas.width,height:canvas.height,data:pixels.data,mask:CopyPandaWardrobe.mask(pixels.data,canvas.width,canvas.height,kind)})}catch(error){reject(error)}
   };image.onerror=()=>reject(new Error('The clothing artwork could not load.'));image.src=paths[kind];
  }).catch(error=>{sources.delete(kind);throw error}));
  return sources.get(kind);
 }
 function hat(){
  if(!hatPromise)hatPromise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('The cutout artwork could not load.'));image.src=CopyPandaRig.garment.asset}).catch(error=>{hatPromise=null;throw error});
  return hatPromise;
 }
 async function texture(kind,style,options={}){
  const original=await source(kind),canvas=document.createElement('canvas');canvas.width=original.width;canvas.height=original.height;
  const ctx=canvas.getContext('2d'),pixels=CopyPandaWardrobe.recolor(original.data,original.mask,style.sweater);
  if(style.headwear!=='beanie-rust'&&!options.layers){ctx.putImageData(new ImageData(pixels,original.width,original.height),0,0);}
  else{
   original.ownership ||= CopyPandaRig.label(original.data,original.width,original.height,kind,original.mask);
   const scratch=document.createElement('canvas');scratch.width=canvas.width;scratch.height=canvas.height;const sc=scratch.getContext('2d'),buffer=new Uint8ClampedArray(pixels.length);
   const drawLayer=id=>{if(options.layers&&!options.layers.includes(CopyPandaRig.layers[id]))return;CopyPandaRig.isolate(pixels,original.ownership,id,buffer);sc.putImageData(new ImageData(buffer,canvas.width,canvas.height),0,0);ctx.drawImage(scratch,0,0);};
   const piece=style.headwear==='beanie-rust'?await hat():null,fit=CopyPandaRig.garment;
   const drawClothing=part=>{if(!piece||(options.layers&&!options.layers.includes(part)))return;const crop=fit[part],w0=fit[part+'Width'];for(let frame=0;frame<6;frame++){
    const pose=CopyPandaRig.pose(kind,frame),x0=Math.round(frame%3*canvas.width/3),y0=Math.round(Math.floor(frame/3)*canvas.height/2),sx=(canvas.width/3)/628,sy=(canvas.height/2)/418,w=w0*sx,h=w*crop[3]/crop[2];
    ctx.save();ctx.beginPath();ctx.rect(x0,y0,canvas.width/3,canvas.height/2);ctx.clip();ctx.translate(x0+pose.x*sx,y0+pose.y*sy);ctx.rotate(pose.angle*Math.PI/180);ctx.drawImage(piece,...crop,-w/2,(fit[part+'Y']-89)*sy-h/2,w,h);ctx.restore();
   }};
   drawLayer(0);drawLayer(4);drawLayer(1);drawClothing('crown');drawClothing('cuff');drawLayer(2);drawLayer(3);
  }
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(URL.createObjectURL(blob)):reject(new Error('The clothing preview could not be drawn.')),'image/png'));
 }
 async function prepare(value){
  const style=CopyPandaWardrobe.appearance(value);
  let urls=[];
  try{
   if(style.sweater!=='moss'||style.headwear!=='none'){
    const results=await Promise.allSettled([texture('focus',style),texture('break',style)]);
    urls=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
    if(results.some(r=>r.status==='rejected'))throw new Error('The clothing preview could not load.');
    // Decode both textures before switching, so changing modes cannot flash an empty panda.
    await Promise.all(urls.map(url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=url})));
   }
   return {focus:urls[0]||paths.focus,break:urls[1]||paths.break,dispose:()=>urls.forEach(URL.revokeObjectURL)};
  }catch(error){urls.forEach(URL.revokeObjectURL);throw error;}
 }
 async function apply(value){
  const style=CopyPandaWardrobe.appearance(value),key=style.sweater+'/'+style.headwear,epoch=++request;if(key===currentKey)return true;
  try{const variant=await prepare(style);if(epoch!==request){variant.dispose();return false;}const previous=currentVariant;
   document.documentElement.style.setProperty('--panda-focus-sheet',`url("${variant.focus}")`);document.documentElement.style.setProperty('--panda-break-sheet',`url("${variant.break}")`);currentVariant=variant;currentKey=key;requestAnimationFrame(()=>previous?.dispose());return true;
  }catch(error){if(epoch===request)throw error;return false;}
 }
 root.CopyPandaWardrobeRenderer={apply,prepare,preview:async(kind,value,layers)=>texture(kind,CopyPandaWardrobe.appearance(value),{layers})};
})(window);
