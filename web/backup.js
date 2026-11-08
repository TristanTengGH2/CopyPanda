/* Local backup format. Authentication, room invitations, and sync tokens are excluded. */
(function(root){
 'use strict';
 const {reward}=root.CopyPandaCore||(typeof require==='function'?require('./core.js'):{});
 const wardrobe=root.CopyPandaWardrobe||(typeof require==='function'?require('./wardrobe-core.js'):null);
 const FORMAT='copypanda-local-backup', VERSION=1;
 const fail=message=>{throw new Error(message)};
 const text=(value,max,label)=>typeof value==='string'&&value.length<=max?value:fail(`Invalid ${label}.`);
 const integer=(value,min,max,label)=>Number.isSafeInteger(value)&&value>=min&&value<=max?value:fail(`Invalid ${label}.`);
 const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:fail('Invalid study date.');
 function day(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))fail('Invalid study day.');
  const parsed=new Date(value+'T12:00:00Z');
  if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)fail('Invalid study day.');
  return value;
 }
 function goal(value){
  if(!value||typeof value!=='object')fail('Invalid study goal.');
  return {id:text(value.id,100,'goal ID'),minutes:integer(value.minutes,1,120,'goal duration'),sessionsPerDay:integer(value.sessionsPerDay,1,8,'daily sessions'),targetDays:integer(value.targetDays,1,365,'goal days'),startedAt:date(value.startedAt)};
 }
 function bookmark(value){return value==null?null:{working:text(value.working||'',180,'bookmark'),next:text(value.next||'',500,'next step'),savedAt:date(value.savedAt)}}
 function record(value){
  if(!value||typeof value!=='object')fail('Invalid study record.');
  if(value.demo)fail('Demo sessions cannot be restored as study records.');
  const manual=value.manual===true;
  const plannedMs=integer(value.plannedMs,manual?0:60000,120*60000,'planned duration');
  const maxActive=manual?720*60000:plannedMs;
  if(typeof value.activeMs!=='number'||!Number.isFinite(value.activeMs)||value.activeMs<0||value.activeMs>maxActive)fail('Invalid study duration.');
  // Browser monotonic timers can produce fractional milliseconds. Normalize for export.
  const activeMs=Math.floor(value.activeMs);
  const completed=!manual&&value.completed===true;
  if(completed&&activeMs<plannedMs)fail('A completed session must include its full study time.');
  return {id:text(value.id,100,'record ID'),day:day(value.day),endedAt:date(value.endedAt),activeMs,plannedMs,completed,intention:text(value.intention||'',500,'study task'),kind:'solo',earned:manual?0:reward(activeMs,plannedMs,completed).total,manual};
 }
 function validate(input){
  if(!input||input.format!==FORMAT||input.version!==VERSION)fail('Choose a CopyPanda backup file (version 1).');
  if(!Array.isArray(input.sessions)||input.sessions.length>10000)fail('The backup contains too many study entries.');
  const sessions=input.sessions.map(record),ids=new Set();
  for(const row of sessions){if(!row.id||ids.has(row.id))fail('The backup contains repeated or empty study IDs.');ids.add(row.id)}
  const result={format:FORMAT,version:VERSION,exportedAt:date(input.exportedAt),sessions,notes:text(input.notes||'',1000000,'notes'),bookmark:bookmark(input.bookmark),challenge:goal(input.challenge)};
  if(input.appearance)result.appearance={sweater:wardrobe.normalize(input.appearance.sweater)};
  return result;
 }
 function create(state,now=new Date()){
  return validate({format:FORMAT,version:VERSION,exportedAt:now.toISOString(),sessions:state.sessions,notes:state.notes,bookmark:state.bookmark,challenge:state.challenge,appearance:state.appearance});
 }
 function merge(existing,incoming){
  const ids=new Set(existing.map(row=>row.id)),added=[];
  for(const row of incoming){if(!ids.has(row.id)){added.push(row);ids.add(row.id)}}
  return {sessions:[...existing,...added].sort((a,b)=>a.endedAt.localeCompare(b.endedAt)),added:added.length,leaves:added.reduce((sum,row)=>sum+row.earned,0)};
 }
 const api={create,validate,merge};root.CopyPandaBackup=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
