/* Shared REST contract for the browser and Godot clients. No administrator key. */
(function(root){
 'use strict';
 class CloudError extends Error{constructor(message,code='network',detail=null){super(message);this.code=code;this.detail=detail;}}
 class CloudClient{
  constructor(config,{storage=root.localStorage,fetcher=root.fetch?.bind(root),storageKey='copypanda-cloud-auth'}={}){
   this.config=config||{};this.storage=storage;this.fetcher=fetcher;this.storageKey=storageKey;this.session=null;this.refreshing=null;
   this.enabled=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(this.config.url||'')&&!!this.config.key;
   if(this.config.key?.startsWith('sb_secret_'))throw new CloudError('Only a public publishable key belongs in the client.','configuration');
   try{this.session=JSON.parse(storage?.getItem(storageKey)||'null')}catch{}
   if(!this.session?.access_token||!this.session?.user?.id)this.session=null;
   this.onAuth=()=>{};
  }
  get user(){return this.session?.user||null}
  get permanent(){return !!this.user&&!this.user.is_anonymous}
  persist(session){
   this.session=session?{access_token:session.access_token,refresh_token:session.refresh_token,expires_at:session.expires_at||Date.now()/1000+session.expires_in,user:session.user}:null;
   if(this.session)this.storage?.setItem(this.storageKey,JSON.stringify(this.session));else this.storage?.removeItem(this.storageKey);
   this.onAuth(this.user);return this.session;
  }
  async request(path,body,{method='POST',authenticated=false,retry=true}={}){
   if(!this.enabled)throw new CloudError('Cloud setup is not configured yet. Local study still works.','configuration');
   if(authenticated)await this.refresh();
   const headers={'Content-Type':'application/json',apikey:this.config.key};
   if(authenticated&&this.session)headers.Authorization='Bearer '+this.session.access_token;
   let response;try{response=await this.fetcher(this.config.url.replace(/\/$/,'')+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)})}catch{throw new CloudError('Could not connect. Your local study is still saved.','offline')}
   let data;try{data=await response.json()}catch{data={}}
   if(response.status===401&&authenticated&&retry&&this.session?.refresh_token){await this.refresh(true);return this.request(path,body,{method,authenticated,retry:false})}
   if(!response.ok)throw new CloudError(data.msg||data.message||data.error_description||'The request could not be completed.',data.error_code||data.code||String(response.status),data);
   if(data.ok===false)throw new CloudError(data.message||'The action could not be completed.',data.code,data);
   return data;
  }
  async refresh(force=false){
   if(!this.session)throw new CloudError('Sign in or continue as a guest first.','unauthorized');
   if(!force&&this.session.expires_at>Date.now()/1000+60)return;
   if(!this.refreshing)this.refreshing=this.request('/auth/v1/token?grant_type=refresh_token',{refresh_token:this.session.refresh_token}).then(s=>this.persist(s)).catch(e=>{if(e.code!=='offline')this.persist(null);throw e}).finally(()=>this.refreshing=null);
   await this.refreshing;
  }
  async guest(){if(this.user)return this.user;const s=await this.request('/auth/v1/signup',{data:{}});this.persist(s);return this.user}
  async sendCode(email,linkGuest=false){
   const normalized=email.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw new CloudError('Enter a valid email address.','invalid_email');
   if(linkGuest&&this.user?.is_anonymous){await this.request('/auth/v1/user',{email:normalized},{method:'PUT',authenticated:true});return 'email_change'}
   await this.request('/auth/v1/otp',{email:normalized,create_user:true});return 'email';
  }
  async verifyCode(email,token,type='email'){
   if(!/^\d{6,10}$/.test(token.trim()))throw new CloudError('Enter the code from your email.','invalid_code');
   const s=await this.request('/auth/v1/verify',{email:email.trim(),token:token.trim(),type},{authenticated:type==='email_change'});this.persist(s);return this.user;
  }
  async signOut(){try{if(this.session)await this.request('/auth/v1/logout',{}, {authenticated:true})}finally{this.persist(null)}}
  async rpc(operation,payload={}){return this.request('/rest/v1/rpc/cp_api',{operation,payload},{authenticated:true})}
  async allRecords(){let result=await this.rpc('bootstrap'),records=[...result.records];while(result.hasMore){const last=result.records.at(-1);result=await this.rpc('history.list',{cursor:{endedAt:last.endedAt,id:last.id}});records.push(...result.records)}return records}
  inviteLink(token){const url=new URL(this.config.appUrl);url.hash='join='+token;return url.href}
  parseInvite(value){
   const text=value.trim(),code=text.replace(/[\s-]/g,'').toUpperCase();
   if(/^[2-9A-HJ-NP-Z]{8}$/.test(code))return {code};
   if(/^[0-9a-f]{64}$/i.test(text))return {token:text.toLowerCase()};
   try{const url=new URL(text),allowed=new URL(this.config.appUrl);if(url.origin!==allowed.origin||url.pathname!==allowed.pathname)throw Error();const token=new URLSearchParams(url.hash.slice(1)).get('join');if(/^[0-9a-f]{64}$/i.test(token||''))return {token:token.toLowerCase()}}catch{}
   throw new CloudError('Enter an eight-character room code or a CopyPanda invite link.','invalid_invite');
  }
 }
 const api={CloudClient,CloudError};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CopyPandaCloud=api;
})(typeof globalThis!=='undefined'?globalThis:this);
