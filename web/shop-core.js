/* Earned-leaf purchases are local until account inventory sync is implemented. */
(function(root){
 'use strict';
 const catalog=Object.freeze([
  {id:'beanie-rust',type:'clothing',name:'Rust beanie',price:40,asset:'assets/panda-head-kit.png',description:'A knitted beanie that follows your panda through study sessions and stretches.'},
  {id:'room-rainy-library',type:'room',room:'rainy-library',name:'Rainy library',price:120,asset:'assets/room-rainy-library.png',description:'Rain at the windows, warm lamps, and shelves full of books.'},
  {id:'room-moonlit-cafe',type:'room',room:'moonlit-cafe',name:'Moonlit café',price:160,asset:'assets/room-moonlit-cafe.png',description:'A quiet café after sunset, with warm lights and a moonlit view.'},
  {id:'room-greenhouse',type:'room',room:'greenhouse',name:'Sunlit greenhouse',price:180,asset:'assets/room-greenhouse.png',description:'A pine workbench under a glass roof, surrounded by ferns and a flowering garden.'},
  {id:'room-observatory',type:'room',room:'observatory',name:'Hilltop observatory',price:200,asset:'assets/room-observatory.png',description:'A walnut desk beneath an open dome, with a brass telescope and distant stars.'}
 ].map(Object.freeze));
 const get=id=>catalog.find(item=>item.id===id);
 const fail=message=>{throw new Error(message)};
 const money=value=>Number.isSafeInteger(value)&&value>=0?value:fail('Invalid leaf balance.');
 function normalize(value){
  if(value==null)return {purchases:[]};
  if(!Array.isArray(value.purchases)||value.purchases.length>catalog.length)fail('Invalid shop history.');
  const ids=new Set(),items=new Set();
  const purchases=value.purchases.map(row=>{
   const item=get(row?.itemId);
   if(!item||row.price!==item.price||typeof row.id!=='string'||!row.id||row.id.length>100||!Number.isFinite(Date.parse(row.purchasedAt)))fail('Invalid shop receipt.');
   if(ids.has(row.id)||items.has(row.itemId))fail('Repeated shop receipt.');
   ids.add(row.id);items.add(row.itemId);
   return {id:row.id,itemId:item.id,price:item.price,purchasedAt:row.purchasedAt};
  });
  return {purchases};
 }
 const owns=(shop,id)=>!!shop?.purchases?.some(row=>row.itemId===id);
 function purchase(balance,shop,itemId,receipt){
  money(balance);shop=normalize(shop);const item=get(itemId);if(!item)fail('This item is unavailable.');
  if(owns(shop,itemId))return {balance,shop,alreadyOwned:true};
  if(balance<item.price)fail(`You need ${item.price-balance} more leaves.`);
  const next=normalize({purchases:[...shop.purchases,{...receipt,itemId,price:item.price}]});
  return {balance:balance-item.price,shop:next,alreadyOwned:false};
 }
 function merge(balance,current,incoming){
  money(balance);current=normalize(current);incoming=normalize(incoming);
  const additions=incoming.purchases.filter(row=>!owns(current,row.itemId));
  const cost=additions.reduce((sum,row)=>sum+row.price,0);
  if(cost>balance)fail('These purchases conflict with leaves already spent here. Keep your current data and restore this backup in a separate browser.');
  return {balance:balance-cost,shop:normalize({purchases:[...current.purchases,...additions]}),added:additions.length,cost};
 }
 const api={catalog,get,normalize,owns,purchase,merge};root.CopyPandaShop=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
