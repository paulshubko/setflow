/* =====================================================================
   SetFlow onboarding: first-run choice, questionnaire, picker, program generator.
   Needs catalog.js (CAT, HOME_EQ, EQ_LABEL) and the globals of index.html
   (state, saveState, EX, ALT, PROG, renderHome, showToast, todayStr).
   Result: state.program (days) and state.profile (answers), both synced with the account.
===================================================================== */

/* ---------- labels ---------- */
const PAT_LABEL = {squat:'Присід', lunge:'Одна нога', hinge:'Тяга тазом', glute:'Сідниці', push_h:'Жим', push_v:'Жим вгору',
  pull_h:'Горизонтальна тяга', pull_v:'Вертикальна тяга', rear:'Задні дельти', delts:'Плечі', arms_bi:'Біцепс', arms_tri:'Трицепс',
  core_anti:'Кор', core_flex:'Прес', back_ext:'Спина', carry:'Хват і корпус', balance:'Баланс', calves:'Литки', surf:'Поп-ап', cardio:'Кардіо'};
const M_LABEL = {legs:'Ноги', glutes:'Сідниці', back:'Спина', chest:'Груди', shoulders:'Плечі', arms:'Руки', core:'Кор', cardio:'Кардіо', full:'Все тіло'};
const LOWER_PATS = ['squat','lunge','hinge','glute','calves'];
const UPPER_PATS = ['push_h','push_v','pull_h','pull_v','rear','delts','arms_bi','arms_tri'];

/* ---------- day templates: each group is one superset of up to 2 patterns, best first ---------- */
const TPL = {
  fbA:{title:'Все тіло: присід', groups:[['squat','core_anti'],['push_h','pull_h'],['glute','core_anti'],['push_v','pull_v'],['arms_bi','arms_tri']]},
  fbB:{title:'Все тіло: тяга', groups:[['hinge','core_flex'],['pull_v','push_v'],['lunge','back_ext'],['push_h','pull_h'],['carry','cardio']]},
  fbC:{title:'Все тіло: баланс і стабільність', groups:[['lunge','core_anti'],['pull_h','push_h'],['glute','balance'],['pull_v','arms_tri'],['cardio','core_anti']]},
  up1:{title:'Верх', groups:[['push_h','pull_h'],['push_v','pull_v'],['rear','arms_tri'],['arms_bi','core_anti'],['back_ext','core_anti']]},
  up2:{title:'Верх: спина й плечі', groups:[['pull_v','push_h'],['pull_h','push_v'],['delts','rear'],['arms_tri','arms_bi'],['core_anti','back_ext']]},
  lo1:{title:'Низ: ноги й сідниці', groups:[['squat','core_anti'],['hinge','calves'],['glute','core_flex'],['lunge','balance'],['cardio','back_ext']]},
  lo2:{title:'Низ: тяга й баланс', groups:[['hinge','core_anti'],['squat','glute'],['lunge','calves'],['back_ext','core_anti'],['cardio','balance']]}
};
const SPLIT = {2:['fbA','fbB'], 3:['fbA','fbB','fbC'], 4:['up1','lo1','up2','lo2']};

/* What each sport asks for more of (added to the score of a pattern) */
const SPORT_BOOST = {
  surf:{pull_v:2, pull_h:2, back_ext:2, balance:2, core_anti:1, surf:3, push_h:1},
  run:{lunge:2, hinge:2, calves:2, core_anti:1, balance:1, glute:1},
  team:{lunge:2, squat:1, hinge:1, cardio:1, balance:1, core_anti:1},
  swim:{pull_v:2, pull_h:1, rear:2, core_anti:1, push_v:1}
};
/* Weak areas the user can name, and the patterns they mean */
const WEAK_PATS = {
  core:['core_anti','core_flex','carry'], legs:['squat','lunge','hinge','glute','calves'],
  back:['pull_h','pull_v','back_ext','rear'], upper:['push_h','push_v','arms_bi','arms_tri','delts'],
  balance:['balance','lunge'], cardio:['cardio']
};

