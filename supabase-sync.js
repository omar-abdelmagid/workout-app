(() => {
'use strict';
const $=id=>document.getElementById(id);
const STORE='workout_tracker_phase1_v1',KEY_STORE='workout_device_key_v1';
const ENDPOINT='https://yipexqnkvwlvprhzstfr.supabase.co/functions/v1/workout-backup';
let deviceKey=localStorage.getItem(KEY_STORE)||'',busy=false,connecting=false,timer=null;
const state=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}};
const message=(text,error=false)=>{
 $('syncStatus').textContent=text;$('homeLoginStatus').textContent=text;
 $('backupDot').className='backupDot '+(error?'error':text.includes('up to date')?'ok':text.includes('pending')?'warn':'');
};
function update(){
 const sessions=state().sessions||[];
 $('syncCount').textContent=sessions.length?sessions.filter(x=>x.cloudSynced).length+' of '+sessions.length+' completed workouts backed up':'No completed workouts yet';
 $('syncAuth').hidden=!!deviceKey;$('syncAccount').hidden=!deviceKey;
 $('homeLogin').hidden=!!deviceKey;
 $('syncUser').textContent='Private device connected';
 $('homeConnect').disabled=connecting;$('syncConnect').disabled=connecting;
}
async function request(key,method='GET',sessions){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(ENDPOINT,{method,headers:{'x-workout-key':key,...(sessions?{'Content-Type':'application/json'}:{})},...(sessions?{body:JSON.stringify({sessions})}:{}),signal:controller.signal});
  let data={};try{data=await response.json()}catch{}
  if(!response.ok)throw Error(data.error||'Backup request failed ('+response.status+')');
  return data;
 }finally{clearTimeout(timeout)}
}
async function connect(input){
 if(connecting)return;
 const key=input.trim();if(!/^wk_[A-Za-z0-9_-]{40,64}$/.test(key)){message('Paste the full private device key.',true);return}
 connecting=true;update();
 const buttons=[$('homeConnect'),$('syncConnect')],labels=buttons.map(b=>b.textContent);
 buttons.forEach(b=>b.textContent='Connecting…');message('Checking device key…');
 try{
  await request(key);
  deviceKey=key;localStorage.setItem(KEY_STORE,key);
  $('homeDeviceKey').value='';$('syncDeviceKey').value='';
  $('backupDetails').open=false;message('Device connected · backing up…');schedule();
 }catch(e){message('Connection failed: '+e.message,true)}
 finally{connecting=false;buttons.forEach((b,i)=>b.textContent=labels[i]);update()}
}
$('homeConnect').onclick=()=>connect($('homeDeviceKey').value);
$('syncConnect').onclick=()=>connect($('syncDeviceKey').value);
$('syncLogout').onclick=()=>{
 localStorage.removeItem(KEY_STORE);deviceKey='';message('Device disconnected. Workouts remain saved locally.');update();
};
async function sync(){
 if(busy||!deviceKey||!navigator.onLine)return;
 busy=true;message('Backing up workouts…');
 try{
  const data=await request(deviceKey);
  const remote=new Map((data.sessions||[]).map(r=>[r.id,r.payload]));
  // Re-read local state after network activity so in-progress changes aren't overwritten.
  const local=state(),sessions=Array.isArray(local.sessions)?local.sessions:[];
  const known=new Set(sessions.map(s=>s.id));let recovered=0,changed=false;
  for(const [id,item] of remote)if(!known.has(id)&&item?.id===id&&item.endedAt&&Array.isArray(item.exercises)){
   sessions.push({...item,cloudSynced:true});known.add(id);recovered++;changed=true;
  }
  for(const item of sessions)if(remote.has(item.id)&&!item.cloudSynced){item.cloudSynced=true;changed=true}
  if(changed){local.sessions=sessions;localStorage.setItem(STORE,JSON.stringify(local));window.dispatchEvent(new Event('workout-cloud-merged'))}
  const pending=sessions.filter(x=>x.id&&x.endedAt&&!remote.has(x.id));
  for(let i=0;i<pending.length;i+=100)await request(deviceKey,'POST',pending.slice(i,i+100).map(({cloudSynced,...rest})=>rest));
  const latest=state();let marked=false;
  const uploaded=new Set(pending.map(x=>x.id));
  for(const item of latest.sessions||[])if((remote.has(item.id)||uploaded.has(item.id))&&!item.cloudSynced){item.cloudSynced=true;marked=true}
  if(marked){localStorage.setItem(STORE,JSON.stringify(latest));window.dispatchEvent(new Event('workout-cloud-merged'))}
  message('Cloud backup up to date ✓'+(recovered?' · '+recovered+' restored':''));
 }catch(e){message('Backup pending: '+e.message,true)}
 finally{busy=false;update()}
}
function schedule(){if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;sync()},800)}
window.addEventListener('online',schedule);
window.addEventListener('workout-local-saved',()=>{update();if(deviceKey)schedule()});
window.addEventListener('workout-cloud-merged',update);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&deviceKey)schedule()});
update();
if(deviceKey)schedule();else message('Local only · connect device once for automatic backup');
})();