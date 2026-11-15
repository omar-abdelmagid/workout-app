(() => {
'use strict';
const DEFAULT_PROGRAMS=[{"id":"four","name":"4-Day Hypertrophy","days":[{"name":"Lower A","warmup":"Bike 3 min · knee-to-chest · 90/90 hip switches · glute bridges · dead bug · light leg press","ex":[["Leg Press",3,"8–12","Hack squat machine"],["Single-Leg Leg Press",2,"10–12/leg","Supported step-up"],["Seated Leg Curl",3,"10–15","Lying leg curl"],["Leg Extension",2,"12–15","Terminal knee extension"],["Standing Calf Raise",3,"12–15","Seated calf raise"],["Dead Bug",2,"8/side","Heel taps"]]},{"name":"Upper A","warmup":"Bike 3 min · arm circles · band pull-aparts · light row and press","ex":[["Dumbbell Bench Press",3,"8–10","Machine chest press"],["Seated Cable Row",3,"8–12","Chest-supported row"],["Incline Machine Chest Press",2,"10–12","Incline dumbbell press"],["Neutral-Grip Lat Pulldown",3,"10–12","Assisted neutral-grip pull-up"],["Cable Lateral Raise",2,"12–15","Dumbbell lateral raise"],["Cable Biceps Curl",2,"10–12","Dumbbell curl"],["Triceps Pressdown",3,"10–15","Rope pressdown"]]},{"name":"Lower B","warmup":"Bike 3 min · knee-to-chest · 90/90 hip switches · bridges · dead bug · light hip thrust","ex":[["Hip Thrust Machine",3,"8–12","Glute bridge"],["Low Step-Up",3,"8–10/leg","Single-leg leg press"],["Seated Leg Curl",3,"10–15","Lying leg curl"],["Seated Hip Abduction",2,"12–15","Cable hip abduction"],["Seated Calf Raise",3,"12–15","Standing calf raise"],["Suitcase Carry",2,"20–30 sec/side","Pallof hold"]]},{"name":"Upper B","warmup":"Bike 3 min · arm circles · pull-aparts · external rotations · light pulldown","ex":[["Neutral-Grip Lat Pulldown",3,"8–12","Assisted pull-up"],["Machine Chest Press",3,"8–12","Dumbbell bench press"],["Seated Cable Row",3,"10–12","Chest-supported row"],["Reverse Pec Deck",2,"12–15","Face pull"],["Dumbbell Biceps Curl",3,"10–12","Cable curl"],["Cable Triceps Extension",3,"10–15","Triceps pressdown"],["Pallof Press",2,"10–12/side","Dead bug"]]}]},{"id":"five","name":"5-Day Split","days":[{"name":"Chest & Biceps","warmup":"Bike 3 min · shoulder circles · band pull-aparts · light chest press","ex":[["Dumbbell Bench Press",3,"8–10","Machine chest press"],["Incline Machine Press",3,"10–12","Incline dumbbell press"],["Cable Fly",2,"12–15","Pec deck"],["Cable Biceps Curl",3,"10–12","Dumbbell curl"],["Hammer Curl",3,"10–12","Rope hammer curl"]]},{"name":"Legs","warmup":"Bike 5 min · 90/90 hip switches · glute bridges · light leg press","ex":[["Leg Press",3,"8–12","Hack squat machine"],["Single-Leg Leg Press",2,"10/leg","Low step-up"],["Seated Leg Curl",3,"10–15","Lying leg curl"],["Hip Thrust",3,"10","Glute bridge"],["Calf Raise",3,"12–15","Seated calf raise"]]},{"name":"Back & Triceps","warmup":"Bike 3 min · band pull-aparts · light pulldown and row","ex":[["Neutral-Grip Lat Pulldown",3,"8–12","Assisted pull-up"],["Seated Cable Row",3,"10–12","Chest-supported row"],["Chest-Supported Row",2,"10–12","Machine row"],["Triceps Pressdown",3,"10–15","Rope pressdown"],["Cable Triceps Extension",3,"10–12","Overhead rope extension"]]},{"name":"Shoulders","warmup":"Bike 3 min · wall slides · band external rotation · light lateral raises","ex":[["Supported Machine Shoulder Press",2,"8–10","Cable scaption"],["Cable Lateral Raise",3,"12–15","Dumbbell lateral raise"],["Reverse Pec Deck",3,"12–15","Face pull"],["Face Pull",2,"12–15","Reverse cable fly"],["Cable Scaption",2,"12","Light dumbbell scaption"]]},{"name":"Mobility & Abs","warmup":"Easy bike 5 min · gentle pain-free movement","ex":[["Supported 90/90 Hip Switches",2,"60 sec","Seated hip rotations"],["Hip Flexor Stretch",2,"45 sec/side","Half-kneeling hip flexor stretch"],["Knee-to-Chest",2,"45 sec/side","Supine knee hug"],["Hamstring Mobility",2,"45 sec/side","Supine hamstring stretch"],["Thoracic Rotation",2,"8/side","Open book"],["Wall Slides",2,"10","Band external rotation"],["Dead Bug",2,"8/side","Heel taps"],["Bird Dog",2,"8/side","Heel taps"]]}]}];
const PROGRAM_CACHE='workout_programs_cache_v1';
let PROGRAMS=DEFAULT_PROGRAMS;
try{const cached=JSON.parse(localStorage.getItem(PROGRAM_CACHE)||'null');if(Array.isArray(cached)&&cached.some(p=>p.days?.length))PROGRAMS=cached}catch{}
const KEY='workout_tracker_phase1_v1';
// Free Exercise DB exercise-photo filenames; the fallback remains visible if an image is missing.
const PHOTO={
'Leg Press':'Leg_Press','Single-Leg Leg Press':'Single-Leg_Press','Seated Leg Curl':'Seated_Leg_Curl','Leg Extension':'Leg_Extensions','Standing Calf Raise':'Standing_Calf_Raises','Seated Calf Raise':'Seated_Calf_Raise',
'Dumbbell Bench Press':'Dumbbell_Bench_Press','Seated Cable Row':'Seated_Cable_Rows','Incline Machine Chest Press':'Leverage_Incline_Chest_Press','Neutral-Grip Lat Pulldown':'Close-Grip_Front_Lat_Pulldown','Cable Lateral Raise':'Cable_Seated_Lateral_Raise','Cable Biceps Curl':'Cable_Hammer_Curls_-_Rope_Attachment','Triceps Pressdown':'Triceps_Pushdown',
'Hip Thrust Machine':'Barbell_Hip_Thrust','Hip Thrust':'Barbell_Hip_Thrust','Low Step-Up':'Dumbbell_Step_Ups','Seated Hip Abduction':'Thigh_Abductor','Suitcase Carry':'Farmers_Walk',
'Machine Chest Press':'Leverage_Chest_Press','Reverse Pec Deck':'Reverse_Machine_Flyes','Dumbbell Biceps Curl':'Dumbbell_Bicep_Curl','Cable Triceps Extension':'Cable_Rope_Overhead_Triceps_Extension','Pallof Press':'Pallof_Press',
'Incline Machine Press':'Leverage_Incline_Chest_Press','Cable Fly':'Cable_Crossover','Hammer Curl':'Hammer_Curls','Calf Raise':'Standing_Calf_Raises','Chest-Supported Row':'Chest-Supported_Dumbbell_Row','Supported Machine Shoulder Press':'Machine_Shoulder_(Military)_Press','Face Pull':'Face_Pull','Cable Scaption':'Front_Cable_Raise',
'Dead Bug':'Dead_Bug','Bird Dog':'Bird_Dog','Wall Slides':'Wall_Slide','Hip Flexor Stretch':'Kneeling_Hip_Flexor','Knee-to-Chest':'Knee_Across_The_Body','Hamstring Mobility':'Standing_Hamstring_and_Calf_Stretch','Thoracic Rotation':'Side_Lying_Floor_Stretch','Supported 90/90 Hip Switches':'90_90_Hamstring'
};

// Verified exercise-library image IDs for the workout substitutions.
const ALTERNATIVE_PHOTO={
 "Hack squat machine": "Hack_Squat",
 "Supported step-up": "Dumbbell_Step_Ups",
 "Lying leg curl": "Lying_Leg_Curls",
 "Terminal knee extension": "Leg_Extensions",
 "Seated calf raise": "Seated_Calf_Raise",
 "Heel taps": "Alternate_Heel_Touchers",
 "Machine chest press": "Leverage_Chest_Press",
 "Chest-supported row": "Dumbbell_Incline_Row",
 "Incline dumbbell press": "Incline_Dumbbell_Press",
 "Assisted neutral-grip pull-up": "Band_Assisted_Pull-Up",
 "Dumbbell lateral raise": "Side_Lateral_Raise",
 "Dumbbell curl": "Dumbbell_Bicep_Curl",
 "Rope pressdown": "Triceps_Pushdown_-_Rope_Attachment",
 "Glute bridge": "Butt_Lift_Bridge",
 "Cable hip abduction": "Thigh_Abductor",
 "Standing calf raise": "Standing_Calf_Raises",
 "Pallof hold": "Pallof_Press",
 "Assisted pull-up": "Band_Assisted_Pull-Up",
 "Dumbbell bench press": "Dumbbell_Bench_Press",
 "Face pull": "Face_Pull",
 "Cable curl": "High_Cable_Curls",
 "Triceps pressdown": "Triceps_Pushdown",
 "Dead bug": "Dead_Bug",
 "Pec deck": "Butterfly",
 "Rope hammer curl": "Cable_Hammer_Curls_-_Rope_Attachment",
 "Low step-up": "Dumbbell_Step_Ups",
 "Machine row": "Leverage_Iso_Row",
 "Overhead rope extension": "Cable_Rope_Overhead_Triceps_Extension",
 "Cable scaption": "Dumbbell_Scaption",
 "Reverse cable fly": "Cable_Rear_Delt_Fly",
 "Light dumbbell scaption": "Dumbbell_Scaption",
 "Seated hip rotations": "Ankle_On_The_Knee",
 "Half-kneeling hip flexor stretch": "Kneeling_Hip_Flexor",
 "Supine knee hug": "One_Knee_To_Chest",
 "Supine hamstring stretch": "90_90_Hamstring",
 "Band external rotation": "External_Rotation_with_Band",
 "Cable lateral raise": "Cable_Seated_Lateral_Raise",
 "Cable biceps curl": "High_Cable_Curls",
 "Cable triceps extension": "Cable_Rope_Overhead_Triceps_Extension"
};
// Verified image IDs from yuhonas/free-exercise-db (exercises/*/0.jpg).
// Warm-up names retain their original program labels while using the nearest matching movement photo.
const WARMUP_PHOTO={
 'bike 3 min':'Bicycling_Stationary','bike 5 min':'Bicycling_Stationary','easy bike 5 min':'Bicycling_Stationary',
 'bike':'Bicycling_Stationary','stationary bike':'Bicycling_Stationary',
 'knee-to-chest':'One_Knee_To_Chest',
 '90/90 hip switches':'90_90_Hamstring',
 'glute bridges':'Butt_Lift_Bridge','bridges':'Butt_Lift_Bridge',
 'dead bug':'Dead_Bug',
 'light leg press':'Leg_Press',
 'arm circles':'Arm_Circles','shoulder circles':'Shoulder_Circles',
 'band pull-aparts':'Band_Pull_Apart','pull-aparts':'Band_Pull_Apart',
 'light row and press':'Seated_Cable_Rows','light chest press':'Leverage_Chest_Press',
 'light hip thrust':'Barbell_Hip_Thrust',
 'external rotations':'External_Rotation_with_Band','band external rotation':'External_Rotation_with_Band',
 'light pulldown':'Close-Grip_Front_Lat_Pulldown','light lateral raises':'Side_Lateral_Raise',
 'wall slides':'Shoulder_Stretch',
 'gentle pain-free movement':'Dynamic_Back_Stretch'
};
const warmupImageId=name=>{
 const key=String(name||'').trim().toLowerCase().replace(/\s+/g,' ');
 if(WARMUP_PHOTO[key])return WARMUP_PHOTO[key];
 const normalized=key.replace(/^(?:easy|light)\s+/,'').replace(/\s+\d+\s*(?:min|minutes)$/,'');
 return WARMUP_PHOTO[normalized]||'';
};
const photoUrl=name=>{
 const id=PHOTO[name]||ALTERNATIVE_PHOTO[name]||warmupImageId(name);
 return id?'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'+encodeURIComponent(id)+'/0.jpg':'';
};
const imageHtml=name=>{
 const src=photoUrl(name);
 return '<button type="button" class="exerciseImage" data-image-name="'+esc(name)+'" aria-label="Expand '+esc(name)+' image">'+(src?'<img loading="lazy" src="'+src+'" alt="'+esc(name)+' exercise" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="imageFallback" hidden>Image unavailable</span>':'<span class="imageFallback">Image unavailable</span>')+'</button>';
};

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>new Date().toISOString();
const date=s=>new Date(s).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
const initial=()=>({programId:'four',next:{four:0,five:0},sessions:[],active:null});
let state;
try { state=JSON.parse(localStorage.getItem(KEY))||initial(); if(!state.next||!Array.isArray(state.sessions)) throw Error('bad data'); } catch(e) {state=initial(); alert('Saved workout data could not be read. The app will start with a new local history.');}
// IndexedDB mirrors the local state for a second on-device recovery path.
const dbPromise=typeof indexedDB==='undefined'?Promise.resolve(null):new Promise(resolve=>{
 try{const req=indexedDB.open('WorkoutTrackerOffline',1);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('snapshots'))req.result.createObjectStore('snapshots');};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null);
 }catch{resolve(null);}
});
function mirrorSnapshot(snapshot){dbPromise.then(db=>{if(!db)return;try{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(snapshot,'workouts');}catch{}});}
function save(){try{const snapshot=JSON.stringify(state);localStorage.setItem(KEY,snapshot);mirrorSnapshot(snapshot);window.dispatchEvent(new Event('workout-local-saved'));}catch(e){alert('Could not save workout locally. Check device storage before continuing.');throw e;}}
if(!localStorage.getItem(KEY))dbPromise.then(db=>{if(!db||localStorage.getItem(KEY))return;try{const tx=db.transaction('snapshots','readonly');const req=tx.objectStore('snapshots').get('workouts');req.onsuccess=()=>{if(localStorage.getItem(KEY)||!req.result)return;try{const recovered=JSON.parse(req.result);if(!Array.isArray(recovered.sessions)||!recovered.next)return;state=recovered;localStorage.setItem(KEY,req.result);render();showSection(state.active?'active':'home');}catch{}};}catch{}});
const program=()=>PROGRAMS.find(p=>p.id===state.programId)||PROGRAMS.find(p=>!p.archived)||PROGRAMS[0];
const day=()=>program().days[(state.next[program().id]||0)%program().days.length];
const allDone=s=>s.exercises.every(e=>e.done);
function warmupExercises(d){
 if(Array.isArray(d.warmupEx))return d.warmupEx;
 return String(d.warmup||'').split(/\s*[·•\n]\s*/).map(x=>x.trim()).filter(Boolean).map(name=>[name,1,'Complete once','']);
}
function exerciseSeed(e,i,group='main'){return {id:i,name:e[0],sets:e[1],reps:e[2],alternative:e[3]||'',group,done:false,weight:'',substituted:false};}
function render(){

$('programName').textContent=program().name;
$('homeProgram').textContent=program().name;
// Navigation visibility is owned by showSection, not by data rendering.
$('navHistory').textContent='History ('+state.sessions.length+')';
if(state.active) renderActive(); else renderUpcoming();
renderHistory();
if(window.renderWorkoutProgress)window.renderWorkoutProgress(state.sessions);
}
function renderUpcoming(){
const p=program(),i=(state.next[p.id]||0)%p.days.length,d=p.days[i];
$('nextTitle').textContent=d.name;
$('homeNext').textContent='Next: '+d.name;
$('homeFocus').textContent=({ 'Lower A':'Quads · Hamstrings · Calves · Core','Lower B':'Glutes · Hamstrings · Calves · Core','Upper A':'Chest · Back · Arms','Upper B':'Back · Chest · Arms','Legs':'Quads · Hamstrings · Glutes','Chest & Biceps':'Chest · Biceps','Back & Triceps':'Back · Triceps','Shoulders':'Shoulders · Rear delts','Mobility & Abs':'Mobility · Core' })[d.name]||'Strength training';
$('nextMeta').textContent=p.name+' · Day '+(i+1)+' of '+p.days.length+' · '+warmupExercises(d).length+' warm-up activities · '+d.ex.length+' exercises';
}
function renderActive(){
const s=state.active,completed=s.exercises.filter(e=>e.done).length;
$('activeTitle').textContent=s.dayName;
$('activeMeta').textContent=s.programName+' · Started '+date(s.startedAt);
$('progress').textContent=completed+' of '+s.exercises.length+' completed';
$('bar').style.width=(100*completed/s.exercises.length)+'%';
$('stickyBar').style.width=(100*completed/s.exercises.length)+'%';
$('stickyText').textContent=s.dayName+' · '+completed+'/'+s.exercises.length;
$('stickyProgram').textContent=s.programName;
const exercises=s.exercises||[];
const renderOne=(e,i)=>{
 const warm=e.group==='warmup';
 return `<article class="exercise ${e.done?'done':''} ${warm?'warmupExercise':''}" data-exercise="${i}">
<div class="exerciseTop">${imageHtml(e.name)}<label class="check"><input type="checkbox" data-index="${i}" data-action="done" ${e.done?'checked':''}><span><strong>${esc(e.name)}</strong><small>${warm?'Warm-up · mark complete':e.sets+' sets × '+esc(e.reps)}</small></span></label></div>
${warm?'':`<div class="fields"><button type="button" class="subtle" data-index="${i}" data-action="weightToggle">${e.weight!==''?'⚖ '+esc(e.weight)+' lb · Edit':'＋ Max weight'}</button>
<button type="button" class="subtle" data-index="${i}" data-action="swap">${e.substituted?'Use original':'Use alternative'}</button></div>
<div class="weightPanel" data-weight-panel="${i}" hidden><label>Max weight (lb, optional)<input type="number" min="0" step="0.5" inputmode="decimal" placeholder="—" data-index="${i}" data-action="weight" value="${esc(e.weight)}"></label></div>
<small class="muted">Alternative: ${esc(e.substituted?e.originalName||'Original exercise':e.alternative)}</small>`}
</article>`;
};
const warmList=exercises.map((e,i)=>({e,i})).filter(x=>x.e.group==='warmup');
const mainList=exercises.map((e,i)=>({e,i})).filter(x=>x.e.group!=='warmup');
const legacyWarmups=!warmList.length&&s.warmup?String(s.warmup).split(/\s*[·•\n]\s*/).map(x=>x.trim()).filter(Boolean):[];
const warmHtml=warmList.map(({e,i})=>renderOne(e,i)).join('')+(legacyWarmups.length?'<ul class="legacyWarmupList">'+legacyWarmups.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'');
$('exercises').innerHTML=(warmHtml?'<section class="workoutExerciseGroup"><h3 class="exerciseGroupTitle">Warm-up</h3>'+warmHtml+'</section>':'')+
'<section class="workoutExerciseGroup"><h3 class="exerciseGroupTitle">Workout</h3>'+mainList.map(({e,i})=>renderOne(e,i)).join('')+'</section>';
$('finish').disabled=false;
}
function renderHistory(){
const rows=state.sessions.slice().reverse();
$('historyList').innerHTML=rows.length?rows.map(s=>{
const done=s.exercises.filter(e=>e.done).length;
return `<article class="historyItem"><div><strong>${esc(s.dayName)}</strong><small>${esc(s.programName)} · ${date(s.startedAt)}</small><small>${done}/${s.exercises.length} exercises · ${Math.max(1,Math.round((new Date(s.endedAt)-new Date(s.startedAt))/60000))} min</small></div><button class="subtle" data-history="${esc(s.id)}">Details</button></article>`;
}).join(''):'<p class="muted">No completed workouts yet.</p>';
}
$('start').onclick=()=>{
const p=program(),idx=(state.next[p.id]||0)%p.days.length,d=p.days[idx];
state.active={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),programId:p.id,programVersion:p.version||1,programName:p.name,dayIndex:idx,dayName:d.name,warmup:d.warmup,startedAt:now(),exercises:[...warmupExercises(d).map((e,i)=>exerciseSeed(e,i,'warmup')),...d.ex.map((e,i)=>exerciseSeed(e,i+warmupExercises(d).length,'main'))]};
save();render();showSection('active');
};
$('exercises').onchange=e=>{
const el=e.target,i=Number(el.dataset.index),s=state.active;if(!s||!Number.isInteger(i)||!s.exercises[i])return;
if(el.dataset.action==='done')s.exercises[i].done=el.checked;
if(el.dataset.action==='weight'){const value=el.value.trim();if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<0)){alert('Enter a valid nonnegative weight.');return;}s.exercises[i].weight=value;}
save();
if(el.dataset.action==='done'){
 const card=el.closest('.exercise');card.classList.toggle('done',el.checked);
 updateProgress();
}
}; 
function updateProgress(){
 const s=state.active;if(!s)return;
 const completed=s.exercises.filter(e=>e.done).length;
 $('progress').textContent=completed+' of '+s.exercises.length+' completed';
 $('bar').style.width=(100*completed/s.exercises.length)+'%';
 $('stickyBar').style.width=(100*completed/s.exercises.length)+'%';
 $('stickyText').textContent=s.dayName+' · '+completed+'/'+s.exercises.length;
}
$('exercises').oninput=e=>{
const el=e.target;if(el.dataset.action!=='weight'||!state.active)return;
const ex=state.active.exercises[Number(el.dataset.index)];if(!ex)return;
if(el.value===''||(Number.isFinite(Number(el.value))&&Number(el.value)>=0)){ex.weight=el.value;save();}
};
$('exercises').onclick=e=>{
const b=e.target.closest('button[data-action]');if(!b||!state.active)return;
if(b.dataset.action==='weightToggle'){const panel=$('exercises').querySelector('[data-weight-panel="'+b.dataset.index+'"]');panel.hidden=!panel.hidden;if(!panel.hidden)panel.querySelector('input').focus();return;}
if(b.dataset.action!=='swap')return;
const ex=state.active.exercises[Number(b.dataset.index)];
if(!ex.substituted){ex.originalName=ex.name;ex.name=ex.alternative;ex.substituted=true;}
else{ex.name=ex.originalName;ex.substituted=false;}
save();
const card=b.closest('.exercise');
const picture=card.querySelector('.exerciseImage');
const pictureImg=picture.querySelector('img');
const newSrc=photoUrl(ex.name);
picture.dataset.imageName=ex.name;
picture.setAttribute('aria-label','Expand '+ex.name+' image');
if(pictureImg){
 if(newSrc){if(pictureImg.getAttribute('src')!==newSrc)pictureImg.src=newSrc;pictureImg.alt=ex.name+' exercise';pictureImg.hidden=false;const fallback=picture.querySelector('.imageFallback');if(fallback)fallback.hidden=true;}
 else{pictureImg.hidden=true;const fallback=picture.querySelector('.imageFallback');if(fallback){fallback.hidden=false;fallback.textContent='Image unavailable';}}
}else if(newSrc){picture.innerHTML='<img loading="lazy" src="'+newSrc+'" alt="'+esc(ex.name)+' exercise" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="imageFallback" hidden>Image unavailable</span>';}
card.querySelector('.check strong').textContent=ex.name;
card.querySelector('[data-action="swap"]').textContent=ex.substituted?'Use original':'Use alternative';
card.querySelector('small.muted').textContent='Alternative: '+(ex.substituted?(ex.originalName||'Original exercise'):ex.alternative);
};
$('finish').onclick=()=>{
const s=state.active;if(!s)return;
const done=s.exercises.filter(e=>e.done).length;
if(done===0&&!confirm('No exercises are checked. Finish this workout anyway?'))return;
if(done<s.exercises.length&&!confirm('Only '+done+' of '+s.exercises.length+' exercises are checked. Finish anyway?'))return;
s.endedAt=now();state.sessions.push(s);state.next[s.programId]=(s.dayIndex+1)%(PROGRAMS.find(p=>p.id===s.programId)?.days.length||s.dayIndex+1);state.active=null;
save();render();showSection('historySection');
};
$('discard').onclick=()=>{if(!state.active||!confirm('Discard this in-progress workout? This cannot be undone.'))return;state.active=null;save();render();showSection('home');};
$('historyList').onclick=e=>{
const b=e.target.closest('[data-history]');if(!b)return;
const s=state.sessions.find(x=>x.id===b.dataset.history);if(!s)return;
$('detailsTitle').textContent=s.dayName+' · '+date(s.startedAt);
$('detailsBody').innerHTML='<p class="muted">Started: '+date(s.startedAt)+'<br>Finished: '+date(s.endedAt)+'</p>'+s.exercises.map(x=>'<p>'+ (x.done?'✓ ':'○ ')+esc(x.name)+' · '+x.sets+' × '+esc(x.reps)+(x.weight!==''?' · '+esc(x.weight)+' lb':'')+'</p>').join('');
$('details').showModal();
};
$('closeDetails').onclick=()=>$('details').close();
$('export').onclick=()=>{
const blob=new Blob([JSON.stringify({exportedAt:now(),version:1,...state},null,2)],{type:'application/json'});
const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='workout-history-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.addEventListener('workout-cloud-merged',()=>{try{const incoming=JSON.parse(localStorage.getItem(KEY));if(incoming&&Array.isArray(incoming.sessions)){state=incoming;if(state.active){renderHistory();if(window.renderWorkoutProgress)window.renderWorkoutProgress(state.sessions);}else{render();}renderProgramGrid();}}catch{}});
$('navHistory').onclick=()=>showSection('historySection');
$('homeHistory').onclick=()=>showSection('historySection');
$('homePrograms').onclick=()=>{renderProgramGrid();showSection('programSection');};
$('homeProgress').onclick=()=>{if(window.renderWorkoutProgress)window.renderWorkoutProgress(state.sessions);showSection('progressSection');};
$('backHome').onclick=()=>{$('backHome').hidden=true;showSection('home');};
$('historyBack').onclick=()=>showSection('home');
$('backPrograms').onclick=()=>{renderProgramGrid();showSection('programSection');};
$('programHome').onclick=()=>showSection('home');
$('dayBack').onclick=()=>{showSection('programDaysSection');};
let browsedProgram=null;
function renderProgramGrid(){
 $('programGrid').innerHTML=PROGRAMS.map(p=>'<button type="button" class="programTile" data-program="'+p.id+'"><span class="programTileIcon">▤</span><strong>'+esc(p.name)+'</strong><small>'+p.days.length+' training days</small>'+(p.id===state.programId?'<span class="selectedPill">Active program</span>':'')+'</button>').join('');
}
function renderProgramDays(p){
 browsedProgram=p;
 $('programSettings').open=false;
 $('programDaysTitle').textContent=p.name;
 $('programDaysList').innerHTML=p.days.map((d,i)=>'<button type="button" class="dayTile" data-day="'+i+'"><span><small>DAY '+(i+1)+'</small><strong>'+esc(d.name)+'</strong><small>'+d.ex.length+' exercises</small></span><span aria-hidden="true">›</span></button>').join('');
 $('selectProgram').textContent=p.id===state.programId?'Active program ✓':'Set as active program';
 $('selectProgram').disabled=p.id===state.programId||!!state.active||!!p.archived;
 $('programLock').hidden=!state.active;
 $('archiveProgram').textContent=p.archived?'Restore archived program':'Archive program';
 $('archiveProgram').disabled=!!state.active||p.id===state.programId;
}
$('programGrid').onclick=e=>{
 const b=e.target.closest('[data-program]');if(!b)return;
 const p=PROGRAMS.find(p=>p.id===b.dataset.program);if(!p)return;
 renderProgramDays(p);showSection('programDaysSection');
};
$('programDaysList').onclick=e=>{
 const b=e.target.closest('[data-day]');if(!b||!browsedProgram)return;
 const i=Number(b.dataset.day),d=browsedProgram.days[i];if(!d)return;
 $('dayTitle').textContent=d.name;
 $('dayMeta').textContent=browsedProgram.name+' · Day '+(i+1)+' of '+browsedProgram.days.length;
 $('dayWarmup').innerHTML='<ul class="warmupList">'+warmupExercises(d).map(ex=>'<li>'+esc(ex[0])+'</li>').join('')+'</ul>';
 $('dayExercises').innerHTML=d.ex.map(ex=>'<li class="previewItem">'+imageHtml(ex[0])+'<span><strong>'+esc(ex[0])+'</strong><small>'+ex[1]+' sets × '+esc(ex[2])+'</small></span></li>').join('');
 showSection('daySection');
};
$('selectProgram').onclick=()=>{
 if(!browsedProgram||state.active)return;
 state.programId=browsedProgram.id;if(!(state.programId in state.next))state.next[state.programId]=0;save();render();renderProgramDays(browsedProgram);renderProgramGrid();showSection('programDaysSection');
};

$('archiveProgram').onclick=()=>{
 if(!browsedProgram||state.active||browsedProgram.id===state.programId)return;
 const newValue=!browsedProgram.archived;
 if(newValue&&!confirm('Archive '+browsedProgram.name+'? You can restore it later.'))return;
 browsedProgram.archived=newValue;
 localStorage.setItem(PROGRAM_CACHE,JSON.stringify(PROGRAMS));
 window.dispatchEvent(new CustomEvent('workout-program-archive',{detail:{id:browsedProgram.id,archived:newValue}}));
 $('programSettings').open=false;renderProgramGrid();showSection('programSection');
};
window.addEventListener('workout-programs-updated',()=>{
 try{const cached=JSON.parse(localStorage.getItem(PROGRAM_CACHE)||'null');if(!Array.isArray(cached)||!cached.length)return;
 PROGRAMS=cached.filter(p=>p&&p.id&&Array.isArray(p.days)&&p.days.length);
 if(!PROGRAMS.length)PROGRAMS=DEFAULT_PROGRAMS;
 if(!PROGRAMS.some(p=>p.id===state.programId)){state.programId=PROGRAMS[0].id;save()}
 if(!state.active){render();renderProgramGrid()}
 }catch{}
});

$('backProgress').onclick=()=>showSection('home');
$('today').onclick=()=>{showSection('upcoming');$('backHome').hidden=false;};
function showSection(id){
 if(state.active && id==='home')id='active';
 for(const section of ['home','upcoming','active','historySection','programSection','programDaysSection','daySection','progressSection'])$(section).hidden=section!==id;
 $('stickyProgress').hidden=!state.active||id!=='active';
 window.scrollTo(0,0);
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-image-name]');if(!b)return;
 const name=b.dataset.imageName,src=photoUrl(name);
 $('imageTitle').textContent=name;
 $('imageLarge').hidden=!src;
 $('imageLarge').src=src||'';
 $('imageMissing').hidden=!!src;
 $('imageDialog').showModal();
});
$('closeImage').onclick=()=>$('imageDialog').close();
$('imageLarge').onerror=()=>{$('imageLarge').hidden=true;$('imageMissing').hidden=false;};


if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();
showSection(state.active?'active':'home');
})();