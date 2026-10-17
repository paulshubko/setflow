/* =====================================================================
   SetFlow exercise catalog: extra exercises (home + gym basics) and tags for
   every exercise, used by the onboarding to build a program.

   CAT tags per exercise id:
     p    movement pattern  (squat, lunge, hinge, glute, push_h, push_v, pull_h, pull_v,
                             rear, delts, arms_bi, arms_tri, core_anti, core_flex, back_ext,
                             carry, balance, calves, surf, cardio)
     m    muscle group for filters (legs, glutes, back, chest, shoulders, arms, core, cardio, full)
     eq   equipment that must be available. Home can have: db, band, bench, bar.
          Gym only: machine, cable, barbell, bike, rower, treadmill, dip.
     lvl  1 beginner, 2 some experience, 3 advanced
     av   pain zones where the exercise is best skipped: back, knee, shoulder, wrist
   Exercises without a CAT entry (duplicates) are never offered.
===================================================================== */

const HOME_EQ = ['db','band','bench','bar'];
const EQ_LABEL = {db:'гантелі', band:'гумка', bench:'лава', bar:'турнік', machine:'тренажер', cable:'блок', barbell:'штанга', bike:'велотренажер', rower:'гребний', treadmill:'доріжка', dip:'бруси'};

const EX_EXTRA = {
  /* ---------- home: bodyweight ---------- */
  h_bw_squat:{name:'Присід з власною вагою', type:'bw', sets:3, repsDefault:15, repsHint:'12–15',
    setup:['Стопи на ширині плечей, носки трохи назовні.','Руки перед грудьми або витягнуті вперед для балансу.'],
    steps:['Вдих, таз назад і вниз, груди розгорнуті.','Коліна йдуть у напрямку носків.','Опускайся, доки стегна паралельні підлозі, або менше, якщо більше болить.','Видих, підйом через п\'яти.'],
    errors:['П\'яти відриваються від підлоги.','Коліна завалюються всередину.','Спина округлюється внизу.']},
  h_glute_bridge:{name:'Сідничний місток', type:'bw', sets:3, repsDefault:15, repsHint:'12–15',
    setup:['Лежачи на спині, коліна зігнуті, стопи на підлозі біля таза.','Руки вздовж тіла.'],
    steps:['Видих, підйом тазу, штовхаючи підлогу п\'ятами.','Вгорі стисни сідниці, лінія від колін до плечей.','Повільне опускання без падіння тазу.'],
    errors:['Прогин у попереку замість роботи сідниць.','Стопи надто далеко від таза, тоді працює задня поверхня стегна.']},
  h_wall_sit:{name:'Стійка спиною до стіни', type:'bw', sets:3, repsDefault:1, repsHint:'30–45 с',
    setup:['Притулись спиною до стіни, стопи на ширині плечей, на крок від стіни.'],
    steps:['Ковзни вниз, доки коліна зігнуті під 90°.','Тримай позу, спина притиснута, дихання рівне.','Піднімайся повільно, спираючись на стіну.'],
    errors:['Коліна виходять далеко за носки.','Руки опираються на стегна й забирають навантаження.']},
  h_step_up:{name:'Підйом на лаву з гантелями', type:'db', step:2.5, sets:3, repsDefault:8, repsHint:'8 на ногу',
    setup:['Лава або стійкий стілець на висоті до коліна.','Гантелі в опущених руках уздовж тіла.'],
    steps:['Постав усю стопу на лаву.','Підніми тіло, штовхаючи опорною ногою, а не відштовхуючись нижньою.','Контрольовано опустись назад, змінюй ногу після підходу.'],
    errors:['Відштовхування нижньою ногою.','Коліно опорної ноги завалюється всередину.']},
  h_knee_pushup:{name:'Віджимання з колін', type:'bw', sets:3, repsDefault:10, repsHint:'8–12',
    setup:['Упор лежачи, коліна на килимку, тіло рівне від колін до голови.','Руки трохи ширше плечей.'],
    steps:['Опускай груди до підлоги, лікті під ~45° до тулуба.','Витискай підлогу, не прогинаючись у попереку.'],
    errors:['Таз відстає й тіло ламається.','Лікті розходяться на 90°.']},
  h_incline_pushup:{name:'Віджимання з упором рук на лаву', type:'bw', sets:3, repsDefault:10, repsHint:'8–12',
    setup:['Руки на лаву або стійку, тіло рівне, стопи на підлозі.','Чим вище опора, тим легше.'],
    steps:['Опускай груди до краю лави, лікті під ~45°.','Витискай вгору, тримаючи тіло рівним.'],
    errors:['Таз провисає.','Голова тягнеться вперед.']},
  h_pike_pushup:{name:'Віджимання кутом (pike)', type:'bw', sets:3, repsDefault:8, repsHint:'6–10',
    setup:['Упор, таз високо, тіло утворює перевернуту літеру V.','Руки на ширині плечей, стопи ближче до рук.'],
    steps:['Зігни лікті й опусти маківку до підлоги між руками.','Витискай вгору, повертаючись у V.'],
    errors:['Спина прогинається замість утримання кута.','Лікті розходяться вбік.']},
  h_chair_dip:{name:'Зворотні віджимання від лави', type:'bw', sets:3, repsDefault:10, repsHint:'8–12',
    setup:['Руки на край лави позаду, пальці вперед, ноги випрямлені або зігнуті.','Таз біля лави, плечі від вух.'],
    steps:['Зігни лікті до ~90°, спина близько до лави.','Витискай вгору, розгинаючи лікті.'],
    errors:['Плечі виходять вперед і болять.','Занадто глибоке опускання.']},
  h_calf_raise:{name:'Підйом на носки стоячи', type:'bw', sets:3, repsDefault:15, repsHint:'12–20',
    setup:['Стопи на ширині таза, рука тримається за опору.','Можна стояти носками на краю сходинки.'],
    steps:['Піднімись на носки максимально високо, коротка пауза вгорі.','Повільно опустись, на сходинці нижче рівня підлоги.'],
    errors:['Швидкі відскоки без паузи.','Стопи розвертаються всередину.']},
  h_mountain_climber:{name:'Альпініст', type:'bw', sets:3, repsDefault:1, repsHint:'20–30 с',
    setup:['Упор лежачи на прямих руках, тіло рівне.'],
    steps:['По черзі підтягуй коліна до грудей у швидкому темпі.','Таз не підіймається, плечі над кистями.'],
    errors:['Таз підскакує вгору.','Плечі відходять від кистей.']},
  h_jumping_jack:{name:'Стрибки «зірка»', type:'bw', sets:3, repsDefault:1, repsHint:'30 с',
    setup:['Стоячи, стопи разом, руки вздовж тіла.'],
    steps:['Стрибком розведи ноги й підніми руки над головою.','Стрибком повернись у початкове положення.'],
    errors:['Жорстке приземлення на прямі ноги.','Задерев\'яніла шия й плечі.']},
  h_reverse_crunch:{name:'Зворотні скручування', type:'bw', sets:3, repsDefault:12, repsHint:'10–15',
    setup:['Лежачи на спині, руки вздовж тіла або під тазом, коліна зігнуті над грудьми.'],
    steps:['Видих, підкрути таз і підніми його від підлоги на кілька сантиметрів.','Повільно опусти, поперек не прогинається.'],
    errors:['Розгойдування ногами замість роботи преса.','Поперек різко відривається від підлоги при опусканні.']},
  h_russian_twist:{name:'Російські скручування', type:'bw', sets:3, repsDefault:10, repsHint:'10 на сторону',
    setup:['Сидячи, корпус нахилений назад ~45°, коліна зігнуті, стопи на підлозі або трохи піднятті.','Руки зчеплені перед грудьми.'],
    steps:['Поверни корпус убік, дивлячись за руками.','Повернись у центр і поверни в іншу сторону.'],
    errors:['Округлена спина.','Рух тільки руками без повороту корпусу.']},
  h_walk:{name:'Швидка ходьба', type:'cardio', sets:1, repsDefault:1, repsHint:'20–30 хв у розмовному темпі',
    setup:['Зручне взуття, рівний маршрут або доріжка.'],
    steps:['Ходи швидко, щоб пульс піднявся, але можна було говорити.','Руки працюють у такт, плечі розслаблені.'],
    errors:['Темп надто повільний, пульс не змінюється.']},

  /* ---------- home: dumbbells ---------- */
  h_db_floor_press:{name:'Жим гантелей лежачи на підлозі', type:'db', step:2.5, sets:3, repsDefault:10, repsHint:'8–12',
    setup:['Лежачи на підлозі, коліна зігнуті, гантелі над грудьми.','Лікті під ~45° до тулуба.'],
    steps:['Опускай гантелі, доки лікті торкнуться підлоги, без відскоку.','Жим вгору до майже прямих рук.'],
    errors:['Лікті розходяться на 90°.','Поперек сильно прогинається.']},
  h_db_bent_row:{name:'Тяга двох гантелей у нахилі', type:'db', step:2.5, sets:3, repsDefault:10, repsHint:'10',
    setup:['Коліна злегка зігнуті, корпус нахилений ~45°, спина рівна.','Гантелі висять під плечима.'],
    steps:['Тягни лікті назад до тазу, лопатки зводяться.','Короткая пауза вгорі й повільне опускання.'],
    errors:['Округлена спина.','Ривок корпусом замість роботи спини.']},
  h_db_shoulder_press:{name:'Жим гантелей стоячи', type:'db', step:2.5, sets:3, repsDefault:10, repsHint:'8–12',
    setup:['Стоячи, прес і сідниці напружені, гантелі на рівні плечей.'],
    steps:['Жим угору над головою, лікті тримаються перед корпусом.','Повільно опусти до плечей.'],
    errors:['Прогин у попереку при жимі.','Гантелі зміщуються далеко вперед.']},
  h_db_lateral_raise:{name:'Розведення гантелей убік', type:'db', step:1, sets:3, repsDefault:12, repsHint:'12–15',
    setup:['Стоячи, легкі гантелі вздовж тіла, лікті трохи зігнуті.'],
    steps:['Піднімай руки вбік до рівня плечей.','Повільно опусти без розгойдування.'],
    errors:['Занадто важка вага та розгойдування корпусом.','Плечі піднімаються до вух.']},
  h_db_hammer_curl:{name:'Молоткові підйоми гантелей', type:'db', step:2.5, sets:3, repsDefault:12, repsHint:'10–12',
    setup:['Стоячи, хват нейтральний (долоні всередину), лікті біля тулуба.'],
    steps:['Зігни лікті, піднімаючи гантелі до плечей.','Повільно опусти до повного випрямлення.'],
    errors:['Лікті йдуть уперед.','Розгойдування корпусом.']},
  h_db_glute_bridge:{name:'Сідничний місток з гантеллю', type:'db', step:2.5, sets:3, repsDefault:12, repsHint:'10–12',
    setup:['Лежачи на підлозі, гантель на тазі, утримуй її руками.','Коліна зігнуті, стопи біля таза.'],
    steps:['Піднімай таз, стискаючи сідниці, до прямої лінії колін і плечей.','Повільне опускання.'],
    errors:['Прогин у попереку.','Штовхає не п\'ятами, а носками.']},

  /* ---------- home: bands and bar ---------- */
  h_band_row:{name:'Тяга гумки сидячи', type:'bw', sets:3, repsDefault:12, repsHint:'12–15',
    setup:['Сидячи, гумка навколо стоп, кінці в руках, спина рівна.'],
    steps:['Тягни кінці до живота, лопатки зводяться.','Повільно поверни руки.'],
    errors:['Округлена спина.','Плечі тягнуться до вух.']},
  h_band_face_pull:{name:'Тяга гумки до обличчя', type:'bw', sets:3, repsDefault:15, repsHint:'12–15',
    setup:['Гумка закріплена на рівні очей, тримай її обома руками.'],
    steps:['Тягни кінці до обличчя, лікті вгору й убік.','Зведи лопатки й повільно поверни.'],
    errors:['Тяга до грудей замість обличчя.','Відхилення назад корпусом.']},
  h_band_pushdown:{name:'Розгинання рук з гумкою', type:'bw', sets:3, repsDefault:15, repsHint:'12–15',
    setup:['Гумка закріплена вгорі, лікті притиснуті до боків.'],
    steps:['Розгинай лікті вниз до повного випрямлення.','Повільно поверни руки.'],
    errors:['Лікті розходяться.','Корпус хитається.']},
  h_band_curl:{name:'Підйом на біцепс з гумкою', type:'bw', sets:3, repsDefault:12, repsHint:'12–15',
    setup:['Стань на середину гумки, кінці в руках, лікті біля тулуба.'],
    steps:['Зігни лікті до плечей.','Повільно опусти.'],
    errors:['Розгойдування корпусом.','Лікті відходять уперед.']},
  h_band_pallof:{name:'Pallof press з гумкою', type:'bw', sets:3, repsDefault:10, repsHint:'10 на сторону',
    setup:['Гумка закріплена збоку на рівні грудей, стій боком до неї.'],
    steps:['Виштовхуй руки вперед, не даючи корпусу провернутися.','Затримка 1–2 с, потім повернення до грудей.'],
    errors:['Корпус прокручується до точки кріплення.','Затримка дихання.']},
  h_pullup:{name:'Підтягування', type:'bw', sets:3, repsDefault:5, repsHint:'3–8',
    setup:['Хват трохи ширше плечей, повний вис, лопатки зведені вниз.'],
    steps:['Тягни підборіддя до перекладини, лікті вниз до боків.','Повільне опускання до повного виса.'],
    errors:['Розгойдування й ривок.','Неповна амплітуда вниз.']},
  h_inverted_row:{name:'Тяга до себе під перекладиною', type:'bw', sets:3, repsDefault:10, repsHint:'8–12',
    setup:['Низька перекладина або міцний стіл, лежачи під нею, хват на ширині плечей.','Тіло пряме, п\'яти на підлозі. Чим вище нахил, тим легше.'],
    steps:['Тягни груди до перекладини, лопатки зводяться.','Повільне опускання.'],
    errors:['Таз провисає.','Рух однією шиєю замість спини.']},

  /* ---------- gym ---------- */
  g_barbell_squat:{name:'Присід зі штангою', type:'machine', w:20, step:2.5, sets:3, repsDefault:8, repsHint:'6–10',
    setup:['Штанга на верху трапецій, лопатки зведені, стопи трохи ширше плечей.','Налаштуй стійку й запобіжники, найкраще з тренером при першому разі.'],
    steps:['Вдих, напруж прес, таз назад і вниз.','Коліна за напрямком носків, спина нейтральна.','Опускайся до паралелі стегон із підлогою, підйом через усю стопу.'],
    errors:['Округлена спина внизу.','Коліна заходять усередину.','Пятки відриваються від підлоги.']},
  g_deadlift:{name:'Станова тяга', type:'machine', w:20, step:2.5, sets:3, repsDefault:6, repsHint:'5–8',
    setup:['Штанга над серединою стопи, хват трохи ширше колін.','Спина рівна, лопатки над штангою, груди вгору.'],
    steps:['Штовхни підлогу ногами, штанга ковзає вздовж ніг.','Вгорі розігнися таз повністю, без прогину в попереку.','Опускай так само контрольовано, таз назад.'],
    errors:['Округлення попереку.','Штанга відходить від ніг.','Ривок замість напруги перед стартом.']},
  g_bench_press:{name:'Жим штанги лежачи', type:'machine', w:20, step:2.5, sets:3, repsDefault:8, repsHint:'6–10',
    setup:['Лопатки зведені й притиснуті до лави, стопи на підлозі.','Хват трохи ширше плечей, страхуючий поруч або запобіжники.'],
    steps:['Опускай штангу до нижньої частини грудей, лікті під ~45°.','Жим угору по невеликій дузі.'],
    errors:['Відрив таза від лави.','Лікті розходяться на 90°.','Відбій штанги від грудей.']},
  g_leg_extension:{name:'Розгинання ніг у тренажері', type:'machine', w:20, step:2.5, sets:3, repsDefault:12, repsHint:'10–15',
    setup:['Спинка тренажера впритул до спини, валик на передній частині гомілки.'],
    steps:['Випрямляй ноги до верхньої точки, коротка пауза.','Повільно опускай.'],
    errors:['Ривок і замах вагою.','Відрив таза від сидіння.']},
  g_leg_curl:{name:'Згинання ніг лежачи', type:'machine', w:15, step:2.5, sets:3, repsDefault:12, repsHint:'10–12',
    setup:['Лягай на тренажер, валик над п\'ятами, таз притиснутий.'],
    steps:['Зігни коліна, підтягуючи п\'яти до сідниць.','Повільне повернення без падіння ваги.'],
    errors:['Таз відривається від лави.','Занадто важка вага та ривок.']},
  g_dips:{name:'Віджимання на брусах', type:'bw', sets:3, repsDefault:6, repsHint:'5–10',
    setup:['Упор на брусах, плечі вниз, корпус трохи нахилений вперед.'],
    steps:['Опускайся, доки плечі трохи нижче ліктів.','Витискай угору без повного блокування ліктів.'],
    errors:['Занадто глибоке опускання, біль у плечах.','Розгойдування ногами.']},
  g_cable_crunch:{name:'Скручування на блоці', type:'cable', step:2.5, sets:3, repsDefault:12, repsHint:'10–15',
    setup:['Стань на коліна спиною до блоку, канат біля голови.'],
    steps:['Видих, скручуй корпус вниз, підтягуючи ребра до таза.','Повільно поверни.'],
    errors:['Рух тазом замість преса.','Занадто важка вага.']},
  g_hanging_knee_raise:{name:'Підйом колін у висі', type:'bw', sets:3, repsDefault:10, repsHint:'8–12',
    setup:['Повний вис на перекладині, лопатки зведені.'],
    steps:['Підтягни коліна до грудей, підкручуючи таз.','Повільно опусти без розгойдування.'],
    errors:['Розгойдування корпусом.','Рух лише ногами без підкручування таза.']},
  g_bike_easy:{name:'Велотренажер у розмовному темпі', type:'cardio', sets:1, repsDefault:1, repsHint:'20 хв',
    setup:['Сідло на рівні таза, спина рівна.'],
    steps:['Крути в темпі, при якому можна розмовляти.','Останні 2 хв зменш темп.'],
    errors:['Темп завеликий, дихання зривається.']},
  g_treadmill:{name:'Доріжка: швидка ходьба або легкий біг', type:'cardio', sets:1, repsDefault:1, repsHint:'20 хв',
    setup:['Нахил 1–2%, зручне взуття.'],
    steps:['Тримай темп, при якому можна розмовляти.','Дихання рівне, плечі розслаблені.'],
    errors:['Тримання за поручні всім тілом.']}
};