/* ---------- warm-up and cool-down blocks ---------- */
const WU = {
  cardio:{t:'Кардіо активація', d:'3–4 хв швидкої ходьби, велотренажера або ходьби на місці в легкому темпі. Пульс піднявся, дихання ще спокійне.'},
  catcow:{t:'Кет-кова', d:'На четвереньках: вдих, прогин у попереку й таз вгору; видих, округлення спини. 8–10 повільних циклів.'},
  legswing:{t:'Мах ногою вперед-назад', d:'Тримайся за опору, 10–12 махів на кожну ногу, амплітуда без болю в попереку.'},
  abduction:{t:'Відведення стегна лежачи', d:'Лежачи на боці, 1×15 на кожну ногу. Таз не відкочується назад. Будить сідниці перед присідами й місточками.'},
  bridge:{t:'Сідничний місток лежачи', d:'Коліна зігнуті, підйом тазу стисканням сідниць. 12–15 повторень.'},
  squatprep:{t:'Присід для розминки', d:'Без ваги, 8 повторень, щоб відчути рух перед робочими підходами.'},
  armcircles:{t:'Кола руками', d:'10 кіл вперед і 10 назад кожною рукою, амплітуда поступово більша.'},
  scap:{t:'Зведення лопаток', d:'Стоячи, руки вздовж тіла, зводь і опускай лопатки 12 разів. З гумкою вийде ще краще.'},
  pushprep:{t:'Розминочні віджимання', d:'1×6–8 у спокійному темпі, можна з колін або з упором на лаву.'},
  lunge:{t:'Глибокий випад з поворотом', d:'5 на кожну ногу: крок вперед у випад, поворот корпусу до передньої ноги. Відкриває стегна.'}
};
const CD = {
  hipflex:{t:'Розтяжка згиначів стегна', d:'На коліні, таз підкручений, сідниця задньої ноги напружена. 2×30–40 с на сторону.'},
  hamstring:{t:'Розтяжка задньої поверхні стегна', d:'Лежачи, рушник під стопою, нога піднята й випрямлена. 2×30 с на ногу.'},
  fig4:{t:'Розтяжка сідниці (фігура 4)', d:'Лежачи на спині, гомілка однієї ноги на стегні іншої, підтягуєш коліно до себе. 2×30 с на сторону.'},
  child:{t:'Поза дитини', d:'30–40 с, руки витягнуті вперед, таз до п\'ят. Розвантажує поперек.'},
  chest:{t:'Розтяжка грудних у дверях', d:'30 с на сторону, плече нижче вуха.'},
  lat:{t:'Розтяжка широчайших', d:'Тримаєшся за опору, відхиляєшся тазом назад, відчуваєш розтяг боку спини. 30 с на сторону.'},
  walk:{t:'Спокійна ходьба', d:'1 хв повільної ходьби, щоб дихання й пульс прийшли в норму.'}
};

