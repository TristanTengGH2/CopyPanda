const test=require('node:test');
const assert=require('node:assert/strict');
const {Session,reward,challengeProgress}=require('../web/core.js');
test('pause freezes elapsed time; resume completes the original duration',()=>{
 const s=new Session({plannedMs:60000});s.start(0);s.tick(20000);s.pause();s.tick(500000);assert.equal(s.elapsedMs,20000);s.start(500000);assert.equal(s.tick(540000),'complete');assert.equal(s.elapsedMs,60000);assert.equal(s.running,false);
});
test('early ending retains full active minutes but no completion bonus',()=>{
 assert.deepEqual(reward(15*60000+59999,25*60000,false),{base:15,bonus:0,total:15});
 assert.deepEqual(reward(25*60000,25*60000,true),{base:25,bonus:3,total:28});
 assert.equal(reward(25*60000,25*60000,false).bonus,0);
});
test('a long sleep gap pauses and does not fabricate study time',()=>{
 const s=new Session();s.start(1000);s.tick(11000);assert.equal(s.tick(500000),'interrupted');assert.equal(s.elapsedMs,10000);assert.equal(s.running,false);
});
test('demo sessions cannot mint currency',()=>assert.equal(reward(600000,600000,true,true).total,0));
test('missed days preserve challenge progress; manual and unfinished entries do not qualify',()=>{
 const c={minutes:25,sessionsPerDay:1,targetDays:14,startedAt:'2026-10-01T00:00:00Z'};
 const entry=(day,extra={})=>({day,endedAt:day+'T20:00:00Z',plannedMs:1500000,completed:true,...extra});
 const p=challengeProgress(c,[entry('2026-10-01'),entry('2026-10-04'),entry('2026-10-04'),entry('2026-10-08',{manual:true}),entry('2026-10-09',{completed:false}),entry('2026-09-30')]);
 assert.deepEqual(p.days,['2026-10-01','2026-10-04']);assert.equal(p.count,2);
});
test('a resumed snapshot requires explicit restart and cannot award the same elapsed interval',()=>{
 const s=new Session({elapsedMs:120000});const restored=new Session(s.serialize());assert.equal(restored.running,false);restored.tick(999999);assert.equal(restored.elapsedMs,120000);
});