/* Tags: id -> [pattern, muscle group, equipment[], level, avoid[], extra tags[]] */
const CAT = (function(){
  const t = {};
  const add = (id,p,m,eq,lvl,av,tags)=>{ t[id]={p,m,eq,lvl,av:av||[],tags:tags||[]}; };
  /* original program */
  add('a1_goblet_squat','squat','legs',['db'],1);
  add('a2_hip_abduction','glute','glutes',[],1);
  add('b1_rdl','hinge','glutes',['db'],2,['back']);
  add('b2_dead_bug','core_anti','core',[],1);
  add('c1_split_squat','lunge','legs',[],2,['knee']);
  add('c2_glute_bridge','glute','glutes',[],1);
  add('core_pallof','core_anti','core',['cable'],1);
  add('a1_incline_press','push_h','chest',['db','bench'],1,['shoulder']);
  add('a2_row','pull_h','back',['db','bench'],1);
  add('b1_shoulder_press','push_v','shoulders',['db','bench'],1,['shoulder']);
  add('b2_lat_pulldown','pull_v','back',['cable'],1);
  add('c1_face_pull','rear','shoulders',['cable'],1,[],['posture']);
  add('c2_bicep_curl','arms_bi','arms',['db'],1);
  add('d1_triceps_pushdown','arms_tri','arms',['cable'],1);
  add('b1_leg_press','squat','legs',['machine'],1,['knee']);
  add('c1_seated_row','pull_h','back',['cable'],1);
  add('c2_pushup','push_h','chest',[],1,['wrist']);
  add('d1_farmers_walk','carry','core',['db'],1);
  add('cardio_airbike','cardio','cardio',['bike'],2,[],['fatloss']);
  add('a_side_plank','core_anti','core',[],1);
  add('a_hip_thrust','glute','glutes',['machine'],1);
  add('a_hyperext','back_ext','back',['machine'],1,['back']);
  add('b_plyo_pushup','push_h','chest',[],3,['wrist','shoulder'],['explosive']);
  add('b_chest_press','push_h','chest',['machine'],1);
  add('b_chest_row','pull_h','back',['machine'],1);
  add('b_shoulder_machine','push_v','shoulders',['machine'],1,['shoulder']);
  add('c_popup','surf','full',[],1,['wrist','back'],['surf']);
  add('c_gravitron','pull_v','back',['machine'],2);
  add('c_plank','core_anti','core',[],1);
  add('c_superman','back_ext','back',[],1);
  add('c_bosu','balance','core',[],1,[],['surf']);
  add('c_burpee','cardio','full',[],3,['knee','back','wrist'],['fatloss','explosive']);
  add('alt_smith_squat','squat','legs',['machine'],1,['knee']);
  add('alt_suitcase_carry','carry','core',['db'],1);
  add('alt_hip_thrust_bench','glute','glutes',['db','bench'],1);
  add('alt_single_leg_rdl','hinge','glutes',['db'],2);
  add('alt_reverse_lunge','lunge','legs',[],1,['knee']);
  add('alt_reverse_fly','rear','shoulders',['db'],1,[],['posture']);
  add('alt_overhead_triceps','arms_tri','arms',['db'],1,['shoulder']);
  add('alt_popup_bench','surf','full',['bench'],1,[],['surf']);
  add('alt_dead_hang','pull_v','back',['bar'],1,['shoulder'],['posture']);
  add('alt_bird_dog','core_anti','core',[],1);
  add('alt_single_leg_balance','balance','legs',[],1,[],['surf']);
  add('alt_jump_squat','squat','legs',[],3,['knee','back'],['explosive']);
  add('alt_rowing','cardio','cardio',['rower'],2,[],['fatloss']);
  /* home extras */
  add('h_bw_squat','squat','legs',[],1);
  add('h_glute_bridge','glute','glutes',[],1);
  add('h_wall_sit','squat','legs',[],1,['knee']);
  add('h_step_up','lunge','legs',['db','bench'],1,['knee']);
  add('h_knee_pushup','push_h','chest',[],1,['wrist']);
  add('h_incline_pushup','push_h','chest',['bench'],1,['wrist']);
  add('h_pike_pushup','push_v','shoulders',[],2,['shoulder','wrist']);
  add('h_chair_dip','arms_tri','arms',['bench'],2,['shoulder','wrist']);
  add('h_calf_raise','calves','legs',[],1);
  add('h_mountain_climber','cardio','core',[],2,['wrist'],['fatloss']);
  add('h_jumping_jack','cardio','cardio',[],1,['knee'],['fatloss']);
  add('h_reverse_crunch','core_flex','core',[],1,['back']);
  add('h_russian_twist','core_flex','core',[],2,['back']);
  add('h_walk','cardio','cardio',[],1,[],['fatloss']);
  add('h_db_floor_press','push_h','chest',['db'],1,['shoulder']);
  add('h_db_bent_row','pull_h','back',['db'],2,['back']);
  add('h_db_shoulder_press','push_v','shoulders',['db'],2,['shoulder','back']);
  add('h_db_lateral_raise','delts','shoulders',['db'],1,['shoulder']);
  add('h_db_hammer_curl','arms_bi','arms',['db'],1);
  add('h_db_glute_bridge','glute','glutes',['db'],1);
  add('h_band_row','pull_h','back',['band'],1);
  add('h_band_face_pull','rear','shoulders',['band'],1,[],['posture']);
  add('h_band_pushdown','arms_tri','arms',['band'],1);
  add('h_band_curl','arms_bi','arms',['band'],1);
  add('h_band_pallof','core_anti','core',['band'],1);
  add('h_pullup','pull_v','back',['bar'],3,['shoulder']);
  add('h_inverted_row','pull_h','back',['bar'],2);
  /* gym extras */
  add('g_barbell_squat','squat','legs',['barbell'],2,['back','knee']);
  add('g_deadlift','hinge','glutes',['barbell'],3,['back']);
  add('g_bench_press','push_h','chest',['barbell','bench'],2,['shoulder']);
  add('g_leg_extension','squat','legs',['machine'],1,['knee']);
  add('g_leg_curl','hinge','legs',['machine'],1);
  add('g_dips','push_h','chest',['dip'],3,['shoulder']);
  add('g_cable_crunch','core_flex','core',['cable'],2,['back']);
  add('g_hanging_knee_raise','core_flex','core',['bar'],2,['shoulder']);
  add('g_bike_easy','cardio','cardio',['bike'],1,[],['fatloss']);
  add('g_treadmill','cardio','cardio',['treadmill'],1,[],['fatloss']);
  return t;
})();