/* ---------- generator ---------- */
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h); }
function obOptions(a){
  const all = ['db','band','bench','bar','machine','cable','barbell','bike','rower','treadmill','dip'];
  const eq = new Set(a.place==='home' ? (a.home||[]) : all);
  const sport = a.sport && SPORT_BOOST[a.sport] ? SPORT_BOOST[a.sport] : {};
  const weakPats = new Set([].concat(...(a.weak||[]).map(w=>WEAK_PATS[w]||[])));
  return {
    eq, sport, weakPats,
    pains:new Set((a.pains||[]).filter(p=>p!=='none')),
    maxLvl: a.exp===2?3 : a.exp===1?2 : 1,
    exp:a.exp||0, goal:a.goal||'health', sedentary:a.life==='sit'
  };
}
function canDo(id, o){
  const c=CAT[id];
  if(!c || !EX[id]) return false;
  if(c.lvl>o.maxLvl) return false;
  if(c.av.some(x=>o.pains.has(x))) return false;
  return c.eq.every(e=>o.eq.has(e));
}
function scoreEx(id, o, dayKey, usedProg){
  const c=CAT[id]; let s=0;
  if(o.weakPats.has(c.p)) s+=3;
  s+=o.sport[c.p]||0;
  if(o.sedentary && (c.tags.includes('posture') || ['glute','rear','back_ext','pull_h'].includes(c.p))) s+=1.5;
  if(o.goal==='fat' && c.tags.includes('fatloss')) s+=2;
  if(o.goal==='strength' && c.eq.some(e=>['barbell','machine','cable','db'].includes(e))) s+=0.7;
  if(c.eq.length && c.eq.every(e=>o.eq.has(e))) s+=0.8;     // use the equipment the person actually has
  s += (o.exp>=1 ? 0.2 : -0.2) * c.lvl;
  if(usedProg.has(id)) s-=50;
  s += (hashStr(id+dayKey)%100)/1000;        // stable variety between days
  return s;
}
function pickFor(pat, o, dayKey, usedProg, usedDay){
  const ids = Object.keys(CAT).filter(id=>CAT[id].p===pat && !usedDay.has(id) && canDo(id,o));
  if(!ids.length) return null;
  ids.sort((a,b)=>scoreEx(b,o,dayKey,usedProg)-scoreEx(a,o,dayKey,usedProg));
  return ids[0];
}
function dayRegion(ids){
  let lo=0, up=0;
  ids.forEach(id=>{ const p=CAT[id]&&CAT[id].p; if(LOWER_PATS.includes(p)) lo++; else if(UPPER_PATS.includes(p)) up++; });
  if(lo>=2*up && lo>0) return 'lower';
  if(up>=2*lo && up>0) return 'upper';
  return 'full';
}
function buildWarmup(region, ids, a){
  const has = p=>ids.some(id=>CAT[id]&&CAT[id].p===p);
  const out=[WU.cardio];
  if(a.life==='sit' || (a.pains||[]).includes('back') || region!=='upper') out.push(WU.catcow);
  if(region==='lower'){ out.push(WU.legswing, WU.abduction, WU.bridge, WU.squatprep); }
  else if(region==='upper'){ out.push(WU.armcircles, WU.scap); if(has('push_h')) out.push(WU.pushprep); }
  else { out.push(WU.legswing, WU.armcircles, WU.bridge); }
  return out.slice(0,6);
}
function buildCooldown(region, a){
  let out = region==='lower' ? [CD.hipflex, CD.hamstring, CD.fig4, CD.walk]
          : region==='upper' ? [CD.chest, CD.lat, CD.child]
          : [CD.hipflex, CD.fig4, CD.child, CD.chest];
  if(a.life==='sit' && !out.includes(CD.hipflex)) out = [CD.hipflex].concat(out).slice(0,4);
  if((a.pains||[]).includes('back') && !out.includes(CD.child)) out = out.concat([CD.child]);
  return out;
}
function groupLabel(letter, ids){
  const names=[]; ids.forEach(id=>{ const l=PAT_LABEL[CAT[id]&&CAT[id].p]; if(l && !names.includes(l)) names.push(l); });
  return letter+' · '+(names.join(' + ')||'Вправа');
}
function dayTitleByRegion(region){ return region==='lower'?'Низ' : region==='upper'?'Верх' : 'Все тіло'; }

function generateProgram(a){
  const o=obOptions(a);
  const days = Math.min(4, Math.max(2, parseInt(a.days,10)||3));
  const G = ({30:3, 45:4, 60:5})[parseInt(a.minutes,10)] || 4;
  const letters = ['A','B','C','D','E'];
  const prog = {}; const usedProg = new Set();
  SPLIT[days].forEach((tplKey, di)=>{
    const key=letters[di];
    let groups = TPL[tplKey].groups.map(g=>g.slice());
    if(a.sport==='surf'){                                   // one dedicated balance and pop-up slot
      const idx = groups.findIndex(g=>g.includes('balance'));
      if(idx>=0 && di===SPLIT[days].length-1) groups[idx]=['surf','balance'];
    }
    groups = groups.slice(0,G);
    if(o.goal==='fat' && G>=4) groups[groups.length-1]=['cardio','core_anti'];
    const usedDay=new Set(); const supersets=[]; const dayIds=[];
    groups.forEach(g=>{
      const ids=[];
      g.forEach(pat=>{ const id=pickFor(pat,o,key,usedProg,usedDay); if(id){ ids.push(id); usedDay.add(id); usedProg.add(id); } });
      if(ids.length){ supersets.push({label:groupLabel(letters[supersets.length], ids), ids}); ids.forEach(i=>dayIds.push(i)); }
    });
    const region=dayRegion(dayIds);
    if(!supersets.length) return;                          // nothing suitable for this day
    prog[key]={ label:'День '+key, title: TPL[tplKey].title, color:key,
      warmup:buildWarmup(region, dayIds, a), cooldown:buildCooldown(region, a), supersets };
  });
  return prog;
}

