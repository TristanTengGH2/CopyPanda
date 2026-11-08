const test=require('node:test');
const assert=require('node:assert/strict');
const {GuardedStore}=require('../web/storage.js');
function memory(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}}
test('a stale tab cannot overwrite a newer snapshot',()=>{
 const storage=memory(),first=new GuardedStore(storage),second=new GuardedStore(storage);first.load('local');second.load('local');
 assert.equal(first.write('local','new notes'),'saved');assert.equal(second.write('local','old tab draft'),'conflict');assert.equal(storage.getItem('local'),'new notes');
});
test('idle tabs do not rewrite unchanged snapshots after another tab saves',()=>{
 const storage=memory();storage.setItem('local','original');const first=new GuardedStore(storage);first.load('local');storage.setItem('local','newer');assert.equal(first.write('local','original'),'unchanged');assert.equal(storage.getItem('local'),'newer');
});
test('reloading a scope accepts its latest snapshot and keeps account scopes separate',()=>{
 const storage=memory(),store=new GuardedStore(storage);store.load('guest');store.load('account');store.write('guest','guest notes');store.write('account','private notes');storage.setItem('guest','new guest notes');assert.equal(store.changed('guest','new guest notes'),true);assert.equal(store.load('guest'),'new guest notes');assert.equal(store.write('guest','revised guest notes'),'saved');assert.equal(storage.getItem('account'),'private notes');
});
test('storage failures reach the caller instead of reporting a successful save',()=>{
 const store=new GuardedStore({getItem:()=>null,setItem:()=>{throw new Error('Quota exceeded')}});store.load('local');assert.throws(()=>store.write('local','notes'),/Quota/);
});
