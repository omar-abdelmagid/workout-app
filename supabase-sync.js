(() => {
'use strict';
const $=id=>document.getElementById(id);
const STORE='workout_tracker_phase1_v1',KEY_STORE='workout_device_key_v1',PROGRAM_CACHE='workout_programs_cache_v1';
const SYNC_STATE_AT='workout_cloud_state_at_v1',STATE_DIRTY='workout_cloud_state_dirty_v1';
const ENDPOINT='https://yipexqnkvwlvprhzstfr.supabase.co/functions/v1/workout-backup';
let deviceKey=localStorage.getItem(KEY_STORE)||'',busy=false,connecting=false,timer=null,archiveQueue=[],deleteQueue=[];
const DELETE_QUEUE='workout_pending_session_deletions_v1';
try{deleteQueue=JSON.parse(localStorage.getItem(DELETE_QUEUE)||'[]');if(!Array.isArray(deleteQueue))deleteQueue=[]}catch{deleteQueue=[]}
try{archiveQueue=JSON.parse(localStorage.getItem('workout_pending_archives_v1')||'[]')}catch{}
const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}};
const message=(text,error=false)=>{
 $('syncStatus').textContent=text;$('homeLoginStatus').textContent=text;
 $('backupDot').className='backupDot '+(error?'error':text.includes('up to date')?'ok':text.includes('pending')?'warn':'');
};
function update(){
 const sessions=read().sessions||[];
 $('syncCount').textContent=sessions.length?sessions.filter(x=>x.cloudSynced).length+' of '+sessions.length+' completed workouts backed up':'No completed workouts yet';
 $('syncAuth').hidden=!!deviceKey;$('syncAccount').hidden=!deviceKey;
 $('homeLogin').hidden=!!deviceKey;
 $('syncUser').textContent='Private device connected';
 $('homeConnect').disabled=connecting;$('syncConnect').disabled=connecting;
}
async function request(key,method='GET',payload){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(ENDPOINT,{method,headers:{'x-workout-key':key,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),signal:controller.signal});
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
function reconcileRemoteState(remote,local){
 if(!remote)return false;
 const seen=localStorage.getItem(SYNC_STATE_AT)||'';
 const dirty=localStorage.getItem(STATE_DIRTY)==='1';
 if(dirty)return false;
 // On a previously used device, local changes take precedence at first migration.
 const hasLocalHistory=(local.sessions||[]).length>0||!!local.active||local.programId!=='four'||Object.values(local.next||{}).some(n=>n>0);
 if(!seen&&hasLocalHistory)return false;
 if(seen&&remote.updated_at<=seen)return false;
 const next=remote.next_days||{};
 local.next={...next,...(local.active?{[local.active.programId]:local.next?.[local.active.programId]||0}:{})};
 if(!local.active)local.active=remote.active_workout||null;
 if(!local.active||local.active.id===remote.active_workout?.id)local.programId=remote.selected_program_id||local.programId;
 localStorage.setItem(SYNC_STATE_AT,remote.updated_at);
 return true;
}
async function sync(){
 if(busy||!deviceKey||!navigator.onLine)return;
 busy=true;message('Backing up workouts…');
 try{
  const data=await request(deviceKey);
  if(Array.isArray(data.programs)&&data.programs.length){
   const cache=data.programs.filter(p=>p.id&&p.days?.length).map(p=>{const pending=archiveQueue.find(a=>a.id===p.id);return pending?{...p,archived:pending.archived}:p});
   if(cache.length){
    const old=localStorage.getItem(PROGRAM_CACHE),updated=JSON.stringify(cache);
    if(old!==updated){localStorage.setItem(PROGRAM_CACHE,updated);window.dispatchEvent(new Event('workout-programs-updated'))}
   }
  }
  // Server tombstones prevent deleted workouts from reappearing on other devices.
  const deletedIds=new Set([...(data.deletedSessionIds||[]),...deleteQueue]);
  const remote=new Map((data.sessions||[]).filter(r=>!deletedIds.has(r.id)).map(r=>[r.id,r.payload]));
  const local=read(),sessions=Array.isArray(local.sessions)?local.sessions.filter(s=>!deletedIds.has(s.id)):[];
  const deletedLocally=Array.isArray(local.sessions)&&sessions.length!==local.sessions.length;
  const known=new Set(sessions.map(s=>s.id));let recovered=0,changed=deletedLocally;
  for(const [id,item] of remote)if(!known.has(id)&&item?.id===id&&item.endedAt&&Array.isArray(item.exercises)){
   sessions.push({...item,cloudSynced:true});known.add(id);recovered++;changed=true;
  }
  for(const item of sessions)if(remote.has(item.id)&&!item.cloudSynced){item.cloudSynced=true;changed=true}
  if(reconcileRemoteState(data.appState,local))changed=true;
  if(changed){local.sessions=sessions;localStorage.setItem(STORE,JSON.stringify(local));window.dispatchEvent(new Event('workout-cloud-merged'))}
  // Persist deletion requests before any session uploads.
  for(const id of [...deleteQueue]){
   await request(deviceKey,'POST',{sessions:[],deleteSessionId:id});
   deleteQueue=deleteQueue.filter(x=>x!==id);
   localStorage.setItem(DELETE_QUEUE,JSON.stringify(deleteQueue));
  }
  const pending=sessions.filter(x=>x.id&&x.endedAt&&!deletedIds.has(x.id)&&!remote.has(x.id));
  for(let i=0;i<pending.length;i+=100)await request(deviceKey,'POST',{sessions:pending.slice(i,i+100).map(({cloudSynced,...rest})=>rest)});
  // If the user changed the active workout while network requests ran, take the newest local snapshot.
  const latest=read();let marked=false;
  const uploaded=new Set(pending.map(x=>x.id));
  for(const item of latest.sessions||[])if((remote.has(item.id)||uploaded.has(item.id))&&!item.cloudSynced){item.cloudSynced=true;marked=true}
  if(marked){localStorage.setItem(STORE,JSON.stringify(latest));window.dispatchEvent(new Event('workout-cloud-merged'))}
  if(archiveQueue.length){
   for(const archive of archiveQueue){
    await request(deviceKey,'POST',{sessions:[],archive});
    archiveQueue=archiveQueue.filter(a=>a!==archive);
    localStorage.setItem('workout_pending_archives_v1',JSON.stringify(archiveQueue));
   }
   schedule();
  }
  const current=read();
  if(current.programId){
   const snapshot=JSON.stringify({selectedProgramId:current.programId,next:current.next||{},active:current.active||null});
   await request(deviceKey,'POST',{sessions:[],appState:JSON.parse(snapshot)});
   if(JSON.stringify({selectedProgramId:read().programId,next:read().next||{},active:read().active||null})===snapshot){
    localStorage.removeItem(STATE_DIRTY);
   }else schedule();
   localStorage.setItem(SYNC_STATE_AT,new Date().toISOString());
  }
  message('Cloud backup up to date ✓'+(recovered?' · '+recovered+' restored':''));
 }catch(e){message('Backup pending: '+e.message,true)}
 finally{busy=false;update()}
}
function schedule(){if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;sync()},800)}
window.addEventListener('online',schedule);
window.addEventListener('workout-local-saved',()=>{localStorage.setItem(STATE_DIRTY,'1');update();if(deviceKey)schedule()});
window.addEventListener('workout-program-archive',e=>{archiveQueue=archiveQueue.filter(a=>a.id!==e.detail.id);archiveQueue.push(e.detail);localStorage.setItem('workout_pending_archives_v1',JSON.stringify(archiveQueue));if(deviceKey)schedule()});
window.addEventListener('workout-session-delete-pending',()=>{
 try{const q=JSON.parse(localStorage.getItem(DELETE_QUEUE)||'[]');deleteQueue=Array.isArray(q)?q:[]}catch{}
 if(deviceKey)schedule();update();
});
window.addEventListener('workout-cloud-merged',update);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&deviceKey)schedule()});
update();
if(deviceKey)schedule();else message('Local only · connect device once for automatic backup');
})();