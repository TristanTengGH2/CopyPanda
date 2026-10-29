/* CopyPanda browser mockup. Local data only. Social flows are explicitly demonstrations. */
'use strict';
const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
const {Session,reward,challengeProgress,dayKey}=CopyPandaCore;
const BASE_KEY=new URLSearchParams(location.search).has('qa')?'copypanda-qa-v1':'copypanda-v1';
let KEY=BASE_KEY;
const defaultChallenge=()=>({minutes:25,sessionsPerDay:1,targetDays:14,startedAt:new Date().toISOString(),id:crypto.randomUUID()});
const defaults=()=>({balance:0,focusMinutes:25,sessions:[],notes:'',intention:'',room:'cafe',bookmark:null,bookmarkDraft:{},challenge:defaultChallenge(),challengeArchive:[],challengeAwards:[],settings:{display:'standard',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,contrast:false,largeText:false,reminders:true},tutorialDone:false,timer:null});
let state=defaults();
try { const stored=JSON.parse(localStorage.getItem(KEY)); if(stored&&typeof stored==='object')state={...state,...stored,settings:{...state.settings,...stored.settings}}; } catch {}
if(!Array.isArray(state.sessions))state.sessions=[];
if(!Array.isArray(state.challengeArchive))state.challengeArchive=[];
if(!Array.isArray(state.challengeAwards))state.challengeAwards=[];
if(!Number.isFinite(state.focusMinutes)||state.focusMinutes<1||state.focusMinutes>120)state.focusMinutes=25;
let session=new Session(state.timer||{plannedMs:state.focusMinutes*60000});
let toastTimeout, checkpoint=0, demoRoom=null, lastFocus=null, journalMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let pandaVisualKind=null;
let pandaPageTurning=false,nextPandaPageAt=performance.now()+5000;
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
function announce(message){$('#announcer').textContent=message;}
let warned=false;
function save(){state.timer=session.serialize();try{localStorage.setItem(KEY,JSON.stringify(state));}catch{if(!warned){warned=true;toast('Storage is unavailable. Progress will only last while this tab stays open.');}}window.dispatchEvent(new Event('copypanda:saved'));}
function showModal(title,html,wide=false){
 const modal=$('#modal');if(!modal.open)lastFocus=document.activeElement;
 modal.classList.toggle('wide',wide);modal.setAttribute('aria-labelledby','dialog-title');$('#modal-content').innerHTML=`<h2 id="dialog-title">${escapeHTML(title)}</h2>${html}`;
 if(!modal.open)modal.showModal();
}
function closeModal(){$('#modal').close();lastFocus?.focus?.();}
$('#close-modal').onclick=closeModal;
$('#modal').addEventListener('close',()=>lastFocus?.focus?.());
$('#modal').addEventListener('click',e=>{if(e.target!==$('#modal'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();});
const roomInfo={
 cafe:{name:'The corner café',caption:'Pull up a chair. You’re right on time.',src:'assets/cafe-flat-panda.png',photo:true},
 library:{name:'The quiet library',caption:'A whole world between the pages.',src:'assets/library.svg'},
 train:{name:'The night train',caption:'A little focus. Somewhere to go.',src:'assets/train.svg'},
 home:{name:'Your own little nook',caption:'Make yourself at home.',src:'assets/home.svg'}
};
function chooseRoom(key){
 const room=roomInfo[key]||roomInfo.cafe;state.room=roomInfo[key]?key:'cafe';
 $('#room-name').textContent=room.name;$('#room-caption').textContent=room.caption;
 const lightweight=state.settings.display!=='standard';
 const layeredCafe=state.room==='cafe'&&!lightweight;
 $('#room-art').src=lightweight?'assets/panda-matched.png':layeredCafe?'assets/cafe-desk-clean.png':room.src;
 $('#panda-composition').hidden=!layeredCafe;
 $('#desk-foreground-composition').hidden=!layeredCafe;
 if(!layeredCafe||state.settings.reducedMotion)endPandaPageTurn();
 if(layeredCafe)layoutPandaScene();
 $('#room-art').alt=lightweight?'Your red panda studying an open book':`${room.name}, with your panda studying beside you`;
 $('#room-card').classList.toggle('photo-room',!!room.photo&&!lightweight);
 $$('[data-room]').forEach(b=>{b.classList.toggle('selected',b.dataset.room===state.room);b.setAttribute('aria-pressed',String(b.dataset.room===state.room));});
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
 $('#duration-button').disabled=session.running||session.elapsedMs>0;
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
  showModal(previous.demo?'That’s the rhythm.':'A little progress. A real difference.',`<img class="completion-panda panda-portrait" src="assets/panda-matched.png" alt="Your study panda"><p>${previous.demo?'You’ve tried the focus flow. This demo does not earn leaves or count toward your study commitment.':`You made time for your one thing. ${Math.round(previous.elapsedMs/60000)} focused minutes, saved in your journal.`}</p>${previous.demo?'':`<div class="stats"><div><strong>+${earnings.base}</strong><span>study leaves</span></div><div><strong>+${earnings.bonus}</strong><span>completion bonus</span></div></div>`}<p>${state.settings.reminders?'A sip of water or a little stretch? Your break starts when you choose.':'Your break is ready whenever you are.'}</p><div class="choice-row"><button id="begin-break" class="primary">Start a 5-minute break</button><button id="later-break">Maybe later</button></div>`);
  $('#begin-break').onclick=()=>{closeModal();startPause();};$('#later-break').onclick=closeModal;
 } else if(earnings.total)toast(`Session saved. You kept ${earnings.total} leaves for your study time.`);
}
$('#start').onclick=startPause;
$('#reset').onclick=()=>{
 checkpointTimer();if(session.elapsedMs===0&&!session.running)return;
 session.pause();save();renderTimer();
 const earned=session.kind==='focus'?reward(session.elapsedMs,session.plannedMs,false,session.demo).total:0;
 showModal('Make room for a fresh start?',`<p>${session.kind==='focus'?`You’ll keep ${earned} leaves for completed active minutes. The finishing bonus is skipped. Your timer is paused while you decide.`:'Your break is paused. You can end it or continue.'}</p><div class="choice-row"><button id="keep-going" class="primary">Keep this session</button><button id="end-session">End session</button></div>`);
 $('#keep-going').onclick=closeModal;$('#end-session').onclick=()=>{finishSession(false);closeModal();};
};
$$('[data-mode]').forEach(b=>b.onclick=()=>{if(session.running||session.elapsedMs>0){toast('Finish or end your current session before switching.');return;}newTimer(b.dataset.mode);});
function durationDialog(){
 if(session.running||session.elapsedMs>0)return;
 if(session.kind==='break'){toast('Short breaks are 5 minutes in this prototype.');return;}
 showModal('Choose a little time.',`<p>Something that feels doable today.</p><div class="choice-row">${[15,25,50].map(n=>`<button data-duration="${n}">${n} min</button>`).join('')}</div><form id="duration-form"><label class="form-label" for="custom-minutes">Or set your own, from 1 to 120 minutes</label><input id="custom-minutes" type="number" min="1" max="120" value="${state.focusMinutes}" required><div class="choice-row"><button class="primary" type="submit">Use this time</button></div></form>`);
 const select=n=>{state.focusMinutes=n;newTimer();closeModal();};$$('[data-duration]').forEach(b=>b.onclick=()=>select(Number(b.dataset.duration)));
 $('#duration-form').onsubmit=e=>{e.preventDefault();const n=Number($('#custom-minutes').value);if(Number.isInteger(n)&&n>=1&&n<=120)select(n);};
}
$('#duration-button').onclick=durationDialog;
$('#demo').onclick=()=>{newTimer('focus',true);session.start(performance.now());save();renderTimer();toast('10-second demo started. No currency or study credit.');};
$('#intention').value=state.intention;$('#intention').oninput=e=>{state.intention=e.target.value;save();};
$('#notes').value=state.notes;$('#notes').oninput=e=>{state.notes=e.target.value;save();};
$('#notes-toggle').onclick=()=>{$('#notes').hidden=!$('#notes').hidden;$('#notes-toggle').setAttribute('aria-expanded',String(!$('#notes').hidden));if(!$('#notes').hidden)$('#notes').focus();};
$$('[data-room]').forEach(b=>b.onclick=()=>chooseRoom(b.dataset.room));
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
function notesDialog(){showModal('Notes',`<p>A private place for a thought, a formula, or something for later. Saves as you write.</p><label class="sr-only" for="floating-notes">Private notes</label><textarea id="floating-notes" rows="8" placeholder="Leave a thought here…">${escapeHTML(state.notes)}</textarea>`);$('#floating-notes').oninput=e=>{state.notes=e.target.value;$('#notes').value=state.notes;save();};}
$('#edit-challenge').onclick=editChallenge;
function journal(){
 const year=journalMonth.getFullYear(),month=journalMonth.getMonth();const first=new Date(year,month,1),offset=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate();
 const total=state.sessions.reduce((sum,s)=>sum+s.activeMs,0),completed=state.sessions.filter(s=>s.completed&&!s.manual).length;
 const cells=Array.from({length:offset},()=>'<span></span>');
 for(let d=1;d<=days;d++){const key=dayKey(new Date(year,month,d));const entries=state.sessions.filter(s=>s.day===key);const minutes=Math.floor(entries.reduce((sum,s)=>sum+s.activeMs,0)/60000);cells.push(`<button class="calendar-day ${entries.length?'studied':''} ${key===dayKey()?'today':''}" data-day="${key}" aria-label="${key}, ${minutes} study minutes">${d}${entries.length?'<i></i>':''}</button>`);}
 showModal('Calendar',`<div class="stats"><div><strong>${Math.floor(total/60000)}</strong><span>focused minutes</span></div><div><strong>${completed}</strong><span>completed sessions</span></div><div><strong>${challengeProgress(state.challenge,state.sessions).count}</strong><span>challenge study days</span></div></div><div class="calendar-heading"><button id="previous-month" aria-label="Previous month">←</button><h3>${first.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h3><button id="next-month" aria-label="Next month">→</button></div><div class="calendar-week">${['M','T','W','T','F','S','S'].map(s=>`<span>${s}</span>`).join('')}</div><div class="calendar">${cells.join('')}</div><p class="small-copy">Gaps are part of the story. Your challenge never resets because you miss a day.</p><div id="journal-entries"></div><div class="journal-actions"><button id="manual-entry">＋ Log outside study</button><button id="view-bookmark">↳ My last bookmark</button></div>${state.challengeAwards.length?'<p class="badge">✳ Keepsake earned: a promise kept</p>':''}`,true);
 $('#previous-month').onclick=()=>{journalMonth=new Date(year,month-1,1);journal();};$('#next-month').onclick=()=>{journalMonth=new Date(year,month+1,1);journal();};
 $$('[data-day]').forEach(b=>b.onclick=()=>renderEntries(b.dataset.day));$('#manual-entry').onclick=manualEntry;$('#view-bookmark').onclick=viewBookmark;renderEntries(dayKey());
}
function renderEntries(day){
 const entries=state.sessions.filter(s=>s.day===day).slice().reverse();$('#journal-entries').innerHTML=`<h3 class="journal-date">${escapeHTML(day)}</h3>${entries.length?entries.map(s=>`<article class="journal-entry"><span class="entry-dot"></span><div><strong>${escapeHTML(s.intention||'A little focus')}</strong><p>${Math.floor(s.activeMs/60000)} min · ${s.manual?'Manually logged · no currency':s.completed?'Completed · solo':'Ended early · solo'}${s.earned?` · +${s.earned} leaves`:''}</p></div></article>`).join(''):'<p class="empty-state">No study recorded for this day. There’s always room for a beginning.</p>'}`;
}
function manualEntry(){
 showModal('Study happens off-screen, too.',`<p>Document your effort here. Manual entries earn no currency and don’t qualify for timer commitments in this prototype.</p><form id="manual-form"><label class="form-label">What did you work on?<input id="manual-intention" maxlength="120" required></label><div class="form-grid"><label>Study date<input id="manual-day" type="date" value="${dayKey()}" max="${dayKey()}" required></label><label>Focused minutes<input id="manual-minutes" type="number" min="1" max="720" value="25" required></label></div><div class="choice-row"><button type="submit" class="primary">Save study entry</button></div></form>`);
 $('#manual-form').onsubmit=e=>{e.preventDefault();state.sessions.push({id:crypto.randomUUID(),day:$('#manual-day').value,endedAt:new Date().toISOString(),activeMs:Number($('#manual-minutes').value)*60000,plannedMs:0,completed:false,intention:$('#manual-intention').value.trim(),manual:true,earned:0});save();journal();};
}
function viewBookmark(){const b=state.bookmark;showModal('A thread to pick up.',b?`<p class="form-label">Last time you were working on</p><blockquote>${escapeHTML(b.working||'Your study session')}</blockquote><p class="form-label">Your next step</p><blockquote>${escapeHTML(b.next||'Choose where to continue.')}</blockquote><div class="choice-row"><button id="use-bookmark" class="primary">Continue this goal</button></div>`:'<p>No bookmark yet. Use “Finish session” when you’re done to leave a note for your next visit.</p>');if(b)$('#use-bookmark').onclick=()=>{state.intention=b.next||b.working;$('#intention').value=state.intention;save();closeModal();};}
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
 showModal('Make this space work for you.',`<p>Comfort and performance settings never change your rewards.</p><label class="form-label" for="display-mode">Display mode</label><select id="display-mode"><option value="standard">Standard · room, panda & timer</option><option value="lightweight">Lightweight · panda & timer</option><option value="still">Still · static panda & timer</option></select><p class="small-copy">Lightweight and Still use the small companion view and stop loading room scenery. This browser mockup is not an always-on-top desktop window.</p><div class="setting-list">${[['reducedMotion','Reduce motion','No decorative movement or transitions.'],['contrast','High contrast','Stronger text, borders, and controls.'],['largeText','Larger text','More readable labels and controls.'],['reminders','Gentle break reminders','Optional water, eye-rest, and seated-stretch suggestions.']].map(([id,label,desc])=>`<label class="setting-row"><div><strong>${label}</strong><span>${desc}</span></div><input id="setting-${id}" type="checkbox" ${s[id]?'checked':''}></label>`).join('')}</div><p class="small-copy">Keyboard: Tab to move, Enter or Space to activate, Escape to close dialogs. With buttons focused, Space starts or pauses normally. No global typing interception.</p>`);
 const replay=document.createElement('button');replay.className='text-button';replay.textContent='Replay the UI walkthrough';replay.onclick=()=>tutorial();$('#modal-content').append(replay);
 const desktop=document.createElement('button');desktop.className='text-button';desktop.textContent='GitHub & Windows overlay';desktop.onclick=overlayDownload;$('#modal-content').append(desktop);
 const leave=document.createElement('button');leave.className='text-button';leave.textContent='Save & leave this space';leave.onclick=leaveDialog;$('#modal-content').append(leave);
 $('#display-mode').value=s.display;$('#display-mode').onchange=e=>{s.display=e.target.value;applySettings();};['reducedMotion','contrast','largeText','reminders'].forEach(id=>$('#setting-'+id).onchange=e=>{s[id]=e.target.checked;applySettings();});
}
function applySettings(){const s=state.settings;document.body.classList.toggle('reduced-motion',s.reducedMotion||s.display==='still');document.body.classList.toggle('high-contrast',s.contrast);document.body.classList.toggle('large-text',s.largeText);document.body.classList.toggle('lightweight',s.display!=='standard');chooseRoom(state.room);save();}
function together(){
 if(window.CopyPandaNetworkUI){window.CopyPandaNetworkUI.room();return;}
 const isInPerson=demoRoom?.type==='in-person';
 showModal('A table with room for you.',`<div class="preview-banner">INTERACTIVE PREVIEW · NOT CONNECTED TO OTHER PEOPLE</div><p>Study independently, or choose to start together. No camera required. No location collected.</p><div class="together-table"><img class="panda-portrait" src="assets/panda-matched.png" alt="Your panda"><span class="empty-seat">＋<small>A friend’s seat</small></span><span class="empty-seat">＋<small>A friend’s seat</small></span></div><div class="choice-row"><button id="online-preview" ${!isInPerson?'class="primary"':''}>Online room</button><button id="inperson-preview" ${isInPerson?'class="primary"':''}>In person</button></div><div class="room-preview"><h3>${isInPerson?'Sit down. Check in. Study.':'Your own rhythm, a little company.'}</h3><p>${isInPerson?'A host will display a short-lived QR check-in. Friends can scan it or use a typed code. This preview does not generate a live invitation.':'Friends will join through an invite link. Each person keeps their own timer unless they choose a shared start.'}</p>${isInPerson?'<div class="qr-placeholder" aria-label="QR check-in placeholder, not scannable"><span>▦</span><strong>QR check-in</strong><small>Live code available in a future build</small></div>':'<div class="invite-placeholder">copypanda / your-private-table <span>Preview only</span></div>'}<div class="bonus-note">${isInPerson?'+15%':'＋10%'} proposed together bonus · active overlap only</div></div><div class="choice-row"><button id="sync-preview" class="primary">Preview a synced session →</button></div><p class="small-copy">No social bonus is awarded in this solo mockup. Real room presence, expiring codes, and timer synchronization need the future backend.</p>`,true);
 $('#online-preview').onclick=()=>{demoRoom={type:'online'};together();};$('#inperson-preview').onclick=()=>{demoRoom={type:'in-person'};together();};$('#sync-preview').onclick=syncPreview;
}
function syncPreview(){showModal('Same start. Your choice.',`<div class="preview-banner">SYNC FLOW PREVIEW · NO REAL TIMERS ARE CHANGED</div><p>A friend proposes a <strong>25-minute focus session</strong>. You can join the shared start or keep your own timer.</p><div class="choice-row"><button id="join-sync" class="primary">Join shared start</button><button id="independent">Keep my own timer</button></div><div id="sync-detail"></div>`);$('#independent').onclick=()=>{$('#sync-detail').innerHTML='<p>You keep your own timer and still share the table. No timer changes have been made.</p>';};$('#join-sync').onclick=()=>{$('#sync-detail').innerHTML='<div class="sync-example"><h3>Your panda joins the study table.</h3><p>In the connected app, you would start together. A personal pause lets others continue; a group pause needs their agreement.</p><div class="choice-row"><button id="personal-pause">Pause for me</button><button id="group-pause">Request group pause</button></div><p id="pause-result" role="status"></p></div>';$('#personal-pause').onclick=()=>$('#pause-result').textContent='Preview: you pause, friends continue. You would finish later after resuming.';$('#group-pause').onclick=()=>$('#pause-result').textContent='Preview: waiting for everyone’s agreement. Nobody else pauses automatically.';};}
const steps=[
 ['Welcome to CopyPanda','Your panda represents you. It studies beside you, takes breaks with you, and never gets upset when you miss a day.'],
 ['Start a study session','Choose how long you want to study, then press Start focus. Pause whenever life interrupts. Active minutes earn leaves; finishing adds a small bonus.'],
 ['Set a study goal','Choose your daily session goal and a number of study days. Missing a day creates a gap, not a reset. Your journal remembers your effort.'],
 ['A little company, anywhere.','Invite-only rooms and in-person QR check-ins are previewed here. Optional shared starts let friends study in sync without taking over their timers.'],
 ['Make it yours. Leave a bookmark.','Use Compact view for just the panda and timer, or choose Still, larger text, and high contrast in settings. Finish session lets you leave a note for next time.']
];
function tutorial(index=0){const [title,copy]=steps[index];showModal(title,`<div class="tutorial-count">A LITTLE WALKTHROUGH · ${index+1} / ${steps.length}</div><img class="completion-panda panda-portrait" src="assets/panda-matched.png" alt="Your study panda"><p>${copy}</p><div class="choice-row">${index?'<button id="tour-back">← Back</button>':''}<button class="primary" id="tour-next">${index===steps.length-1?'Get started':'Next →'}</button></div><button id="skip-tour" class="text-button">Skip for now</button>`);$('#tour-next').onclick=()=>{if(index<steps.length-1)tutorial(index+1);else{state.tutorialDone=true;save();closeModal();}};if(index)$('#tour-back').onclick=()=>tutorial(index-1);$('#skip-tour').onclick=()=>{state.tutorialDone=true;save();closeModal();};}
$('#tour').onclick=()=>tutorial();
function wardrobe(){showModal('Your panda. Your personality.',`<img class="completion-panda panda-portrait" src="assets/panda-matched.png" alt="Your panda"><p>You’ve earned <strong>${state.balance} leaves</strong>. Keep them for a little something that feels like you.</p><div class="wardrobe-preview"><span>Clothing</span><span>Accessories</span><span>Room pieces</span></div><p>Customization comes later. Your balance is saved now, so your study time won’t be lost when the wardrobe arrives.</p><p class="small-copy">No shop, payments, or random rolls in this prototype.</p>`);}
function overlayDownload(){
 showModal('Download the Windows overlay',`<div class="preview-banner">OVERLAY V1.2.1 · WINDOWS PREVIEW</div><p>Keep your panda and timer beside your work with a transparent desktop overlay.</p><div class="download-status"><strong>Overlay v1.2.1 is available.</strong><span>Portable Windows x64 preview. Extract the full ZIP, then run CopyPanda.exe. Keep the included files together.</span></div><div class="download-links"><a class="download-primary" href="https://github.com/TristanTengGH2/CopyPanda/releases/download/overlay-v1.2.1-preview.1/CopyPanda-overlay-v1.2.1-windows-x64.zip">Download for Windows ↧</a><a href="https://github.com/TristanTengGH2/CopyPanda" target="_blank" rel="noopener noreferrer">Overlay GitHub repo ↗</a></div><p class="small-copy">This is an unsigned preview. Browser progress and overlay progress are stored separately.</p><a class="overlay-spec-link" href="https://github.com/TristanTengGH2/CopyPanda/releases/tag/overlay-v1.2.1-preview.1" target="_blank" rel="noopener noreferrer">Release notes &amp; instructions ↗</a><a class="overlay-spec-link" href="https://github.com/TristanTengGH2/CopyPanda-web" target="_blank" rel="noopener noreferrer">Web app GitHub repo ↗</a>`);
}
$('#overlay-download').onclick=overlayDownload;
$$('[data-panel]').forEach(b=>b.onclick=()=>{switch(b.dataset.panel){case 'focus':document.body.classList.remove('compact');$('#start').focus();break;case 'journal':journal();break;case 'friends':together();break;case 'settings':settings();break;case 'wardrobe':wardrobe();break;case 'challenge':promiseSummary();break;case 'notes':notesDialog();break;default:showModal('A little company for your focus.',`<p>CopyPanda is a browser prototype built from our day-one spec. Timer, rewards, commitment, journal, notes, audio, and bookmarks work locally.</p><p>Friend rooms and synced sessions are labeled previews. This is not yet the native Godot overlay.</p><p>Your data stays in this browser. Clearing site data removes it. No location collection, analytics, camera monitoring, or sign-in.</p>`);}});
$('.brand').onclick=e=>{e.preventDefault();document.body.classList.remove('compact');$('#main').focus();};
$('#compact').onclick=()=>{document.body.classList.add('compact');$('#start').focus();};$('#compact-exit').onclick=()=>{document.body.classList.remove('compact');$('#compact').focus();};
$('.header-right').insertBefore($('#compact'),$('#leave'));
function closeBubblePanels(){document.body.classList.remove('rooms-open','sound-open');$('#rooms-bubble').setAttribute('aria-expanded','false');$('#sound-bubble').setAttribute('aria-expanded','false');}
$('#rooms-bubble').onclick=()=>{const open=!document.body.classList.contains('rooms-open');closeBubblePanels();document.body.classList.toggle('rooms-open',open);$('#rooms-bubble').setAttribute('aria-expanded',String(open));};
$('#sound-bubble').onclick=()=>{const open=!document.body.classList.contains('sound-open');closeBubblePanels();document.body.classList.toggle('sound-open',open);$('#sound-bubble').setAttribute('aria-expanded',String(open));};
$('#timer-bubble').onclick=()=>{closeBubblePanels();if(matchMedia('(max-width:760px)').matches){document.body.classList.toggle('timer-expanded');$('#timer-bubble').setAttribute('aria-expanded',String(document.body.classList.contains('timer-expanded')));}else{document.body.classList.toggle('timer-hidden');$('#timer-bubble').setAttribute('aria-expanded',String(!document.body.classList.contains('timer-hidden')));}};
$('#hide-bubbles').onclick=()=>{closeBubblePanels();document.body.classList.add('ui-hidden');$('#restore-bubbles').hidden=false;$('#restore-bubbles').focus();};$('#restore-bubbles').onclick=()=>{document.body.classList.remove('ui-hidden');$('#restore-bubbles').hidden=true;$('#hide-bubbles').focus();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').open)closeBubblePanels();});
const audio=$('#audio');audio.volume=.3;
audio.onplay=()=>{$('#sound-toggle').textContent='Ⅱ';$('#sound-toggle').setAttribute('aria-label','Pause atmosphere');};audio.onpause=()=>{$('#sound-toggle').textContent='▶';$('#sound-toggle').setAttribute('aria-label','Play atmosphere');};
$('#sound-toggle').onclick=async()=>{if(audio.paused){if(!audio.getAttribute('src'))audio.src=`assets/${$('#sound-select').value}.wav`;try{await audio.play();}catch{toast('Audio could not start. Try pressing play again.');}}else audio.pause();};
$('#sound-select').onchange=async e=>{const playing=!audio.paused;audio.src=`assets/${e.target.value}.wav`;if(playing)try{await audio.play();}catch{toast('Press play to start this soundscape.');}};$('#volume').oninput=e=>audio.volume=Number(e.target.value)/100;
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#room-card').requestFullscreen();}catch{toast('Fullscreen is unavailable in this browser.');}};
window.addEventListener('pagehide',()=>{if(session.tick(performance.now())==='complete')finishSession(true);session.pause();save();});
document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('window-hidden',document.hidden);if(!document.hidden){checkpointTimer();save();}});
function layoutPandaScene(){
 const card=$('#room-card'),frame=$('#panda-composition');if(!frame||frame.hidden)return;
 const bounds=card.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
 const scale=Math.max(bounds.width/1536,bounds.height/1024),width=1536*scale,height=1024*scale;
 for(const layer of [frame,$('#desk-foreground-composition')]){layer.style.width=width+'px';layer.style.height=height+'px';layer.style.left=(bounds.width-width)*.5+'px';layer.style.top=(bounds.height-height)*.53+'px';}
}
new ResizeObserver(layoutPandaScene).observe($('#room-card'));
function pandaMotionAllowed(){return state.room==='cafe'&&state.settings.display==='standard'&&!state.settings.reducedMotion&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
function endPandaPageTurn(){pandaPageTurning=false;$('#panda-turn-page')?.classList.remove('page-turn-playing','break-motion-playing','manual-page-preview');nextPandaPageAt=performance.now()+(session.running?18000:24000);}
function turnPandaPage(manual=false){
 if(!pandaMotionAllowed())return;
 if(!manual&&!session.running&&session.elapsedMs>0)return;
 const panda=$('#panda-turn-page');panda.classList.remove('page-turn-playing','break-motion-playing','manual-page-preview');void panda.offsetWidth;pandaPageTurning=true;panda.classList.add(session.kind==='break'?'break-motion-playing':'page-turn-playing');panda.classList.toggle('manual-page-preview',manual);
}
$('#panda-turn-page').onclick=()=>turnPandaPage(true);
$('#panda-turn-page').addEventListener('animationend',e=>{if(['panda-book-turn','panda-break-stretch'].includes(e.animationName))endPandaPageTurn();});
document.querySelectorAll('.panda-portrait').forEach(img=>img.src='assets/panda-matched.png');
applySettings();renderTimer();renderChallenge();showReturnBookmark();
$('#timer-bubble').setAttribute('aria-expanded',String(!matchMedia('(max-width:760px)').matches));
if(session.elapsedMs>=session.plannedMs)finishSession(true);
setInterval(()=>{if(session.running)checkpointTimer();if(!pandaPageTurning&&performance.now()>=nextPandaPageAt)turnPandaPage();if(++checkpoint%10===0)save();},1000);

// Explicit account-scoped storage. A sign-out never leaves the previous user's
// notes, timer, or pending imports visible in the next account.
window.CopyPandaApp={
 snapshot:()=>structuredClone(state),
 privateData:()=>({notes:state.notes,bookmark:state.bookmark,challenge:state.challenge}),
 activity:()=>({status:session.running?session.kind==='focus'?'focus':'break':session.elapsedMs>0?'paused':'idle',remainingMs:Math.max(0,session.plannedMs-session.elapsedMs)}),
 idle:()=>!session.running&&session.elapsedMs===0,
 modal:showModal,close:closeModal,toast,escape:escapeHTML,
 switchAccount(uid){
  if(session.running)checkpointTimer();session.pause();save();const settings=state.settings;
  KEY=uid?BASE_KEY+':account:'+uid:BASE_KEY;
  let stored;try{stored=JSON.parse(localStorage.getItem(KEY))}catch{}
  state={...defaults(),...(stored||{}),settings};
  if(!Array.isArray(state.sessions))state.sessions=[];
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
  if(!this.idle())return false;session=new Session({plannedMs:minutes*60000,kind:'focus'});
  session.elapsedMs=Math.max(0,Math.min(5000,serverNow-Date.parse(startedAt)));session.start(performance.now());save();renderTimer();return true;
 },
 pause(){if(session.running)checkpointTimer();session.pause();save();renderTimer()}
};
