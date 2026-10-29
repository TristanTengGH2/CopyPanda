const {test}=require('node:test');const assert=require('node:assert/strict');
const {CloudClient}=require('../web/cloud-client.js');
const config={url:'https://test.supabase.co',key:'sb_publishable_test',appUrl:'https://example.org/CopyPanda-web/'};
test('invite parsing accepts only CopyPanda links, tokens, or unambiguous codes',()=>{
 const c=new CloudClient(config,{storage:null});const token='ab'.repeat(32);
 assert.deepEqual(c.parseInvite('ABCD-EF23'),{code:'ABCDEF23'});
 assert.deepEqual(c.parseInvite(c.inviteLink(token)),{token});
 for(const bad of ['https://evil.org/#join='+token,'https://example.org/other/#join='+token,'ABCD-EFI0','javascript:alert(1)'])assert.throws(()=>c.parseInvite(bad));
});
test('refresh is shared by simultaneous requests and updates the session',async()=>{
 let calls=0;const c=new CloudClient(config,{storage:null,fetcher:async()=>{calls++;await new Promise(r=>setTimeout(r,5));return {ok:true,json:async()=>({access_token:'new',refresh_token:'next',expires_in:3600,user:{id:'one'}})}}});
 c.session={access_token:'old',refresh_token:'old',expires_at:0,user:{id:'one'}};
 await Promise.all([c.refresh(),c.refresh()]);assert.equal(calls,1);assert.equal(c.session.access_token,'new');
});
test('network interruption retains a refresh session for later retry',async()=>{
 const c=new CloudClient(config,{storage:null,fetcher:async()=>{throw Error('offline')}});c.session={refresh_token:'still-valid',user:{id:'one'}};
 await assert.rejects(c.refresh(),e=>e.code==='offline');assert.equal(c.session.refresh_token,'still-valid');
});
test('server denial is surfaced, and secret keys are refused',async()=>{
 assert.throws(()=>new CloudClient({...config,key:'sb_secret_bad'}));
 const c=new CloudClient(config,{storage:null,fetcher:async()=>({ok:true,status:200,json:async()=>({ok:false,code:'conflict',message:'Changed elsewhere',revision:4})})});
 c.session={access_token:'token',expires_at:Date.now()/1000+3600,user:{id:'one'}};
 await assert.rejects(c.rpc('state.put'),e=>e.code==='conflict'&&e.detail.revision===4);
});
