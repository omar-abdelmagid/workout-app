(() => {
'use strict';
// Phase 2: completed sessions only. Local data is authoritative until uploaded.
const $=id=>document.getElementById(id);
const STORE='workout_tracker_phase1_v1',CLIENT='phase0_google_client_id',SHEET='phase0_spreadsheet_id',TAB='WorkoutSessions';
let accessToken=null,expiresAt=0,busy=false,client=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state=()=>JSON.parse(localStorage.getItem(STORE)||'{}');
const save=s=>{localStorage.setItem(STORE,JSON.stringify(s));window.dispatchEvent(new Event('workout-cloud-merged'));};
const status=(message,error=false)=>{$('syncStatus').textContent=message;$('syncStatus').style.color=error?'#aa2a2a':'#555';};
const sheetUrl=id=>'https://docs.google.com/spreadsheets/d/'+encodeURIComponent(id)+'/edit';
function update(){
 const s=state(),total=(s.sessions||[]).length,uploaded=(s.sessions||[]).filter(x=>x.cloudSynced).length;
 $('syncCount').textContent=total?uploaded+' of '+total+' completed workouts synced':'No completed workouts yet';
 $('syncNow').disabled=busy||!accessToken||Date.now()>expiresAt;
 $('syncConnect').disabled=busy;
 $('syncSheetLink').hidden=!localStorage.getItem(SHEET);
 if(localStorage.getItem(SHEET))$('syncSheetLink').href=sheetUrl(localStorage.getItem(SHEET));
}
async function api(path,opts={}){
 if(!accessToken||Date.now()>expiresAt)throw Error('Google authorization expired. Tap Connect Google again.');
 const res=await fetch('https://sheets.googleapis.com/v4/spreadsheets'+path,{...opts,headers:{Authorization:'Bearer '+accessToken,...(opts.body?{'Content-Type':'application/json'}:{}),...opts.headers}});
 const raw=await res.text();let data;try{data=JSON.parse(raw);}catch{data={};}
 if(!res.ok){if(res.status===401){accessToken=null;expiresAt=0;}throw Error(data.error?.message||'Google Sheets HTTP '+res.status);}
 return data;
}
const sheetPath=id=>'/'+encodeURIComponent(id);
const range=()=>encodeURIComponent("'"+TAB+"'!A:H");
async function ensureSheet(){
 let id=$('syncSheetId').value.trim()||localStorage.getItem(SHEET)||'';
 if(!id){
  const created=await api('',{method:'POST',body:JSON.stringify({properties:{title:'Workout Tracker History'},sheets:[{properties:{title:TAB}}]})});
  id=created.spreadsheetId;
 }
 const meta=await api(sheetPath(id)+'?fields=sheets.properties.title');
 if(!(meta.sheets||[]).some(x=>x.properties?.title===TAB)){
  await api(sheetPath(id)+':batchUpdate',{method:'POST',body:JSON.stringify({requests:[{addSheet:{properties:{title:TAB}}}]})});
 }
 localStorage.setItem(SHEET,id);$('syncSheetId').value=id;
 return id;
}
function parseRows(values){
 const result=new Map();
 for(const row of values||[]){
  if(row[0]==='session_id'||!row[0]||!row[7])continue;
  try{
   const s=JSON.parse(row[7]);
   if(s&&s.id===row[0]&&Array.isArray(s.exercises)&&s.endedAt)result.set(s.id,s);
  }catch{}
 }
 return result;
}
async function sync(){
 if(busy||!accessToken)return;
 busy=true;update();status('Syncing with Google Sheets…');
 try{
  if(!navigator.onLine)throw Error('You are offline. Workouts remain saved locally.');
  const id=await ensureSheet();
  const data=await api(sheetPath(id)+'/values/'+range());
  const remote=parseRows(data.values);
  let s=state(),sessions=s.sessions||[];
  // Never overwrite a local workout with an older cloud copy.
  const known=new Set(sessions.map(x=>x.id));
  let downloaded=0;
  for(const item of remote.values()){
   if(!known.has(item.id)){sessions.push({...item,cloudSynced:true});known.add(item.id);downloaded++;}
  }
  // Save remote copies first so a network interruption cannot lose the download.
  s.sessions=sessions;save(s);
  const pending=sessions.filter(x=>x.endedAt&&!remote.has(x.id));
  if(pending.length){
   const rows=pending.map(x=>[x.id,x.startedAt,x.endedAt,x.programId||'',x.dayName||'',String(x.exercises.filter(e=>e.done).length),String(x.exercises.length),JSON.stringify({...x,cloudSynced:undefined})]);
   await api(sheetPath(id)+'/values/'+range()+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{method:'POST',body:JSON.stringify({values:rows})});
  }
  // Verify IDs after the append; a timeout can mean the append succeeded.
  const verify=await api(sheetPath(id)+'/values/'+range());
  const verified=parseRows(verify.values);
  s=state();
  for(const x of s.sessions||[])if(verified.has(x.id))x.cloudSynced=true;
  // Recalculate rotation from latest completed session per program only if no local session exists for that program.
  for(const p of ['four','five']){
   const all=(s.sessions||[]).filter(x=>x.programId===p&&Number.isInteger(x.dayIndex)&&x.endedAt).sort((a,b)=>Date.parse(a.endedAt)-Date.parse(b.endedAt));
   if(all.length){const last=all[all.length-1],count=p==='four'?4:5;s.next[p]=(last.dayIndex+1)%count;}
  }
  save(s);
  const remaining=(s.sessions||[]).filter(x=>!x.cloudSynced).length;
  status(remaining?remaining+' workouts pending. Tap Sync now to retry.':'Synced ✓ '+pending.length+' uploaded, '+downloaded+' downloaded.');
 }catch(e){status('Sync not completed: '+e.message,true);}
 finally{busy=false;update();}
}
$('syncClientId').value=localStorage.getItem(CLIENT)||'';
$('syncSheetId').value=localStorage.getItem(SHEET)||'';
$('syncConnect').onclick=()=>{
 const id=$('syncClientId').value.trim();
 if(!id.endsWith('.apps.googleusercontent.com'))return status('Enter your Google OAuth Web Client ID.',true);
 if(!window.google?.accounts?.oauth2)return status('Google sign-in is unavailable. Connect to the internet and reopen the app.',true);
 localStorage.setItem(CLIENT,id);
 const supplied=$('syncSheetId').value.trim();if(supplied)localStorage.setItem(SHEET,supplied);
 try{
  client=google.accounts.oauth2.initTokenClient({
   client_id:id,scope:'https://www.googleapis.com/auth/spreadsheets',
   callback:r=>{
    if(r.error||!r.access_token)return status('Google authorization failed: '+(r.error||'no access token'),true);
    accessToken=r.access_token;expiresAt=Date.now()+Math.max(60,Number(r.expires_in||3500)-60)*1000;
    status('Connected to Google. Synchronizing…');update();sync();
   },
   error_callback:e=>status('Google sign-in window: '+(e.type||'closed')+'. Tap Connect Google to retry.',true)
  });
  client.requestAccessToken({prompt:''});
  status('Waiting for Google authorization…');
 }catch(e){status('Sign-in failed: '+e.message,true);}
};
$('syncNow').onclick=sync;
window.addEventListener('online',()=>{if(accessToken&&Date.now()<expiresAt)sync();else{status('Online. Connect Google to sync pending workouts.');update();}});
window.addEventListener('workout-local-saved',()=>{update();if(accessToken&&Date.now()<expiresAt&&navigator.onLine)sync();});
window.addEventListener('workout-cloud-merged',update);
update();
if(localStorage.getItem(CLIENT))status('Connect Google to sync. Your completed workouts remain on this device until synced.');
else status('Connect Google to back up and restore completed workouts.');
})();