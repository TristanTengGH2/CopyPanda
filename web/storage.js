/* Detect stale-tab writes without merging private notes or losing newer records. */
(function(root){
 'use strict';
 class GuardedStore {
  constructor(storage){this.storage=storage;this.baselines=new Map();}
  load(key){const value=this.storage.getItem(key);this.baselines.set(key,value);return value;}
  write(key,value){
   if(!this.baselines.has(key))throw new Error('Load this storage scope before writing.');
   const baseline=this.baselines.get(key);
   // An unchanged idle tab should not keep rewriting its old snapshot.
   if(value===baseline)return 'unchanged';
   if(this.storage.getItem(key)!==baseline)return 'conflict';
   this.storage.setItem(key,value);this.baselines.set(key,value);return 'saved';
  }
  changed(key,value){return this.baselines.has(key)&&this.baselines.get(key)!==value;}
 }
 root.CopyPandaStorage={GuardedStore};
 if(typeof module!=='undefined'&&module.exports)module.exports={GuardedStore};
})(typeof globalThis!=='undefined'?globalThis:this);