/* Program from hand-picked exercises: sel = {A:[ids], B:[ids], ...} */
function programFromPicks(sel, a){
  const prog={}; const letters=['A','B','C','D','E']; let n=0;
  letters.forEach(k=>{
    const ids=(sel[k]||[]).filter(id=>EX[id]);
    if(!ids.length) return;
    const key=letters[n++]; const region=dayRegion(ids);
    prog[key]={ label:'День '+key, title:dayTitleByRegion(region), color:key,
      warmup:buildWarmup(region, ids, a||{}), cooldown:buildCooldown(region, a||{}),
      supersets: ids.map((id,i)=>({label:groupLabel(letters[i], [id]), ids:[id]})) };
  });
  return prog;
}

/* ---------- questions ---------- */
const OB_Q = [
  {k:'goal', t:'Яка твоя головна ціль?', opts:[['strength','Стати сильнішим і набрати м\'язи'],['fat','Схуднути й підтягнути тіло'],['health','Бути в тонусі, без болю й скутості'],['sport','Підготуватись до спорту']]},
  {k:'exp', t:'Який у тебе досвід тренувань?', opts:[[0,'Початківець або давно не тренувався'],[1,'Тренуюсь регулярно рік-два'],[2,'Досвідчений, багато років']]},
  {k:'place', t:'Де будеш тренуватись?', opts:[['home','Вдома'],['gym','У залі'],['both','І вдома, і в залі']]},
  {k:'home', t:'Що є вдома?', multi:true, when:a=>a.place==='home', opts:[['db','Гантелі'],['band','Гумки'],['bench','Лава або міцний стілець'],['bar','Турнік']], note:'Нічого не обирай, якщо нічого немає: складу вправи з власною вагою.'},
  {k:'days', t:'Скільки днів на тиждень готовий тренуватись?', opts:[[2,'2 дні'],[3,'3 дні'],[4,'4 дні']]},
  {k:'minutes', t:'Скільки часу на одне тренування?', opts:[[30,'До 30 хв'],[45,'Близько 45 хв'],[60,'Година й більше']]},
  {k:'life', t:'Який у тебе спосіб життя?', opts:[['sit','Сидяча робота, багато часу за столом'],['mixed','Змішаний: і сиджу, і рухаюсь'],['active','Активний: багато ходжу або фізична праця']]},
  {k:'pains', t:'Що болить або турбує?', multi:true, none:'none', opts:[['back','Поперек'],['knee','Коліна'],['shoulder','Плечі'],['wrist','Зап\'ястя'],['none','Нічого не болить']], note:'Вправи, які можуть навантажувати ці місця, буде пропущено.'},
  {k:'weak', t:'Що в тебе слабке? Обери до трьох.', multi:true, max:3, opts:[['core','Кор і прес'],['legs','Ноги й сідниці'],['back','Спина й постава'],['upper','Груди, плечі, руки'],['balance','Баланс і стабільність'],['cardio','Витривалість']]},
  {k:'sport', t:'Є спорт, до якого хочеш підготуватись?', opts:[['none','Ні, просто форма'],['surf','Серфінг'],['run','Біг'],['team','Командні ігри'],['swim','Плавання']]}
];

