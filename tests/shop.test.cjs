const test=require('node:test'),assert=require('node:assert/strict');
const shop=require('../web/shop-core.js');
const receipt=(id='purchase-1')=>({id,purchasedAt:'2026-11-09T12:00:00Z'});
test('buying an item spends the fixed price once and gives permanent ownership',()=>{
 const first=shop.purchase(56,null,'beanie-rust',receipt());assert.equal(first.balance,16);assert.equal(shop.owns(first.shop,'beanie-rust'),true);
 const second=shop.purchase(first.balance,first.shop,'beanie-rust',receipt('retry'));assert.equal(second.balance,16);assert.equal(second.shop.purchases.length,1);
});
test('insufficient funds and unknown items never mutate the wallet or inventory',()=>{
 const inventory={purchases:[]};assert.throws(()=>shop.purchase(39,inventory,'beanie-rust',receipt()),/1 more/);assert.deepEqual(inventory,{purchases:[]});assert.throws(()=>shop.purchase(100,inventory,'missing',receipt()),/unavailable/);
 for(const balance of [-1,NaN,1.5])assert.throws(()=>shop.purchase(balance,inventory,'beanie-rust',receipt()));
});
test('restored purchase receipts cannot refund spending or charge twice',()=>{
 const source=shop.purchase(56,null,'beanie-rust',receipt());const restored=shop.merge(56,null,source.shop);assert.equal(restored.balance,16);
 const repeated=shop.merge(restored.balance,restored.shop,source.shop);assert.equal(repeated.balance,16);assert.equal(repeated.added,0);
});
test('conflicting cross-device spending is rejected rather than creating a negative wallet',()=>{
 const local=shop.purchase(200,null,'room-moonlit-cafe',receipt());const incoming=shop.purchase(200,null,'room-rainy-library',receipt('other'));
 assert.throws(()=>shop.merge(local.balance,local.shop,incoming.shop),/conflict/);assert.equal(local.balance,40);
});
test('invalid prices and duplicate receipts are rejected',()=>{
 const data=shop.purchase(56,null,'beanie-rust',receipt()).shop;
 assert.throws(()=>shop.normalize({purchases:[{...data.purchases[0],price:0}]}));assert.throws(()=>shop.normalize({purchases:[...data.purchases,...data.purchases]}));
});
