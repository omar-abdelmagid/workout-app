/* Phase 5: read-only analytics from saved workout sessions. No schema or history changes. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString();
const dayKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const monday=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return x;};
const niceDate=d=>d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
const dateOf=s=>{const d=new Date(s?.endedAt||s?.startedAt);return Number.isFinite(d.getTime())?d:null;};
const validWeight=x=>{if(x===null||x===undefined||String(x).trim()==='')return null;const n=Number(x);return Number.isFinite(n)&&n>0?n:null;};
const repsLower=x=>{const s=String(x??'').trim();const m=s.match(/^(\d+(?:\.\d+)?)(?:\s*[-–—]\s*\d+)?(?:\s*\/\s*(?:side|leg|arm))?$/i);return m?Number(m[1]):null;};
const exerciseKey=e=>String(e.originalName||e.name||'').trim().toLowerCase().replace(/\s+/g,' ');
function metrics(sessions){
 const valid=(Array.isArray(sessions)?sessions:[]).filter(s=>s&&Array.isArray(s.exercises)&&dateOf(s)).slice().sort((a,b)=>dateOf(a)-dateOf(b));
 const exercises=new Map();let estimatedVolume=0,estimatedCount=0,weightedCount=0;
 for(const s of valid){
  const d=dateOf(s);
  for(const e of s.exercises){
   if(!e||!e.done||e.group==='warmup')continue;
   const weight=validWeight(e.weight);if(weight===null)continue;
   const key=exerciseKey(e);if(!key)continue;
   weightedCount++;
   if(!exercises.has(key))exercises.set(key,{name:e.originalName||e.name,points:[],best:0});
   const entry=exercises.get(key);
   entry.points.push({date:d,weight,sessionId:s.id||''});
   entry.best=Math.max(entry.best,weight);
   const sets=Number(e.sets),reps=repsLower(e.reps);
   // This is a prescription-based estimate, NOT measured set-by-set volume.
   if(Number.isInteger(sets)&&sets>0&&sets<=30&&reps!==null&&reps>0&&reps<=100){
    const estimate=weight*sets*reps;
    estimatedVolume+=estimate;estimatedCount++;
   }
  }
 }
 const today=new Date(),currentMonday=monday(today),weeks=[];
 for(let i=11;i>=0;i--){const start=new Date(currentMonday);start.setDate(start.getDate()-7*i);const end=new Date(start);end.setDate(end.getDate()+7);weeks.push({start,end,label:niceDate(start),count:valid.filter(s=>{const d=dateOf(s);return d>=start&&d<end}).length});}
 const last28=new Date(today.getFullYear(),today.getMonth(),today.getDate()-27);
 const last28Count=valid.filter(s=>dateOf(s)>=last28&&dateOf(s)<=today).length;
 const ordered=[...exercises.values()].sort((a,b)=>a.name.localeCompare(b.name));
 return {valid,weeks,last28Count,estimatedVolume,estimatedCount,weightedCount,exercises:ordered,exerciseCount:ordered.length};
}
function bars(weeks){
 const max=Math.max(1,...weeks.map(w=>w.count));
 return '<div class="progressBars" role="img" aria-label="Completed workouts per week for the past 12 weeks: '+esc(weeks.map(w=>w.label+': '+w.count).join(', '))+'">'+weeks.map(w=>'<div class="progressBarColumn"><span class="progressBarCount">'+(w.count||'')+'</span><div class="progressBarTrack"><div class="progressBarFill" style="height:'+Math.max(w.count?6:0,Math.round(w.count/max*100))+'%"></div></div><small>'+esc(w.label)+'</small></div>').join('')+'</div>';
}
function line(points){
 if(!points.length)return '';
 const last=points.slice(-20),min=Math.min(...last.map(p=>p.weight)),max=Math.max(...last.map(p=>p.weight)),range=Math.max(1,max-min);
 const coords=last.map((p,i)=>({x:last.length===1?50:5+90*i/(last.length-1),y:80-(p.weight-min)/range*65,p}));
 const path=coords.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ');
 return '<svg class="progressLine" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Logged maximum weights from '+esc(last[0].weight)+' to '+esc(last[last.length-1].weight)+' pounds"><path d="'+path+'" fill="none" stroke="#171717" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>'+coords.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="1.8" fill="#171717"/>').join('')+'</svg>';
}
function render(sessions){
 const target=$('progressDashboard');if(!target)return;
 const m=metrics(sessions);
 if(!m.valid.length){target.innerHTML='<div class="progressEmpty"><h3>Your progress starts here</h3><p>Complete a workout to see training frequency. Log maximum weights on exercises to unlock weight trends and personal records.</p></div>';return;}
 const selected=target.querySelector('#progressExercise')?.value||'';
 const selectedExercise=m.exercises.find(x=>x.name.toLowerCase()===selected)||m.exercises[0];
 const thisWeek=m.weeks[m.weeks.length-1].count;
 target.innerHTML='<div class="progressStats">'+
  '<div class="progressStat"><span>Total workouts</span><strong>'+fmt(m.valid.length)+'</strong><small>All time</small></div>'+
  '<div class="progressStat"><span>Last 28 days</span><strong>'+fmt(m.last28Count)+'</strong><small>Completed sessions</small></div>'+
  '<div class="progressStat"><span>This week</span><strong>'+fmt(thisWeek)+'</strong><small>Since Monday</small></div>'+
  '<div class="progressStat"><span>Logged lifts</span><strong>'+fmt(m.weightedCount)+'</strong><small>Completed exercises with weight</small></div></div>'+
  '<section class="progressPanel"><h3>Workout frequency</h3><p class="muted">Completed sessions · past 12 weeks</p>'+bars(m.weeks)+'</section>'+
  '<section class="progressPanel"><h3>Training volume</h3><div class="progressVolume"><strong>'+(m.estimatedCount?fmt(m.estimatedVolume)+' lb':'—')+'</strong><span>Estimated prescribed volume · all time</span></div>'+
  '<p class="progressNote">Estimate = logged maximum weight × prescribed sets × minimum prescribed reps, for '+m.estimatedCount+' completed exercises with compatible rep targets. This is not actual lifted volume; warm-ups and exercises without weight are excluded.</p></section>'+
  '<section class="progressPanel"><h3>Exercise progression</h3>'+
  (selectedExercise?'<label class="progressSelectLabel" for="progressExercise">Exercise</label><select id="progressExercise">'+m.exercises.map(x=>'<option value="'+esc(x.name.toLowerCase())+'" '+(x===selectedExercise?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select>'+
   '<div class="progressTrendHead"><strong>'+selectedExercise.points[selectedExercise.points.length-1].weight.toLocaleString()+' lb</strong><span>Latest logged max · '+selectedExercise.points.length+' sessions</span></div>'+line(selectedExercise.points)+
   '<div class="progressTrendDates"><span>'+niceDate(selectedExercise.points[Math.max(0,selectedExercise.points.length-20)].date)+'</span><span>'+niceDate(selectedExercise.points[selectedExercise.points.length-1].date)+'</span></div>':
   '<p class="muted">Log a maximum weight on a completed exercise to see your progression.</p>')+'</section>'+
  '<section class="progressPanel"><h3>Personal records</h3><p class="muted">Heaviest logged weight per exercise (not an estimated 1-rep max)</p>'+
  (m.exercises.length?'<div class="progressRecords">'+m.exercises.slice().sort((a,b)=>b.best-a.best).map(x=>'<div class="progressRecord"><span>'+esc(x.name)+'</span><strong>'+x.best.toLocaleString()+' lb</strong></div>').join('')+'</div>':'<p class="muted">No weights recorded yet.</p>')+'</section>';
 const select=$('progressExercise');if(select)select.onchange=()=>render(sessions);
}
window.renderWorkoutProgress=render;
window.workoutProgressMetrics=metrics;
})();