/* ---------- UI ---------- */
let OB = null;
(function addObStyles(){
  const st=document.createElement('style');
  st.textContent=`
  #obOverlay{position:fixed;inset:0;z-index:80;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch;}
  #obOverlay[hidden]{display:none;}
  .ob-wrap{max-width:560px;margin:0 auto;padding:calc(20px + env(safe-area-inset-top,0px)) 16px calc(28px + env(safe-area-inset-bottom,0px));}
  .ob-top{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
  .ob-top .back{border:0;background:var(--surface-2);color:var(--text);width:36px;height:36px;border-radius:12px;font-size:18px;font-family:inherit;}
  .ob-prog{flex:1;height:6px;background:var(--surface-2);border-radius:6px;overflow:hidden;}
  .ob-prog i{display:block;height:100%;background:var(--accent);border-radius:6px;transition:width .2s;}
  .ob-wrap h2{font-family:'Archivo',sans-serif;font-size:24px;line-height:1.2;margin:18px 0 6px;}
  .ob-wrap p.sub{font-size:13.5px;color:var(--text-dim);line-height:1.5;margin:0 0 14px;}
  .ob-opt{display:block;width:100%;text-align:left;background:var(--surface);border:1.5px solid var(--border);color:var(--text);
    border-radius:var(--radius-m);padding:15px 16px;margin-top:10px;font:inherit;font-size:15px;font-weight:700;}
  .ob-opt.on{border-color:var(--accent);background:var(--surface-2);}
  .ob-opt small{display:block;font-weight:500;font-size:12.5px;color:var(--text-dim);margin-top:3px;line-height:1.4;}
  .ob-note{font-size:12.5px;color:var(--text-dim);margin-top:12px;line-height:1.5;}
  .ob-day{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-m);padding:14px;margin-top:12px;}
  .ob-day h3{font-size:15.5px;font-family:'Archivo',sans-serif;margin:0 0 8px;}
  .ob-day .g{font-size:12px;font-weight:800;color:var(--text-dim);margin-top:8px;}
  .ob-day .e{font-size:14px;margin-top:2px;line-height:1.4;}
  .ob-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;}
  .ob-chip{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;font-weight:700;}
  .ob-chip.on{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);}
  .ob-row{display:flex;align-items:center;gap:10px;background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:11px 12px;margin-top:8px;width:100%;text-align:left;font:inherit;color:var(--text);}
  .ob-row.on{border-color:var(--accent);background:var(--surface-2);}
  .ob-row .n{flex:1;min-width:0;font-size:14.5px;font-weight:700;}
  .ob-row .n small{display:block;font-weight:500;font-size:12px;color:var(--text-dim);margin-top:2px;}
  .ob-row .ck{width:26px;height:26px;border-radius:8px;border:2px solid var(--border);flex:none;display:flex;align-items:center;justify-content:center;font-size:15px;color:var(--accent-ink);}
  .ob-row.on .ck{background:var(--accent);border-color:var(--accent);}
  `;
  document.head.appendChild(st);
})();

function obEl(){ return document.getElementById('obOverlay'); }
function obHome(){ document.documentElement.scrollTop=0; obEl().scrollTop=0; }
function hasHistory(){ return Object.values(state.history||{}).some(h=>h&&h.length); }

/* Show the onboarding once for an account that has no program, no profile and no history yet */
function maybeOnboard(){
  try{
    if(OB) return;
    if(state.program || state.profile || hasHistory()) return;
    const sheet=document.getElementById('syncSheet');
    if(sheet && !sheet.hidden) return;                 // login panel first
    if(typeof syncCfg!=='undefined' && syncCfg && syncStatus.state!=='ok') return;   // wait for the account data
    openOnboarding(false);
  }catch(e){}
}
function openOnboarding(replace){
  if(state.activeSession && replace){ showToast('Спершу заверши поточне тренування'); return; }
  OB={replace:!!replace, view:'welcome', ans:{}, qi:0, pick:{days:3, cur:'A', sel:{}, muscle:'all', loc:'all'}, prog:null};
  obEl().hidden=false; obRender();
}
function closeOnboarding(){ OB=null; obEl().hidden=true; }
function skipOnboarding(){
  if(!OB.replace){ state.profile={skipped:true, at:todayStr()}; saveState(); }
  closeOnboarding(); renderHome();
}
function obRender(){
  const el=obEl();
  const v=OB.view;
  if(v==='welcome') el.innerHTML=obWelcome();
  else if(v==='quiz') el.innerHTML=obQuiz();
  else if(v==='pick') el.innerHTML=obPick();
  else if(v==='result') el.innerHTML=obResult();
  obHome();
}
function obWelcome(){
  return `<div class="ob-wrap">
    <h2>${OB.replace?'Нова програма':'Складемо твою програму'}</h2>
    <p class="sub">${OB.replace?'Історія тренувань і ваги збережуться, зміниться тільки набір днів і вправ.':'Це займе хвилину. Програму можна буде змінити пізніше.'}</p>
    <button class="ob-opt" onclick="obPickPath()">Я знаю, що хочу<small>Сам обираю вправи з каталогу на кожен день.</small></button>
    <button class="ob-opt" onclick="obQuizPath()">Не знаю, з чого почати<small>Кілька питань про ціль, інвентар, болі й спосіб життя, і я складу програму.</small></button>
    <button class="ghost-cta" style="margin-top:18px" onclick="skipOnboarding()">${OB.replace?'Скасувати':'Пропустити й залишити базову програму'}</button>
  </div>`;
}
function obPickPath(){ OB.view='pick'; obRender(); }
function obQuizPath(){ OB.view='quiz'; OB.qi=0; obRender(); }

