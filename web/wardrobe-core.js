/* Clothing colors are independent of the original character artwork and animation. */
(function(root){
 'use strict';
 const colors=Object.freeze([
  {id:'moss',name:'Moss',hex:'#826d37',rgb:[130,109,55]},
  {id:'river',name:'River',hex:'#718b9e',rgb:[113,139,158]},
  {id:'clay',name:'Clay',hex:'#a96c5d',rgb:[169,108,93]},
  {id:'lavender',name:'Lavender',hex:'#9d82a2',rgb:[157,130,162]},
  {id:'oat',name:'Oat',hex:'#c4b28a',rgb:[196,178,138]}
 ].map(Object.freeze));
 const normalize=id=>colors.some(c=>c.id===id)?id:'moss';
 // Seed regions are authored in the existing 628×418 pose coordinate system.
 // A flood fill follows only connected olive fabric. Disconnected book leaves stay out.
 const focusSeeds=Array.from({length:6},()=>[[128,260,176,300],[445,270,487,333]]);
 const torsoSeeds=[[[250,288,323,307]],[[250,288,289,305]],[[250,288,288,303]],[[340,286,380,301]],[],[[249,289,323,308]]];
 const breakSeeds=Array.from({length:6},()=>[[135,264,180,301],[345,279,405,309],[222,288,294,310]]);
 function fabric(r,g,b,a){return a>32&&g-b>20&&r-g<(g-b)*.6&&r>g*.9;}
 function mask(data,width,height,kind){
  if(data.length!==width*height*4||!['focus','break'].includes(kind))throw new Error('Invalid clothing atlas.');
  const selected=new Uint8Array(width*height),queue=new Int32Array(width*height);
  for(let frame=0;frame<6;frame++){
   const x0=Math.round(frame%3*width/3),x1=Math.round((frame%3+1)*width/3),y0=Math.round(Math.floor(frame/3)*height/2),y1=Math.round((Math.floor(frame/3)+1)*height/2);
   const seeds=kind==='focus'?[...focusSeeds[frame],...torsoSeeds[frame]]:breakSeeds[frame];let end=0;
   const add=(x,y)=>{if(x<x0||x>=x1||y<y0||y>=y1)return;const p=y*width+x,k=p*4;if(!selected[p]&&fabric(data[k],data[k+1],data[k+2],data[k+3])){selected[p]=1;queue[end++]=p}};
   for(const [left,top,right,bottom] of seeds){
    for(let y=y0+Math.round(top*(y1-y0)/418);y<y0+Math.round(bottom*(y1-y0)/418);y++)
     for(let x=x0+Math.round(left*(x1-x0)/628);x<x0+Math.round(right*(x1-x0)/628);x++)add(x,y);
   }
   for(let head=0;head<end;head++){const p=queue[head],x=p%width,y=Math.floor(p/width);add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1)}
  }
  return selected;
 }
 function recolor(data,selected,id){
  if(data.length!==selected.length*4)throw new Error('Clothing mask size does not match the artwork.');
  const output=new Uint8ClampedArray(data),color=colors.find(c=>c.id===normalize(id));
  if(color.id==='moss')return output;
  for(let p=0;p<selected.length;p++)if(selected[p])for(let c=0;c<3;c++)output[p*4+c]=data[p*4+c]+color.rgb[c]-colors[0].rgb[c];
  return output;
 }
 const api={colors,normalize,mask,recolor};root.CopyPandaWardrobe=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
