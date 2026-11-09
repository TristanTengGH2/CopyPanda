/* Per-pose cutout ownership. Every source pixel belongs to exactly one layer. */
(function(root){
 'use strict';
 const layers=Object.freeze(['body','head','ears','foreground','sweater']);
 const headOutline=[[130,0],[497,0],[499,125],[475,170],[477,244],[430,279],[325,293],[180,280],[100,249],[86,180],[123,107]];
 const ears=[[[129,116],[123,57],[139,22],[177,2],[219,2],[253,21],[276,53],[240,61],[209,69],[179,84],[159,105]],[[330,80],[373,45],[418,34],[459,35],[486,57],[497,90],[491,123],[479,151],[456,175],[437,145],[413,125],[385,109],[359,95]]];
 const inside=(x,y,points)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 // Median crown landmark stays within two pixels across the source poses.
 const pose=(kind,frame)=>({x:294,y:89+(kind==='focus'?[0,0,0,-1,-1,-1]:[-2,-1,-1,-1,-1,-1])[frame],angle:0});
 function label(data,width,height,kind,clothing){
  if(data.length!==width*height*4||clothing.length!==width*height||!['focus','break'].includes(kind))throw new Error('Invalid rig source.');
  const result=new Uint8Array(width*height);
  for(let frame=0;frame<6;frame++){
   const left=Math.round(frame%3*width/3),right=Math.round((frame%3+1)*width/3),top=Math.round(Math.floor(frame/3)*height/2),bottom=Math.round((Math.floor(frame/3)+1)*height/2),p=pose(kind,frame),angle=-p.angle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
   for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const pixel=y*width+x;if(!data[pixel*4+3])continue;
    const lx=(x-left)*628/(right-left),ly=(y-top)*418/(bottom-top),dx=lx-p.x,dy=ly-p.y,hx=dx*c-dy*s+294,hy=dx*s+dy*c+89;
    // Book and pose-specific arms stay in front of face and clothing.
    const arm=ly>150&&((kind==='focus'&&frame===3&&lx>288&&lx<450)||(kind==='break'&&frame>=2&&lx>80&&lx<455));
    const foreground=ly>=294||(arm&&(clothing[pixel]||data[pixel*4]<165));
    result[pixel]=foreground?3:ears.some(poly=>inside(hx,hy,poly))?2:inside(hx,hy,headOutline)?1:clothing[pixel]?4:0;
   }
  }
  return result;
 }
 function isolate(data,ownership,id,target=new Uint8ClampedArray(data.length)){
  if(data.length!==ownership.length*4||!Number.isInteger(id)||id<0||id>=layers.length||target.length!==data.length)throw new Error('Invalid rig layer.');
  for(let p=0;p<ownership.length;p++){const k=p*4;target[k]=data[k];target[k+1]=data[k+1];target[k+2]=data[k+2];target[k+3]=ownership[p]===id?data[k+3]:0;}
  return target;
 }
 const garment=Object.freeze({asset:'assets/panda-head-kit.png',crown:[175,615,550,200],cuff:[1008,622,640,188],crownWidth:285,cuffWidth:294,crownY:58,cuffY:97});
 const api={layers,label,isolate,pose,garment};root.CopyPandaRig=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