/* --- questionnaire --- */
function obSteps(){ return OB_Q.filter(q=>!q.when || q.when(OB.ans)); }
function obQuiz(){
  const steps=obSteps(); const q=steps[OB.qi]; const a=OB.ans;
  const cur=a[q.k];
  const isOn = val => q.multi ? (cur||[]).includes(val) : cur===val;
  const opts=q.opts.map(([val,label])=>`<button class="ob-opt${isOn(val)?' on':''}" onclick="obAnswer('${q.k}','${val}')">${label}</button>`).join('');
  const ready = q.multi ? (q.k==='home' || (cur||[]).length>0) : cur!==undefined;
  const last = OB.qi===steps.length-1;
  return `<div class="ob-wrap">
    <div class="ob-top"><button class="back" onclick="obBack()">‹</button><div class="ob-prog"><i style="width:${Math.round((OB.qi+1)/steps.length*100)}%"></i></div></div>
    <h2>${q.t}</h2>${q.note?`<p class="sub">${q.note}</p>`:''}
    ${opts}
    <button class="big-cta" style="margin-top:18px" ${ready?'':'disabled'} onclick="obNext()">${last?'Скласти програму':'Далі'}</button>
  </div>`;
}
function obAnswer(k,val){
  const q=OB_Q.find(x=>x.k===k);
  const isNum = q.opts.some(o=>typeof o[0]==='number');
  if(q.multi){
    let arr=(OB.ans[k]||[]).slice();
    if(arr.includes(val)) arr=arr.filter(x=>x!==val);
    else {
      if(q.none && val===q.none) arr=[val];
      else { arr=arr.filter(x=>x!==q.none); if(!q.max || arr.length<q.max) arr.push(val); }
    }
    OB.ans[k]=arr;
  } else {
    OB.ans[k]= isNum ? Number(val) : val;
  }
  obRender();
}
function obBack(){
  if(OB.qi>0){ OB.qi--; obRender(); } else { OB.view='welcome'; obRender(); }
}
function obNext(){
  const steps=obSteps();
  if(OB.qi<steps.length-1){ OB.qi++; obRender(); return; }
  const prog=generateProgram(OB.ans);
  if(!Object.keys(prog).length){ showToast('Не вдалося підібрати вправи, зміни відповіді'); return; }
  OB.prog=prog; OB.mode='quiz'; OB.view='result'; obRender();
}