/* One swap per new exercise: same movement, other equipment (existing ALT entries are kept) */
const ALT_EXTRA = (function(){
  const pairs = {
    h_bw_squat:['a1_goblet_squat','Той самий присід, але з гантеллю перед грудьми, тож навантаження більше.'],
    h_glute_bridge:['c2_glute_bridge','Той самий місток, але на одній нозі: складніше й краще для стабілізації тазу.'],
    h_wall_sit:['h_bw_squat','Динамічний присід замість статичної стійки, коліна навантажуються менше.'],
    h_step_up:['alt_reverse_lunge','Та сама одностороння робота ніг, без лави й гантелей.'],
    h_knee_pushup:['h_incline_pushup','Той самий жим від підлоги, але з упором рук на лаву, легше й без навантаження на коліна.'],
    h_incline_pushup:['h_knee_pushup','Той самий жим від підлоги, але з колін, без лави.'],
    h_pike_pushup:['h_db_shoulder_press','Той самий жим вгору, але з гантелями стоячи.'],
    h_chair_dip:['h_band_pushdown','Те саме розгинання ліктів, але з гумкою, плечі розвантажені.'],
    h_calf_raise:['h_wall_sit','Інша робота для ніг, коли немає опори для підйому на носки.'],
    h_mountain_climber:['h_jumping_jack','Та сама кардіо-робота, але стрибки замість упору.'],
    h_jumping_jack:['h_walk','Те саме кардіо без ударного навантаження на коліна.'],
    h_reverse_crunch:['b2_dead_bug','Той самий акцент на прес без згинання шиї: dead bug.'],
    h_russian_twist:['a_side_plank','Бічна планка замість скручувань, спина працює статично.'],
    h_walk:['g_bike_easy','Те саме кардіо в розмовному темпі, але на велотренажері.'],
    h_db_floor_press:['h_incline_pushup','Той самий жимовий рух, але віджимання з упором на лаву.'],
    h_db_bent_row:['h_band_row','Та сама горизонтальна тяга, але з гумкою сидячи, поперек розвантажений.'],
    h_db_shoulder_press:['h_db_lateral_raise','Інша вправа на дельти без жиму над головою.'],
    h_db_lateral_raise:['h_band_face_pull','Та сама робота дельт і лопаток з гумкою.'],
    h_db_hammer_curl:['h_band_curl','Той самий згин рук, але з гумкою.'],
    h_db_glute_bridge:['h_glute_bridge','Той самий місток без гантелі.'],
    h_band_row:['h_db_bent_row','Та сама горизонтальна тяга, але з гантелями в нахилі.'],
    h_band_face_pull:['alt_reverse_fly','Ті самі задні дельти, але з гантелями в нахилі.'],
    h_band_pushdown:['alt_overhead_triceps','Те саме розгинання ліктів, але з гантеллю над головою.'],
    h_band_curl:['h_db_hammer_curl','Той самий згин рук, але з гантелями.'],
    h_band_pallof:['c_plank','Та сама антиротація й робота кору, але планка без гумки.'],
    h_pullup:['h_inverted_row','Та сама тяга власною вагою, але горизонтальна, легше.'],
    h_inverted_row:['h_band_row','Та сама тяга, але з гумкою сидячи.'],
    g_barbell_squat:['alt_smith_squat','Той самий присід, але у Смітті, баланс простіший.'],
    g_deadlift:['b1_rdl','Той самий hip hinge, але з гантелями й меншим навантаженням на поперек.'],
    g_bench_press:['b_chest_press','Той самий жимовий рух, але в тренажері.'],
    g_leg_extension:['b1_leg_press','Та сама робота квадрицепса, але жим ногами.'],
    g_leg_curl:['b1_rdl','Та сама задня поверхня стегна, але румунська тяга з гантелями.'],
    g_dips:['b_chest_press','Той самий жимовий рух, але в тренажері, плечі розвантажені.'],
    g_cable_crunch:['h_reverse_crunch','Той самий акцент на прес, але без блоку.'],
    g_hanging_knee_raise:['h_reverse_crunch','Той самий акцент на прес, але лежачи.'],
    g_bike_easy:['g_treadmill','Те саме кардіо, але на доріжці.'],
    g_treadmill:['g_bike_easy','Те саме кардіо, але на велотренажері.']
  };
  const out = {};
  Object.keys(pairs).forEach(k=>{ out[k]={id:pairs[k][0], why:pairs[k][1]}; });
  return out;
})();

