/* CopyPanda browser study space. Local progress, with optional guest rooms. */
'use strict';
const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
const {Session,reward,challengeProgress,dayKey}=CopyPandaCore;
const qaValue=new URLSearchParams(location.search).get('qa');
const BASE_KEY=qaValue!==null?'copypanda-qa-v1'+(qaValue&&qaValue!=='1'&&/^[a-z0-9-]{1,32}$/i.test(qaValue)?':'+qaValue:''):'copypanda-v1';
let KEY=BASE_KEY;
let guardedStore=null,storageBlocked=false;
try{guardedStore=new CopyPandaStorage.GuardedStore(localStorage)}catch{}
const defaultChallenge=()=>({minutes:25,sessionsPerDay:1,targetDays:14,startedAt:new Date().toISOString(),id:crypto.randomUUID()});
const defaults=()=>({balance:0,focusMinutes:25,sessions:[],notes:'',intention:'',room:'cafe',bookmark:null,bookmarkDraft:{},shop:{purchases:[]},testCredit:null,appearance:{sweater:'moss',headwear:'none'},challenge:defaultChallenge(),challengeArchive:[],challengeAwards:[],settings:{display:'standard',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,contrast:false,largeText:false,reminders:true},tutorialDone:false,onboardingSeen:false,timer:null});
let state=defaults(),returningProfile=false;
try { const stored=JSON.parse(guardedStore?.load(KEY)||'null'); if(stored&&typeof stored==='object'){returningProfile=true;state={...state,...stored,settings:{...state.settings,...stored.settings}};} } catch {}
if(!Array.isArray(state.sessions))state.sessions=[];
if(!Array.isArray(state.challengeArchive))state.challengeArchive=[];
if(!Array.isArray(state.challengeAwards))state.challengeAwards=[];
if(!Number.isFinite(state.focusMinutes)||state.focusMinutes<1||state.focusMinutes>120)state.focusMinutes=25;
function normalizeInventory(){try{state.shop=CopyPandaShop.normalize(state.shop)}catch{state.shop={purchases:[]};}state.appearance=CopyPandaWardrobe.appearance(state.appearance);if(!CopyPandaShop.owns(state.shop,state.appearance.headwear))state.appearance.headwear='none';}
normalizeInventory();
state.testCredit=state.testCredit==='shop-preview-v1'?'shop-preview-v1':null;
let session=new Session(state.timer||{plannedMs:state.focusMinutes*60000});
let toastTimeout, checkpoint=0, demoRoom=null, lastFocus=null, journalMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let pandaVisualKind=null;
let shopPreview=null,shopPreviewEpoch=0;
let pandaPageTurning=false,nextPandaPageAt=performance.now()+5000;
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
function announce(message){$('#announcer').textContent=message;}
let warned=false;
function save(){
 state.timer=session.serialize();if(storageBlocked)return false;
 try{
  if(!guardedStore)throw new Error('Storage unavailable');
  const result=guardedStore.write(KEY,JSON.stringify(state));
  if(result==='conflict'){handleStorageConflict();return false;}
  if(result==='saved')window.dispatchEvent(new Event('copypanda:saved'));
  return true;
 }catch{if(!warned){warned=true;toast('Storage is unavailable. Progress will only last while this tab stays open.');}return false;}
}
function handleStorageConflict(){
 if(storageBlocked)return;storageBlocked=true;
 if(session.running){const result=session.tick(performance.now());session.pause();if(result==='complete')finishSession(true);else renderTimer();}
 const warning=document.createElement('button');warning.id='storage-warning';warning.textContent='Saving paused · Review work from this tab';warning.onclick=storageConflictDialog;document.body.append(warning);
 announce('Another tab saved changes. Saving is paused here to protect that version. Review this tab’s work before reloading.');
}
function storageConflictDialog(){
 showModal('Another tab saved changes',`<p>Saving is paused in this tab so it cannot overwrite the newer saved version. Your work here is still available while this tab stays open.</p><p>Download this tab’s work before reloading if you want to keep it. ${session.elapsedMs>0?'The backup action will end your paused timer and include its study time.':''}</p><div class="choice-row"><button class="primary" id="review-conflict-backup">Review backup options</button><button id="reload-saved">Reload saved version</button></div><p class="small-copy">Reloading discards changes that exist only in this tab. You can restore downloaded entries afterward using Data & backups.</p>`);
 $('#review-conflict-backup').onclick=()=>{if(session.elapsedMs>0)finishSession(false);backupDialog();};$('#reload-saved').onclick=()=>location.reload();
}
window.addEventListener('storage',event=>{if((event.key===KEY||event.key===null)&&guardedStore?.changed(KEY,event.key===null?null:event.newValue))handleStorageConflict();});
function showModal(title,html,wide=false){
 clearShopPreview();
 const modal=$('#modal');if(!modal.open){const trigger=document.activeElement,menuOnly=matchMedia('(max-width:1024px), (max-height:560px)').matches,inRoom=$('#room-options').contains(trigger),inSound=$('#sound-options').contains(trigger);lastFocus=$('#app-menu').contains(trigger)||(menuOnly&&(inRoom||inSound))?$('#app-menu-toggle'):inRoom?$('#rooms-bubble'):inSound?$('#sound-bubble'):trigger;}
 closeBubblePanels();
 modal.classList.toggle('wide',wide);modal.classList.toggle('shop-modal',title==='Shop');modal.setAttribute('aria-labelledby','dialog-title');$('#modal-content').innerHTML=`<h2 id="dialog-title">${escapeHTML(title)}</h2>${html}`;
 dressPortraits();
 if(!modal.open)modal.showModal();
 if(!modal.contains(document.activeElement))$('#close-modal').focus();
}
function closeModal(){clearShopPreview();$('#modal').close();lastFocus?.focus?.();}
$('#close-modal').onclick=closeModal;
$('#modal').addEventListener('close',()=>{clearShopPreview();lastFocus?.focus?.();});
$('#modal').addEventListener('click',e=>{if(e.target!==$('#modal'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();});
const roomInfo={
 cafe:{name:'The corner café',caption:'Pull up a chair. You’re right on time.',src:'assets/cafe-coherent.png',photo:true,layered:true},
 library:{name:'The quiet library',caption:'A whole world between the pages.',src:'assets/library.svg'},
 train:{name:'The night train',caption:'A little focus. Somewhere to go.',src:'assets/train.svg'},
 home:{name:'Your own little nook',caption:'Make yourself at home.',src:'assets/home.svg'},
 'rainy-library':{name:'Rainy library',caption:'A quiet desk by the rain.',src:'assets/room-rainy-library.png',layered:true,photo:true,item:'room-rainy-library'},
 'moonlit-cafe':{name:'Moonlit café',caption:'A warm desk after sunset.',src:'assets/room-moonlit-cafe.png',layered:true,photo:true,item:'room-moonlit-cafe'},
 greenhouse:{name:'Sunlit greenhouse',caption:'A little daylight, a little growing.',src:'assets/room-greenhouse.png',layered:true,photo:true,item:'room-greenhouse',pandaTop:44.5},
 observatory:{name:'Hilltop observatory',caption:'A quiet desk beneath the stars.',src:'assets/room-observatory.png',layered:true,photo:true,item:'room-observatory',pandaTop:47}
};
function renderRoomChoices(){
 const labels={cafe:'Café',library:'Library',train:'Night train',home:'My nook'};
 $('.environment-options').innerHTML=Object.entries(roomInfo).map(([key,room])=>`<button class="environment ${state.room===key?'selected':''}" ${room.item&&!CopyPandaShop.owns(state.shop,room.item)?`data-shop-item="${room.item}"`:`data-room="${key}" aria-pressed="${state.room===key}"`}>${labels[key]||room.name}${room.item&&!CopyPandaShop.owns(state.shop,room.item)?`<small>${CopyPandaShop.get(room.item).price} leaves · Shop</small>`:''}</button>`).join('');
 $$('[data-room]').forEach(button=>button.onclick=()=>{chooseRoom(button.dataset.room);closeBubblePanels();(matchMedia('(max-width:1024px), (max-height:560px)').matches?$('#app-menu-toggle'):$('#rooms-bubble')).focus();});
 $$('[data-shop-item]').forEach(button=>button.onclick=()=>shopDetail(button.dataset.shopItem,'room'));
}
function chooseRoom(key){
 if(roomInfo[key]?.item&&!CopyPandaShop.owns(state.shop,roomInfo[key].item))key='cafe';
 const room=roomInfo[key]||roomInfo.cafe;state.room=roomInfo[key]?key:'cafe';
 $('#room-card').style.setProperty('--scene-panda-top',(room.pandaTop||40.5)+'%');
 $('#room-name').textContent=room.name;$('#room-caption').textContent=room.caption;
 const lightweight=state.settings.display!=='standard';
 const layeredCafe=!!room.layered&&!lightweight;
 $('#room-art').src=lightweight?'assets/panda-matched.png':room.src;
 $('#panda-composition').hidden=!layeredCafe;
 if(!layeredCafe||state.settings.reducedMotion)endPandaPageTurn();
 if(layeredCafe)layoutPandaScene();
 $('#room-art').alt=lightweight?'Your red panda studying an open book':`${room.name}, with your panda studying beside you`;
 $('#room-card').classList.toggle('photo-room',!!room.photo&&!lightweight);
 renderRoomChoices();
 save();
}
function updatePanda(){
 const changed=pandaVisualKind!==session.kind;
 if(changed){pandaVisualKind=session.kind;endPandaPageTurn();}
 $('#panda-turn-page').setAttribute('aria-label',session.kind==='break'?'Preview your panda stretching':'Preview a page turn');
 $('#panda-turn-page').title=session.kind==='break'?'Preview stretch':'Turn a page';
 const text=session.running?(session.kind==='break'?'A little breather.':'Studying, right beside you.'):session.elapsedMs>0?'Paused. Take your time.':'Ready when you are.';
 $('#panda-state').textContent=text;$('#mini-state').textContent=text;
 document.body.classList.toggle('focusing',session.running&&session.kind==='focus');document.body.classList.toggle('resting',session.kind==='break');
 document.body.classList.toggle('session-paused',!session.running&&session.elapsedMs>0);
 if(changed&&session.kind==='break'&&!session.elapsedMs)requestAnimationFrame(()=>turnPandaPage());
}
function renderTimer(){
 const seconds=session.remainingSeconds;const m=Math.floor(seconds/60),s=seconds%60;
 $('#time').innerHTML=`${String(m).padStart(2,'0')}<span>:</span>${String(s).padStart(2,'0')}`;
 $('#time').setAttribute('aria-label',`${m} minutes ${s} seconds remaining`);
 $('#start-label').textContent=session.running?'Pause':session.elapsedMs>0?'Resume':session.kind==='break'?'Start break':'Start focus';
 $('#play-icon').textContent=session.running?'Ⅱ':'▶';$('#timer-status').textContent=session.demo?'DEMO · NO REWARDS':(session.kind==='focus'?'FOCUS':'BREAK')+(session.running?(session.kind==='focus'?' · STUDYING':' · RESTING'):session.elapsedMs>0?' · PAUSED':'');
 $('#duration-button').textContent=`${session.plannedMs/60000===Math.floor(session.plannedMs/60000)?session.plannedMs/60000+' min':'10 sec'} ⌄`;
 $('#duration-button').disabled=session.kind==='break'||session.running||session.elapsedMs>0;
 $('#duration-button').title=session.kind==='break'?'Short breaks last 5 minutes':session.running||session.elapsedMs>0?'End this session before changing its duration':'Change focus duration';
 $('#reset').disabled=!session.running&&session.elapsedMs===0;
 const leaves=reward(session.plannedMs,session.plannedMs,true,session.demo);
 $('#reward-preview').textContent=session.demo?'Preview only · no leaves or study credit':session.kind==='break'?'A little rest. No leaves needed.':`${leaves.base} leaves + ${leaves.bonus} for finishing`;
 $('#intention').disabled=session.running;$('#demo').disabled=session.running||session.elapsedMs>0;
 $$('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===session.kind);b.setAttribute('aria-pressed',String(b.dataset.mode===session.kind));});
 updatePanda();
}
function renderChallenge(){
 const c=state.challenge,p=challengeProgress(c,state.sessions);
 $('#balance').textContent=state.balance;
 $('.wallet-label').textContent=state.balance===1?'leaf':'leaves';
 $('#challenge-description').textContent=`${c.sessionsPerDay===1?'One':c.sessionsPerDay} ${c.minutes}-minute session${c.sessionsPerDay===1?'':'s'} a day.`;
 $('#challenge-count').innerHTML=`${p.count}<span> / ${c.targetDays} study days</span>`;
 if($('#dock-progress'))$('#dock-progress').textContent=`${p.count} / ${c.targetDays} days`;
 $('#challenge-dots').innerHTML=Array.from({length:c.targetDays},(_,i)=>`<span class="${i<p.count?'filled':''}" title="Study day ${i+1}${i<p.count?' complete':''}" aria-label="Study day ${i+1}${i<p.count?' complete':' to go'}">${i<p.count?'✓':i+1}</span>`).join('');
 $('#challenge-today').textContent=p.count>=c.targetDays?'Your promise, kept. Well done.':p.today>=c.sessionsPerDay?'Today’s promise, kept.':`${p.today} of ${c.sessionsPerDay} sessions today`;
}
function newTimer(kind='focus',demo=false){session=new Session({plannedMs:demo?10000:(kind==='focus'?state.focusMinutes:5)*60000,kind,demo});save();renderTimer();}
function checkpointTimer(){const result=session.tick(performance.now());if(result==='interrupted'){toast('A long interruption was detected. Your timer is paused—resume when ready.');announce('Timer paused after an interruption.');save();}if(result==='complete'){finishSession(true);return result;}renderTimer();return result;}
function startPause(){
 if(storageBlocked){storageConflictDialog();return;}
 if(checkpointTimer()==='complete')return;
 if(session.running){session.pause();announce('Session paused.');}
 else{session.start(performance.now());announce(session.kind==='focus'?'Focus session started.':'Break started.');if(session.kind==='break'&&state.settings.reminders)toast(['Time for some water?','Rest your eyes for a moment.','Try a gentle seated stretch, if you like.'][Math.floor(Math.random()*3)]);}
 save();renderTimer();
}
function finishSession(completed){
 const previous=session;previous.pause();
 const earnings=previous.kind==='focus'?reward(previous.elapsedMs,previous.plannedMs,completed,previous.demo):{base:0,bonus:0,total:0};
 if(previous.kind==='focus'&&!previous.demo&&previous.elapsedMs>0){
  const now=new Date();state.sessions.push({id:crypto.randomUUID(),day:dayKey(now),endedAt:now.toISOString(),activeMs:previous.elapsedMs,plannedMs:previous.plannedMs,completed,intention:state.intention,kind:'solo',earned:earnings.total,manual:false});state.balance+=earnings.total;
 }
 newTimer(completed&&previous.kind==='focus'?'break':'focus');
 const p=challengeProgress(state.challenge,state.sessions);
 if(p.count>=state.challenge.targetDays&&!state.challengeAwards.includes(state.challenge.id)){state.challengeAwards.push(state.challenge.id);toast('Commitment complete! Your study-day keepsake is in your journal.');}
 save();renderChallenge();
 if(completed){
  if(previous.kind==='break'){toast('Break complete. Your next focus session is ready.');announce('Break complete.');return;}
  announce('Focus session complete.');
  showModal(previous.demo?'Demo complete':'Focus session complete',`<img class="completion-panda panda-portrait" src="assets/panda-matched.png" alt="Your study panda"><p>${previous.demo?'You’ve tried the focus flow. This demo does not earn leaves or count toward your study commitment.':`${Math.round(previous.elapsedMs/60000)} focused minutes, saved in your calendar.`}</p>${previous.demo?'':`<div class="stats"><div><strong>+${earnings.base}</strong><span>study leaves</span></div><div><strong>+${earnings.bonus}</strong><span>completion bonus</span></div></div>`}<p>${state.settings.reminders?'A sip of water or a little stretch? Your break starts when you choose.':'Your break is ready whenever you are.'}</p><div class="choice-row"><button id="begin-break" class="primary">Start a 5-minute break</button><button id="later-break">Maybe later</button></div>`);
  $('#begin-break').onclick=()=>{closeModal();startPause();};$('#later-break').onclick=closeModal;
 } else if(earnings.total)toast(storageBlocked?'Session kept in this tab. Download a backup before reloading.':`Session saved. You kept ${earnings.total} leaves for your study time.`);
}
$('#start').onclick=startPause;
$('#reset').onclick=()=>{
 checkpointTimer();if(session.elapsedMs===0&&!session.running)return;
 session.pause();save();renderTimer();
 const earned=session.kind==='focus'?reward(session.elapsedMs,session.plannedMs,false,session.demo).total:0;
 showModal('End this session?',`<p>${session.kind==='focus'?`You’ll keep ${earned} leaves for completed active minutes. The finishing bonus is skipped. Your timer is paused while you decide.`:'Your break is paused. You can end it or continue.'}</p><div class="choice-row"><button id="keep-going" class="primary">Keep this session</button><button id="end-session">End session</button></div>`);
 $('#keep-going').onclick=closeModal;$('#end-session').onclick=()=>{finishSession(false);closeModal();};
};
$$('[data-mode]').forEach(b=>b.onclick=()=>{if(session.running||session.elapsedMs>0){toast('Finish or end your current session before switching.');return;}newTimer(b.dataset.mode);});
function durationDialog(){
 if(session.running||session.elapsedMs>0)return;
 if(session.kind==='break'){toast('Short breaks are 5 minutes in this prototype.');return;}
 showModal('Set focus duration',`<p>Choose a preset or enter a duration.</p><div class="choice-row">${[15,25,50].map(n=>`<button data-duration="${n}">${n} min</button>`).join('')}</div><form id="duration-form"><label class="form-label" for="custom-minutes">Or set your own, from 1 to 120 minutes</label><input id="custom-minutes" type="number" min="1" max="120" value="${state.focusMinutes}" required><div class="choice-row"><button class="primary" type="submit">Use this time</button></div></form>`);
 const select=n=>{state.focusMinutes=n;newTimer();closeModal();};$$('[data-duration]').forEach(b=>b.onclick=()=>select(Number(b.dataset.duration)));
 $('#duration-form').onsubmit=e=>{e.preventDefault();const n=Number($('#custom-minutes').value);if(Number.isInteger(n)&&n>=1&&n<=120)select(n);};
}
$('#duration-button').onclick=durationDialog;
$('#demo').onclick=()=>{closeBubblePanels();newTimer('focus',true);session.start(performance.now());save();renderTimer();$('#start').focus();toast('10-second demo started. No currency or study credit.');};
$('#intention').value=state.intention;$('#intention').oninput=e=>{state.intention=e.target.value;save();};
$('#notes').value=state.notes;$('#notes').oninput=e=>{state.notes=e.target.value;save();};
$('#notes-toggle').onclick=()=>{$('#notes').hidden=!$('#notes').hidden;$('#notes-toggle').setAttribute('aria-expanded',String(!$('#notes').hidden));if(!$('#notes').hidden)$('#notes').focus();};
$('#pet').onclick=()=>{const lines=['You don’t have to do everything today.','Welcome back. Ready to study together?','A small step is still a step.','One page is a perfectly good place to start.'];$('#panda-message').textContent=lines[Math.floor(Math.random()*lines.length)];};
function editChallenge(){
 const c=state.challenge;
 showModal('Set a study goal',`<p>Choose a daily rhythm and a number of study days. Miss a day? Your progress stays exactly where you left it.</p><form id="challenge-form"><div class="form-grid"><label>Minutes per session<input id="goal-minutes" type="number" min="1" max="120" value="${c.minutes}" required></label><label>Sessions per day<input id="goal-sessions" type="number" min="1" max="8" value="${c.sessionsPerDay}" required></label><label>Study days to aim for<select id="goal-days">${[7,14,30].map(n=>`<option ${n===c.targetDays?'selected':''} value="${n}">${n} study days</option>`).join('')}</select></label></div><p class="small-copy">Starting a new commitment archives this one. Your study history, leaves, and previous progress stay yours.</p><div class="choice-row"><button type="submit" class="primary">Start this goal</button></div></form>`);
 $('#challenge-form').onsubmit=e=>{e.preventDefault();state.challengeArchive.push(state.challenge);state.challenge={...defaultChallenge(),minutes:Number($('#goal-minutes').value),sessionsPerDay:Number($('#goal-sessions').value),targetDays:Number($('#goal-days').value)};save();renderChallenge();closeModal();toast('A new promise. One day at a time.');};
}
function promiseSummary(){
 const c=state.challenge,p=challengeProgress(c,state.sessions);
 showModal('Study goals',`<p>${c.sessionsPerDay} completed ${c.minutes}-minute session${c.sessionsPerDay===1?'':'s'} a day, working toward ${c.targetDays} study days.</p><div class="stats"><div><strong>${p.count} / ${c.targetDays}</strong><span>study days completed</span></div><div><strong>${p.today} / ${c.sessionsPerDay}</strong><span>sessions today</span></div></div><div class="promise-days">${Array.from({length:c.targetDays},(_,i)=>`<span class="${i<p.count?'filled':''}">${i<p.count?'✓':i+1}</span>`).join('')}</div><p>Missing a day creates a gap, not a reset. Your progress and completion reward stay available.</p><div class="choice-row"><button class="primary" id="change-promise">Set a new goal</button><button id="promise-journal">View calendar</button></div>`);
 $('#change-promise').onclick=editChallenge;$('#promise-journal').onclick=journal;
}
function notesDialog(){showModal('Notes',`<p>Your notes save as you type on this device.</p><label class="sr-only" for="floating-notes">Private notes</label><textarea id="floating-notes" rows="8" placeholder="Leave a thought here…">${escapeHTML(state.notes)}</textarea>`);$('#floating-notes').oninput=e=>{state.notes=e.target.value;$('#notes').value=state.notes;save();};}
$('#edit-challenge').onclick=editChallenge;
function journal(){
 const year=journalMonth.getFullYear(),month=journalMonth.getMonth();const first=new Date(year,month,1),offset=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate();
 const total=state.sessions.reduce((sum,s)=>sum+s.activeMs,0),completed=state.sessions.filter(s=>s.completed&&!s.manual).length;
 const cells=Array.from({length:offset},()=>'<span></span>');
 for(let d=1;d<=days;d++){const date=new Date(year,month,d),key=dayKey(date),today=key===dayKey();const entries=state.sessions.filter(s=>s.day===key);const minutes=Math.floor(entries.reduce((sum,s)=>sum+s.activeMs,0)/60000);cells.push(`<button class="calendar-day ${entries.length?'studied':''} ${today?'today':''}" data-day="${key}" ${today?'aria-current="date"':''} aria-label="${escapeHTML(date.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}))}, ${minutes} study minutes">${d}${entries.length?'<i></i>':''}</button>`);}
 showModal('Calendar',`<div class="stats"><div><strong>${Math.floor(total/60000)}</strong><span>focused minutes</span></div><div><strong>${completed}</strong><span>completed sessions</span></div><div><strong>${challengeProgress(state.challenge,state.sessions).count}</strong><span>challenge study days</span></div></div><div class="calendar-heading"><button id="previous-month" aria-label="Previous month">←</button><h3>${first.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h3><button id="next-month" aria-label="Next month">→</button></div><div class="calendar-week">${['M','T','W','T','F','S','S'].map(s=>`<span>${s}</span>`).join('')}</div><div class="calendar">${cells.join('')}</div><p class="small-copy">Gaps are part of the story. Your challenge never resets because you miss a day.</p><div id="journal-entries"></div><div class="journal-actions"><button id="manual-entry">＋ Log outside study</button><button id="view-bookmark">↳ My last bookmark</button></div>${state.challengeAwards.length?'<p class="badge">✳ Keepsake earned: a promise kept</p>':''}`,true);
 $('#previous-month').onclick=()=>{journalMonth=new Date(year,month-1,1);journal();$('#previous-month').focus();};$('#next-month').onclick=()=>{journalMonth=new Date(year,month+1,1);journal();$('#next-month').focus();};
 $$('[data-day]').forEach(b=>b.onclick=()=>renderEntries(b.dataset.day));$('#manual-entry').onclick=manualEntry;$('#view-bookmark').onclick=viewBookmark;
 const today=new Date();renderEntries(dayKey(today.getFullYear()===year&&today.getMonth()===month?today:first));
}
function renderEntries(day){
 $$('[data-day]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.day===day)));
 const selectedDate=new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
 const entries=state.sessions.filter(s=>s.day===day).slice().reverse();$('#journal-entries').innerHTML=`<h3 class="journal-date">${escapeHTML(selectedDate)}</h3>${entries.length?entries.map(s=>`<article class="journal-entry"><span class="entry-dot"></span><div><strong>${escapeHTML(s.intention||'A little focus')}</strong><p>${Math.floor(s.activeMs/60000)} min · ${s.manual?'Manually logged · no currency':s.completed?'Completed · solo':'Ended early · solo'}${s.earned?` · +${s.earned} leaves`:''}</p></div></article>`).join(''):'<p class="empty-state">No study sessions recorded for this day.</p>'}`;
}
function manualEntry(){
 showModal('Log study time',`<p>Document your effort here. Manual entries earn no currency and don’t qualify for timer commitments in this prototype.</p><form id="manual-form"><label class="form-label">What did you work on?<input id="manual-intention" maxlength="120" required></label><div class="form-grid"><label>Study date<input id="manual-day" type="date" value="${dayKey()}" max="${dayKey()}" required></label><label>Focused minutes<input id="manual-minutes" type="number" min="1" max="720" value="25" required></label></div><div class="choice-row"><button type="submit" class="primary">Save study entry</button></div></form>`);
 $('#manual-form').onsubmit=e=>{e.preventDefault();state.sessions.push({id:crypto.randomUUID(),day:$('#manual-day').value,endedAt:new Date().toISOString(),activeMs:Number($('#manual-minutes').value)*60000,plannedMs:0,completed:false,intention:$('#manual-intention').value.trim(),manual:true,earned:0});save();journal();};
}
function viewBookmark(){const b=state.bookmark;showModal('Your last bookmark',b?`<p class="form-label">Last time you were working on</p><blockquote>${escapeHTML(b.working||'Your study session')}</blockquote><p class="form-label">Your next step</p><blockquote>${escapeHTML(b.next||'Choose where to continue.')}</blockquote><div class="choice-row"><button id="use-bookmark" class="primary">Continue this goal</button></div>`:'<p>No bookmark yet. Use “Save & leave” to leave a note for your next visit.</p>');if(b)$('#use-bookmark').onclick=()=>{state.intention=b.next||b.working;$('#intention').value=state.intention;save();closeModal();};}
function showReturnBookmark(){const b=state.bookmark;if(!b)return;const el=$('#return-bookmark');el.hidden=false;el.innerHTML=`<span>↳</span><div><strong>A little note from last time</strong><p>${escapeHTML(b.next||b.working)}</p></div><button id="continue-bookmark">Continue this goal →</button><button id="dismiss-bookmark" aria-label="Dismiss bookmark reminder">×</button>`;$('#continue-bookmark').onclick=()=>{state.intention=b.next||b.working;$('#intention').value=state.intention;el.hidden=true;save();$('#start').focus();};$('#dismiss-bookmark').onclick=()=>el.hidden=true;}
function leaveDialog(){
 checkpointTimer();session.pause();save();renderTimer();
 const draft=state.bookmarkDraft||{};
 showModal('Leave a bookmark for next time.',`<p>Your panda will keep your place. A little note can make coming back easier.</p><form id="leave-form"><label class="form-label" for="bookmark-working">What were you working on?</label><input id="bookmark-working" maxlength="180" value="${escapeHTML(draft.working??state.intention)}" placeholder="Biology, chapter four…"><label class="form-label" for="bookmark-next">Where would you like to pick up?</label><textarea id="bookmark-next" maxlength="500" placeholder="Start the practice questions on page 82…">${escapeHTML(draft.next||'')}</textarea><p class="small-copy">${session.elapsedMs>0?'Your timer is paused. Leaving ends this session and keeps leaves for completed focus minutes.':'Your notes and progress stay private on this device.'}</p><div class="choice-row"><button class="primary" type="submit">Save & leave</button><button type="button" id="skip-leave">Skip & leave</button></div><button class="text-button" type="button" id="stay-here">Stay in my space</button></form>`);
 const draftSave=()=>{state.bookmarkDraft={working:$('#bookmark-working').value,next:$('#bookmark-next').value};save();};$('#bookmark-working').oninput=draftSave;$('#bookmark-next').oninput=draftSave;
 const leave=saveBookmark=>{if(saveBookmark){state.bookmark={working:$('#bookmark-working').value.trim(),next:$('#bookmark-next').value.trim(),savedAt:new Date().toISOString()};state.bookmarkDraft={};}if(session.elapsedMs>0)finishSession(false);save();$('#audio').pause();closeModal();document.body.classList.add('away');$('#away').hidden=false;$('#come-back').focus();};
 $('#leave-form').onsubmit=e=>{e.preventDefault();leave(true);};$('#skip-leave').onclick=()=>leave(false);$('#stay-here').onclick=closeModal;
}
$('#leave').onclick=leaveDialog;$('#come-back').onclick=()=>{document.body.classList.remove('away');$('#away').hidden=true;showReturnBookmark();$('#start').focus();};
function settings(){
 const s=state.settings;
 showModal('Settings',`<p>Adjust your view, text, and reminders.</p><label class="form-label" for="display-mode">Display mode</label><select id="display-mode"><option value="standard">Standard · room, panda & timer</option><option value="lightweight">Lightweight · panda & timer</option><option value="still">Still · static panda & timer</option></select><p class="small-copy">Lightweight and Still hide the room to use fewer resources.</p><div class="setting-list">${[['reducedMotion','Reduce motion','No decorative movement or transitions.'],['contrast','High contrast','Stronger text, borders, and controls.'],['largeText','Larger text','More readable labels and controls.'],['reminders','Gentle break reminders','Optional water, eye-rest, and seated-stretch suggestions.']].map(([id,label,desc])=>`<label class="setting-row"><div><strong>${label}</strong><span>${desc}</span></div><input id="setting-${id}" type="checkbox" ${s[id]?'checked':''}></label>`).join('')}</div><p class="small-copy">Use Tab to move between controls, Enter or Space to select, and Escape to close.</p>`);
 const replay=document.createElement('button');replay.className='text-button';replay.textContent='Replay the UI walkthrough';replay.onclick=()=>tutorial();$('#modal-content').append(replay);
 const desktop=document.createElement('button');desktop.className='text-button';desktop.textContent='Download overlay';desktop.onclick=overlayDownload;$('#modal-content').append(desktop);
 const backups=document.createElement('button');backups.className='text-button';backups.textContent='Data & backups';backups.onclick=backupDialog;$('#modal-content').append(backups);
 const leave=document.createElement('button');leave.className='text-button';leave.textContent='Save & leave this space';leave.onclick=leaveDialog;$('#modal-content').append(leave);
 $('#display-mode').value=s.display;$('#display-mode').onchange=e=>{s.display=e.target.value;applySettings();};['reducedMotion','contrast','largeText','reminders'].forEach(id=>$('#setting-'+id).onchange=e=>{s[id]=e.target.checked;applySettings();});
}
function backupDialog(){
 const canRestore=!storageBlocked&&KEY===BASE_KEY&&!session.running&&session.elapsedMs===0;
 showModal('Data & backups',`<p>Your study history and notes are saved in this browser. Download a backup before clearing browser data or moving to another device.</p><section class="backup-section"><h3>Download a backup</h3><p class="small-copy">Includes saved study entries, notes, your bookmark, your current goal, clothing, owned shop items, and room selection. Includes private writing; keep the file somewhere you trust. Your running timer and sign-in details are excluded.</p><div class="choice-row"><button id="download-backup" class="primary">Download backup</button></div></section><section class="backup-section"><h3>Restore from a backup</h3><p class="small-copy">Existing study entries stay. Repeated entries are skipped and leaves are recalculated from imported study time. Purchase history is restored with its past leaf spending. You can choose whether to replace private writing and selected clothing or room.</p>${canRestore?'<label class="form-label" for="backup-file">Choose a CopyPanda JSON backup</label><input id="backup-file" type="file" accept=".json,application/json"><p id="backup-error" class="backup-error" role="alert"></p>':`<p class="network-message">${storageBlocked?'Reload the newer saved version before restoring a backup. Download this tab’s work first if you want to keep it.':KEY!==BASE_KEY?'Restore is available in local mode. Sign out before importing a local backup.':'Finish or end your current timer before restoring a backup.'}</p>`}</section>`);
 $('#download-backup').onclick=()=>{
  try{
   save();const data=CopyPandaBackup.create(state),content=JSON.stringify(data,null,2);
   if(new Blob([content]).size>10*1024*1024)throw new Error('This backup is too large to export in this version.');
   const url=URL.createObjectURL(new Blob([content],{type:'application/json'})),link=document.createElement('a');
   link.href=url;link.download=`copypanda-backup-${dayKey()}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   toast('Backup download requested. Check your downloads folder.');
  }catch(error){toast(error.message||'The backup could not be created.');}
 };
 const input=$('#backup-file');if(input)input.onchange=async()=>{
  const file=input.files?.[0];if(!file)return;$('#backup-error').textContent='';
  try{
   if(file.size>10*1024*1024)throw new Error('Choose a backup smaller than 10 MB.');
   const data=CopyPandaBackup.validate(JSON.parse(await file.text()));
   if(!input.isConnected||input.files?.[0]!==file)return;
   const preview=CopyPandaBackup.merge(state.sessions,data.sessions),testLeaves=data.testCredit&&!state.testCredit?500:0,inventory=CopyPandaShop.merge(state.balance+preview.leaves+testLeaves,state.shop,data.shop);
   showModal('Review your backup',`<p>This backup has <strong>${data.sessions.length} study ${data.sessions.length===1?'entry':'entries'}</strong>. Restoring adds <strong>${preview.added} new ${preview.added===1?'entry':'entries'}</strong> and <strong>${preview.leaves} study leaves</strong>${testLeaves?' and a 500-leaf test credit':''}. Existing entries stay unchanged.</p><p>${inventory.added} purchased ${inventory.added===1?'item':'items'} will be restored, with ${inventory.cost} already-spent leaves recorded. Your balance afterward will be <strong>${inventory.balance} leaves</strong>.</p><p class="small-copy">${data.sessions.length-preview.added} saved ${data.sessions.length-preview.added===1?'entry will':'entries will'} be skipped. An in-progress timer is not included.</p><label class="network-check"><input type="checkbox" id="restore-private"> Replace my notes, bookmark, goal, clothing, and room selection with this backup</label><p class="small-copy">Leave this unchecked to keep your current notes, goal, and selections.</p><div class="choice-row"><button class="primary" id="restore-backup">Restore backup</button><button id="cancel-backup">Cancel</button></div>`);
   $('#cancel-backup').onclick=backupDialog;
   $('#restore-backup').onclick=()=>{
    if(storageBlocked||KEY!==BASE_KEY||session.running||session.elapsedMs>0){backupDialog();return;}
    const before=structuredClone(state),replacePrivate=$('#restore-private').checked;
    const result=CopyPandaBackup.merge(state.sessions,data.sessions),restored=CopyPandaShop.merge(state.balance+result.leaves+(data.testCredit&&!state.testCredit?500:0),state.shop,data.shop);if(data.testCredit)state.testCredit=data.testCredit;state.sessions=result.sessions;state.balance=restored.balance;state.shop=restored.shop;
    if(replacePrivate){state.notes=data.notes;state.bookmark=data.bookmark;state.challengeArchive.push(state.challenge);state.challenge=data.challenge;if(data.appearance)state.appearance=CopyPandaWardrobe.appearance(data.appearance);if(data.room&&roomInfo[data.room])state.room=data.room;normalizeInventory();}
    if(!save()){state=before;return;}
    if(replacePrivate){chooseRoom(state.room);applyAppearance();$('#notes').value=state.notes;$('#return-bookmark').hidden=true;showReturnBookmark();}
    renderChallenge();renderRoomChoices();closeModal();toast(`Restored ${result.added} new study ${result.added===1?'entry':'entries'}. Your existing entries were kept.`);
   };
  }catch(error){if(input.isConnected)$('#backup-error').textContent=error instanceof SyntaxError?'This file is not valid JSON. Choose a CopyPanda backup.':error.message;}
 };
}
function applySettings(){const s=state.settings;document.body.classList.toggle('reduced-motion',s.reducedMotion||s.display==='still');document.body.classList.toggle('high-contrast',s.contrast);document.body.classList.toggle('large-text',s.largeText);document.body.classList.toggle('lightweight',s.display!=='standard');chooseRoom(state.room);applyAppearance();save();}
function together(){
 if(window.CopyPandaNetworkUI){window.CopyPandaNetworkUI.room();return;}
 const isInPerson=demoRoom?.type==='in-person';
 showModal('A table with room for you.',`<div class="preview-banner">INTERACTIVE PREVIEW · NOT CONNECTED TO OTHER PEOPLE</div><p>Study independently, or choose to start together. No camera required. No location collected.</p><div class="together-table"><img class="panda-portrait" src="assets/panda-matched.png" alt="Your panda"><span class="empty-seat">＋<small>A friend’s seat</small></span><span class="empty-seat">＋<small>A friend’s seat</small></span></div><div class="choice-row"><button id="online-preview" ${!isInPerson?'class="primary"':''}>Online room</button><button id="inperson-preview" ${isInPerson?'class="primary"':''}>In person</button></div><div class="room-preview"><h3>${isInPerson?'Sit down. Check in. Study.':'Your own rhythm, a little company.'}</h3><p>${isInPerson?'A host will display a short-lived QR check-in. Friends can scan it or use a typed code. This preview does not generate a live invitation.':'Friends will join through an invite link. Each person keeps their own timer unless they choose a shared start.'}</p>${isInPerson?'<div class="qr-placeholder" aria-label="QR check-in placeholder, not scannable"><span>▦</span><strong>QR check-in</strong><small>Live code available in a future build</small></div>':'<div class="invite-placeholder">copypanda / your-private-table <span>Preview only</span></div>'}<div class="bonus-note">${isInPerson?'+15%':'＋10%'} proposed together bonus · active overlap only</div></div><div class="choice-row"><button id="sync-preview" class="primary">Preview a synced session →</button></div><p class="small-copy">No social bonus is awarded in this solo mockup. Real room presence, expiring codes, and timer synchronization need the future backend.</p>`,true);
 $('#online-preview').onclick=()=>{demoRoom={type:'online'};together();};$('#inperson-preview').onclick=()=>{demoRoom={type:'in-person'};together();};$('#sync-preview').onclick=syncPreview;
}
function syncPreview(){showModal('Same start. Your choice.',`<div class="preview-banner">SYNC FLOW PREVIEW · NO REAL TIMERS ARE CHANGED</div><p>A friend proposes a <strong>25-minute focus session</strong>. You can join the shared start or keep your own timer.</p><div class="choice-row"><button id="join-sync" class="primary">Join shared start</button><button id="independent">Keep my own timer</button></div><div id="sync-detail"></div>`);$('#independent').onclick=()=>{$('#sync-detail').innerHTML='<p>You keep your own timer and still share the table. No timer changes have been made.</p>';};$('#join-sync').onclick=()=>{$('#sync-detail').innerHTML='<div class="sync-example"><h3>Your panda joins the study table.</h3><p>In the connected app, you would start together. A personal pause lets others continue; a group pause needs their agreement.</p><div class="choice-row"><button id="personal-pause">Pause for me</button><button id="group-pause">Request group pause</button></div><p id="pause-result" role="status"></p></div>';$('#personal-pause').onclick=()=>$('#pause-result').textContent='Preview: you pause, friends continue. You would finish later after resuming.';$('#group-pause').onclick=()=>$('#pause-result').textContent='Preview: waiting for everyone’s agreement. Nobody else pauses automatically.';};}
const steps=[
 ['Study beside your panda','Your panda represents you. Choose a focus duration, add what you are working on, and press Start focus. Pause whenever you need to. Tap Timer to expand its controls on smaller screens, or use Menu → Compact view for a simpler layout.'],
 ['Earn leaves for your study time','Each full focus minute earns a leaf. Finishing adds a small bonus: a 25-minute session earns 28 leaves. Breaks, pauses, and demos earn none. Ending early keeps leaves for your completed focus minutes.'],
 ['Choose what you want to unlock','Open Shop from Menu or your leaf balance. Preview clothing and room themes, then choose whether to buy at the displayed price. Starter colors and the original rooms stay free. Your purchases stay yours, even if you miss a study day.'],
 ['Find your tools','Calendar records your study days; Goals keeps progress across missed days. Together has private friend invitations and optional shared timer starts. Menu → Settings has text and motion options. Save & leave keeps a note for your next visit.']
];
function markIntroSeen(){state.onboardingSeen=true;try{localStorage.setItem(BASE_KEY+':intro-seen','true')}catch{}save();}
function finishTutorial(openShop=false){state.tutorialDone=true;markIntroSeen();closeModal();if(openShop)shop();}
function offerIntro({afterAccount=false}={}){
 let seen=false;try{seen=localStorage.getItem(BASE_KEY+':intro-seen')==='true'}catch{}
 if(seen||state.onboardingSeen||state.tutorialDone||session.running||session.elapsedMs>0||new URLSearchParams(location.hash.slice(1)).has('join'))return;
 if($('#modal').open&&!(afterAccount&&$('#dialog-title')?.textContent==='Account'))return;
 markIntroSeen();showModal('Welcome to CopyPanda',`<span class="completion-panda sprite-portrait" role="img" aria-label="Your study panda"></span><p>Study beside your panda, earn leaves, and make your space yours. You can study without an account.</p><div class="choice-row intro-actions"><button id="intro-tour" class="primary">Show me around</button><button id="intro-skip">Start studying</button></div><p class="small-copy">The short tutorial is optional. Replay it anytime from Menu → Tutorial.</p>`);
 $('#intro-tour').onclick=()=>tutorial();$('#intro-skip').onclick=()=>finishTutorial();
}
function tutorial(index=0){const [title,copy]=steps[index];markIntroSeen();showModal(title,`<div class="tutorial-count">QUICK TOUR · ${index+1} / ${steps.length}</div><span class="completion-panda sprite-portrait" role="img" aria-label="Your study panda"></span><p>${copy}</p><div class="choice-row">${index?'<button id="tour-back">Back</button>':''}<button class="primary" id="tour-next">${index===steps.length-1?'Start studying':'Next'}</button>${index===steps.length-1?'<button id="tour-shop">Explore the shop</button>':''}</div><button id="skip-tour" class="text-button">Skip tutorial</button>`);$('#tour-next').onclick=()=>{if(index<steps.length-1)tutorial(index+1);else finishTutorial();};if(index)$('#tour-back').onclick=()=>tutorial(index-1);$('#skip-tour').onclick=()=>finishTutorial();if($('#tour-shop'))$('#tour-shop').onclick=()=>finishTutorial(true);}
$('#tour').onclick=()=>tutorial();
let wardrobeChoiceRequest=0;
function dressPortraits(){
 $$('img.panda-portrait').forEach(image=>{const sprite=document.createElement('span');sprite.className=image.className+' sprite-portrait';sprite.setAttribute('role','img');sprite.setAttribute('aria-label',image.alt||'Your panda');image.replaceWith(sprite);});
}
function appearanceStatus(message){const node=$('#wardrobe-status');if(node)node.textContent=message;}
function renderWardrobeSelection(){
 $$('[data-sweater]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sweater===state.appearance.sweater)));
 $$('[data-headwear]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.headwear===state.appearance.headwear)));
}
async function applyAppearance(){try{await CopyPandaWardrobeRenderer.apply(state.appearance)}catch{toast('Your clothing could not load. The original artwork is still available.')}}
async function chooseAppearance(value){
 if(storageBlocked){storageConflictDialog();return false;}
 const style=CopyPandaWardrobe.appearance(value);if(style.headwear!=='none'&&!CopyPandaShop.owns(state.shop,style.headwear))return false;
 const epoch=++wardrobeChoiceRequest;appearanceStatus('Applying clothing…');
 try{
  const applied=await CopyPandaWardrobeRenderer.apply(style);if(!applied||epoch!==wardrobeChoiceRequest)return false;
  if(storageBlocked){applyAppearance();return false;}
  const previous=state.appearance;state.appearance=style;const saved=save();
  if(!saved){state.appearance=previous;applyAppearance();appearanceStatus('Your choice could not be saved. Your previous clothing is kept.');return false;}
  renderWardrobeSelection();appearanceStatus('Clothing saved on this browser.');return true;
 }catch{if(epoch===wardrobeChoiceRequest)appearanceStatus('The clothing could not load. Your current panda is unchanged.');return false;}
}
function chooseSweater(id){return chooseAppearance({...state.appearance,sweater:id});}
function chooseHeadwear(id){return chooseAppearance({...state.appearance,headwear:id});}
function bindPandaPreview(stage,preview){
 preview.disabled=state.settings.reducedMotion||state.settings.display==='still'||matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(preview.disabled){preview.textContent='Animation preview off';preview.title='Reduced motion is enabled.';}
 preview.onclick=()=>{stage.classList.remove('wardrobe-preview-playing');void stage.offsetWidth;stage.classList.add('wardrobe-preview-playing');};
 stage.addEventListener('animationend',()=>stage.classList.remove('wardrobe-preview-playing'));
}
function wardrobe(){
 showModal('Wardrobe',`<div class="wardrobe-avatar" role="img" aria-label="Your panda wearing the selected clothing"><span class="wardrobe-preview-frames" aria-hidden="true"></span></div><button id="wardrobe-preview" class="quiet-button wardrobe-preview-button">${session.kind==='break'?'Preview stretch':'Preview page turn'}</button><h3>Starter sweater colors</h3><p class="small-copy">These colors are free.</p><div class="wardrobe-colors" role="group" aria-label="Sweater color">${CopyPandaWardrobe.colors.map(color=>`<button class="wardrobe-color" data-sweater="${color.id}" aria-pressed="${color.id===state.appearance.sweater}"><span class="wardrobe-swatch" style="background:${color.hex}" aria-hidden="true"></span>${color.name}</button>`).join('')}</div><h3>Headwear</h3><div class="choice-row" role="group" aria-label="Headwear"><button data-headwear="none" aria-pressed="${state.appearance.headwear==='none'}">No hat</button>${CopyPandaShop.owns(state.shop,'beanie-rust')?`<button data-headwear="beanie-rust" aria-pressed="${state.appearance.headwear==='beanie-rust'}">Rust beanie</button>`:''}</div><p class="small-copy wardrobe-status" id="wardrobe-status" role="status">Your clothing is saved on this browser.</p><button id="wardrobe-shop" class="quiet-button wardrobe-link">Shop clothing · ${state.balance} leaves</button>`);
 $$('[data-sweater]').forEach(button=>button.onclick=()=>chooseSweater(button.dataset.sweater));
 $$('[data-headwear]').forEach(button=>button.onclick=()=>chooseHeadwear(button.dataset.headwear));
 $('#wardrobe-shop').onclick=()=>shop('clothing');bindPandaPreview($('.wardrobe-avatar'),$('#wardrobe-preview'));
}

function clearShopPreview(){shopPreviewEpoch++;shopPreview?.dispose();shopPreview=null;}
function leafBalance(){return `<p class="shop-wallet"><svg aria-hidden="true"><use href="#leaf"/></svg><strong>${state.balance}</strong> ${state.balance===1?'leaf':'leaves'}</p>`;}
function itemEquipped(item){return item.type==='room'?state.room===item.room:state.appearance.headwear===item.id;}
function claimTestLeaves(){
 if(KEY!==BASE_KEY||storageBlocked||state.testCredit==='shop-preview-v1')return;
 const previous={balance:state.balance,testCredit:state.testCredit};state.balance+=500;state.testCredit='shop-preview-v1';
 if(!save()){Object.assign(state,previous);toast('Test leaves could not be saved.');return;}
 renderChallenge();shop();toast('Added 500 test leaves. Your study history is unchanged.');
}
function shop(category='clothing'){
 if(!['clothing','room'].includes(category))category='clothing';
 showModal('Shop',`${leafBalance()}<p>Use earned leaves to make your study space yours. Items stay yours after purchase.</p>${new URLSearchParams(location.search).has('test-shop')&&KEY===BASE_KEY?`<div class="shop-testing"><p class="small-copy">Shop testing · no study credit</p><button id="test-leaves" ${state.testCredit?'disabled':''}>${state.testCredit?'500 test leaves already added':'Add 500 test leaves'}</button></div>`:''}<div class="download-tabs shop-tabs" role="tablist" aria-label="Shop category">${[['clothing','Clothing'],['room','Rooms']].map(([id,label])=>`<button role="tab" id="shop-tab-${id}" aria-selected="${id===category}" aria-controls="shop-items" tabindex="${id===category?0:-1}" data-category="${id}">${label}</button>`).join('')}</div><section id="shop-items" role="tabpanel" aria-labelledby="shop-tab-${category}" tabindex="0">${category==='room'?`<h3>Free starter rooms</h3><div class="shop-grid">${Object.entries(roomInfo).filter(([,r])=>!r.item).map(([key,r])=>`<button class="shop-card" data-free-room="${key}" aria-label="${r.name}, free starter room"><img src="${r.src}" alt="" loading="lazy"><strong>${r.name}</strong><span>${state.room===key?'Current room · Free':'Free · Use room'}</span></button>`).join('')}</div><h3>More room themes</h3>`:''}<div class="shop-grid">${CopyPandaShop.catalog.filter(item=>item.type===category).map(item=>`<button class="shop-card" data-item="${item.id}" aria-label="Preview ${item.name}, ${CopyPandaShop.owns(state.shop,item.id)?'owned':item.price+' leaves'}">${item.type==='clothing'?'<span class="shop-hat-icon" aria-hidden="true"><svg viewBox="0 0 400 220"><svg x="65" y="10" width="270" height="110" viewBox="175 615 550 200"><image href="assets/panda-head-kit.png" width="1774" height="887"/></svg><svg x="55" y="90" width="290" height="90" viewBox="1008 622 640 188"><image href="assets/panda-head-kit.png" width="1774" height="887"/></svg></svg></span>':`<img src="${item.asset}" alt="" loading="lazy">`}<strong>${item.name}</strong><span>${CopyPandaShop.owns(state.shop,item.id)?itemEquipped(item)?'Equipped':'Owned':item.price+' leaves'}</span></button>`).join('')}</div></section><p class="small-copy">Starter colors and the original rooms stay free. Purchases and owned items are saved in this browser.</p><div class="choice-row"><button id="shop-wardrobe">My wardrobe</button></div>`,true);
 $$('[data-free-room]').forEach(button=>button.onclick=()=>freeRoomDetail(button.dataset.freeRoom));
 $$('[data-item]').forEach(button=>button.onclick=()=>shopDetail(button.dataset.item,category));$('#shop-wardrobe').onclick=wardrobe;
 if($('#test-leaves'))$('#test-leaves').onclick=claimTestLeaves;
 const tabs=$$('.shop-tabs [role=tab]');tabs.forEach((tab,index)=>{tab.onclick=()=>{shop(tab.dataset.category);$('#shop-tab-'+tab.dataset.category).focus();};tab.onkeydown=event=>{let next=index;if(event.key==='ArrowRight'||event.key==='ArrowLeft')next=1-index;else if(event.key==='Home')next=0;else if(event.key==='End')next=1;else return;event.preventDefault();const id=tabs[next].dataset.category;shop(id);$('#shop-tab-'+id).focus();};});
}
function freeRoomDetail(key){
 const room=roomInfo[key];if(!room||room.item)return;
 showModal(room.name,`<img class="shop-room-preview" src="${room.src}" alt="${room.name}"><p><strong>Free starter room</strong> · Always available. No purchase needed.</p><div class="choice-row"><button class="primary" id="use-free-room" ${state.room===key?'disabled':''}>${state.room===key?'Current room':'Use room'}</button><button id="free-room-back">Back to rooms</button></div>`);
 $('#use-free-room').onclick=()=>{chooseRoom(key);closeModal();};$('#free-room-back').onclick=()=>shop('room');
}
function shopDetail(id,category='clothing'){
 const item=CopyPandaShop.get(id);if(!item)return;const owned=CopyPandaShop.owns(state.shop,id),equipped=itemEquipped(item),canBuy=KEY===BASE_KEY&&!storageBlocked;
 showModal(item.name,`${leafBalance()}<div id="shop-preview" data-item-id="${id}">${item.type==='room'?`<img class="shop-room-preview" id="shop-room-image" src="${item.asset}" alt="${item.name} room preview">`:'<div class="wardrobe-avatar" id="shop-panda" role="img" aria-label="Preview of your panda wearing the rust beanie"><span class="wardrobe-preview-frames" aria-hidden="true"></span></div><button id="shop-animation" class="quiet-button wardrobe-preview-button">'+(session.kind==='break'?'Preview stretch':'Preview page turn')+'</button>'}</div><p>${item.description}</p><p class="small-copy">${owned?'You own this item.':`${item.price} leaves · one purchase · yours to keep`}</p><p id="shop-detail-status" role="status" class="small-copy">Loading preview…</p><div class="choice-row"><button class="primary" id="shop-buy" disabled>${owned?equipped?'Equipped':item.type==='room'?'Use room':'Wear beanie':`Buy & ${item.type==='room'?'use':'wear'} · ${item.price} leaves`}</button><button id="shop-back">Back to shop</button></div>${!canBuy&&!owned?'<p class="small-copy">Browse and preview freely. Shop purchases currently use local progress; account inventory sync is coming later.</p>':''}`,true);
 const epoch=shopPreviewEpoch,button=$('#shop-buy'),status=$('#shop-detail-status');
 const ready=()=>{if(!button.isConnected||epoch!==shopPreviewEpoch)return;button.disabled=equipped||(!owned&&(!canBuy||state.balance<item.price));status.textContent=owned?'Preview your item before equipping.':state.balance<item.price?`You need ${item.price-state.balance} more leaves.`:'Preview only. Leaves are spent when you choose Buy.';};
 $('#shop-back').onclick=()=>shop(category);
 button.onclick=async()=>{
  if(!button.isConnected||storageBlocked)return;
  try{
   const wasOwned=CopyPandaShop.owns(state.shop,id);
   if(!wasOwned){
    if(KEY!==BASE_KEY)return;
    const result=CopyPandaShop.purchase(state.balance,state.shop,id,{id:crypto.randomUUID(),purchasedAt:new Date().toISOString()}),previous={balance:state.balance,shop:state.shop};state.balance=result.balance;state.shop=result.shop;
    if(!save()){state.balance=previous.balance;state.shop=previous.shop;renderChallenge();status.textContent='The purchase could not be saved. Your leaves were not spent.';return;}
    renderChallenge();renderRoomChoices();
   }
   button.disabled=true;
   const applied=item.type==='room'?(chooseRoom(item.room),true):await chooseHeadwear(item.id);
   if(button.isConnected&&epoch===shopPreviewEpoch&&$('#modal').open){shopDetail(id,category);toast(applied?`${item.name} ${wasOwned?'equipped':'is yours'}.`:'Your item is owned. You can try equipping it again.');}
  }catch(error){if(status.isConnected)status.textContent=error.message;}
 };
 if(item.type==='room'){
  const image=$('#shop-room-image');image.onload=ready;image.onerror=()=>{if(status.isConnected)status.textContent='The room preview could not load. Your leaves have not been spent.';};if(image.complete&&image.naturalWidth)ready();
 }else{
  bindPandaPreview($('#shop-panda'),$('#shop-animation'));
  CopyPandaWardrobeRenderer.prepare({...state.appearance,headwear:item.id}).then(variant=>{if(epoch!==shopPreviewEpoch||!$('#shop-panda')){variant.dispose();return;}shopPreview=variant;$('#shop-panda').style.setProperty('--panda-focus-sheet',`url("${variant.focus}")`);$('#shop-panda').style.setProperty('--panda-break-sheet',`url("${variant.break}")`);ready();}).catch(()=>{if(status.isConnected)status.textContent='The clothing preview could not load. Your leaves have not been spent.';});
 }
}

function overlayDownload(){
 showModal('Download overlay',`<p>Keep your panda and timer beside your work.</p>
 <div class="download-tabs" role="tablist" aria-label="Overlay platform">
 <button type="button" role="tab" id="download-tab-windows" aria-controls="download-windows" aria-selected="true">Windows</button>
 <button type="button" role="tab" id="download-tab-mac" aria-controls="download-mac" aria-selected="false" tabindex="-1">Mac</button></div>
 <section role="tabpanel" id="download-windows" aria-labelledby="download-tab-windows" tabindex="0">
 <div class="download-status"><strong>Windows preview · v1.2.1</strong><span>Windows x64. Extract the full ZIP, then run CopyPanda.exe. Keep the included files together.</span></div>
 <div class="download-links"><a class="download-primary" href="https://github.com/TristanTengGH2/CopyPanda/releases/download/overlay-v1.2.1-preview.1/CopyPanda-overlay-v1.2.1-windows-x64.zip">Download for Windows ↧</a></div>
 <a class="overlay-spec-link" href="https://github.com/TristanTengGH2/CopyPanda/releases/tag/overlay-v1.2.1-preview.1" target="_blank" rel="noopener noreferrer">Windows release notes ↗</a>
 <p class="small-copy">Unsigned preview.</p></section>
 <section role="tabpanel" id="download-mac" aria-labelledby="download-tab-mac" tabindex="0" hidden>
 <div class="download-status"><strong>Experimental Mac preview · v1.3</strong><span>Tested on an Apple Silicon Mac VM. Physical-device testing is pending.</span><span>Extract the download, then the ZIP inside it to find CopyPanda.app.</span></div>
 <div class="download-links"><a class="download-primary" href="https://github.com/TristanTengGH2/CopyPanda/actions/runs/42007961679/artifacts/13405861924" target="_blank" rel="noopener noreferrer">Download for Mac ↗</a></div>
 <p class="small-copy">Not notarized. GitHub sign-in may be required. This test download expires after 30 days.</p></section>
 <p class="small-copy">Browser and overlay progress are stored separately.</p>
 <a class="overlay-spec-link" href="https://github.com/TristanTengGH2/CopyPanda" target="_blank" rel="noopener noreferrer">Overlay GitHub repo ↗</a>
 <a class="overlay-spec-link" href="https://github.com/TristanTengGH2/CopyPanda-web" target="_blank" rel="noopener noreferrer">Web app GitHub repo ↗</a>`);
 const tabs=$$('.download-tabs [role="tab"]');
 const selectTab=index=>tabs.forEach((tab,i)=>{const selected=i===index;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;});
 tabs.forEach((tab,index)=>{tab.onclick=()=>selectTab(index);tab.onkeydown=event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();selectTab(next);tabs[next].focus();};});
}
$('#overlay-download').onclick=overlayDownload;
$$('[data-panel]').forEach(b=>b.onclick=()=>{switch(b.dataset.panel){case 'focus':document.body.classList.remove('compact');$('#start').focus();break;case 'journal':journal();break;case 'friends':together();break;case 'settings':settings();break;case 'wardrobe':wardrobe();break;case 'shop':shop();break;case 'challenge':promiseSummary();break;case 'notes':notesDialog();break;default:showModal('A little company for your focus.',`<p>CopyPanda is a browser prototype built from our day-one spec. Timer, rewards, commitment, journal, notes, audio, and bookmarks work locally.</p><p>Friend rooms and synced sessions are labeled previews. This is not yet the native Godot overlay.</p><p>Your data stays in this browser. Clearing site data removes it. No location collection, analytics, camera monitoring, or sign-in.</p>`);}});
$('.brand').onclick=e=>{e.preventDefault();document.body.classList.remove('compact');$('#main').focus();};
$('#compact').onclick=()=>{setAppMenu(false);document.body.classList.add('compact');$('#start').focus();};$('#compact-exit').onclick=()=>{document.body.classList.remove('compact');$('#app-menu-toggle').focus();};
function setAppMenu(open){$('#app-menu').hidden=!open;$('#app-menu-toggle').setAttribute('aria-expanded',String(open));}
$('#app-menu-toggle').onclick=()=>{const open=$('#app-menu').hidden;closeBubblePanels();setAppMenu(open);};
document.addEventListener('click',event=>{if(!$('#app-menu').hidden&&!event.target.closest('.header-right'))setAppMenu(false);});
function closeBubblePanels(){setAppMenu(false);document.body.classList.remove('rooms-open','sound-open');$('#rooms-bubble').setAttribute('aria-expanded','false');$('#sound-bubble').setAttribute('aria-expanded','false');}
$('#rooms-bubble').onclick=()=>{const open=!document.body.classList.contains('rooms-open');closeBubblePanels();document.body.classList.toggle('rooms-open',open);$('#rooms-bubble').setAttribute('aria-expanded',String(open));};
$('#sound-bubble').onclick=()=>{const open=!document.body.classList.contains('sound-open');closeBubblePanels();document.body.classList.toggle('sound-open',open);$('#sound-bubble').setAttribute('aria-expanded',String(open));};
$('#menu-room').onclick=()=>{$('#rooms-bubble').click();$('.environment-options button')?.focus();};
$('#menu-sound').onclick=()=>{$('#sound-bubble').click();$('#sound-toggle').focus();};
$('#menu-account').onclick=()=>$('#cloud-account')?.click();
$('#timer-bubble').onclick=()=>{closeBubblePanels();if(matchMedia('(max-width:1024px)').matches){document.body.classList.toggle('timer-expanded');$('#timer-bubble').setAttribute('aria-expanded',String(document.body.classList.contains('timer-expanded')));}else{document.body.classList.toggle('timer-hidden');$('#timer-bubble').setAttribute('aria-expanded',String(!document.body.classList.contains('timer-hidden')));}};
$('#hide-bubbles').onclick=()=>{closeBubblePanels();document.body.classList.add('ui-hidden');$('#restore-bubbles').hidden=false;$('#restore-bubbles').focus();};$('#restore-bubbles').onclick=()=>{document.body.classList.remove('ui-hidden');$('#restore-bubbles').hidden=true;$('#app-menu-toggle').focus();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').open){const mobile=matchMedia('(max-width:1024px), (max-height:560px)').matches,trigger=!$('#app-menu').hidden?$('#app-menu-toggle'):document.body.classList.contains('rooms-open')?(mobile?$('#app-menu-toggle'):$('#rooms-bubble')):document.body.classList.contains('sound-open')?(mobile?$('#app-menu-toggle'):$('#sound-bubble')):null;closeBubblePanels();trigger?.focus();}});
const audio=$('#audio');audio.volume=.3;
audio.onplay=()=>{$('#sound-caption').textContent=$('#sound-select').selectedOptions[0].textContent;$('#sound-toggle').textContent='Ⅱ';$('#sound-toggle').setAttribute('aria-label','Pause atmosphere');};audio.onpause=()=>{$('#sound-caption').textContent='Off';$('#sound-toggle').textContent='▶';$('#sound-toggle').setAttribute('aria-label','Play atmosphere');};
$('#sound-toggle').onclick=async()=>{if(audio.paused){if(!audio.getAttribute('src'))audio.src=`assets/${$('#sound-select').value}.wav`;try{await audio.play();}catch{toast('Audio could not start. Try pressing play again.');}}else audio.pause();};
$('#sound-select').onchange=async e=>{const playing=!audio.paused;audio.src=`assets/${e.target.value}.wav`;if(playing)try{await audio.play();}catch{toast('Press play to start this soundscape.');}};$('#volume').oninput=e=>audio.volume=Number(e.target.value)/100;
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#room-card').requestFullscreen();}catch{toast('Fullscreen is unavailable in this browser.');}};
window.addEventListener('pagehide',()=>{if(session.tick(performance.now())==='complete')finishSession(true);session.pause();save();});
document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('window-hidden',document.hidden);if(!document.hidden){checkpointTimer();save();}});
function layoutPandaScene(){
 const card=$('#room-card'),frame=$('#panda-composition');if(!frame||frame.hidden)return;
 const bounds=card.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
 const art=$('#room-art'),nativeWidth=art.naturalWidth||1672,nativeHeight=art.naturalHeight||941;
 const scale=Math.max(bounds.width/nativeWidth,bounds.height/nativeHeight),width=nativeWidth*scale,height=nativeHeight*scale;
 for(const layer of [frame]){layer.style.width=width+'px';layer.style.height=height+'px';layer.style.left=(bounds.width-width)*.5+'px';layer.style.top=(bounds.height-height)*.53+'px';}
}
$('#room-art').addEventListener('load',layoutPandaScene);
new ResizeObserver(layoutPandaScene).observe($('#room-card'));
function reserveMobileScene(){
 const tools=$('.tools-column');
 const reserve=tools.getClientRects().length?Math.max(0,innerHeight-tools.getBoundingClientRect().top+12):0;
 document.documentElement.style.setProperty('--scene-reserve',reserve+'px');
}
new ResizeObserver(reserveMobileScene).observe($('.tools-column'));
window.addEventListener('resize',reserveMobileScene);
reserveMobileScene();
function pandaMotionAllowed(){return !!roomInfo[state.room]?.layered&&state.settings.display==='standard'&&!state.settings.reducedMotion&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
function endPandaPageTurn(){pandaPageTurning=false;$('#panda-turn-page')?.classList.remove('page-turn-playing','break-motion-playing','manual-page-preview');nextPandaPageAt=performance.now()+(session.running?18000:24000);}
function turnPandaPage(manual=false){
 if(!pandaMotionAllowed())return;
 if(!manual&&!session.running&&session.elapsedMs>0)return;
 const panda=$('#panda-turn-page');panda.classList.remove('page-turn-playing','break-motion-playing','manual-page-preview');void panda.offsetWidth;pandaPageTurning=true;panda.classList.add(session.kind==='break'?'break-motion-playing':'page-turn-playing');panda.classList.toggle('manual-page-preview',manual);
}
$('#panda-turn-page').onclick=()=>turnPandaPage(true);
$('#panda-turn-page').addEventListener('animationend',e=>{if(['panda-book-turn','panda-break-stretch'].includes(e.animationName))endPandaPageTurn();});
document.querySelectorAll('.panda-portrait').forEach(img=>img.src='assets/panda-matched.png');
dressPortraits();
applySettings();renderTimer();renderChallenge();showReturnBookmark();
const timerBreakpoint=matchMedia('(max-width:1024px)');
function syncTimerToggle(){if(timerBreakpoint.matches)document.body.classList.remove('timer-hidden');$('#timer-bubble').setAttribute('aria-expanded',String(timerBreakpoint.matches?document.body.classList.contains('timer-expanded'):!document.body.classList.contains('timer-hidden')));}
timerBreakpoint.addEventListener('change',syncTimerToggle);syncTimerToggle();
if(session.elapsedMs>=session.plannedMs)finishSession(true);
setInterval(()=>{if(session.running)checkpointTimer();if(!pandaPageTurning&&performance.now()>=nextPandaPageAt)turnPandaPage();if(++checkpoint%10===0)save();},1000);

// Explicit account-scoped storage. A sign-out never leaves the previous user's
// notes, timer, or pending imports visible in the next account.
window.CopyPandaApp={
 offerIntro,
 storageSafe:()=>!storageBlocked,
 snapshot:()=>structuredClone(state),
 privateData:()=>({notes:state.notes,bookmark:state.bookmark,challenge:state.challenge}),
 activity:()=>({status:session.running?session.kind==='focus'?'focus':'break':session.elapsedMs>0?'paused':'idle',remainingMs:Math.max(0,session.plannedMs-session.elapsedMs)}),
 idle:()=>!session.running&&session.elapsedMs===0,
 modal:showModal,close:closeModal,toast,escape:escapeHTML,
 switchAccount(uid){
  if(session.running)checkpointTimer();session.pause();save();const settings=state.settings;
  KEY=uid?BASE_KEY+':account:'+uid:BASE_KEY;
  storageBlocked=false;$('#storage-warning')?.remove();
  let stored;try{stored=JSON.parse(guardedStore?.load(KEY)||'null')}catch{}
  state={...defaults(),...(stored||{}),settings};
  if(!Array.isArray(state.sessions))state.sessions=[];
  normalizeInventory();
  session=new Session(state.timer||{plannedMs:state.focusMinutes*60000});
  $('#intention').value=state.intention;$('#notes').value=state.notes;
  $('#return-bookmark').hidden=true;showReturnBookmark();applySettings();renderTimer();renderChallenge();save();
 },
 applyCloud(snapshot,{keepPrivate=false}={}){
  const merged=new Map(state.sessions.map(s=>[s.id,s]));for(const row of snapshot.records||[])merged.set(row.id,{...row,cloudSynced:true});
  state.sessions=[...merged.values()].sort((a,b)=>a.endedAt.localeCompare(b.endedAt));
  const pending=state.sessions.filter(s=>!s.cloudSynced);
  state.balance=Number(snapshot.balance||0)+pending.reduce((sum,s)=>sum+Number(s.earned||0),0);
  if(!keepPrivate&&snapshot.data){
   if(typeof snapshot.data.notes==='string')state.notes=snapshot.data.notes;
   state.bookmark=snapshot.data.bookmark||null;
   if(snapshot.data.challenge?.id)state.challenge=snapshot.data.challenge;
   $('#notes').value=state.notes;
  }
  renderChallenge();save();
 },
 applyRecord(record,balance){
  const index=state.sessions.findIndex(s=>s.id===record.id);
  if(index>=0)state.sessions[index]={...record,cloudSynced:true};else state.sessions.push({...record,cloudSynced:true});
  state.balance=Number(balance)+state.sessions.filter(s=>!s.cloudSynced).reduce((sum,s)=>sum+Number(s.earned||0),0);
  renderChallenge();save();
 },
 usePrivate(data){if(typeof data.notes==='string')state.notes=data.notes;state.bookmark=data.bookmark||null;if(data.challenge?.id)state.challenge=data.challenge;$('#notes').value=state.notes;save();renderChallenge()},
 addLocalRecords(records){const seen=new Set(state.sessions.map(s=>s.id));for(const row of records)if(!seen.has(row.id)){state.sessions.push({...row,cloudSynced:false});seen.add(row.id)}save()},
 startShared(minutes,startedAt,serverNow){
  if(storageBlocked||!this.idle())return false;session=new Session({plannedMs:minutes*60000,kind:'focus'});
  session.elapsedMs=Math.max(0,Math.min(5000,serverNow-Date.parse(startedAt)));session.start(performance.now());save();renderTimer();return true;
 },
 pause(){if(session.running)checkpointTimer();session.pause();save();renderTimer()}
};
if(!returningProfile)queueMicrotask(()=>offerIntro());