/* --- picker --- */
const PICK_MUSCLES=['all','legs','glutes','back','chest','shoulders','arms','core','cardio'];
function pickCandidates(){
  const p=OB.pick;
  return Object.keys(CAT).filter(id=>{
    if(!EX[id]) return false;
    const c=CAT[id];
    if(p.muscle!=='all' && c.m!==p.muscle) return false;
    if(p.loc==='home' && !c.eq.every(e=>HOME_EQ.includes(e))) return false;
    if(p.loc==='gym' && c.eq.every(e=>HOME_EQ.includes(e))) return false;
    return true;
  }).sort((a,b)=>(CAT[a].m+EX[a].name).localeCompare(CAT[b].m+EX[b].name,'uk'));
}
function exSub(id){
  const c=CAT[id]; const eq=c.eq.length?c.eq.map(e=>EQ_LABEL[e]||e).join(' + '):'без інвентаря';
  return (M_LABEL[c.m]||'')+' · '+eq;
}
function obPick(){
  const p=OB.pick; const letters=['A','B','C','D','E'].slice(0,p.days);
  const tabs=letters.map(k=>`<button class="ob-chip${p.cur===k?' on':''}" onclick="obPickDay('${k}')">${k} · ${(p.sel[k]||[]).length}</button>`).join('');
  const counts=[2,3,4,5].map(n=>`<button class="ob-chip${p.days===n?' on':''}" onclick="obPickDays(${n})">${n}</button>`).join('');
  const mus=PICK_MUSCLES.map(m=>`<button class="ob-chip${p.muscle===m?' on':''}" onclick="obPickFilter('muscle','${m}')">${m==='all'?'Усі':M_LABEL[m]}</button>`).join('');
  const locs=[['all','Усі'],['home','Вдома'],['gym','Зал']].map(([v,l])=>`<button class="ob-chip${p.loc===v?' on':''}" onclick="obPickFilter('loc','${v}')">${l}</button>`).join('');
  const sel=p.sel[p.cur]||[];
  const rows=pickCandidates().map(id=>{
    const on=sel.includes(id);
    return `<button class="ob-row${on?' on':''}" onclick="obPickToggle('${id}')"><span class="n">${EX[id].name}<small>${exSub(id)}</small></span><span class="ck">${on?'✓':''}</span></button>`;
  }).join('') || '<p class="ob-note">Нічого не знайшлось із такими фільтрами.</p>';
  const total=letters.reduce((n,k)=>n+(p.sel[k]||[]).length,0);
  return `<div class="ob-wrap">
    <div class="ob-top"><button class="back" onclick="OB.view='welcome';obRender()">‹</button><div style="flex:1;font-weight:800">Вибери вправи</div></div>
    <p class="sub">Скільки днів на тиждень:</p><div class="ob-chips" style="margin-top:0">${counts}</div>
    <p class="sub" style="margin-top:14px">Обери день і познач вправи. Порядок такий, як ти їх відмічаєш.</p>
    <div class="ob-chips" style="margin-top:0">${tabs}</div>
    <div class="ob-chips">${mus}</div><div class="ob-chips">${locs}</div>
    ${rows}
    <button class="big-cta" style="margin-top:18px" ${total?'':'disabled'} onclick="obPickDone()">Готово: ${total} вправ</button>
  </div>`;
}
function obPickDays(n){ OB.pick.days=n; if(['A','B','C','D','E'].indexOf(OB.pick.cur)>=n) OB.pick.cur='A'; obRender(); }
function obPickDay(k){ OB.pick.cur=k; obRender(); }
function obPickFilter(f,v){ OB.pick[f]=v; obRender(); }
function obPickToggle(id){
  const p=OB.pick; const arr=(p.sel[p.cur]||[]).slice();
  const i=arr.indexOf(id); if(i>=0) arr.splice(i,1); else arr.push(id);
  p.sel[p.cur]=arr;
  const y=obEl().scrollTop; obRender(); obEl().scrollTop=y;
}
function obPickDone(){
  const prog=programFromPicks(OB.pick.sel, OB.ans);
  if(!Object.keys(prog).length) return;
  OB.prog=prog; OB.mode='pick'; OB.view='result'; obRender();
}

/* --- result --- */
function obResult(){
  const prog=OB.prog;
  const days=Object.keys(prog).map(k=>{
    const d=prog[k];
    const body=d.supersets.map(s=>`<div class="g">${s.label}</div>${s.ids.map(id=>`<div class="e">${EX[id].name}, ${EX[id].sets} × ${EX[id].repsHint}</div>`).join('')}`).join('');
    return `<div class="ob-day"><h3>${d.label} · ${d.title}</h3>${body}</div>`;
  }).join('');
  return `<div class="ob-wrap">
    <div class="ob-top"><button class="back" onclick="OB.view='${OB.mode==='pick'?'pick':'quiz'}';obRender()">‹</button><div style="flex:1;font-weight:800">Твоя програма</div></div>
    <p class="sub">Розминка й розтяжка додані до кожного дня. Кожну вправу в тренуванні можна замінити на схожу. Це не медична порада: якщо біль не минає, звернись до лікаря.</p>
    ${days}
    <button class="big-cta" style="margin-top:18px" onclick="obAccept()">Взяти цю програму</button>
    <button class="ghost-cta" onclick="OB.view='welcome';obRender()">Почати спочатку</button>
  </div>`;
}
function obAccept(){
  const prog=OB.prog; if(!prog) return;
  state.program=prog;
  state.profile={mode:OB.mode, answers:OB.ans, at:todayStr()};
  state.lastDay={};                                  // new days, start the rotation from the first one
  saveState();
  closeOnboarding(); renderHome();
  showToast('Програму збережено');
}