/* Search phrases for the video/photo links */
const EXQ_EXTRA = {
  h_bw_squat:'bodyweight squat form', h_glute_bridge:'glute bridge form', h_wall_sit:'wall sit exercise',
  h_step_up:'dumbbell step up form', h_knee_pushup:'knee push up form', h_incline_pushup:'incline push up form',
  h_pike_pushup:'pike push up form', h_chair_dip:'bench dips form', h_calf_raise:'standing calf raise form',
  h_mountain_climber:'mountain climbers form', h_jumping_jack:'jumping jacks', h_reverse_crunch:'reverse crunch form',
  h_russian_twist:'russian twist form', h_walk:'brisk walking technique', h_db_floor_press:'dumbbell floor press form',
  h_db_bent_row:'bent over dumbbell row form', h_db_shoulder_press:'standing dumbbell shoulder press form',
  h_db_lateral_raise:'dumbbell lateral raise form', h_db_hammer_curl:'hammer curl form', h_db_glute_bridge:'dumbbell glute bridge',
  h_band_row:'seated resistance band row', h_band_face_pull:'resistance band face pull', h_band_pushdown:'resistance band triceps pushdown',
  h_band_curl:'resistance band biceps curl', h_band_pallof:'band pallof press', h_pullup:'pull up proper form',
  h_inverted_row:'inverted row form', g_barbell_squat:'barbell back squat form', g_deadlift:'conventional deadlift form',
  g_bench_press:'barbell bench press form', g_leg_extension:'leg extension machine form', g_leg_curl:'lying leg curl machine form',
  g_dips:'parallel bar dips form', g_cable_crunch:'cable crunch form', g_hanging_knee_raise:'hanging knee raise form',
  g_bike_easy:'stationary bike proper setup', g_treadmill:'treadmill walking setup'
};

