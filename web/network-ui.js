/* Optional accounts and real rooms. Private study data never enters presence. */
(function(){
 'use strict';
 const app=window.CopyPandaApp,{CloudClient}=window.CopyPandaCloud;
 const qa=new URLSearchParams(location.search).has('qa'),prefix=qa?'copypanda-qa-network':'copypanda-network';
 const client=new CloudClient(window.COPY_PANDA_CONFIG,{storageKey:prefix+':auth'});
 const $=s=>document.querySelector(s),esc=app.escape;
 const deviceId=localStorage.getItem(prefix+':device')||crypto.randomUUID();localStorage.setItem(prefix+':device',deviceId);
 let accountId=null,roomId=null,roomState=null,invitation=null,conflict=null,applying=false,busy=false,roomBusy=false;
 let revision=0,baseline='',syncTimer=null,scanner=null,scanEpoch=0,scheduled=null,lastPause=null,serverOffset=0,status='Local only',candidate=null;
 const fingerprint=()=>JSON.stringify(app.privateData());
 const authButton=document.createElement('button');authButton.className='quiet-button account-bubble';authButton.id='cloud-account';authButton.textContent='Account';authButton.onclick=account;
 document.querySelector('.header-right').insertBefore(authButton,$('#leave'));
 const metadata=()=>{try{return JSON.parse(localStorage.getItem(prefix+':sync:'+accountId))||{}}catch{return {}}};
 const remember=()=>localStorage.setItem(prefix+':sync:'+accountId,JSON.stringify({revision,baseline}));
 function updateBadge(){authButton.textContent=client.permanent?'Account ✓':'Account';authButton.title=status;authButton.setAttribute('aria-label','Account and sync: '+status)}
 function setStatus(text){status=text;updateBadge();if($('#cloud-status'))$('#cloud-status').textContent=text}
 function failure(error){const text=error?.message||String(error||'The action could not be completed.');setStatus(error?.code==='offline'?'Offline · changes saved on this device':text);app.toast(text)}
 async function run(task){try{await task()}catch(e){failure(e)}}
 function button(id,action){const node=$('#'+id);if(node)node.onclick=()=>run(action)}
 function message(text){return `<p class="network-message" role="status">${esc(text)}</p>`}
 function account(){
  stopScanner();
  if(!client.enabled){app.modal('Account',message('Cloud setup is not available yet. Your local timer and progress still work.'));return}
  if(!client.permanent&&!client.config.emailEnabled){app.modal('Account',message('Email sign-in is being set up. For now, your leaves and study history stay on this device. You can already join study rooms without an account.'));return}
  if(client.permanent){
   app.modal('Account',`<p>Signed in as <strong>${esc(client.user.email||'your account')}</strong></p><p id="cloud-status" role="status">${esc(status)}</p><p>Your shared leaves, notes, study calendar, and goal are private. Device settings stay on this device.</p><div class="choice-row"><button class="primary" id="cloud-sync-now">Sync now</button><button id="cloud-room">Study together</button></div>${candidate?`<p>${candidate.sessions.length} local study record(s) are available to import. The server recalculates rewards and ignores repeated IDs.</p><label class="network-check"><input type="checkbox" id="import-private"> Also use this device’s notes, bookmark, and goal</label><button id="cloud-import">Import local study</button>`:''}${conflict?`<section class="network-conflict"><h3>Notes or goals changed elsewhere</h3><p>Choose which version to keep. Your study records and leaves are unaffected.</p><button id="use-cloud-private">Use cloud version</button><button id="use-local-private">Use this device’s version</button></section>`:''}<button class="text-button" id="cloud-signout">Sign out</button>`);
   button('cloud-sync-now',sync);button('cloud-room',room);button('cloud-import',async()=>{
    applying=true;app.addLocalRecords(candidate.sessions);if($('#import-private')?.checked)app.usePrivate(candidate);applying=false;candidate=null;await sync();account();
   });
   button('use-cloud-private',async()=>{applying=true;app.usePrivate(conflict.data);applying=false;revision=conflict.revision;baseline=fingerprint();conflict=null;remember();account()});
   button('use-local-private',async()=>{revision=conflict.revision;conflict=null;await pushPrivate();account()});
   button('cloud-signout',async()=>{if(busy){app.toast('Please wait for the current sync to finish.');return}busy=true;try{await leaveRoom();applying=true;app.pause();await client.signOut();app.switchAccount(null);applying=false;accountId=null;conflict=null;candidate=null;setStatus('Local only');account()}finally{busy=false;applying=false}});
   return;
  }
  app.modal('Account',`<p>Keep studying without an account, or use an email code to share leaves and progress between the website and overlay.</p><form id="cloud-email-form"><label class="form-label">Email<input id="cloud-email" type="email" autocomplete="email" required></label>${client.user?.is_anonymous?'<label class="network-check"><input type="checkbox" id="link-guest" checked> Link this guest identity to a new account</label><p class="small-copy">If this email already has an account, uncheck this option to sign in to it instead.</p>':''}<button class="primary" type="submit">Send sign-in code</button></form><p class="small-copy">Local progress stays on this device until you choose to import it. Your email is never shared with a study room.</p>`);
  $('#cloud-email-form').onsubmit=e=>{e.preventDefault();run(async()=>{
   const email=$('#cloud-email').value.trim(),link=!!$('#link-guest')?.checked;
   const saved=accountId?null:app.snapshot();const type=await client.sendCode(email,link);
   app.modal('Check your email',`<p>Enter the code sent to ${esc(email)}.</p><form id="cloud-code-form"><label class="form-label">Sign-in code<input id="cloud-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" required></label><button class="primary" type="submit">Verify and sign in</button></form>`);
   $('#cloud-code-form').onsubmit=event=>{event.preventDefault();run(async()=>{await client.verifyCode(email,$('#cloud-code').value,type);candidate=saved;await connectAccount();account()})};
  })};
 }
 async function connectAccount(){
  if(!client.permanent)return;
  const next=client.user.id;
  if(accountId!==next){applying=true;app.switchAccount(next);applying=false;accountId=next;conflict=null}
  const meta=metadata(),local=fingerprint(),dirty=!!meta.baseline&&local!==meta.baseline;
  const snapshot=await client.rpc('bootstrap');revision=snapshot.revision;roomId=snapshot.roomId||null;
  const records=await client.allRecords();
  if(dirty&&snapshot.revision!==meta.revision)conflict={data:snapshot.data,revision:snapshot.revision};
  applying=true;app.applyCloud({...snapshot,records},{keepPrivate:dirty});applying=false;
  baseline=dirty?meta.baseline:fingerprint();remember();setStatus(conflict?'Sync needs a notes/goal choice':'Connected');
  if(!conflict)await sync();if(roomId)await heartbeat();
 }
 async function pushPrivate(){
  const result=await client.rpc('state.put',{revision,data:app.privateData()});revision=result.revision;baseline=fingerprint();remember();
 }
 async function sync(){
  if(!client.permanent||accountId!==client.user.id||busy)return;busy=true;
  const syncingAccount=accountId;
  try{
   setStatus('Syncing…');
   for(const record of app.snapshot().sessions.filter(s=>!s.cloudSynced)){
    const result=await client.rpc('record.import',{record});if(accountId!==syncingAccount||client.user?.id!==syncingAccount)return;applying=true;app.applyRecord(result.record,result.balance);applying=false;
   }
   if(!conflict&&fingerprint()!==baseline)await pushPrivate();
   const latest=await client.rpc('bootstrap');
   if(accountId!==syncingAccount||client.user?.id!==syncingAccount)return;
   const dirty=fingerprint()!==baseline;
   if(!dirty&&!conflict){applying=true;app.applyCloud(latest);applying=false;revision=latest.revision;baseline=fingerprint();remember()}
   setStatus(conflict?'Choose which notes/goal version to keep':'Synced');
  }catch(e){if(e.code==='conflict'){conflict=e.detail;setStatus('Notes or goals changed on another device · open Account')}else throw e}
  finally{applying=false;busy=false}
 }
 window.addEventListener('copypanda:saved',()=>{if(applying||!client.permanent)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>run(sync),1000)});
 async function ensureGuest(){if(!client.user)await client.guest()}
 async function refreshRoom(operation='room.get',extra={}){
  const result=await client.rpc(operation,{roomId,deviceId,...extra});roomState=result;
  if(result.serverNow)serverOffset=Date.parse(result.serverNow)-Date.now();
  if(result.invitation)invitation=result.invitation;
  const me=result.members.find(m=>m.self),shared=result.sync;
  if(shared?.pauseAppliedAt&&shared.pauseId!==lastPause&&me?.joinedSync===shared.id){lastPause=shared.pauseId;app.pause();app.toast('Everyone agreed to pause. Resume when you’re ready.')}
  if($('#network-presence'))renderPresence();return result;
 }
 async function heartbeat(){
  if(!roomId||roomBusy)return;roomBusy=true;
  try{await refreshRoom('room.heartbeat',app.activity())}catch(e){if(e.code==='room_closed'){roomId=null;roomState=null;invitation=null;scheduled=null;if($('#network-presence'))room();app.toast(e.message)}else throw e}finally{roomBusy=false}
 }
 async function leaveRoom(){if(roomId){try{await client.rpc('room.leave',{roomId})}finally{roomId=null;roomState=null;invitation=null;scheduled=null}}}
 async function createRoom(mode,name){await ensureGuest();roomState=await client.rpc('room.create',{mode,name,deviceId});roomId=roomState.roomId;invitation=roomState.invitation;room();await heartbeat()}
 async function joinRoom(value,name){await ensureGuest();roomState=await client.rpc('room.join',{...client.parseInvite(value),name,deviceId});roomId=roomState.roomId;invitation=null;location.hash='';room();await heartbeat()}
 function room(){
  stopScanner();
  if(!client.enabled){app.modal('Study together',message('Rooms need the cloud service, which is not configured yet. Your solo timer remains available.'));return}
  if(!roomId||!roomState){
   app.modal('Study together',`<p>Study independently with friends, or choose a shared start. No camera or location tracking is required.</p>${!client.permanent?'<p class="small-copy">Guest room identity stays on this device. Link an account to recover it elsewhere.</p>':''}<label class="form-label">Name shown to the room<input id="room-name-input" maxlength="24" value="Study panda" autocomplete="nickname"></label><div class="choice-row"><button id="create-online" class="primary">Create online room</button><button id="create-inperson">Create in-person room</button></div><hr><form id="join-room-form"><label class="form-label">Room code or invite link<input id="join-room-code" autocomplete="off" placeholder="ABCD-EFGH or invite link" required></label><button class="primary" type="submit">Join room</button></form><div class="choice-row"><button id="scan-room">Scan QR</button><label class="network-file">Read QR image<input id="qr-image" type="file" accept="image/*"></label></div><p class="small-copy">In-person check-in is honor based. A code or screenshot can be shared remotely.</p>`);
   const name=()=>$('#room-name-input')?.value.trim()||'Study panda';
   button('create-online',()=>createRoom('online',name()));button('create-inperson',()=>createRoom('inperson',name()));
   $('#join-room-form').onsubmit=e=>{e.preventDefault();run(()=>joinRoom($('#join-room-code').value,name()))};
   button('scan-room',()=>scan(name()));
   $('#qr-image').onchange=e=>run(async()=>{const file=e.target.files?.[0];if(!file)return;const epoch=scanEpoch;const {default:QrScanner}=await import('./vendor/qr-scanner.min.js');const result=await QrScanner.scanImage(file,{returnDetailedScanResult:true});if(epoch===scanEpoch&&$('#qr-image'))await joinRoom(result.data,name())});
   return;
  }
  app.modal(roomState.mode==='inperson'?'In-person study room':'Online study room',`<p>Only room members see names and study status. Your notes, email, and calendar stay private.</p><div id="network-presence" aria-live="polite"></div><section id="network-invitation"></section><section id="network-shared"></section><div class="choice-row"><button id="room-refresh">Refresh</button><button id="room-leave">${roomState.host?'Close room and leave':'Leave room'}</button></div>`,true);
  renderPresence();renderInvitation();renderShared();button('room-refresh',heartbeat);button('room-leave',async()=>{await leaveRoom();room()});
 }
 function renderPresence(){
  const root=$('#network-presence');if(!root||!roomState)return;
  root.innerHTML=`<div class="network-members">${roomState.members.map(m=>`<article class="network-member"><span class="network-panda ${m.status==='break'?'is-break':''}" aria-hidden="true"></span><strong>${esc(m.name)}${m.self?' (you)':''}</strong><span>${esc(({focus:'Studying',break:'On a break',paused:'Paused',idle:'Ready',away:'Away'})[m.status])}</span></article>`).join('')}</div>`;
  renderShared();
 }
 async function renderInvitation(){
  const target=$('#network-invitation');if(!target||!roomState)return;
  if(!invitation){target.innerHTML=roomState.host?'<button id="renew-invite">Generate invitation</button>':'<p class="small-copy">The host can share the invitation. You can always leave without changing anyone else’s timer.</p>';button('renew-invite',async()=>{await refreshRoom('room.rotate');renderInvitation()});return}
  const link=client.inviteLink(invitation.token),code=invitation.code.slice(0,4)+'-'+invitation.code.slice(4);
  target.innerHTML=`<div class="network-invite"><img id="room-qr" alt="Scan to join this study room"><div><label>Room code</label><strong class="network-code">${esc(code)}</strong><p>Expires ${new Date(invitation.expiresAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p><button id="copy-room-link">Copy invite link</button><button id="renew-invite">Renew invitation</button></div></div>`;
  const svg=await window.CopyPandaQR.svg(link);if($('#room-qr'))$('#room-qr').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  button('copy-room-link',async()=>{await navigator.clipboard.writeText(link);app.toast('Invite link copied.')});button('renew-invite',async()=>{await refreshRoom('room.rotate');renderInvitation()});
 }
 function renderShared(){
  const target=$('#network-shared');if(!target||!roomState)return;
  const now=Date.now()+serverOffset,shared=roomState.sync&&Date.parse(roomState.sync.startsAt)+roomState.sync.minutes*60000>now?roomState.sync:null,me=roomState.members.find(m=>m.self);
  const viewKey=JSON.stringify([shared,me?.joinedSync,shared?Date.parse(shared.startsAt)>now:false]);
  if(target.dataset.viewKey===viewKey)return;target.dataset.viewKey=viewKey;
  if(!shared){target.innerHTML='<h3>Timers are independent</h3><p>Optional: propose a shared start. Everyone chooses whether to join.</p><label class="form-label">Focus minutes<input id="shared-minutes" type="number" min="1" max="120" value="25"></label><button id="propose-shared">Propose shared start</button>';button('propose-shared',async()=>{await refreshRoom('sync.propose',{minutes:Number($('#shared-minutes').value)});renderShared()});return}
  const joined=me?.joinedSync===shared.id,pending=shared.pauseId&&!shared.pauseAppliedAt&&Date.parse(shared.pauseExpiresAt)>now;
  target.innerHTML=`<h3>${shared.minutes}-minute shared session</h3><p>${Date.parse(shared.startsAt)>now?'Starts at '+new Date(shared.startsAt).toLocaleTimeString():joined?'Your shared session has started.':'This session has started. You can study independently.'}</p>${!joined&&Date.parse(shared.startsAt)>now?'<button id="accept-shared">Join shared start</button>':''}${joined?'<p>You joined this shared timer. A personal pause affects only you.</p><button id="personal-pause">Pause for me</button><button id="group-pause">Request group pause</button><button id="leave-shared">Continue independently</button>':''}${pending?'<p>A group pause needs everyone’s agreement.</p><button id="vote-pause">Agree to pause</button>':''}`;
  button('accept-shared',async()=>{if(!app.idle())throw new Error('Finish or end your current timer before joining a shared start.');await refreshRoom('sync.accept',{syncId:shared.id});scheduled={...shared};renderShared()});
  button('personal-pause',async()=>{app.pause();await heartbeat()});button('group-pause',async()=>{await refreshRoom('sync.pause_request');renderShared()});button('vote-pause',async()=>{await refreshRoom('sync.pause_vote',{pauseId:shared.pauseId});renderShared()});button('leave-shared',async()=>{scheduled=null;await refreshRoom('sync.leave');renderShared()});
 }
 async function scan(name){
  stopScanner();app.modal('Scan a room QR',`<p>Camera frames are decoded on this device. No video is uploaded.</p><video id="room-camera" playsinline muted></video><button id="stop-camera">Stop camera</button>`);
  const {default:QrScanner}=await import('./vendor/qr-scanner.min.js');
  if(!$('#room-camera'))return;
  scanner=new QrScanner($('#room-camera'),result=>run(async()=>{const value=result.data;stopScanner();await joinRoom(value,name)}),{returnDetailedScanResult:true,maxScansPerSecond:5,highlightScanRegion:true});
  button('stop-camera',async()=>{stopScanner();room()});await scanner.start();
 }
 function stopScanner(){scanEpoch++;if(scanner){scanner.stop();scanner.destroy();scanner=null}}
 $('#modal').addEventListener('close',stopScanner);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopScanner()});
 window.addEventListener('pagehide',stopScanner);
 setInterval(()=>run(async()=>{await heartbeat();if(client.permanent&&!document.hidden)await sync()}),10000);
 setInterval(()=>{if(!scheduled)return;const now=Date.now()+serverOffset,at=Date.parse(scheduled.startsAt);if(now<at)return;const current=scheduled;scheduled=null;if(now-at>5000){app.toast('The shared start was missed. Start independently when ready.');return}if(app.startShared(current.minutes,current.startsAt,now)){app.toast('Shared focus session started.');run(heartbeat)}},250);
 window.addEventListener('online',()=>run(sync));
 window.CopyPandaNetworkUI={account,room,sync,client};
 client.onAuth=user=>{if(!user&&accountId){applying=true;app.pause();app.switchAccount(null);applying=false;accountId=null;roomId=null;roomState=null;invitation=null;conflict=null;candidate=null;scheduled=null;setStatus('Signed out · local study available')}};
 run(async()=>{
  if(client.permanent)await connectAccount();
  else if(client.user){const snapshot=await client.rpc('bootstrap');roomId=snapshot.roomId;if(roomId){roomState=await refreshRoom();await heartbeat()}}
  const token=new URLSearchParams(location.hash.slice(1)).get('join');if(token){room();if($('#join-room-code'))$('#join-room-code').value=client.inviteLink(token)}
  updateBadge();
 });
})();



