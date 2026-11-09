const test=require('node:test');
const assert=require('node:assert/strict');
const backup=require('../web/backup.js');
const row=(id='one')=>({id,day:'2026-11-08',endedAt:'2026-11-08T12:00:00Z',activeMs:1500000,plannedMs:1500000,completed:true,intention:'Biology',earned:999,manual:false});
const state=()=>({sessions:[row()],notes:'Private notes',bookmark:{working:'Biology',next:'Page 82',savedAt:'2026-11-08T12:00:00Z'},challenge:{id:'goal',minutes:25,sessionsPerDay:1,targetDays:14,startedAt:'2026-11-01T12:00:00Z'},access_token:'never export',timer:{running:true}});
test('backup round trip preserves private work and excludes authentication and running timers',()=>{
 const result=backup.validate(JSON.parse(JSON.stringify(backup.create(state()))));
 assert.equal(result.notes,'Private notes');assert.equal(result.bookmark.next,'Page 82');assert.equal(result.sessions[0].earned,28);
 assert.equal('access_token' in result,false);assert.equal('timer' in result,false);
});
test('restoring twice cannot duplicate study entries or leaves',()=>{
 const incoming=backup.create(state());const first=backup.merge([],incoming.sessions),second=backup.merge(first.sessions,incoming.sessions);
 assert.equal(first.added,1);assert.equal(first.leaves,28);assert.equal(second.added,0);assert.equal(second.leaves,0);
});
test('existing study records win over conflicting backup records',()=>{
 const existing={...row(),intention:'Keep this task'};assert.equal(backup.merge([existing],[row()]).sessions[0].intention,'Keep this task');
});
test('manual study earns no leaves and demos cannot become study records',()=>{
 const source=state();source.sessions=[{...row(),manual:true,plannedMs:0}];assert.equal(backup.create(source).sessions[0].earned,0);
 source.sessions=[{...row(),demo:true}];assert.throws(()=>backup.create(source),/Demo/);
});
test('invalid dates, incomplete completions, and duplicate IDs are rejected',()=>{
 for(const sessions of [[{...row(),day:'2026-02-31'}],[{...row(),activeMs:1000}],[row(),row()]])assert.throws(()=>backup.create({...state(),sessions}));
});
test('foreign formats, unsupported versions, and oversized notes are rejected',()=>{
 const source=backup.create(state());assert.throws(()=>backup.validate({...source,format:'other'}));assert.throws(()=>backup.validate({...source,version:2}));assert.throws(()=>backup.validate({...source,notes:'a'.repeat(1000001)}));
});
test('real elapsed times with fractional milliseconds remain exportable',()=>{
 const source=state();source.sessions=[{...row(),activeMs:120000.75,completed:false}];const result=backup.create(source);assert.equal(result.sessions[0].activeMs,120000);assert.equal(result.sessions[0].earned,2);
 for(const activeMs of [NaN,Infinity,-.1])assert.throws(()=>backup.create({...state(),sessions:[{...row(),activeMs,completed:false}]}));
});
test('backups preserve sweater choice and still accept older backups without appearance',()=>{
 const result=backup.create({...state(),appearance:{sweater:'river'}});assert.deepEqual(result.appearance,{sweater:'river',headwear:'none'});
 const original=backup.create(state());assert.equal(original.appearance,undefined);
 assert.deepEqual(backup.validate({...result,appearance:{sweater:'unknown'}}).appearance,{sweater:'moss',headwear:'none'});
});
test('purchase-aware backups preserve owned clothing and do not refund spending on restore',()=>{
 const store=require('../web/shop-core.js');const sessions=[row('one'),row('two')];const bought=store.purchase(56,null,'beanie-rust',{id:'hat',purchasedAt:'2026-11-09T12:00:00Z'});
 const data=backup.create({...state(),sessions,shop:bought.shop,appearance:{sweater:'river',headwear:'beanie-rust'}});assert.equal(data.appearance.headwear,'beanie-rust');
 const history=backup.merge([],data.sessions),first=store.merge(history.leaves,null,data.shop);assert.equal(first.balance,16);
 const repeatedHistory=backup.merge(history.sessions,data.sessions),again=store.merge(first.balance+repeatedHistory.leaves,first.shop,data.shop);assert.equal(again.balance,16);
 assert.throws(()=>backup.create({...state(),shop:bought.shop}),/without enough/);
});