/* Photos from the shed catalog (ids of yuhonas/free-exercise-db). Only exact or close matches. */
const PIC_EXTRA = {
  h_bw_squat:'Bodyweight_Squat', h_glute_bridge:'Butt_Lift_Bridge', h_step_up:'Dumbbell_Step_Ups',
  h_chair_dip:'Bench_Dips', h_mountain_climber:'Mountain_Climbers', h_reverse_crunch:'Reverse_Crunch',
  h_russian_twist:'Russian_Twist', h_calf_raise:'Standing_Calf_Raises', h_db_floor_press:'Dumbbell_Bench_Press',
  h_db_bent_row:'Bent_Over_Two-Dumbbell_Row', h_db_shoulder_press:'Standing_Dumbbell_Press',
  h_db_lateral_raise:'Side_Lateral_Raise', h_db_hammer_curl:'Hammer_Curls', h_db_glute_bridge:'Butt_Lift_Bridge',
  h_band_row:'Band_Pull_Apart', h_pullup:'Pullups', h_inverted_row:'Inverted_Row',
  g_barbell_squat:'Barbell_Full_Squat', g_deadlift:'Barbell_Deadlift', g_bench_press:'Barbell_Bench_Press_-_Medium_Grip',
  g_leg_extension:'Leg_Extensions', g_leg_curl:'Lying_Leg_Curls', g_dips:'Dips_-_Chest_Version',
  g_cable_crunch:'Cable_Crunch', g_hanging_knee_raise:'Hanging_Leg_Raise'
};
const PIC_APPROX_EXTRA = ['h_glute_bridge','h_calf_raise','h_db_floor_press','h_db_glute_bridge','h_band_row','g_hanging_knee_raise'];
