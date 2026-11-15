(() => {
'use strict';
const $=id=>document.getElementById(id);
const STORE='workout_tracker_phase1_v1',AUTH='workout_supabase_auth_v1';
const state=()=>JSON.parse(localStorage.getItem(STORE)||'{}');
// Public client configuration. Database access is restricted by Supabase RLS.
const config=()=>({url:'https://yipexqnkvwlvprhzstfr.supabase.co',key:'sb_publishable_TY6c1lHDtFrkpLqYCg9Tgg_IbleQFfT'});
let auth=null,busy=false,refreshPromise=null,syncTimer=null,loginBusy=false;
try{auth=JSON.parse(localStorage.getItem(AUTH)||'null')}catch{}
const message=(text,error=false)=>{ $('homeLoginStatus').textContent=text; $('syncStatus').textContent=text;const dot=$('backupDot');dot.className='backupDot '+(error?'error':text.includes('up to date')?'ok':text.includes('pending')?'warn':''); };
const persistAuth=value=>{auth=value;if(value)localStorage.setItem(AUTH,JSON.stringify(value));else localStorage.removeItem(AUTH);update()};
const validConfig=()=>{const c=config();return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(c.url||'')&&/^(sb_publishable_|eyJ)/.test(c.key||'')};
const endpoint=()=>config().url.replace(/\/$/,'');
function update(){
 const s=state(),sessions=s.sessions||[];
 $('syncCount').textContent=sessions.length?sessions.filter(x=>x.cloudSynced).length+' of '+sessions.length+' completed workouts backed up':'No completed workouts yet';
 $('syncUser').textContent=auth?.user?.email||'Connected';
 $('syncAccount').hidden=!auth;
 $('syncAuth').hidden=!!auth;
 $('homeLogin').hidden=!!auth;
 $('syncLogin').disabled=loginBusy;
 $('homeSendCode').disabled=loginBusy;
 $('syncConfirm').disabled=loginBusy;
 $('homeConfirm').disabled=loginBusy;
}
async function request(path,{method='GET',body,token,prefer}={}){
 const c=config();
 const res=await fetch(endpoint()+path,{method,headers:{apikey:c.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const raw=await res.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=null}
 if(!res.ok)throw Error(data?.msg||data?.error_description||data?.message||data?.error||'Cloud request failed ('+res.status+')');
 return data;
}
function acceptAuth(data){
 if(!data?.access_token||!data?.refresh_token)throw Error('Sign-in did not return a session.');
 persistAuth({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600),user:data.user||auth?.user});
}
async function token(){
 if(!auth)return null;
 if(Date.now()/1000 < (auth.expires_at||0)-90)return auth.access_token;
 if(!refreshPromise)refreshPromise=(async()=>{
  try{const result=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:auth.refresh_token}});acceptAuth(result);return auth.access_token}
  catch(e){persistAuth(null);message('Session expired. Sign in with your password.',true);throw e}
 })().finally(()=>{refreshPromise=null});
 return refreshPromise;
}
async function rest(path,options={}){
 const t=await token();if(!t)throw Error('Sign in to enable cloud backup.');
 return request('/rest/v1/'+path,{...options,token:t});
}
async function sync(){
 if(busy||!auth||!validConfig()||!navigator.onLine)return;
 busy=true;update();message('Backing up workouts…');
 try{
  const user=auth.user?.id;if(!user)throw Error('Missing account identity. Please sign in again.');
  // Pull before pushing: avoids overwriting another device's completed sessions.
  const rows=await rest('workout_sessions?select=id,payload&order=created_at.asc&limit=10000');
  const remote=new Map(rows.map(r=>[r.id,r.payload]));
  const local=state();local.sessions=local.sessions||[];
  const known=new Set(local.sessions.map(x=>x.id));
  let recovered=0;
  for(const [id,item] of remote){if(!known.has(id)&&item&&item.id===id&&item.endedAt&&Array.isArray(item.exercises)){local.sessions.push({...item,cloudSynced:true});known.add(id);recovered++}}
  // Preserve active workout and local program preference. Only merge completed history.
  for(const item of local.sessions)if(remote.has(item.id))item.cloudSynced=true;
  localStorage.setItem(STORE,JSON.stringify(local));
  window.dispatchEvent(new Event('workout-cloud-merged'));
  const pending=local.sessions.filter(x=>x.id&&x.endedAt&&!remote.has(x.id));
  if(pending.length){
   await rest('workout_sessions?on_conflict=user_id,id',{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',body:pending.map(x=>({id:x.id,user_id:user,payload:{...x,cloudSynced:undefined}}))});
  }
  const check=await rest('workout_sessions?select=id&limit=10000');
  const synced=new Set(check.map(x=>x.id));
  const latest=state();
  for(const item of latest.sessions||[])if(synced.has(item.id))item.cloudSynced=true;
  // Do not overwrite changes to the current active workout.
  localStorage.setItem(STORE,JSON.stringify(latest));
  window.dispatchEvent(new Event('workout-cloud-merged'));
  const remaining=(latest.sessions||[]).filter(x=>x.endedAt&&!x.cloudSynced).length;
  message(remaining?'Backup pending · will retry automatically':'Cloud backup up to date ✓'+(recovered?' · '+recovered+' restored':''));
 }catch(e){message('Cloud backup pending: '+e.message,true)}
 finally{busy=false;update()}
}
function schedule(){if(syncTimer)clearTimeout(syncTimer);syncTimer=setTimeout(()=>{syncTimer=null;sync()},1200)}
const savedEmail=localStorage.getItem('workout_supabase_email')||'';
$('syncEmail').value=savedEmail;$('homeEmail').value=savedEmail;
async function passwordAuth(email,password,signup){
 email=String(email||'').trim();
 if(!email.includes('@')||!email.split('@')[1]?.includes('.')||/\\s/.test(email))throw Error('Enter a valid email address.');
 if(!password||password.length<6)throw Error('Password must be at least 6 characters.');
 localStorage.setItem('workout_supabase_email',email);
 $('syncEmail').value=email;$('homeEmail').value=email;
 const data=await request(signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{method:'POST',body:{email,password,...(signup?{data:{}}:{})}});
 if(data?.access_token&&data?.refresh_token){acceptAuth(data);message('Signed in · backing up automatically');schedule()}
 else if(signup)message('Account created. Check your email for confirmation, then sign in.');
 else throw Error('Sign-in did not return a session.');
}
async function withLoginProgress(signup,email,password){
 if(loginBusy)return;loginBusy=true;update();
 const ids=signup?['syncConfirm','homeConfirm']:['syncLogin','homeSendCode'];
 const labels=ids.map(id=>$(id).textContent);
 ids.forEach(id=>$(id).textContent=signup?'Creating…':'Signing in…');
 message(signup?'Creating account…':'Signing in…');
 try{await passwordAuth(email,password,signup)}
 catch(e){message((signup?'Account creation failed: ':'Sign-in failed: ')+(e?.message||'Network error'),true)}
 finally{ids.forEach((id,i)=>$(id).textContent=labels[i]);loginBusy=false;update()}
}
$('syncLogin').onclick=()=>withLoginProgress(false,$('syncEmail').value,$('syncPassword').value);
$('homeSendCode').onclick=()=>withLoginProgress(false,$('homeEmail').value,$('homePassword').value);
$('syncConfirm').onclick=()=>withLoginProgress(true,$('syncEmail').value,$('syncPassword').value);
$('homeConfirm').onclick=()=>withLoginProgress(true,$('homeEmail').value,$('homePassword').value);
$('syncLogout').onclick=async()=>{
 try{const t=await token();if(t)await request('/auth/v1/logout',{method:'POST',token:t})}catch{}
 persistAuth(null);message('Signed out. Local workouts are still saved.');
};
async function consumeRedirect(){
 const hash=new URLSearchParams(location.hash.slice(1));
 const query=new URLSearchParams(location.search);
 try{
  if(hash.get('error')||query.get('error'))throw Error(hash.get('error_description')||query.get('error_description')||'Sign-in failed');
  if(hash.get('access_token')&&hash.get('refresh_token')){
   const jwt=hash.get('access_token');
   const user=await request('/auth/v1/user',{token:jwt});
   acceptAuth({access_token:jwt,refresh_token:hash.get('refresh_token'),expires_in:Number(hash.get('expires_in')||3600),user});
  }else if(query.get('code')){
   const verifier=sessionStorage.getItem('workout_supabase_pkce_verifier');
   if(!verifier)throw Error('Open the sign-in link in the same browser where you requested it, or use an email OTP flow.');
   const data=await request('/auth/v1/token?grant_type=pkce',{method:'POST',body:{auth_code:query.get('code'),code_verifier:verifier}});
   acceptAuth(data);sessionStorage.removeItem('workout_supabase_pkce_verifier');
  }else return;
  history.replaceState(null,'',location.pathname);
  $('backupDetails').open=false;message('Signed in · backing up automatically');schedule();
 }catch(e){message('Sign-in failed: '+e.message,true)}
}
window.addEventListener('online',schedule);
window.addEventListener('workout-local-saved',()=>{update();if(auth)schedule()});
window.addEventListener('workout-cloud-merged',update);
window.addEventListener('visibilitychange',()=>{if(!document.hidden&&auth)schedule()});
update();
consumeRedirect().then(async()=>{if(auth){try{await token();schedule()}catch{}}else message('Local only · sign in to enable automatic backup')});
})();