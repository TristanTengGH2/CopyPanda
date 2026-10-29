/* Pure session and reward rules shared by the prototype and its tests. */
(function (root) {
  'use strict';
  const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function reward(activeMs, plannedMs, completed, demo = false) {
    if (demo) return {base:0, bonus:0, total:0};
    const base = Math.floor(Math.min(Math.max(0, activeMs), plannedMs) / 60000);
    const bonus = completed && activeMs >= plannedMs ? Math.ceil(base * 0.1) : 0;
    return {base, bonus, total:base+bonus};
  }
  function challengeProgress(challenge, sessions) {
    const byDay = {};
    for (const session of sessions) {
      if (session.completed && !session.manual && !session.demo && session.plannedMs >= challenge.minutes*60000 && session.endedAt >= challenge.startedAt) {
        byDay[session.day] = (byDay[session.day] || 0) + 1;
      }
    }
    const days = Object.keys(byDay).filter(day => byDay[day] >= challenge.sessionsPerDay).sort();
    return {days, count:Math.min(days.length, challenge.targetDays), today:Math.min(byDay[dayKey()]||0,challenge.sessionsPerDay)};
  }
  class Session {
    constructor({plannedMs=25*60000,elapsedMs=0,kind='focus',demo=false} = {}) {
      this.plannedMs=plannedMs; this.elapsedMs=Math.min(plannedMs,Math.max(0,elapsedMs));
      this.kind=kind; this.demo=demo; this.running=false; this.lastTick=null;
    }
    tick(now) {
      if (!this.running) return 'paused';
      const delta=Math.max(0,now-this.lastTick); this.lastTick=now;
      // A long scheduling gap may be OS sleep. Ask the user to resume instead of granting unattended time.
      if (delta>90000) {this.pause();return 'interrupted';}
      this.elapsedMs=Math.min(this.plannedMs,this.elapsedMs+delta);
      if(this.elapsedMs>=this.plannedMs){this.pause();return 'complete';}
      return 'running';
    }
    start(now){if(this.elapsedMs>=this.plannedMs)return;this.running=true;this.lastTick=now;}
    pause(){this.running=false;this.lastTick=null;}
    get remainingSeconds(){return Math.max(0,Math.ceil((this.plannedMs-this.elapsedMs)/1000));}
    serialize(){return {plannedMs:this.plannedMs,elapsedMs:this.elapsedMs,kind:this.kind,demo:this.demo};}
  }
  const api={Session,reward,challengeProgress,dayKey};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.CopyPandaCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
