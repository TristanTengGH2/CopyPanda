'use strict';
const $=selector=>document.querySelector(selector),checks=[...document.querySelectorAll('fieldset input')];
let epoch=0,currentUrl=null,playing=false;
function frame(){const n=Number($('#rig-frame').value);$('#rig-sheet').style.backgroundPosition=`${n%3*50}% ${Math.floor(n/3)*100}%`;$('#rig-frame-label').value=`${n+1} / 6`;}
function stop(){playing=false;$('#rig-stage').classList.remove('playing');$('#rig-play').textContent='Play animation';frame();}
async function render(){
 const turn=++epoch;$('#rig-status').textContent='Preparing layers…';$('#rig-stage').classList.toggle('rig-break',$('#rig-kind').value==='break');$('#rig-stage').classList.toggle('rig-focus',$('#rig-kind').value==='focus');
 try{const url=await CopyPandaWardrobeRenderer.preview($('#rig-kind').value,{sweater:$('#rig-color').value,headwear:$('#rig-hat').value},checks.filter(c=>c.checked).map(c=>c.value));const decode=new Image();decode.src=url;await decode.decode();if(turn!==epoch){URL.revokeObjectURL(url);return;}const previous=currentUrl;currentUrl=url;$('#rig-sheet').style.backgroundImage=`url("${url}")`;if(previous)URL.revokeObjectURL(previous);$('#rig-status').textContent='Layers ready.';}catch(error){if(turn===epoch)$('#rig-status').textContent=error.message;}
}
for(const control of [...checks,$('#rig-kind'),$('#rig-color'),$('#rig-hat')])control.onchange=()=>{stop();render();};
$('#rig-frame').oninput=stop;$('#rig-all').onclick=()=>{checks.forEach(c=>c.checked=true);render();};
const motion=matchMedia('(prefers-reduced-motion: reduce)');function respectMotion(){if(motion.matches)stop();$('#rig-play').disabled=motion.matches;$('#rig-play').title=motion.matches?'Reduced motion is enabled. Use the frame slider.':'';}motion.addEventListener('change',respectMotion);respectMotion();
$('#rig-play').onclick=()=>{playing=!playing;$('#rig-stage').classList.toggle('playing',playing);$('#rig-play').textContent=playing?'Pause animation':'Play animation';};document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>{epoch++;if(currentUrl)URL.revokeObjectURL(currentUrl);});frame();render();
