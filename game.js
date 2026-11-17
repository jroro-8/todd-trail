'use strict';
/* ============================================================
   THE TODD TRAIL — a St. Augustine survival adventure
   Prep for 14 days, then lead the crew to the Wawa on US-1.
   ============================================================ */

const $ = s => document.querySelector(s);
const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const chance = p => Math.random() < p;
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.floor(n);

const SAVE_KEY = 'toddtrail-save-v1';
const HOF_KEY = 'toddtrail-hof-v1';
const PREP_DAYS = 14;
const START_DATE = new Date(2026, 10, 17);
const MEMBERS = ['Todd', 'Kirsten', 'Jennifer', 'DJ', 'Jon'];
const FULL = { Todd: 'Todd', Kirsten: 'Kirsten', Jennifer: 'Jennifer', DJ: 'DJ', Jon: 'Jon Galluzzo' };

const LANDMARKS = [
  { id: 'home', name: "Todd's Compound (off SR-16)", mile: 0 },
  { id: 'publix', name: 'Publix on SR-16', mile: 6 },
  { id: 'outlets', name: 'The Outlet Mall Bazaar', mile: 12 },
  { id: 'fountain', name: 'Fountain of Youth', mile: 19 },
  { id: 'castillo', name: 'Castillo de San Marcos', mile: 24 },
  { id: 'stgeorge', name: 'St. George Street', mile: 28 },
  { id: 'bridge', name: 'Bridge of Lions', mile: 32 },
  { id: 'gators', name: 'St. Augustine Alligator Farm', mile: 37 },
  { id: 'lighthouse', name: 'St. Augustine Lighthouse', mile: 41 },
  { id: 'bridge312', name: 'SR-312 Bridge', mile: 47 },
  { id: 'wawa', name: 'THE WAWA on US-1', mile: 55 },
];
const TOTAL_MILES = LANDMARKS[LANDMARKS.length - 1].mile;

const PACES = [
  { name: 'Steady', mi: 4, dmg: 0 },
  { name: 'Strenuous', mi: 6, dmg: 2 },
  { name: 'Grueling', mi: 8, dmg: 5 },
];
const RATIONS = [
  { name: 'Filling', lb: 2, dmg: -2 },
  { name: 'Meager', lb: 1.5, dmg: 1 },
  { name: 'Bare bones', lb: 1, dmg: 4 },
];
const WEATHER = [
  { name: `82°F and sticky. It's December. Florida does not care.`, hot: true, w: 4 },
  { name: 'sunny and warm', hot: true, w: 2 },
  { name: 'afternoon thunderstorms', rain: true, w: 2 },
  { name: 'cold front: 52°F. Locals are wearing parkas.', w: 2 },
  { name: 'a perfect 72°F', w: 2 },
];
const AILMENTS = [
  { text: 'has heat exhaustion.', dmg: 18 },
  { text: 'got eaten alive by mosquitoes.', dmg: 10 },
  { text: 'stepped in a fire ant mound.', dmg: 12 },
  { text: 'has a terrible sunburn.', dmg: 10 },
  { text: 'ate gas station sushi. Regrets everything.', dmg: 18 },
  { text: 'has dysentery. (It was the creek water.)', dmg: 22 },
  { text: 'stubbed a toe on a solar panel.', dmg: 8 },
  { text: `has a sinus thing. It's Florida.`, dmg: 8 },
  { text: 'got a no-see-um bite in a very bad place.', dmg: 10 },
];
const LEAVE = {
  Kirsten: `Kirsten has had ENOUGH. She flags down her cousin's pontoon boat and heads for her mom's place in Palm Coast. "Call me when the lights are back on, Todd."`,
  Jennifer: `Jennifer, who is somewhere between 94 and 107 depending on who you ask, announces it is past her bedtime. She clips in and pedals home at a steady 6 mph. She'll be fine. She survived the Spanish flu.`,
  DJ: `DJ flags down a passing airboat, yells "I'LL SEE YOU AT DJ & LINDSEY!" and is gone. His hat is the last thing you see.`,
  Jon: `Jon Galluzzo is too exhausted to keep looking this good. He retreats to a friend's porch to recover. (He still looks great.)`,
};

let S = null;
let soundOn = true;
let currentChoices = [];
let busy = false;

/* ---------------- sound ---------------- */
let actx = null;
function beep(freq = 440, dur = 0.05, type = 'square', vol = 0.04) {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(actx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.stop(actx.currentTime + dur + 0.02);
  } catch (e) { /* no audio */ }
}
const blip = () => beep(660, 0.04);
const bang = () => { beep(110, 0.18, 'sawtooth', 0.09); beep(70, 0.12, 'square', 0.05); };
const fanfare = () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.14, 'square', 0.05), i * 130));
const sad = () => [392, 330, 262].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.07), i * 220));

/* ---------------- state ---------------- */
const BACKGROUNDS = [
  { name: 'Office Prepper', desc: 'Steady paycheck. Color-coded spreadsheets.', money: 900, marksman: 0, mult: 1 },
  { name: 'Weekend Warrior', desc: 'Owns tactical pants. Has been to the range. Points ×1.5', money: 650, marksman: 1, mult: 1.5 },
  { name: 'Total Wildcard', desc: 'Bought a generator on a store credit card. Points ×2', money: 400, marksman: 0, mult: 2 },
];

function newState(bg) {
  const s = {
    bg: bg.name, scoreMult: bg.mult, phase: 'prep', day: 1, money: bg.money,
    water: 5, food: 10, cake: 2, ammo: 20, meds: 0, gas: 8,
    panels: 0, panelsInstalled: 0, batteries: 0, spareTire: 0, rainBarrel: 0, bugSpray: 0, bikeParts: 0, cleaningKit: 0,
    morale: 65, kirsten: 50, jenn: 0, djShifts: 0, djLoyal: 0, metJon: false, marksman: bg.marksman,
    kirstenShoots: false, purify: false, bikeRepair: false, radioSetup: false, intel: {}, tip: 0,
    party: {}, hat: true,
    tday: 0, miles: 0, lm: 0, pace: 0, rations: 0, weather: null, lastLog: [],
    radioDay: -1, tradeDay: -1, jonLate: false, lastEvent: -1,
    met: {}, alexStole: 0, cakeSafe: false, kelseyTrust: 0,
  };
  MEMBERS.forEach(n => s.party[n] = { hp: 100, in: n === 'Todd' || n === 'Kirsten', gone: false });
  return s;
}

const has = n => S && S.party[n] && S.party[n].in && !S.party[n].gone;
const active = () => MEMBERS.filter(has);
function hurt(n, amt) { if (has(n)) S.party[n].hp = clamp(S.party[n].hp - amt, 0, 100); }
function healAll(amt) { active().forEach(n => S.party[n].hp = clamp(S.party[n].hp + amt, 0, 100)); }
function hurtAll(amt) { active().forEach(n => hurt(n, amt)); }
function mood(d) { S.morale = clamp(S.morale + d, 0, 100); }
function hpWord(hp) { return hp > 70 ? 'good' : hp > 45 ? 'fair' : hp > 20 ? 'poor' : 'very poor'; }
function moraleWord() { const m = S.morale; return m > 75 ? 'fired up' : m > 50 ? 'pretty good' : m > 25 ? 'grumbly' : 'mutinous'; }
function partyHealth() { const a = active(); if (!a.length) return '—'; return hpWord(a.reduce((t, n) => t + S.party[n].hp, 0) / a.length); }
function dateStr(offset) { const d = new Date(START_DATE); d.setDate(d.getDate() + offset); return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const radioPowered = () => S.radioSetup && (S.panelsInstalled > 0 || S.batteries > 0);

/* ---------------- save ---------------- */
function save(where) { S.resume = where; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function loadSave() { try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
const RESUME = { prepHub: () => { S.met = S.met || {}; S.alexStole = S.alexStole || 0; prepHub(); }, trailHub: () => { S.met = S.met || {}; S.alexStole = S.alexStole || 0; trailHub(); } };

/* ---------------- UI ---------------- */
function statusBar() {
  if (!S || S.phase === 'end' || S.phase === 'title') return '';
  const date = S.phase === 'prep' ? dateStr(S.day - 1) : dateStr(PREP_DAYS + S.tday);
  const cells = [['Cash', '$' + fmt(S.money)], ['Water', fmt(S.water) + ' gal'], ['Food', fmt(S.food) + ' lb'],
    ['Cake', S.cake + ' sl'], ['Ammo', S.ammo], ['Gas', fmt(S.gas) + ' gal'], ['Morale', moraleWord()]];
  return `<div class="status"><div class="date">${date}</div><div class="cells">${cells.map(([k, v]) => `<span><b>${k}</b> ${v}</span>`).join('')}</div></div>`;
}

function scene({ title = '', text = '', html = '', extra = '', choices = [], after = null }) {
  const el = $('#screen');
  el.innerHTML = `${statusBar()}${extra}${title ? `<h2>${title}</h2>` : ''}${text ? `<div class="text">${text}</div>` : ''}${html}
    <div class="choices">${choices.map((c, i) => `<button class="choice" data-i="${i}" ${c.disabled ? 'disabled' : ''}><span class="num">${choices.length > 1 ? (i + 1) + '.' : '▶'}</span>${c.label}${c.note ? ` <span class="note">${c.note}</span>` : ''}</button>`).join('')}</div>`;
  currentChoices = choices;
  el.querySelectorAll('button.choice').forEach(b => b.addEventListener('click', () => choose(+b.dataset.i)));
  window.scrollTo(0, 0);
  if (after) after(el);
}
function choose(i) {
  const c = currentChoices[i];
  if (!c || c.disabled || busy) return;
  blip(); currentChoices = []; c.fn();
}
document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (/^[1-9]$/.test(e.key)) choose(+e.key - 1);
  else if (e.key === '0') choose(9);
  else if ((e.key === 'Enter' || e.key === ' ') && currentChoices.length === 1) { e.preventDefault(); choose(0); }
});
function say(title, text, next, label = 'Continue') { scene({ title, text, choices: [{ label, fn: next }] }); }

/* ============================================================
   TITLE
   ============================================================ */
function title() {
  S = null; busy = false;
  const saved = loadSave();
  scene({
    extra: `<div class="logo"><div class="logo-top">THE</div><div class="logo-main">TODD TRAIL</div><div class="logo-sub">A St. Augustine Survival Adventure</div></div><canvas id="titleCanvas" class="scenecv" width="320" height="100"></canvas>`,
    text: `<br>Todd knows something the rest of us don't: <b>the grid is going down.</b> He has 14 days to prep — water, food, ammo, solar panels, and as much white cake as one man can store — before he leads his crew across St. Augustine to the last lit sign in town.<br><br>You may:`,
    choices: [
      { label: 'Travel the trail', fn: chooseBackground },
      saved && saved.resume ? { label: 'Continue saved game', note: saved.phase === 'prep' ? `(prep day ${saved.day})` : `(${fmt(saved.miles)} of ${TOTAL_MILES} miles)`, fn: () => { S = saved; RESUME[S.resume](); } } : null,
      { label: 'Learn about the trail', fn: howTo },
      { label: 'See the Wawa Hall of Fame', fn: () => hallOfFame(title) },
      { label: `Turn sound ${soundOn ? 'off' : 'on'}`, fn: () => { soundOn = !soundOn; title(); } },
    ].filter(Boolean),
    after: () => animateScene('titleCanvas', true),
  });
}

function howTo() {
  say('Learn About the Trail', `<b>PART 1 — THE PREP (14 days).</b> Each day Todd does one thing: work a shift for DJ to earn cash, shop, practice at the range, install solar panels, set up the ham radio to reach Matt, keep Kirsten happy, learn survival skills from Jennifer, or fill every container in the house with water.<br><br>
<b>PART 2 — THE TRAIL (${TOTAL_MILES} miles).</b> The grid goes down. Lead the crew across St. Augustine to the Wawa on US-1. Everyone drinks about a gallon of water a day and eats 1–2 lb of food. Set your pace and rations, hunt, trade, rest, and handle whatever Florida throws at you.<br><br>
<b>TIPS.</b> Solar panels power the ham radio and keep the food cold. Matt's intel helps you dodge trouble. Jon Galluzzo gets better deals from everyone. DJ must not lose his hat. White cake fixes morale. Eliza is very open-minded. West is wise. Kelsey is "from Ohio." And watch out for Alex — every slice of cake she steals is a demerit on your final score. Nobody gets left behind if you can help it.`, title, 'Back');
}

function chooseBackground() {
  scene({
    title: 'Many kinds of Todd could make this trip.',
    text: 'Which Todd are you?',
    choices: BACKGROUNDS.map(b => ({ label: `${b.name} — $${b.money}`, note: b.desc, fn: () => { S = newState(b); intro(); } }))
      .concat([{ label: 'What is the difference?', fn: () => say('The Difference', 'The <b>Office Prepper</b> starts with the most cash. The <b>Weekend Warrior</b> starts with range experience (better hunting) and earns 1.5× points. The <b>Total Wildcard</b> starts nearly broke but earns double points at the Wawa.', chooseBackground) }]),
  });
}

function intro() {
  say('Day 1', `It is ${dateStr(0)}. Todd is leaning against his black Jeep Gladiator, staring at a power line. It hums. It is <i>judging</i> him.<br><br>
Todd's ham radio buddy Matt — a conspiracy theorist with a garage full of ammo — has heard "chatter." Todd's gut agrees. In <b>14 days</b>, Todd believes, the grid will go down — and when it does, the whole town will head for the one place in St. Augustine with industrial generators, hot coffee and an endless supply of hoagies:<br><br>
<span class="hl">THE WAWA ON US-1.</span><br><br>
Each day, choose one thing to do. Prep wisely. And never, ever run out of white cake.`, prepHub, 'Begin prepping');
}

/* ============================================================
   PART 1 — PREP
   ============================================================ */
const PREP_FLAVOR = [
  'Todd wakes at 4:45 AM and does 20 push-ups next to his water barrels.',
  'Todd has started referring to the pantry as "the Armory of Beans."',
  'A transformer down the street makes a weird noise. Todd writes it down in a notebook labeled EVIDENCE.',
  `Kirsten asks why there's a crank radio in the shower. Todd says "for emergencies." She says "in the shower?"`,
  'Todd watches a 3-hour YouTube video titled "Grid Down: Day One (Florida Edition)." He takes notes.',
  'Todd tells the mail carrier to "stay safe out there." The mail carrier is confused.',
  'Todd re-labels every jug in the garage with the date and his initials. Twice.',
  'A peacock is standing on Todd\'s Jeep Gladiator. Todd takes it as an omen.',
  'Todd stares out the window at the pool he dug himself. It has been "almost done" since 2023. A frog lives there now. Todd has named him Gerald.',
  'Kirsten asks when the pool will be finished. Todd says "after the grid goes down." Kirsten does not understand the answer.',
  'Todd measures the hole in the backyard again. Still a hole. Still his.',
];

function prepHub() {
  S.phase = 'prep'; busy = false;
  if (S.day > PREP_DAYS) return gridDown();
  save('prepHub');
  const left = PREP_DAYS - S.day + 1;
  const uninstalled = S.panels - S.panelsInstalled;
  scene({
    title: `Day ${S.day} — ${left} day${left > 1 ? 's' : ''} until the grid goes down`,
    text: `<i>(according to Todd)</i><br>${pick(PREP_FLAVOR)}<br><br>What will Todd do today?`,
    choices: [
      { label: 'Work a shift at DJ & Lindsey', note: '(DJ pays cash)', fn: workShift },
      { label: 'Shop at Publix', note: '(water, food, WHITE CAKE)', fn: () => store('publix') },
      { label: 'Shop at Home Depot', note: '(solar, gas, batteries)', fn: () => store('depot') },
      { label: 'Shop at Ancient City Arms & Ammo', note: '(ammo)', fn: () => store('guns') },
      { label: 'Practice at the gun range', fn: range },
      { label: 'Install solar panels', note: uninstalled > 0 ? `(${uninstalled} ready)` : '(buy panels at Home Depot first)', disabled: uninstalled <= 0, fn: solar },
      { label: S.radioSetup ? 'Get on the ham radio with Matt' : 'Set up the ham radio to reach Matt', fn: hamRadio },
      { label: 'Date night with Kirsten', fn: dateNight },
      { label: 'Bike day with Jennifer', fn: bikeDay },
      { label: 'Fill every container with water', fn: waterDay },
      { label: 'Work on the unfinished pool', note: S.poolCistern ? '(now a cistern)' : '(dug it himself)', fn: poolDay },
      { label: 'Check supplies & crew', note: '(free)', fn: () => supplies(prepHub) },
    ],
  });
}

function nextDay() {
  S.day++;
  if (S.day > PREP_DAYS) return gridDown();
  if (chance(0.5)) return nightEvent();
  prepHub();
}
function outcome(t, text) { say(t, text, nextDay, 'Call it a day'); }

/* ---- Work ---- */
function workShift() {
  S.djShifts++;
  const pay = 150;
  const variants = [
    () => scene({
      title: 'DJ & Lindsey HQ', text: `Todd clocks in at DJ & Lindsey Real Estate. At 9:04 AM, DJ kicks the door open wearing a brand-new hat. "TODD! BIG DAY! HUGE DAY!" Nobody knows why it's a big day. It's never clear.`,
      choices: [
        { label: 'Hustle all day', note: `(+$${pay + 50})`, fn: () => { S.money += pay + 50; mood(-5); outcome('The Grind', `Todd works like a machine. DJ yells "THAT'S WHAT I'M TALKING ABOUT" eleven times. +$${pay + 50}.`); } },
        { label: 'Tell DJ the grid is going down', fn: () => { S.money += pay; if (chance(0.55)) { S.money += 100; S.djLoyal++; outcome('DJ Is In', `DJ's eyes go wide. "Todd. TODD. I've been SAYING this." He pulls $100 cash out of his hat. "Prepping bonus." +$${pay + 100}.`); } else { mood(-5); outcome('DJ Laughs', `DJ laughs so hard his hat falls off. He picks it up, puts it back on, and laughs again. +$${pay}.`); } } },
        { label: 'Duck out early for "a dentist appointment"', fn: () => { S.money += pay / 2; S.water += 10; outcome('The Dentist', `Todd's "dentist" is the water aisle at Publix. +$${pay / 2}, +10 gallons of water.`); } },
      ],
    }),
    () => scene({
      title: 'Team Building', text: 'DJ has announced a mandatory team-building exercise: paddleboarding on the Intracoastal. In hats. DJ will be wearing two hats.',
      choices: [
        { label: `Go — it's basically survival training`, fn: () => { S.money += pay; mood(10); hurt('Todd', 5); outcome('Paddle Prepper', `Todd falls in twice but discovers he can paddle a mile while holding a cooler. Valuable skill. +$${pay}.`); } },
        { label: 'Stay at your desk and vibe-code a bug-out app', fn: () => { S.money += pay; S.food += 5; outcome('Ship It', `Todd builds an app that tracks every can of beans in his house. It has a dark mode. The spreadsheet behind it has 14 tabs. Todd finds a canned-goods coupon in tab 9. +$${pay}, +5 lb food.`); } },
      ],
    }),
    () => {
      S.money += pay;
      if (!S.metJon) {
        S.metJon = true;
        outcome('A Visitor', `Around 2 PM the whole DJ & Lindsey office goes quiet. Even the keyboards stop. Someone has walked in. Strong jaw. Great hair. Somehow lit from slightly above at all times.<br><br>"Jon Galluzzo," he says, shaking Todd's hand. Todd hears a faint choir.<br><br>Todd tells Jon about the grid. Jon nods thoughtfully. "I'm in. I look great by candlelight."<br><br><b>Jon Galluzzo will join your crew.</b> +$${pay}.`);
      } else {
        S.money += 25;
        outcome('Normal Day', `A normal day at DJ & Lindsey. Everyone pushed code to production on a Friday. DJ wore a hat. Matt explained that Publix knows something. Jennifer, who is very, very old, biked in at 5 AM and has already done a crossword in pen. +$${pay + 25}.`);
      }
    },
    () => scene({
      title: 'Code Red: The Hat', text: `DJ storms out of his office. "WHERE. IS. MY. HAT." He is hatless. It is deeply unsettling. Nobody can focus.`,
      choices: [
        { label: 'Organize a search party', fn: () => { S.money += pay; S.djLoyal += 2; outcome('Found It', `Todd finds the hat in the break room fridge next to someone's yogurt. DJ hugs Todd for an uncomfortably long time. "I owe you one, Todd." +$${pay}. <b>DJ will remember this.</b>`); } },
        { label: 'Keep your head down and work', fn: () => { S.money += pay; outcome('Head Down', `Todd keeps working. Jennifer, who has been finding lost hats since the Truman administration, finds it in four seconds. DJ names her "Chief Hat Officer." +$${pay}.`); } },
      ],
    }),
  ];
  pick(variants)();
}

/* ---- Stores ---- */
const STORES = {
  publix: {
    name: 'Publix (SR-16)', blurb: `"Where shopping is a pleasure." The bakery smells like destiny.`, items: [
      { k: 'water', label: 'Water (gallon)', price: 1.5, step: 5 },
      { k: 'food', label: 'Canned food (lb)', price: 2, step: 5 },
      { k: 'cake', label: 'White cake (slice)', price: 4, step: 1 },
      { k: 'sheet', label: 'WHITE SHEET CAKE (24 slices)', price: 45, step: 1 },
      { k: 'meds', label: 'First-aid kit', price: 20, step: 1 },
    ]
  },
  depot: {
    name: 'Home Depot (US-1)', blurb: `An orange-aproned associate watches Todd's cart fill with rope, tarps and zip ties. "Big project?" "...Yes."`, items: [
      { k: 'panels', label: 'Solar panel', price: 150, step: 1 },
      { k: 'batteries', label: 'Battery bank', price: 120, step: 1 },
      { k: 'gas', label: 'Gas (gallon, with can)', price: 5, step: 5 },
      { k: 'spareTire', label: 'Spare Jeep tire', price: 90, step: 1 },
      { k: 'rainBarrel', label: 'Rain barrel', price: 60, step: 1, max: 1 },
      { k: 'bugSpray', label: 'Bug spray', price: 8, step: 1 },
    ]
  },
  guns: {
    name: 'Ancient City Arms & Ammo', blurb: `A man with a magnificent beard nods slowly. "Prepping?" Todd: "...No." The man: "Mm-hm."`, items: [
      { k: 'ammo', label: 'Ammo (box of 20)', price: 15, step: 1, mult: 20 },
      { k: 'cleaningKit', label: 'Gun cleaning kit (better aim)', price: 25, step: 1, max: 1 },
    ]
  },
  bazaar: {
    name: 'The Outlet Mall Bazaar', blurb: 'Grid-down prices. The guy running it is wearing four pairs of designer sunglasses.', items: [
      { k: 'water', label: 'Water (gallon)', price: 4, step: 5 },
      { k: 'food', label: 'Food (lb)', price: 4, step: 5 },
      { k: 'gas', label: 'Gas (gallon)', price: 12, step: 1 },
      { k: 'ammo', label: 'Ammo (box of 20)', price: 30, step: 1, mult: 20 },
      { k: 'meds', label: 'First-aid kit', price: 40, step: 1 },
      { k: 'bikeParts', label: 'Bike part', price: 20, step: 1 },
    ]
  },
  pirate: {
    name: `Pirate Pete's Post-Apocalypse Provisions`, blurb: `"Arrr. Cash only. Also, do ye have any cake?"`, items: [
      { k: 'water', label: 'Water (gallon)', price: 5, step: 5 },
      { k: 'food', label: 'Food (lb)', price: 5, step: 5 },
      { k: 'meds', label: 'First-aid kit', price: 45, step: 1 },
      { k: 'spareTire', label: 'Spare tire (from a golf cart?)', price: 80, step: 1 },
      { k: 'hat', label: 'Pirate hat (for DJ)', price: 25, step: 1, max: 1 },
    ]
  },
};

function ownedOf(k) {
  if (k === 'sheet' || k === 'cake') return S.cake + ' slices';
  if (k === 'ammo') return S.ammo + ' rounds';
  if (k === 'hat') return S.hat ? 'DJ has a hat' : 'DJ is hatless';
  if (k === 'panels') return `${S.panels} (${S.panelsInstalled} installed)`;
  return fmt(S[k] || 0);
}

function store(id, back) {
  const st = STORES[id];
  const cart = {}; st.items.forEach(i => cart[i.k] = 0);
  const jon = S.phase === 'prep' ? S.metJon : has('Jon');
  const disc = jon ? 0.9 : 1;
  const price = i => Math.round(i.price * disc * 100) / 100;
  const total = () => st.items.reduce((t, i) => t + cart[i.k] * price(i), 0);
  const maxFor = i => {
    if (i.k === 'hat') return S.hat || !has('DJ') ? 0 : 1;
    return i.max != null ? Math.max(0, i.max - (S[i.k] || 0)) : Infinity;
  };
  const leave = bought => {
    if (back) return back();
    if (bought) return outcome('Loaded Up', `Todd loads the Jeep. ${pick(['Kirsten raises an eyebrow at the receipt.', 'The Jeep sits noticeably lower.', 'Todd hums the Rocky theme the whole drive home.', 'A neighbor waves. Todd waves back, suspiciously.'])}`);
    prepHub();
  };
  function render() {
    const t = total();
    const rows = st.items.map(i => `<tr><td>${i.label}<div class="own">You have: ${ownedOf(i.k)}</div></td><td class="price">$${price(i).toFixed(2)}${i.step > 1 ? '/ea' : ''}</td><td class="qty"><button class="q" data-k="${i.k}" data-d="-1" aria-label="less">−</button><span>${cart[i.k]}</span><button class="q" data-k="${i.k}" data-d="1" aria-label="more">+</button></td></tr>`).join('');
    scene({
      title: st.name,
      text: `${st.blurb}${jon ? '<br><span class="hl">Jon Galluzzo smiled at the cashier. 10% off everything.</span>' : ''}`,
      html: `<table class="store">${rows}</table><div class="total">Bill: $${t.toFixed(2)} &nbsp;|&nbsp; Cash: $${fmt(S.money)}${t > S.money ? ' <span class="bad">(not enough cash)</span>' : ''}</div>`,
      choices: [
        { label: 'Check out', note: S.phase === 'prep' && !back ? '(uses the day)' : '', disabled: t <= 0 || t > S.money, fn: checkout },
        { label: 'Leave without buying', fn: () => leave(false) },
      ],
      after: el => el.querySelectorAll('button.q').forEach(b => b.addEventListener('click', () => {
        const it = st.items.find(x => x.k === b.dataset.k);
        let v = cart[it.k] + (+b.dataset.d) * (it.step || 1);
        v = Math.min(v, maxFor(it));
        cart[it.k] = Math.max(0, v); blip(); render();
      })),
    });
  }
  function checkout() {
    S.money -= total();
    st.items.forEach(i => {
      const q = cart[i.k]; if (!q) return;
      if (i.k === 'sheet') S.cake += 24 * q;
      else if (i.k === 'hat') { S.hat = true; mood(15); }
      else S[i.k] = (S[i.k] || 0) + q * (i.mult || 1);
    });
    if (cart.hat) return say('A New Hat', `DJ puts on the pirate hat. He looks in a car window. He nods. "This is who I am now." DJ is himself again.`, () => leave(true));
    leave(true);
  }
  render();
}

/* ---- Range ---- */
function range() {
  scene({
    title: 'The Gun Range',
    text: `Todd signs the waiver, puts on eye and ear protection, and listens to the range safety officer like a model citizen. Marksmanship: ${stars(S.marksman)}${!S.metJon ? `<br><br>In lane 4, a stranger with perfect hair is shooting tight groups. The fluorescent lights seem to dim out of respect.` : ''}`,
    choices: [
      { label: 'Practice', note: S.ammo >= 20 ? '(uses 20 rounds)' : '(need 20 rounds)', disabled: S.ammo < 20 || S.marksman >= 3, fn: () => { S.ammo -= 20; S.marksman = Math.min(3, S.marksman + 1); outcome('Practice', `Todd's groups tighten up. Marksmanship: ${stars(S.marksman)}. Hunting on the trail will be easier.`); } },
      { label: 'Take the fundamentals class ($40)', disabled: S.money < 40 || S.marksman >= 3, fn: () => { S.money -= 40; S.marksman = Math.min(3, S.marksman + 1); mood(5); outcome('Class Dismissed', `A retired Marine named Gunny teaches safety, stance and breathing. Todd takes notes in his EVIDENCE notebook. Marksmanship: ${stars(S.marksman)}.`); } },
      !S.metJon && { label: 'Introduce yourself to lane 4', fn: () => { S.metJon = true; outcome('Lane 4', `"Jon Galluzzo," he says, and a ceiling fan turns on by itself.<br><br>Todd explains the grid situation. Jon listens like it's the most important thing he's ever heard. "Count me in. I look great by candlelight."<br><br><b>Jon Galluzzo will join your crew.</b> Shopkeepers will now give you 10% off.`); } },
      { label: 'Never mind', fn: prepHub },
    ].filter(Boolean),
  });
}

/* ---- Solar ---- */
function solar() {
  const n = S.panels - S.panelsInstalled;
  scene({
    title: 'Solar Panel Installation',
    text: `Todd has ${n} panel${n > 1 ? 's' : ''} leaning against the garage. The plan: mount them on a rack over the Jeep's bed, so the power goes wherever the crew goes. Panels will run the ham radio, the fans and the cooler.`,
    choices: [
      { label: 'DIY it — Kirsten holds the ladder', fn: () => { if (chance(0.7)) { S.panelsInstalled = S.panels; mood(10); S.kirsten -= 5; outcome('Success!', `All ${n} panel(s) installed. Kirsten held the ladder for four hours and would like that on the record.`); } else { const half = Math.ceil(n / 2); S.panelsInstalled += half; hurt('Todd', 20); outcome('The Azalea Incident', `Todd installs ${half} panel(s), then falls off the ladder into the azaleas. Todd is hurt. The azaleas did not survive.`); } } },
      { label: `Hire "DJ's guy" ($100)`, disabled: S.money < 100, fn: () => { S.money -= 100; S.panelsInstalled = S.panels; S.djLoyal++; outcome(`DJ's Guy`, `"DJ's guy" turns out to be DJ, wearing a hard hat over his regular hat. The panels are installed perfectly. He also installed a disco ball in the garage. "You're welcome, Todd."`); } },
      { label: 'Ask Jennifer (she bikes over with a drill in her basket, at age 96)', fn: () => { S.jenn++; if (chance(0.9)) { S.panelsInstalled = S.panels; outcome('Pedal Power', `Jennifer arrives with a cordless drill, a level and a thermos of Sanka, all in a bike basket. She has been installing things since before electricity was popular. Panels mounted in an hour. She also adjusts Todd's Jeep mirrors "because they were bothering her."`); } else { S.panelsInstalled += Math.ceil(n / 2); outcome('Half Done', `Jennifer gets half the panels up before a thunderstorm rolls in. She bikes home in the rain, grinning.`); } } },
    ],
  });
}

/* ---- Ham radio ---- */
const INTEL = {
  wawa: `Matt confirms the Wawa on US-1 has industrial generators. "If the grid goes, Todd, that Wawa will be the last lit sign in St. Augustine. Hoagies, Todd. Hoagies forever. Over."`,
  boat: `Matt knows a shrimp boat captain who docks near the Bridge of Lions. "Captain Ray. Tell him Matt sent you. He takes cake. Over." <span class="hl">(The bridge crossing will be cheaper.)</span>`,
  gators: `Matt warns that the Alligator Farm's gate locks are electric. "If the power goes, Todd... so do the gates. Over." <span class="hl">(You'll be ready at the Alligator Farm.)</span>`,
  hogs: `Matt says the feral hogs are thick out past the outlets. "Bring ammo. Over." <span class="hl">(Hunting will yield more.)</span>`,
  cake: `Matt heard the SR-16 Publix bakery keeps an emergency stash of white sheet cakes in the walk-in. "Don't ask how I know. Over." <span class="hl">(Search the Publix bakery on the trail!)</span>`,
  bridge312: `Matt says a man in a lawn chair has been "collecting tolls" on the SR-312 bridge. "He's a sucker for compliments. Over." <span class="hl">(Remember that.)</span>`,
};
function giveIntel(night) {
  const next = night ? prepHub : nextDay;
  const left = Object.keys(INTEL).filter(k => !S.intel[k]);
  mood(4);
  if (!left.length) return say('Ham Radio', `Matt talks for three hours about how pelicans are surveillance drones run by the Department of Fish and Wildlife. Todd understands about 12% of it. Some of it makes a disturbing amount of sense.`, next);
  const k = pick(left); S.intel[k] = true;
  say(night ? 'Late-Night Transmission' : 'On the Air with Matt', `<i>*kssshhht*</i> "Todd, this is Matt, over."<br><br>${INTEL[k]}`, next);
}
function hamRadio() {
  if (S.radioSetup) return giveIntel(false);
  scene({
    title: 'The Ham Radio',
    text: `Todd's coworker Matt has been a licensed ham operator since before it was cool (it has never been cool). He does not trust cell phones ("they listen"), birds ("they're not real") or the moon ("too convenient"). He also owns more ammunition than some small nations. When the cell towers go down, Matt's voice will be the only news Todd trusts. First, Todd needs an antenna.`,
    choices: [
      { label: 'Put up a 40-foot antenna in the backyard', fn: () => { S.radioSetup = true; S.kirsten -= 10; mood(10); outcome('Antenna Up', `The antenna is enormous. Planes now route around the neighborhood. Kirsten is NOT happy about the view. But the signal is perfect: "Todd, this is Matt. You're coming in five-by-nine. Over."<br><br><b>Matt is now your radio contact.</b> On the trail, you'll need solar panels or a battery bank to power the radio.`); } },
      { label: 'Hide a modest wire antenna in the attic', fn: () => { S.radioSetup = true; mood(5); hurt('Todd', 5); outcome('Stealth Mode', `Todd crawls through 130-degree attic insulation to string the wire. It works! "Todd, this is Matt. You sound like you're inside a microwave. Over."<br><br><b>Matt is now your radio contact.</b> On the trail, you'll need solar panels or a battery bank to power the radio.`); } },
      { label: 'Never mind', fn: prepHub },
    ],
  });
}

/* ---- Kirsten ---- */
function kirstenHint() {
  const k = S.kirsten;
  return k >= 70 ? 'Things are great between them.' : k >= 40 ? 'Things are... fine. Mostly. She has asked about the pool 41 times.' : k >= 25 ? 'She has started saying "Todd." in a very flat voice.' : 'She has started looking at apartments in Palm Coast.';
}
function dateNight() {
  scene({
    title: 'Date Night with Kirsten',
    text: `Kirsten has been extremely patient about the water jugs in the living room. ${kirstenHint()} Tonight is about her.`,
    choices: [
      { label: 'Romantic dinner on St. George Street ($80)', disabled: S.money < 80, fn: () => { S.money -= 80; S.kirsten += 25; mood(10); outcome('Candlelight', 'Live music, twinkle lights, a horse-drawn carriage clopping by. Todd only mentions the grid twice. Personal record. Kirsten is glowing.'); } },
      { label: 'Sunset picnic at Vilano Beach with white cake', note: '(2 slices)', disabled: S.cake < 2, fn: () => { S.cake -= 2; S.kirsten += 20; mood(15); outcome('Golden Hour', `The sun drops behind the Vilano bridge. They split two slices of white cake. Kirsten rests her head on Todd's shoulder. Todd thinks, "This is what I'm prepping for." He does not say it out loud. Good call.`); } },
      { label: 'Show her the bunker inventory spreadsheet', fn: () => { if (chance(0.35)) { S.kirsten += 15; S.meds += 2; outcome('Unexpected Success', `Kirsten scrolls through all 14 tabs... and starts color-coding. "You don't have nearly enough first-aid kits, babe." She buys two. She's in. +2 first-aid kits.`); } else { S.kirsten -= 15; outcome('Wrong Move', `"You made a pivot table... of beans?" Kirsten goes to bed early.`); } } },
      { label: 'Take her to the range', note: '(20 rounds)', disabled: S.ammo < 20 || S.kirstenShoots, fn: () => { S.ammo -= 20; S.kirsten += 10; S.kirstenShoots = true; outcome('A Natural', 'Kirsten outshoots Todd on her very first try. The range officer slow-claps. Todd is proud and slightly terrified. <b>Kirsten will help on hunts.</b>'); } },
      { label: 'Never mind', fn: prepHub },
    ],
  });
}

/* ---- Jennifer ---- */
function bikeDay() {
  const first = S.jenn === 0;
  S.jenn++;
  scene({
    title: 'Bike Day with Jennifer',
    text: `${first ? 'Jennifer rolls up on her bike, as she has done everywhere since roughly 1938. Nobody knows exactly how old Jennifer is. Her driver\'s license is written on parchment. She has outlived three bikes and two bike shops. ' : 'Jennifer coasts into the driveway at a dignified 4 mph, hearing aid whistling, not even slightly out of breath. '}"Sonny, I lived through the Great Depression on a bicycle," she says. "No gas, no grid, no problem. What do you want to learn?"`,
    choices: [
      { label: 'Bike & tire repair', note: S.bikeRepair ? '(already learned)' : '', disabled: S.bikeRepair, fn: () => { S.bikeRepair = true; outcome('Grease Monkey', `Jennifer teaches Todd to patch a tube, plug a tire and adjust brakes, pausing twice to tell him what bread cost in 1946. "Same idea works on a Jeep tire, more or less." <b>Todd can now fix flats on the trail.</b>`); } },
      { label: 'Water purification', note: S.purify ? '(already learned)' : '', disabled: S.purify, fn: () => { S.purify = true; outcome('Clean Water', `Jennifer builds a filter out of a handkerchief, sand, charcoal and "what we did in the war" — then boils everything to be safe. "Never drink creek water straight, Todd." <b>She can now stretch your water on the trail.</b>`); } },
      { label: 'Buy spare bike parts from her stash ($30)', disabled: S.money < 30, fn: () => { S.money -= 30; S.bikeParts += 2; outcome('Parts Department', 'Two tubes, a chain link and a brass bell older than Todd\'s parents. +2 bike parts.'); } },
      { label: 'Ride with her to Vilano Beach and back', fn: () => { mood(15); hurt('Todd', 5); outcome('Leg Day', 'Twenty miles. Jennifer, who is very old, chats the whole way and still drops Todd on the bridge. Todd can no longer feel his thighs. But the bridge at sunrise? Unreal. Morale way up.'); } },
    ],
  });
}

/* ---- The unfinished pool ---- */
function poolDay() {
  scene({
    title: 'The Unfinished Pool',
    text: `In Todd's backyard is a pool. Technically, it is a hole. Todd dug it himself, by hand, starting in 2023, after watching one video. It is 4 feet deep at one end, 7 at the other, and 100% unfinished. It currently contains rainwater, leaves and a frog named Gerald.<br><br>${S.poolCistern ? 'It is lined with tarps now and collecting rainwater. Todd is very proud of it.' : 'Kirsten refers to it as "the Situation."'} What will Todd do with it today?`,
    choices: [
      { label: 'Line it with tarps — turn it into an emergency rainwater cistern ($40)', disabled: S.poolCistern || S.money < 40, note: S.poolCistern ? '(done)' : '', fn: () => { S.money -= 40; S.poolCistern = true; mood(10); S.kirsten -= 5; outcome('The Cistern', `Todd lines the hole with blue tarps and sandbags. It is not a pool. It is a <b>strategic water reserve</b>. When the grid goes down, it'll be full of rainwater. Gerald the frog is allowed to stay. Kirsten says it "looks like a crime scene."${S.bugSpray ? '' : ' The mosquitoes are thrilled.'}`); } },
      { label: 'Dig deeper ("it\'s basically a bunker")', fn: () => { hurt('Todd', 10); mood(5); const r = R(1, 3); if (r === 1) { S.money += 60; outcome('Buried Treasure', 'Three feet down, Todd hits a rusty coffee can. Inside: $60 in old bills and a 1987 Gators ticket stub. +$60. Todd is now convinced the pool is lucky.'); } else if (r === 2) { outcome('Sprinkler Line', 'Todd hits the sprinkler line. Geyser! The pool is now 30% fuller and 0% more finished. Kirsten watches from the window, sipping coffee, saying nothing. Very loudly.'); } else { mood(10); outcome('Deeper', 'Todd digs for six hours. The pool is now 7 feet 4 inches at the deep end. He takes a selfie in the hole. He sends it to Matt. Matt replies: "They can\'t see you down there. Good."'); } } },
      { label: 'Throw a "pool party" anyway (2 slices of cake)', disabled: S.cake < 2, fn: () => { S.cake -= 2; mood(15); S.kirsten += 10; S.djLoyal++; outcome('Pool Party', 'Todd throws a pool party at a pool that does not exist. DJ shows up in a hat and swim trunks and cannonballs into four inches of water. Eliza blesses the hole. West says, "A man is not measured by his pool." Kirsten laughs so hard she forgives Todd for the whole thing. Morale way up.'); } },
      { label: 'Never mind', fn: prepHub },
    ],
  });
}

/* ---- Water ---- */
function waterDay() {
  const gal = 15 + (S.rainBarrel ? 10 : 0);
  S.water += gal; S.kirsten -= 5;
  const bugs = !S.bugSpray; if (bugs) mood(-3);
  outcome('Operation Hydration', `Todd fills the bathtub, a kiddie pool, 30 old milk jugs and a cooler. ${S.rainBarrel ? 'The rain barrel adds 10 more. ' : ''}+${gal} gallons of water. Kirsten cannot take a bath for a week.${bugs ? ' Also, the mosquitoes have found the kiddie pool. Bug spray would help.' : ''}`);
}

/* ---- Night events ---- */
const NIGHT = [
  {
    ok: () => true, run: () => {
      const v = chance(0.5); if (v) S.money += 50; mood(-3);
      say('2:13 AM', `Todd's phone buzzes. It's DJ.<br><br>"Todd. Todd. What if the grid... has a <i>grid</i>."<br><br>DJ talks for forty minutes. Todd learns nothing. ${v ? 'Before hanging up, DJ Venmos him $50 "for the cause."' : 'Todd stares at the ceiling until dawn.'}`, prepHub);
    }
  },
  { ok: () => true, run: () => { mood(-5); say('False Alarm!', `The lights flicker during a thunderstorm. Todd sprints to the garage in his boxers yelling "IT'S HAPPENING!" It is not happening. The neighbor filmed it. It has 40,000 views on Nextdoor.`, prepHub); } },
  { ok: () => S.food > 12, run: () => { const l = R(4, 8); S.food -= l; say('Bandit in the Pantry', `A raccoon breaks into the garage and eats ${l} lb of canned corn. How did it open the cans? Nobody knows. Todd adds "raccoons" to the threat matrix.`, prepHub); } },
  { ok: () => S.radioSetup, run: () => giveIntel(true) },
  { ok: () => S.food >= 25, run: kirstenFindsCans },
  { ok: () => S.panelsInstalled > 0, run: hoaLetter },
  { ok: () => S.cake > 0, run: () => cakeCraving(prepHub, true) },
  { ok: () => true, run: hurricaneWatch },
  { ok: () => true, run: () => { healAll(5); mood(5); say('A Quiet Night', 'Crickets. A breeze off the Matanzas. Somewhere a peacock screams. Todd sleeps like a baby with a bug-out bag.', prepHub); } },
  { ok: () => S.metJon, run: () => { mood(5); S.food += 8; say('Jon Drops By', `Jon Galluzzo stops by with a bag of groceries. "Neighbors kept handing me stuff on my run." +8 lb food. He also fixes a squeaky door by looking at it.`, prepHub); } },
];
/* ---- Recurring characters: Matt's ammo, Eliza, Alex, West, Kelsey ---- */
function alexSteals(max) {
  let n = Math.min(S.cake, R(1, max));
  if (S.cakeSafe) n = Math.min(n, 1);
  S.cake -= n; S.alexStole = (S.alexStole || 0) + n;
  return n;
}
NIGHT.push(
  { ok: () => true, run: () => { S.ammo += 60; say('3 AM Delivery', `Headlights off, Matt's truck backs into Todd's driveway at 3 AM. He unloads three ammo cans without a word, then leans in close.<br><br>"For the cause. Don't tell the pelicans. They report to Tallahassee."<br><br>He also leaves a pamphlet titled <i>BIRDS: Who Is Really Watching?</i> +60 rounds of ammo.`, prepHub); } },
  { ok: () => true, run: elizaPrep },
  { ok: () => S.cake > 0, run: alexPrep },
  { ok: () => S.cake > 0, run: alexPrep },
  { ok: () => true, run: westPrep },
  { ok: () => true, run: kelseyPrep },
);

function elizaPrep() {
  S.met.eliza = true;
  scene({
    title: 'A Knock at Midnight',
    text: `It's <b>Eliza</b>, the witchy woman from down the street, in a velvet cloak, holding a cat that is not hers. Before Todd can say a word: "I'm very open-minded."<br><br>Nobody asked. Nobody ever asks. She offers her services.`,
    choices: [
      { label: 'Get a tarot reading', fn: () => { S.tip++; say('The Tower', `Eliza flips a card: The Tower. "Big change is coming. The lights. The bridge. A lion who cannot close his mouth." She leans in. "I'm very open-minded, so I'm not judging the beans." <span class="hl">You'll dodge the next bit of trouble on the trail.</span>`, prepHub); } },
      { label: 'Buy a jug of "moon water" ($10)', disabled: S.money < 10, fn: () => { S.money -= 10; S.water += 8; say('Moon Water', `It's tap water that sat outside during a full moon. It's also 8 perfectly good gallons. "I'm very open-minded about what counts as water," Eliza says. +8 gallons.`, prepHub); } },
      { label: 'Let her cleanse the house with sage', fn: () => { mood(10); S.kirsten -= 5; say('Cleansed', `Eliza wafts sage through every room. The smoke alarm disagrees. Kirsten is not open-minded about this. Todd, however, feels lighter. Morale up.`, prepHub); } },
    ],
  });
}
function alexPrep() {
  S.met.alex = true;
  const n = alexSteals(4);
  scene({
    title: 'The Cake Bandit Strikes',
    text: `<b>Alex</b> — who is, objectively, stunningly beautiful — stopped by "to borrow a cup of sugar." She was very charming. Todd doesn't remember most of the conversation.<br><br>Later, Todd opens the cooler. <span class="bad">${n} slice${n === 1 ? '' : 's'} of white cake: gone.</span> There is frosting on the doorknob. There is a lipstick mark on the cooler lid.`,
    choices: [
      { label: 'Go confront her', fn: () => { const m = alexSteals(1); say('Confrontation', `Todd marches over. Alex opens the door, smiles, and tilts her head. Todd forgets what he came for and ${m ? 'somehow hands her ONE MORE slice' : 'apologizes for bothering her'}. Strong work, Todd.`, prepHub); } },
      { label: 'Lock the cake in the gun safe from now on', disabled: !!S.cakeSafe, note: S.cakeSafe ? '(already done)' : '', fn: () => { S.cakeSafe = true; say('Maximum Security', `The white cake now lives in the gun safe, next to the important documents. <span class="hl">Alex can only get one slice at a time now.</span> (She will still try.)`, prepHub); } },
      { label: 'Let it go', fn: () => { mood(-5); say('Let It Go', `Todd lets it go. It's not the first time. It won't be the last. <span class="bad">Every slice Alex steals costs you points at the end.</span>`, prepHub); } },
    ],
  });
}
function westPrep() {
  S.met.west = true;
  scene({
    title: 'The Wise Man on the Bench',
    text: `<b>West</b> sits on his usual bench outside the hardware store, whittling something that might be a duck. People say he has never been wrong. People also say he once out-fished a pelican with his bare hands. He motions Todd over. "Sit. Ask."`,
    choices: [
      { label: '"Is the grid really going down?"', fn: () => { mood(10); S.tip++; say('West Speaks', `West whittles for a long time. "The grid always goes down, son. The question is whether you're ready when it does." He hands Todd the duck. <span class="hl">You'll dodge the next bit of trouble on the trail.</span>`, prepHub); } },
      { label: '"What should I stock up on?"', fn: () => { S.water += 10; say('West Speaks', `"More water than you think. Then more than that." He points to a pallet behind the bench. "Take ten. I bought too much in '04." +10 gallons of water.`, prepHub); } },
      { label: '"How do I keep my crew together?"', fn: () => { mood(15); S.kirsten += 10; say('West Speaks', `"A man who hoards cake has cake. A man who shares cake has friends." He pauses. "And watch out for Alex." Morale up. Todd goes home and is nicer to Kirsten.`, prepHub); } },
    ],
  });
}
function kelseyPrep() {
  S.met.kelsey = true;
  scene({
    title: 'The New Neighbor',
    text: `A new neighbor named <b>Kelsey</b> has moved in across the street. She says she's from "Ohio." She pronounces it "O-hee-yo." Her moving boxes are labeled in Cyrillic. She jogs every morning at 5 AM and photographs every power substation she passes.<br><br>She waves. "Hello, comrade — I mean, neighbor."`,
    choices: [
      { label: 'Welcome her with a slice of white cake', disabled: S.cake < 1, fn: () => { S.cake--; S.gas += 5; S.kelseyTrust = (S.kelseyTrust || 0) + 1; say('Diplomatic Relations', `Kelsey eats the cake in one bite. "Is very good. In my country— in Ohio, we do not have such cake." She gives Todd 5 gallons of gas "from the embassy— from my garage." +5 gallons of gas.`, prepHub); } },
      { label: 'Report her to Matt', fn: () => { mood(5); S.ammo += 20; say('Matt Is Not Surprised', `"Todd. TODD. I have a whole binder on her. She's been pinging repeater 146.52 every night at 2 AM." Matt drops off 20 extra rounds "just in case." +20 rounds of ammo.`, prepHub); } },
      { label: 'Wave back and mind your business', fn: () => say('Neighborly', `Todd waves. Kelsey waves. A black SUV idles at the end of the street for six hours. Totally normal.`, prepHub) },
    ],
  });
}

NIGHT.push(
  { ok: () => true, run: () => { mood(5); S.djLoyal++; say('Splash', `At 11 PM, DJ stops by "to see the pool" and walks straight into it in the dark. He emerges from four feet of rainwater holding Gerald the frog. His hat is still dry. Nobody knows how. "Todd," he says, dripping, "this is a GREAT pool."`, prepHub); } },
  { ok: () => true, run: () => say('Aerial Surveillance', `Todd spots Kelsey on her roof at 2 AM, photographing his backyard pool with a long lens. The next morning there's a note in his mailbox: "Is missile silo, da?" Matt is going to love this.`, prepHub) },
);

function nightEvent() { pick(NIGHT.filter(e => e.ok())).run(); }

function kirstenFindsCans() {
  scene({
    title: 'Under the Bed',
    text: `Kirsten went looking for a phone charger and found ${fmt(S.food)} pounds of canned goods under the bed. And in the closet. And inside the piano bench.<br><br>"Todd," she says. "Why is there a can of yams in my shoe?"`,
    choices: [
      { label: `"It's for us, babe. For our future."`, fn: () => { if (chance(0.55)) { S.kirsten += 15; S.meds++; say('Romance Wins', `Kirsten softens. "Okay, that's weirdly sweet." She puts a first-aid kit from her car into the pile. +1 first-aid kit.`, prepHub); } else { S.kirsten -= 10; say('Not Romantic', `"Our future is a can of yams?" Kirsten sleeps on the couch.`, prepHub); } } },
      { label: 'Blame the raccoon', fn: () => { S.kirsten -= 5; say('The Raccoon Defense', 'Kirsten does not believe a raccoon bought 40 cans of yams. Kirsten is correct.', prepHub); } },
      { label: 'Offer her a slice of white cake', disabled: S.cake < 1, fn: () => { S.cake--; S.kirsten += 10; say('Diplomacy', 'The cake works. The cake always works.', prepHub); } },
    ],
  });
}
function hoaLetter() {
  scene({
    title: 'A Letter from the HOA',
    text: `"Dear Resident: Solar panels visible from the street violate Section 14(b) of the Covenants. Please remove them or face a $75 fine. Warmly, Brenda."`,
    choices: [
      { label: 'Pay the $75 fine', disabled: S.money < 75, fn: () => { S.money -= 75; say('Paid', 'Brenda accepts your money. Brenda will be back.', prepHub); } },
      { label: 'Take one panel down and sell it back', fn: () => { S.panelsInstalled--; S.panels--; S.money += 60; say('Compliance', 'Todd sells one panel back... at a loss. +$60.', prepHub); } },
      S.metJon
        ? { label: 'Send Jon Galluzzo to talk to Brenda', fn: () => { mood(10); say('Jon Galluzzo, Diplomat', `Jon Galluzzo knocks on Brenda's door. Twelve minutes later, the HOA amends Section 14(b). Brenda sends a fruit basket. Nobody asks questions.`, prepHub); } }
        : { label: 'Ignore it', fn: () => { S.money = Math.max(0, S.money - 120); say('Ignored', 'Brenda does not like being ignored. The fine compounds. -$120.', prepHub); } },
    ],
  });
}
function hurricaneWatch() {
  scene({
    title: 'Tropical Storm Watch!',
    text: 'A late-season storm is spinning off the coast and the whole town is panic-buying. The Publix bread aisle looks like a crime scene. Todd has never felt more alive.',
    choices: [
      { label: 'Midnight Wawa run for water ($25 for 10 gal)', disabled: S.money < 25, fn: () => { S.money -= 25; S.water += 10; mood(5); say('Wawa at Midnight', 'Todd scores 10 gallons of water and a hoagie. Scouting the destination early. Smart.', prepHub); } },
      { label: 'Board up the windows (for practice)', fn: () => { mood(5); hurt('Todd', 5); S.kirsten -= 5; say('Practice Makes Prepper', `The storm turns out to sea. Todd leaves the plywood up "just in case." Kirsten has not seen the sun in three days.`, prepHub); } },
      { label: 'Do nothing. Real preppers are always ready.', fn: () => say('Unbothered', 'Todd sits on the porch with a lawn chair and watches the neighbors panic. Peak prepper.', prepHub) },
    ],
  });
}
function cakeCraving(next, night) {
  scene({
    title: 'The Craving',
    text: `${night ? `It's late. The house is quiet. ` : `It's been a long day. `}And in the cooler, glowing softly, is a slice of white cake with buttercream frosting. It is calling Todd's name. It knows his middle name.`,
    choices: [
      { label: 'Eat it', fn: () => { S.cake--; mood(10); say('Worth It', 'Todd eats it in the dark, standing up, directly from the container. Morale soars.', next); } },
      { label: 'Resist. The cake is for emergencies.', fn: () => { mood(-5); say('Discipline', 'Todd closes the lid. A single tear rolls down his cheek. The cake will be there when he needs it.', next); } },
    ],
  });
}

/* ============================================================
   THE GRID GOES DOWN
   ============================================================ */
function gridDown() {
  S.phase = 'trail';
  const lines = [];
  if (S.kirsten >= 25) {
    lines.push(`<b>Kirsten</b> grabs her go-bag. "If we're doing this, we're doing it together."${S.kirsten >= 70 ? ' She kisses Todd on the cheek. Morale up.' : ''}`);
    if (S.kirsten >= 70) mood(10);
  } else {
    S.party.Kirsten.in = false;
    const c = Math.min(S.cake, 3); S.cake -= c;
    lines.push(`<b>Kirsten</b> has decided to ride out the outage at her mom's place in Palm Coast. ${c ? `She takes ${c} slice${c > 1 ? 's' : ''} of white cake. Fair.` : ''} <span class="bad">(Keep her happier next time.)</span>`);
  }
  S.party.Jennifer.in = true;
  lines.push(S.jenn > 0 ? `<b>Jennifer</b> rides up, panniers loaded, shawl fluttering. She is very, very old and has seen four grids go down. "Amateurs," she says.` : `<b>Jennifer</b> rides up anyway, ancient and unstoppable. "You didn't invite me? I knew your grandfather. I'm coming."`);
  S.party.DJ.in = true;
  lines.push(`Nobody invited <b>DJ</b>. DJ is here. He is wearing his hat. ${S.djLoyal >= 2 ? `"Todd found my hat once. I go where Todd goes."` : `"WHERE ARE WE GOING? DOESN'T MATTER. LET'S GO!"`}`);
  if (S.metJon) { S.party.Jon.in = true; lines.push(`<b>Jon Galluzzo</b> jogs up, somehow freshly showered. The power is out, but he is still backlit.`); }
  else { S.jonLate = true; lines.push(`No sign of <b>Jon Galluzzo</b> — Todd never met him. (Maybe you'll run into him downtown.)`); }
  lines.push(S.radioSetup
    ? `<b>Matt</b> crackles over the ham radio: "Todd, this is Matt. The Wawa on US-1 is lit up like Christmas. I'm heading there now with a few crates of ammo. Also, I need you to know this was NOT an accident. Over."`
    : `Without a ham radio, Todd has no idea where <b>Matt</b> is. (He's fine. He has nine radios, a bunker under his bunker, and 40,000 rounds of ammo.)`);
  if (S.poolCistern) { const g = 30 + (S.purify ? 15 : 0); S.water += g; lines.push(`The backyard <b>pool</b> — still unfinished, but lined with tarps — is full of rainwater. ${S.purify ? 'Jennifer filters it the old-fashioned way. ' : ''}Todd pumps ${g} gallons into jugs. "WHO'S LAUGHING NOW, KIRSTEN?" (Kirsten is not laughing.) +${g} gallons of water.`); }
  else lines.push(`Todd looks at the unfinished <b>pool</b> in the backyard one last time. It contains four inches of rainwater and Gerald the frog. Gerald will hold the fort.`);
  sad();
  say('THE GRID IS DOWN', `${dateStr(PREP_DAYS)}, 6:47 PM.<br><br>The ceiling fan slows. The fridge goes silent. Across St. Augustine, every light blinks out at once — even the Bridge of Lions. Somewhere, a man who just started a load of laundry screams.<br><br>Todd slowly rises from his recliner. He has been waiting for this moment for six years.<br><br>"It's happening."`,
    () => say('Roll Call', lines.join('<br><br>'), trailIntro), 'Gather the crew');
}

function trailIntro() {
  say('The Trail', `The plan: get everyone to <b>the Wawa on US-1</b> — the only place in town with generators, coffee and hoagies.<br><br>
The direct route is blocked (a billboard for a personal-injury lawyer fell across SR-16), so Todd plots the long way: past the outlets, through downtown, across the Bridge of Lions, around Anastasia Island and back over the SR-312 bridge. <b>${TOTAL_MILES} miles</b> of detours.<br><br>
Everyone drinks about a gallon of water a day. The Jeep burns about a gallon of gas every 4 miles — when it runs dry, you walk. Keep morale up. Eat cake when needed.`, trailHub, 'Hit the road');
}

/* ============================================================
   PART 2 — THE TRAIL
   ============================================================ */
function trailHub() {
  S.phase = 'trail'; busy = false;
  save('trailHub');
  const next = LANDMARKS[S.lm + 1];
  const log = S.lastLog && S.lastLog.length ? `<div class="log">${S.lastLog.map(l => '• ' + l).join('<br>')}</div>` : '';
  S.lastLog = [];
  const radioNote = !S.radioSetup ? '(no radio)' : !radioPowered() ? '(no power — need solar or a battery)' : S.radioDay === S.tday ? '(already talked today)' : '';
  scene({
    extra: `<canvas id="trailCanvas" class="scenecv" width="320" height="100"></canvas>`,
    html: `<table class="info">
      <tr><td>Weather:</td><td>${S.weather ? S.weather.name : 'warm and humid'}</td></tr>
      <tr><td>Health:</td><td>${partyHealth()}</td></tr>
      <tr><td>Pace:</td><td>${PACES[S.pace].name}${S.gas <= 0 ? ' (on foot — out of gas)' : ''}</td></tr>
      <tr><td>Rations:</td><td>${RATIONS[S.rations].name}</td></tr>
      <tr><td>Next landmark:</td><td>${next.name} — ${next.mile - S.miles} mi</td></tr>
      <tr><td>Miles traveled:</td><td>${S.miles} of ${TOTAL_MILES}</td></tr>
    </table>${log}`,
    choices: [
      { label: 'Continue on the trail', fn: travel },
      { label: 'Check supplies & crew', fn: () => supplies(trailHub) },
      { label: 'Change pace', fn: changePace },
      { label: 'Change food rations', fn: changeRations },
      { label: 'Eat white cake', note: `(${S.cake} slices)`, disabled: S.cake < 1, fn: eatCake },
      { label: 'Stop to rest', fn: rest },
      { label: 'Go hunting', note: S.ammo < 1 ? '(no ammo)' : '', disabled: S.ammo < 1, fn: hunt },
      { label: 'Radio Matt', note: radioNote, disabled: !radioPowered() || S.radioDay === S.tday, fn: radioMatt },
      { label: 'Look for someone to trade with', note: S.tradeDay === S.tday ? '(tried today)' : '', disabled: S.tradeDay === S.tday, fn: trade },
    ],
    after: () => animateScene('trailCanvas', false),
  });
}

function travel() {
  busy = true;
  animateScene('trailCanvas', true, 1300, () => { busy = false; travelDay(); });
}

function travelDay() {
  const next = LANDMARKS[S.lm + 1];
  const onFoot = S.gas <= 0;
  let speed = PACES[S.pace].mi;
  if (onFoot) speed = Math.max(2, Math.round(speed * 0.6));
  const move = Math.min(speed, next.mile - S.miles);
  S.miles += move;
  let ranOut = false;
  if (!onFoot) { S.gas = Math.max(0, Math.round((S.gas - move / 4) * 10) / 10); ranOut = S.gas <= 0; }
  passDay(onFoot ? `Walked ${move} miles (the Jeep is out of gas).` : `Drove ${move} miles.`);
  if (ranOut) S.lastLog.push('<span class="bad">The Jeep is OUT OF GAS. You will have to walk (slower) unless you find more.</span>');
  afterDay(() => {
    if (S.miles >= next.mile) { S.lm++; return arrive(next); }
    if (chance(0.6)) return randomEvent();
    trailHub();
  });
}

function rollWeather() {
  const tot = WEATHER.reduce((t, w) => t + w.w, 0);
  let r = Math.random() * tot;
  for (const w of WEATHER) { if ((r -= w.w) < 0) return w; }
  return WEATHER[0];
}

function passDay(firstLine, resting = false) {
  S.tday++;
  S.weather = rollWeather();
  const log = []; if (firstLine) log.push(firstLine);
  const ppl = active(), n = ppl.length;
  const wNeed = Math.ceil(n * (S.weather.hot ? 1.4 : 1));
  if (S.weather.rain && S.rainBarrel) { S.water += 6; log.push('The rain barrel caught 6 gallons.'); }
  if (S.purify && has('Jennifer') && S.water < wNeed * 3) { S.water += 4; log.push('Jennifer filtered and boiled 4 gallons of creek water.'); }
  S.water -= wNeed;
  S.food -= n * RATIONS[S.rations].lb;
  let dmg = (resting ? -14 : PACES[S.pace].dmg) + RATIONS[S.rations].dmg;
  if (S.water < 0) { S.water = 0; dmg += 15; log.push('<span class="bad">You are OUT OF WATER. Everyone is dehydrated.</span>'); }
  if (S.food < 0) { S.food = 0; dmg += 8; log.push('<span class="bad">You are OUT OF FOOD.</span>'); }
  if (S.weather.hot) { dmg += S.panelsInstalled > 0 ? 1 : 3; if (S.panelsInstalled > 0 && chance(0.25)) log.push('Solar-powered fans keep the Jeep cab bearable.'); }
  if (S.morale < 25) { dmg += 3; log.push('Morale is so low that people are sniping at each other.'); }
  ppl.forEach(p => { let d = dmg; if (p === 'DJ' && !S.hat) d += 3; S.party[p].hp = clamp(S.party[p].hp - d, 0, 100); });
  ppl.forEach(p => {
    if (chance(resting ? 0.03 : 0.07)) {
      const a = pick(AILMENTS);
      S.party[p].hp = clamp(S.party[p].hp - a.dmg, 0, 100);
      log.push(`<span class="bad">${FULL[p]} ${a.text}</span>${p === 'Jon' ? ' Still handsome, though.' : ''}`);
    }
  });
  ppl.forEach(p => { if (S.party[p].hp > 0 && S.party[p].hp < 35 && S.meds > 0) { S.meds--; S.party[p].hp = clamp(S.party[p].hp + 40, 0, 100); log.push(`Used a first-aid kit on ${FULL[p]}.`); } });
  if (S.weather.hot && S.panelsInstalled < 2 && S.food > 20 && chance(0.15)) { const l = Math.ceil(S.food * 0.15); S.food -= l; log.push(`${l} lb of food spoiled in the heat. (Two or more solar panels would keep the cooler running.)`); }
  if (!S.hat && has('DJ')) log.push('DJ is hatless and visibly wilting.');
  mood(resting ? 6 : -2);
  if (S.cake > 0 && chance(0.08)) { const n = alexSteals(3); log.push(`<span class="bad">Alex was spotted near the cooler. ${n} slice${n === 1 ? '' : 's'} of white cake missing.</span>`); }
  if (S.cake === 0 && chance(0.3)) { mood(-4); log.push('Todd mentions, again, that there is no white cake.'); }
  S.lastLog = log;
}

function afterDay(cb) {
  const gone = active().filter(p => S.party[p].hp <= 0);
  if (!gone.length) return cb();
  if (gone.includes('Todd')) return gameOver();
  const p = gone[0];
  S.party[p].gone = true; sad();
  if (p === 'Kirsten') mood(-15); else mood(-8);
  say(`${FULL[p]} has left the crew`, LEAVE[p], () => afterDay(cb));
}

function gameOver() {
  clearSave(); sad(); S.phase = 'end';
  scene({
    title: 'TODD HAS DIED OF DYSENTERY',
    html: `<pre class="tomb">
   _____________
  /             \\
 |   HERE LIES   |
 |    TODD'S     |
 |    DIGNITY    |
 |               |
 |  ${String(S.miles).padStart(2, ' ')} miles from |
 |   the Wawa    |
_|_______________|_</pre>`,
    text: `...just kidding. Todd collapses dramatically on the side of A1A, and a passing family in a golf cart drives him to Kirsten's mom's house in Palm Coast, which — it turns out — never lost power.<br><br>Todd spends the rest of the outage in a recliner watching the Weather Channel. He made it ${S.miles} of ${TOTAL_MILES} miles. The white cake ${S.cake ? 'remains uneaten. Tragic.' : 'is long gone.'}`,
    choices: [{ label: 'Try again', fn: title }],
  });
}

/* ---- Trail actions ---- */
function changePace() {
  scene({
    title: 'Change Pace',
    text: 'Steady — 4 mi/day, easy on everyone.<br>Strenuous — 6 mi/day, tiring.<br>Grueling — 8 mi/day, hard on health.<br>(Out of gas? You walk at about 60% speed.)',
    choices: PACES.map((p, i) => ({ label: p.name + (i === S.pace ? ' (current)' : ''), fn: () => { S.pace = i; trailHub(); } })),
  });
}
function changeRations() {
  scene({
    title: 'Change Food Rations',
    text: `Filling — 2 lb per person per day. Keeps everyone healthy.<br>Meager — 1.5 lb. Slightly hungry.<br>Bare bones — 1 lb. Everyone is hangry and losing health.<br><br>You have ${fmt(S.food)} lb of food for ${active().length} people.`,
    choices: RATIONS.map((r, i) => ({ label: r.name + (i === S.rations ? ' (current)' : ''), fn: () => { S.rations = i; trailHub(); } })),
  });
}
function eatCake() {
  const n = active().length;
  scene({
    title: 'White Cake',
    text: `You have ${S.cake} slice${S.cake === 1 ? '' : 's'} of white cake. Todd's eyes are already misty.`,
    choices: [
      { label: 'Todd eats a slice', fn: () => { S.cake--; mood(10); S.party.Todd.hp = clamp(S.party.Todd.hp + 5, 0, 100); say('Bliss', `Todd eats the slice in four bites and stares at the horizon. "Okay," he says. "Okay. We can do this." Morale up.`, trailHub); } },
      { label: `Cake party for the whole crew`, note: `(${n} slices)`, disabled: S.cake < n, fn: () => { S.cake -= n; mood(25); healAll(6); say('Cake Party!', `Everyone gets a slice. ${has('DJ') ? 'DJ stands on the tailgate and gives a toast nobody asked for. ' : ''}${has('Kirsten') ? 'Kirsten laughs for the first time in days. ' : ''}${has('Jon') ? 'Jon Galluzzo gets frosting on his face and somehow it looks intentional. ' : ''}Morale soars.`, trailHub); } },
      { label: 'Never mind', fn: trailHub },
    ],
  });
}
function rest() {
  passDay('Camped and rested all day.', true);
  afterDay(() => say('Rest', `The crew rests in the shade of a live oak dripping with Spanish moss. ${has('DJ') ? 'DJ naps with his hat over his face. ' : ''}${has('Jon') ? 'Jon Galluzzo does push-ups for no one. ' : ''}${has('Jennifer') ? 'Jennifer, who is very old, naps sitting upright on her bike. ' : ''}Health improves.`, trailHub));
}

const MATT_TIPS = [
  `I'm hearing reports of trouble on the road ahead. Also: the outage was planned. By who? Exactly.`,
  `A guy on 146.52 says there's a sketchy roadblock somewhere near you. Eyes open.`,
  `The Wawa is still running. Ask yourself why the Wawa is the only one with power. Actually don't. Keep moving.`,
  `Gators on the move. And hogs. And one very angry swan. The swan is not a swan, Todd.`,
];
function radioMatt() {
  S.radioDay = S.tday; mood(5);
  if (chance(0.3)) { S.ammo += 40; return say('Radio: Matt', `<i>*kssshhht*</i> "Todd, this is Matt. I buried an ammo cache under the third palm tree past the next stop sign. GPS coordinates are compromised, so I'm telling you by palm tree. Also: the Wawa is the only store with power. Think about that. Over."<br><br>Todd digs. +40 rounds of ammo.`, trailHub); }
  const left = Object.keys(INTEL).filter(k => !S.intel[k]);
  if (left.length && chance(0.5)) { const k = pick(left); S.intel[k] = true; return say('Radio: Matt', `<i>*kssshhht*</i> ${INTEL[k]}`, trailHub); }
  S.tip++;
  say('Radio: Matt', `<i>*kssshhht*</i> "Todd, this is Matt. ${pick(MATT_TIPS)} Over."<br><br><span class="hl">Matt's intel will help you dodge the next bit of trouble.</span>`, trailHub);
}

const UNIT = { ammo: 'rounds of ammo', water: 'gallons of water', food: 'lb of food', cake: 'slices of white cake', gas: 'gallons of gas', meds: 'first-aid kit(s)', money: 'dollars', bikeParts: 'bike part(s)' };
function trade() {
  S.tradeDay = S.tday;
  if (chance(0.2)) return say('No Takers', 'Nobody around wants to trade today. A peacock eyes you suspiciously.', trailHub);
  const offers = [
    { give: ['ammo', 10], get: ['water', 8], who: 'A guy in a Gators jersey' },
    { give: ['cake', 2], get: ['gas', 3], who: 'A retiree in a golf cart' },
    { give: ['water', 6], get: ['food', 15], who: 'A surfer named Breeze' },
    { give: ['food', 15], get: ['meds', 1], who: 'A nurse walking home from Flagler Hospital' },
    { give: ['money', 40], get: ['gas', 4], who: 'A man siphoning gas from his own boat' },
    { give: ['cake', 1], get: ['ammo', 15], who: `A grizzled fisherman who hasn't had cake since 1997` },
    { give: ['ammo', 20], get: ['cake', 6], who: 'A baker with a cooler labeled "EMERGENCY CAKE"' },
    { give: ['food', 10], get: ['bikeParts', 1], who: 'A teenager on a BMX' },
    { give: ['money', 30], get: ['water', 10], who: 'A family with a backyard well' },
  ];
  const o = pick(offers);
  const [gk, gq] = o.give; let [rk, rq] = o.get;
  if (has('Jon')) rq = Math.ceil(rq * 1.5);
  const can = (S[gk] || 0) >= gq;
  scene({
    title: 'Trading',
    text: `${o.who} offers you <b>${rq} ${UNIT[rk]}</b> for <b>${gq} ${UNIT[gk]}</b>.${has('Jon') ? ' <span class="hl">(Jon Galluzzo made eye contact. The offer improved.)</span>' : ''}`,
    choices: [
      { label: 'Accept', note: can ? '' : `(you don't have enough)`, disabled: !can, fn: () => { S[gk] -= gq; S[rk] = (S[rk] || 0) + rq; say('Deal', 'Pleasure doing business.', trailHub); } },
      { label: 'Decline', fn: trailHub },
    ],
  });
}

/* ---- Random trail events ---- */
const EVENTS = [
  {
    ok: () => true, bad: true, dodge: 'a sketchy roadblock', run: () => scene({
      title: 'Roadblock!', text: `Three guys in matching camo cargo shorts have blocked the road with shopping carts and a cardboard sign that says "TOLL." They don't look dangerous. They look bored. And hungry.`,
      choices: [
        { label: 'Offer them white cake (2 slices)', disabled: S.cake < 2, fn: () => { S.cake -= 2; say('Cake Diplomacy', 'They accept the cake with surprising emotion. One of them tears up. "Thanks, man." They move the carts.', trailHub); } },
        { label: 'Take a detour (lose a day)', fn: () => { passDay('Took a long detour around a roadblock.'); afterDay(trailHub); } },
        has('Jon')
          ? { label: 'Send Jon Galluzzo to negotiate', fn: () => { mood(10); S.water += 5; say('The Negotiator', 'Jon walks over. Laughter. Handshakes. A selfie. He walks back with 5 gallons of water that THEY gave HIM.', trailHub); } }
          : { label: `Bluff: "We're with the power company."`, fn: () => { if (chance(0.5)) say('Bluff Works', 'They scatter instantly. Nobody wants to deal with the power company right now.', trailHub); else { const l = Math.min(S.water, 8); S.water -= l; say('Bluff Fails', `"Then why is your Jeep full of beans?" You pay them ${l} gallons of water to move the carts.`, trailHub); } } },
      ],
    })
  },
  {
    ok: () => S.gas > 0, bad: true, dodge: 'a nail in the road', run: () => {
      if (S.spareTire > 0) { S.spareTire--; return say('Flat Tire!', 'A nail. Of course. Todd swaps on the spare in 20 minutes like a NASCAR pit crew. Nobody claps but him.', trailHub); }
      if (S.bikeRepair) return say('Flat Tire!', `No spare — but thanks to Jennifer's lessons, Todd plugs the tire with a bike-patch kit and a lot of hope. It holds!`, trailHub);
      passDay('Stuck all day with a flat tire.'); mood(-10);
      afterDay(() => say('Flat Tire!', `No spare and nobody knows how to plug a tire. You lose a whole day waiting for a guy named Dale with a compressor.`, trailHub));
    }
  },
  {
    ok: () => has('Jennifer'), bad: true, dodge: `a pothole that would have flattened Jennifer's tire`, run: () => {
      if (S.bikeParts > 0) { S.bikeParts--; return say('Bike Flat', `Jennifer's front tire pops. She swaps in a new tube in four minutes flat without stopping her story about Eisenhower.`, trailHub); }
      hurt('Jennifer', 10); mood(-5);
      say('Bike Flat', `Jennifer's tire pops and there are no spare tubes. She rides on the rim, sparks flying, muttering things we cannot print.`, trailHub);
    }
  },
  {
    ok: () => has('DJ') && S.hat, bad: false, run: () => scene({
      title: 'HAT OVERBOARD', text: `A gust of wind snatches DJ's hat clean off his head. It cartwheels down the road toward a storm drain. DJ makes a sound no human should make.`,
      choices: [
        { label: 'Chase it!', fn: () => { if (chance(S.djLoyal >= 2 ? 0.9 : 0.6)) { mood(10); say('Got It!', `${has('Jennifer') ? 'Jennifer, at roughly age 99, sprints after it on her bike and snags it with her cane. ' : 'Todd dives and catches it inches from the storm drain. '}DJ puts it back on and is instantly himself again.`, trailHub); } else { S.hat = false; mood(-15); say('Gone', `The hat disappears down the storm drain. DJ stares at the grate. He is not okay. <span class="bad">DJ will lose health every day until he finds a new hat.</span>`, trailHub); } } },
        { label: `Let it go. It's just a hat.`, fn: () => { S.hat = false; mood(-15); say('"Just a Hat"', `"JUST A HAT?" DJ is inconsolable. <span class="bad">DJ will lose health every day until he finds a new hat.</span>`, trailHub); } },
      ],
    })
  },
  { ok: () => has('DJ') && !S.hat, bad: false, run: () => { S.hat = true; mood(15); say('A New Hat', `At a closed gift shop, DJ spots a bin of hats out front marked "FREE — STORM DAMAGED." He picks one that says "I ♥ ST. AUGUSTINE" and puts it on. He's back. DJ is BACK.`, trailHub); } },
  {
    ok: () => true, bad: true, dodge: 'a cloud of mosquitoes', run: () => {
      if (S.bugSpray > 0) { S.bugSpray--; return say('Mosquito Swarm', 'A cloud of mosquitoes rises off the marsh. Todd deploys the bug spray. The mosquitoes retreat, defeated.', trailHub); }
      hurtAll(5); mood(-8);
      say('Mosquito Swarm', `A cloud of mosquitoes rises off the marsh like a biblical plague. No bug spray. Everyone is itchy, swollen and miserable.`, trailHub);
    }
  },
  { ok: () => true, bad: false, run: () => { const f = R(10, 30); S.food += f; let t = `An abandoned delivery truck sits on the shoulder with its back door open. Inside: ${f} lb of canned goods.`; if (chance(0.4)) { S.cake += 6; t += ' And a white sheet cake, only slightly squished. +6 slices. Todd falls to his knees.'; } say('Lucky Find', t, trailHub); } },
  {
    ok: () => true, bad: false, run: () => scene({
      title: 'Someone Needs Help', text: `A mom is sitting on the curb next to a stalled minivan with two kids and a very old golden retriever. They're out of water.`,
      choices: [
        { label: 'Give them 5 gallons of water', disabled: S.water < 5, fn: () => { S.water -= 5; mood(15); const g = pick([['meds', 1, 'a first-aid kit'], ['ammo', 10, `a box of ammo her husband "won't miss"`], ['cake', 4, 'four slices of white cake from a birthday party']]); S[g[0]] += g[1]; say('Good Karma', `The kids cheer. The mom insists you take ${g[2]} in return. Morale up.`, trailHub); } },
        { label: 'Give them directions to the Wawa', fn: () => { mood(3); say('Directions', `"Follow the glow," Todd says, pointing southwest. It's the most heroic thing he has ever said.`, trailHub); } },
        { label: 'Keep driving', fn: () => { mood(-10); say('Guilt', 'Todd keeps driving. Nobody says anything for a long time.', trailHub); } },
      ],
    })
  },
  { ok: () => has('Jon'), bad: false, run: () => { const g = pick([['food', 15, 'a bag of groceries'], ['water', 8, '8 gallons of water'], ['cake', 4, '4 slices of white cake'], ['gas', 3, '3 gallons of gas']]); S[g[0]] += g[1]; say('The Galluzzo Effect', `Neighbors grilling in a driveway spot Jon Galluzzo and insist the whole crew stop. They send you off with ${g[2]}. "Come back anytime," they tell Jon. Only Jon.`, trailHub); } },
  {
    ok: () => true, bad: true, dodge: 'an alligator lounging in the road', run: () => scene({
      title: 'Gator in the Road', text: 'A nine-foot alligator is sunbathing across both lanes. It does not care about your plans.',
      choices: [
        { label: 'Wait it out', fn: () => { mood(-3); say('Patience', 'Two hours later, the gator slides off into a ditch. Everyone has a sunburn.', trailHub); } },
        { label: 'Honk', fn: () => { if (chance(0.5)) say('Honk Honk', 'The gator hisses, then waddles away offended.', trailHub); else { const l = Math.min(S.food, 10); S.food -= l; say('Bad Idea', `The gator charges the Jeep. Everyone screams. In the chaos, a cooler tips out the back and ${l} lb of food is now gator food.`, trailHub); } } },
        has('DJ') && { label: 'Let DJ handle it', fn: () => { hurt('DJ', 15); mood(20); say('DJ vs. Gator', `DJ hands his hat to Todd, says "hold this," and walks toward the gator yelling about "alpha energy." The gator, deeply confused, leaves. DJ is scraped up but triumphant. Morale is through the roof.`, trailHub); } },
      ].filter(Boolean),
    })
  },
  { ok: () => has('Kirsten'), bad: false, run: () => { mood(15); healAll(4); say('Sing-Along', `Kirsten starts singing "Margaritaville." By the second chorus, everyone is singing. ${has('DJ') ? 'DJ knows every word and does harmonies. ' : ''}It's the best mood the crew has been in for days.`, trailHub); } },
  {
    ok: () => S.ammo >= 3, bad: false, run: () => scene({
      title: 'Wild Hog!', text: 'A 200-pound feral hog bursts out of the palmettos and stares down the Jeep. It has tusks. It has attitude.',
      choices: [
        { label: 'Take the shot (3 rounds)', fn: () => { S.ammo -= 3; const p = 0.45 + S.marksman * 0.15 + (has('Kirsten') && S.kirstenShoots ? 0.15 : 0); if (chance(p)) { S.food += 60; say('Dinner', `Clean shot${has('Kirsten') && S.kirstenShoots ? ' (Kirsten called it)' : ''}. +60 lb of food. Pulled pork for days.`, trailHub); } else { hurt(pick(active()), 15); say('Missed!', 'The hog charges, bowls someone into the palmettos, and vanishes. Everyone is fine-ish.', trailHub); } } },
        { label: 'Back away slowly', fn: () => say('Standoff', 'You back away. The hog wins the staring contest. The hog always wins.', trailHub) },
      ],
    })
  },
  { ok: () => S.cake > 0, bad: false, run: () => cakeCraving(trailHub, false) },
  { ok: () => true, bad: true, dodge: 'a wrong turn', run: () => { passDay('Got lost in a subdivision where every street is named "Palm."'); afterDay(() => say('Lost', `Without GPS, Todd takes a wrong turn into a subdivision where every street is named Palm-something. Palm Cove. Palm Court. Palm Circle. You lose a day.`, trailHub)); } },
  { ok: () => true, bad: false, run: () => { S.water += 10; say('Fire Hydrant', `Some kids have cracked open a fire hydrant. Jugs out, everyone! +10 gallons of water${S.purify ? ' (Jennifer boils it, just to be safe)' : ''}.`, trailHub); } },
  { ok: () => true, bad: false, run: () => { S.food += 10; mood(5); say('Stranded Trolley', 'A sightseeing trolley is stranded with a dozen tourists from Ohio who have been on the "history tour" for three days. They trade you trail mix and beef jerky for directions to the Wawa. +10 lb food.', trailHub); } },
  { ok: () => has('DJ'), bad: false, run: () => { if (chance(0.5)) { S.gas += 5; say('DJ Made a Deal', `While everyone slept, DJ traded a bag of Todd's beef jerky for 5 gallons of gas and a boat horn. According to DJ, the boat horn is the real prize. +5 gallons of gas.`, trailHub); } else { const l = Math.min(S.water, 10); S.water -= l; say('DJ Made a Deal', `While everyone slept, DJ traded ${l} gallons of water for a signed photo of a guy who "might be" a Jacksonville Jaguar. DJ is thrilled. Nobody else is.`, trailHub); } } },
  { ok: () => true, bad: true, dodge: 'a fire ant mound', run: () => { const v = pick(active()); hurt(v, 12); say('Fire Ants!', `${FULL[v]} steps directly into a fire ant mound. There is a lot of hopping and yelling. ${v === 'Jon' ? 'Even mid-hop, Jon looks like a cologne ad.' : ''}`, trailHub); } },
  { ok: () => has('Jennifer'), bad: false, run: () => { const f = R(8, 16); S.food += f; say('Jennifer Scouts Ahead', `Jennifer bikes ahead to scout and comes back with ${f} lb of food from a church giveaway. Half the congregation are her grandchildren. Some are her great-great-grandchildren. Bikes: 1, Gas: 0.`, trailHub); } },
];

EVENTS.push(
  {
    ok: () => S.cake > 0, bad: false, run: () => {
      const n = alexSteals(5);
      scene({
        title: 'Alex Strikes Again', text: `While everyone was distracted, <b>Alex</b> — radiant, windswept, somehow wearing a sundress in a grid-down emergency — strolled past the Jeep. When she's gone, so are <span class="bad">${n} slice${n === 1 ? '' : 's'} of white cake</span>. She waves from down the road with a fork.`,
        choices: [
          { label: 'Chase her!', fn: () => { if (chance(0.25)) { S.cake += n; S.alexStole -= n; mood(10); say('Recovered!', `${has('Jennifer') ? 'Jennifer, who is very old, somehow corners her with her bike. ' : 'Todd somehow corners her. '}Alex hands back the cake with a dazzling smile and zero remorse. "I was just holding it for you."`, trailHub); } else { mood(-5); say('Gone', `Alex vanishes into a crowd of tourists. All that remains is a single footprint in the frosting. <span class="bad">That's a demerit on your final score.</span>`, trailHub); } } },
          { label: 'Let her go. Nobody can stop Alex.', fn: () => { mood(-3); say('Nobody Can Stop Alex', `Todd watches the cake disappear over the horizon. West's words echo in his head: "Watch out for Alex." <span class="bad">That's a demerit on your final score.</span>`, trailHub); } },
        ],
      });
    }
  },
  {
    ok: () => true, bad: false, run: () => scene({
      title: 'Eliza at the Crossroads', text: `At an intersection with dead traffic lights stands <b>Eliza</b>, cloak billowing, arranging crystals on the hood of an abandoned Corolla. "Oh good, it's you," she says. "I'm very open-minded about who I help."`,
      choices: [
        { label: 'Ask her to read your palm', fn: () => { S.tip++; say('Your Palm', `"You have a long life line, a short cake line, and someone named Alex in your future. Avoid her." <span class="hl">You'll dodge the next bit of trouble.</span> "I'm very open-minded, but that woman is a menace."`, trailHub); } },
        { label: 'Accept her herbal poultice', fn: () => { healAll(15); say('Mysterious Healing', `It smells like swamp and lavender. It works anyway. Everyone feels better. "I'm very open-minded about medicine," Eliza says, which is not reassuring.`, trailHub); } },
        { label: 'Let her bless the Jeep', fn: () => { S.gas += 2; mood(5); say('Blessed', `Eliza chants, rings a tiny bell and taps the hood three times. The gas gauge rises. Todd checks: +2 gallons. Science cannot explain it. "I'm very open-minded about science," she says.`, trailHub); } },
      ],
    })
  },
  {
    ok: () => true, bad: false, run: () => scene({
      title: 'West Under the Live Oak', text: `Under a live oak dripping with Spanish moss sits <b>West</b>, the wise man, as if he's been waiting. He probably has. "Sit," he says. "One question."`,
      choices: [
        { label: '"How do we get there alive?"', fn: () => { healAll(10); mood(10); say('West Speaks', `"Slow is smooth. Smooth is fast. Water before food. Food before cake." He pauses. "Cake before despair." Everyone feels steadier.`, trailHub); } },
        { label: '"What lies ahead?"', fn: () => { S.tip++; say('West Speaks', `West draws a line in the sand with a stick, then a lion, then a gator. "Patience at the lion. Courage at the gator." <span class="hl">You'll dodge the next bit of trouble.</span>`, trailHub); } },
        { label: '"Is Matt right about the birds?"', fn: () => { mood(15); say('West Speaks', `West is quiet for a very long time. A pelican flies overhead. West watches it go. "...Next question." Everyone laughs, a little nervously.`, trailHub); } },
      ],
    })
  },
  {
    ok: () => true, bad: false, run: () => scene({
      title: 'A Black Sedan', text: `A black sedan with tinted windows — the only car on the road with a full tank — pulls alongside. The window lowers. It's <b>Kelsey</b>, in sunglasses, holding a satellite phone. "Comrades! I mean... neighbors. You need gas, da? I need... cake. For reasons."`,
      choices: [
        { label: 'Trade 3 slices of cake for 8 gallons of gas', disabled: S.cake < 3, fn: () => { S.cake -= 3; S.gas += 8; say('Deal, Comrade', `Kelsey siphons 8 gallons into the Jeep with alarming professionalism. She photographs the cake before eating it. "For the file." +8 gallons of gas.`, trailHub); } },
        { label: 'Interrogate her', fn: () => { if (radioPowered()) { mood(10); S.ammo += 15; say('Matt on the Line', `Todd keys the radio. Matt's voice: "ASK HER ABOUT THE SQUIRREL." Kelsey's eye twitches. She tosses a box of ammo onto the seat — "this conversation did not happen" — and speeds off. +15 rounds.`, trailHub); } else { say('Nyet', `"I am simple girl from O-hee-yo," Kelsey says, and drives away at 90 mph without headlights.`, trailHub); } } },
        { label: 'Trust her and let her ride along for a mile', fn: () => { if (chance(0.5)) { S.food += 20; say('Surprisingly Helpful', `Kelsey leads you to an unmarked warehouse full of canned goods labeled only with serial numbers. "Is not my warehouse." +20 lb food.`, trailHub); } else { const l = Math.min(S.ammo, 20); S.ammo -= l; say('Do Svidaniya', `At a stop sign, Kelsey vanishes — along with ${l} rounds of ammo. She leaves a note: "Thank you for cooperation. — K." Matt is going to be insufferable about this.`, trailHub); } } },
      ],
    })
  },
);

function randomEvent() {
  const opts = EVENTS.map((e, i) => ({ e, i })).filter(x => x.e.ok() && x.i !== S.lastEvent);
  const { e, i } = pick(opts);
  S.lastEvent = i;
  if (e.bad && S.tip > 0) { S.tip--; return say('Close Call', `Thanks to the heads-up, you steer clear of ${e.dodge}. Smart.`, trailHub); }
  e.run();
}

/* ---- Landmarks ---- */
function arrive(lm) {
  beep(784, 0.1); setTimeout(() => beep(988, 0.15), 120);
  LM[lm.id]();
}

const LM = {
  publix() {
    scene({
      title: 'Publix on SR-16',
      text: `The automatic doors are stuck halfway open. Inside, the shelves have been picked clean... mostly. A lone employee in a green apron guards the bakery like a knight guarding the Holy Grail.`,
      choices: [
        { label: 'Search the bakery', fn: () => { if (S.intel.cake || (has('Jon') && chance(0.8)) || chance(0.4)) { const c = S.intel.cake ? 24 : 12; S.cake += c; mood(15); say('THE BAKERY', `${S.intel.cake ? `Thanks to Matt's tip, Todd heads straight for the walk-in. ` : has('Jon') ? 'The employee looks at Jon Galluzzo, sighs, and wheels out a cart. ' : 'The employee is on break. '}+${c} slices of white cake. Todd weeps openly.`, trailHub); } else { mood(-5); say('Denied', `"Ma'am, I just want the cake." "Sir, the cake is not for sale during a grid emergency." Todd respects her commitment. He leaves empty-handed.`, trailHub); } } },
        { label: 'Search the pharmacy', fn: () => { const m = R(1, 2); S.meds += m; say('Pharmacy', `Behind the counter: a box of first-aid kits nobody grabbed. +${m}.`, trailHub); } },
        { label: 'Keep moving', fn: trailHub },
      ],
    });
  },
  outlets() {
    scene({
      title: 'The Outlet Mall Bazaar',
      text: `The outlet mall has become a grid-down trading post. Somebody is selling generators out of a sneaker store. A man is trading gas for designer sunglasses. It's the most St. Augustine thing you've ever seen.`,
      choices: [
        { label: 'Shop the bazaar', fn: () => store('bazaar', LM.outlets) },
        { label: 'Leave', fn: trailHub },
      ],
    });
  },
  fountain() {
    scene({
      title: 'The Fountain of Youth',
      text: `The archaeological park is dark and quiet except for the peacocks, who are screaming like it's their job. The famous spring still flows. Ponce de León never found eternal youth here, but he also never had a grid-down emergency.`,
      choices: [
        { label: 'Everyone drinks from the Fountain', fn: () => { healAll(25); mood(10); say('Refreshed', `It tastes like sulfur and history. Everyone feels better. ${has('DJ') ? 'DJ claims he looks ten years younger. ' : ''}${has('Jon') ? 'Jon Galluzzo somehow DOES look younger. It is upsetting.' : ''}`, trailHub); } },
        { label: 'Fill the water jugs', note: S.purify && has('Jennifer') ? '(Jennifer will purify it)' : '(need Jennifer + purification skill)', disabled: !(S.purify && has('Jennifer')), fn: () => { S.water += 15; say('Topped Off', `+15 gallons of purified spring water. Jennifer's bandana filter has never been more relevant.`, trailHub); } },
        { label: 'Try to catch a peacock', fn: () => { hurt('Todd', 12); mood(12); say('Peacock: 1, Todd: 0', `The peacock is faster, louder and angrier than Todd. Todd gets pecked. Everyone else is crying laughing. Morale up, Todd's dignity down.`, trailHub); } },
      ],
    });
  },
  castillo() {
    scene({
      title: 'Castillo de San Marcos',
      text: `The old Spanish fort has survived 350 years, a couple of sieges and countless field trips. Its coquina walls absorbed cannonballs like sponges — it can handle a power outage. A park ranger in full 1700s costume is still on duty. Nobody told him to go home.`,
      choices: [
        { label: 'Camp safely inside the walls (rest a day)', fn: () => { passDay('Camped inside the Castillo.', true); healAll(10); afterDay(() => say('Safe Night', `Nobody bothers you. The ranger keeps watch all night with a (replica) musket. Best sleep in days.`, trailHub)); } },
        { label: 'Ask the costumed ranger for advice', fn: () => { S.tip++; say('Ranger Wisdom', `"Huzzah, travelers. The road past the Bridge of Lions is perilous. Go carefully." He hands you a map drawn on parchment. <span class="hl">You'll dodge the next bit of trouble.</span>`, trailHub); } },
        { label: has('DJ') ? 'Let DJ fire the cannon' : 'Ask to fire the cannon', fn: () => { mood(25); if (chance(0.4)) { const l = Math.min(S.food, 15); S.food -= l; say('BOOM', `The ranger allows ONE ceremonial blank. It is the loudest thing to happen in St. Augustine in days. Morale skyrockets. Unfortunately, the noise draws a gang of raccoons, who make off with ${l} lb of food.`, trailHub); } else say('BOOM', `The ranger allows ONE ceremonial blank. Car alarms go off across downtown. Pelicans scatter. ${has('DJ') ? 'DJ is screaming with joy. ' : ''}Best day of the apocalypse.`, trailHub); } },
      ],
    });
  },
  stgeorge() {
    const go = () => scene({
      title: 'St. George Street',
      text: `The pedestrian street is dark, but the shops are open by candlelight and cash still talks. A guy dressed as a pirate is running a provisions table outside the fudge shop.`,
      choices: [
        { label: `Shop at the pirate's table`, fn: () => store('pirate', go) },
        { label: 'Eat free fudge samples', fn: () => { mood(8); S.food += 3; say('Fudge', 'The fudge shop is giving away samples before they melt. Everyone eats too much. +3 lb "food."', trailHub); } },
        { label: 'Keep moving', fn: trailHub },
      ],
    });
    if (S.jonLate && !S.party.Jon.in) {
      S.party.Jon.in = true; S.jonLate = false; mood(10);
      return say('Who Is That?', `Outside a candle shop, a small crowd has gathered. At the center: a man with great hair and a jawline you could slice cheese with. He's helping an elderly couple carry water. He's also lit from slightly above, somehow.<br><br>"Jon Galluzzo," he says. "Heading to the Wawa? Mind if I join?"<br><br><b>Jon Galluzzo has joined the crew.</b> Traders will give you better deals.`, go);
    }
    go();
  },
  bridge() {
    const capCost = S.intel.boat ? 3 : 6;
    const cashCost = S.intel.boat ? 60 : 120;
    scene({
      title: 'The Bridge of Lions',
      text: `The Bridge of Lions is a drawbridge. When the grid went down, it was <b>open</b>. Now both halves point at the sky, and the two marble lions guarding the entrance look as disappointed as you are.<br><br>The Matanzas River is about a quarter-mile across here. How will you cross?`,
      choices: [
        { label: `Jump the gap in the Jeep${has('DJ') ? ` (DJ's idea)` : ''}`, fn: () => { mood(-3); say('Absolutely Not', `${has('Kirsten') ? 'Kirsten' : 'Jennifer'} snatches the keys out of the ignition before Todd can rev the engine. "We are NOT doing a Dukes of Hazzard." Probably for the best.`, LM.bridge); } },
        { label: 'Float the Jeep across on pool noodles', note: '(risky)', fn: floatAcross },
        { label: `Hire ${S.intel.boat ? 'Captain Ray' : 'a shrimp boat captain'} — pay in cake`, note: `(${capCost} slices)`, disabled: S.cake < capCost, fn: () => { S.cake -= capCost; mood(5); say('Smooth Sailing', `${S.intel.boat ? `"Matt sent ya? Hop on." ` : ''}The shrimp boat chugs across the Matanzas with the Jeep lashed to the deck. ${has('Jennifer') ? `Jennifer's bike rides up front like a figurehead. ` : ''}Dolphins escort you. The captain eats ${capCost} slices of cake in one sitting. A fair price.`, trailHub); } },
        { label: `Hire ${S.intel.boat ? 'Captain Ray' : 'a shrimp boat captain'} — pay cash`, note: `($${cashCost})`, disabled: S.money < cashCost, fn: () => { S.money -= cashCost; say('Smooth Sailing', 'The captain counts the cash twice, then ferries you across. Dolphins escort you the whole way.', trailHub); } },
        { label: 'Wait for the bridge crew to crank it down by hand', note: '(2 days)', fn: () => { passDay('Waited at the Bridge of Lions.'); afterDay(() => { passDay('Still waiting at the Bridge of Lions.'); afterDay(() => say('Slowly, Slowly', 'Two days and roughly 4,000 hand-cranks later, the bridge comes down. A small crowd cheers. You drive across like royalty.', trailHub)); }); } },
      ],
    });
  },
  gators() {
    const foodCost = S.intel.gators ? 10 : 20;
    scene({
      title: 'St. Augustine Alligator Farm',
      text: `${S.intel.gators ? 'Just like Matt warned, the' : 'The'} electric gate locks failed when the grid went down. The alligators have, technically, let themselves out. About forty of them are sunning themselves across A1A. One of them is an albino. It is looking right at you.`,
      choices: [
        { label: 'Tiptoe past', fn: () => { let safe; if (S.tip > 0) { S.tip--; safe = true; } else safe = chance(has('Jennifer') ? 0.8 : 0.55); if (safe) say('Made It', `${has('Jennifer') ? 'Jennifer scouts a silent route on her bike, weaving between gators like a slalom course. ' : ''}You make it past without incident. Nobody breathes for a quarter mile.`, trailHub); else { const v = pick(active()); hurt(v, 30); const l = Math.min(S.food, 15); S.food -= l; say('CHOMP', `A gator lunges and catches ${FULL[v]}'s backpack. ${FULL[v]} escapes — but the backpack, and ${l} lb of food, do not.`, trailHub); } } },
        { label: `Distract them with food (${foodCost} lb)`, disabled: S.food < foodCost, fn: () => { S.food -= foodCost; say('Snack Time', 'You toss canned hot dogs into the marsh. Forty gators turn as one. You roll past while they eat.', trailHub); } },
        has('Jon') && { label: 'Let Jon Galluzzo handle it', fn: () => { mood(15); say('The Gator Whisperer', 'Jon Galluzzo walks calmly into the road. The alligators look at him. He looks at them. Something passes between them. They part like the Red Sea. Even the albino seems charmed. Nobody will ever speak of this.', trailHub); } },
      ].filter(Boolean),
    });
  },
  lighthouse() {
    scene({
      title: 'St. Augustine Lighthouse',
      text: `The black-and-white striped lighthouse towers over Anastasia Island. 219 steps to the top. From up there you can see everything — the dark city, the ocean, and maybe, just maybe, a faint red-and-yellow glow on the horizon.`,
      choices: [
        { label: 'Climb all 219 steps', fn: () => { hurt('Todd', 8); mood(15); let t = `Todd reaches the top, wheezing. And there it is — a tiny glowing Wawa sign on the horizon. It's real. It's REAL.`; if (S.radioSetup) { S.tip++; t += `<br><br>From this height, the handheld reaches Matt crystal clear: "Todd! I can practically see you from here. Watch yourself on the 312 bridge. Over." <span class="hl">You'll dodge the next bit of trouble.</span>`; } if (has('Kirsten')) t += '<br><br>Kirsten climbs up behind him and takes his hand. Best view in Florida.'; say('The View', t, trailHub); } },
        { label: `Rest at the keeper's house (rest a day)`, fn: () => { passDay('Rested at the lighthouse.', true); afterDay(() => say(`Keeper's Rest`, `The lighthouse volunteers share their emergency crackers and ghost stories. (The lighthouse is famously haunted.${has('DJ') ? ' DJ does not sleep.' : ''})`, trailHub)); } },
        { label: 'Keep moving', fn: trailHub },
      ],
    });
  },
  bridge312() {
    scene({
      title: 'The SR-312 Bridge',
      text: `At the top of the bridge sits a man in a lawn chair, under a beach umbrella, next to a hand-painted sign: <b>TOLL — $50 OR CAKE</b>. He is not a government official. He is extremely relaxed about it.`,
      choices: [
        { label: 'Pay $50', disabled: S.money < 50, fn: () => { S.money -= 50; say('Paid', '"Pleasure." He tips his visor. You roll on.', trailHub); } },
        { label: 'Pay 3 slices of white cake', disabled: S.cake < 3, fn: () => { S.cake -= 3; mood(-5); say('Cake Toll', 'Todd hands over the cake with trembling hands. The man eats a slice right in front of him. Todd will remember his face forever.', trailHub); } },
        { label: 'Compliment his lawn chair', fn: () => { if (S.intel.bridge312 || chance(0.4)) { mood(10); say('Flattery Works', `"It IS a nice chair, isn't it?" He waves you through, beaming.${S.intel.bridge312 ? ' Matt was right.' : ''}`, trailHub); } else { const p = Math.min(S.money, 50); S.money -= p; say('Nice Try', `"I appreciate that. Toll's still the toll." He takes $${fmt(p)}.`, trailHub); } } },
        { label: 'Turn around and take the long way', note: '(lose 2 days)', fn: () => { passDay('Took the long way around the 312 bridge.'); afterDay(() => { passDay('Still on the long way.'); afterDay(() => say('The Long Way', 'Two days of back roads later, you rejoin US-1. The lawn chair man waves as you pass in the distance.', trailHub)); }); } },
      ],
    });
  },
  wawa() { wawa(); },
};

function floatAcross() {
  if (chance(0.6)) { mood(15); say('It Worked?!', 'Against every law of physics and common sense, the pool-noodle raft holds. You paddle across with a canoe paddle and a Publix bag. Locals on the seawall applaud.', trailHub); return; }
  const lw = Math.min(S.water, R(5, 15)), lf = Math.min(S.food, R(10, 25)), la = Math.min(S.ammo, R(5, 15));
  S.water -= lw; S.food -= lf; S.ammo -= la; hurtAll(10);
  say('Swamped!', `Halfway across, the noodles start to fold. Water pours in. You make it to the other side, but you lost:<br>• ${lw} gallons of water<br>• ${lf} lb of food<br>• ${la} rounds of ammo<br>Everyone is soaked and miserable.${S.cake ? ' Somehow the white cake survived. Todd held it over his head the entire time.' : ''}`, trailHub);
}

/* ============================================================
   HUNTING
   ============================================================ */
const GAME = [
  { n: 'feral hog', w: 22, h: 12, sp: [0.5, 0.9], lbs: 80, wt: 3 },
  { n: 'wild turkey', w: 12, h: 13, sp: [0.7, 1.2], lbs: 15, wt: 3 },
  { n: 'armadillo', w: 12, h: 7, sp: [0.4, 0.7], lbs: 8, wt: 3 },
  { n: 'squirrel', w: 8, h: 6, sp: [1.3, 1.9], lbs: 1, wt: 3 },
  { n: 'white sheet cake', w: 14, h: 10, sp: [1.6, 2.2], lbs: 0, cake: true, wt: 0.6 },
];

let huntState = null;
function hunt() {
  huntState = { done: false };
  scene({
    title: 'Hunting',
    text: `Click or tap to shoot. You have ${S.ammo} rounds and 30 seconds. ${S.intel.hogs ? `Matt was right — the hogs are everywhere out here. ` : ''}You can carry ${100 + (has('Jennifer') ? 50 : 0)} lb back to the Jeep${has('Jennifer') ? ` (Jennifer's bike trailer helps)` : ''}.`,
    html: `<canvas id="huntCanvas" width="320" height="180"></canvas><div class="hunthud"><span id="hTime">30</span>s &middot; Ammo <span id="hAmmo">${S.ammo}</span> &middot; Bagged <span id="hLbs">0</span> lb</div>`,
    choices: [{ label: 'Stop hunting', fn: () => endHunt() }],
    after: startHunt,
  });
}

function startHunt() {
  const cv = document.getElementById('huntCanvas');
  const H = huntState;
  H.animals = []; H.bag = []; H.cake = 0; H.lbs = 0; H.flash = 0; H.floaters = [];
  H.t0 = performance.now(); H.lastSpawn = 0; H.aim = { x: 160, y: 90, on: false };
  H.bonus = S.marksman * 2 + (S.cleaningKit ? 2 : 0) + (has('Kirsten') && S.kirstenShoots ? 2 : 0);
  let ctx = null;
  try { ctx = cv && cv.getContext('2d'); } catch (e) { ctx = null; }
  const toXY = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * 320 / (r.width || 320), y: (e.clientY - r.top) * 180 / (r.height || 180) }; };
  if (cv) {
    cv.addEventListener('pointermove', e => { const p = toXY(e); H.aim = { ...p, on: true }; });
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (H.done) return;
      const p = toXY(e); H.aim = { ...p, on: true };
      if (S.ammo <= 0) { beep(200, 0.05); return; }
      S.ammo--; bang(); H.flash = 4;
      const b = H.bonus;
      for (let i = H.animals.length - 1; i >= 0; i--) {
        const a = H.animals[i];
        if (a.dead) continue;
        if (p.x >= a.x - b && p.x <= a.x + a.w + b && p.y >= a.y - b && p.y <= a.y + a.h + b) {
          a.dead = performance.now();
          H.bag.push(a.type.n);
          if (a.type.cake) { H.cake++; H.floaters.push({ x: a.x, y: a.y, txt: 'CAKE!!', t: performance.now() }); }
          else { const l = Math.round(a.type.lbs * (S.intel.hogs && a.type.n === 'feral hog' ? 1.25 : 1)); H.lbs += l; H.floaters.push({ x: a.x, y: a.y, txt: `+${l} lb`, t: performance.now() }); }
          break;
        }
      }
      const am = document.getElementById('hAmmo'); if (am) am.textContent = S.ammo;
      const lb = document.getElementById('hLbs'); if (lb) lb.textContent = H.lbs;
      if (S.ammo <= 0) setTimeout(() => endHunt(), 900);
    });
  }
  const frame = now => {
    if (H.done) return;
    const el = (now - H.t0) / 1000;
    const left = Math.max(0, 30 - el);
    const ht = document.getElementById('hTime'); if (ht) ht.textContent = Math.ceil(left);
    if (left <= 0) return endHunt();
    if (now - H.lastSpawn > 750 && H.animals.filter(a => !a.dead).length < 5) {
      H.lastSpawn = now;
      const pool = GAME.map(g => ({ g, w: g.wt * (g.n === 'feral hog' && S.intel.hogs ? 2 : 1) }));
      let r = Math.random() * pool.reduce((t, x) => t + x.w, 0), type = GAME[0];
      for (const x of pool) { if ((r -= x.w) < 0) { type = x.g; break; } }
      const dir = chance(0.5) ? 1 : -1;
      H.animals.push({ type, w: type.w, h: type.h, dir, x: dir > 0 ? -type.w : 320, y: R(92, 162 - type.h), sp: type.sp[0] + Math.random() * (type.sp[1] - type.sp[0]) });
    }
    H.animals.forEach(a => { if (!a.dead) a.x += a.sp * a.dir; });
    H.animals = H.animals.filter(a => (a.dead ? now - a.dead < 700 : a.x > -40 && a.x < 360));
    if (ctx) drawHunt(ctx, now, H);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function endHunt() {
  const H = huntState;
  if (!H || H.done) return;
  H.done = true; currentChoices = [];
  const cap = 100 + (has('Jennifer') ? 50 : 0);
  const carried = Math.min(H.lbs, cap);
  S.food += carried; S.cake += H.cake * 6;
  const counts = {}; (H.bag || []).forEach(n => counts[n] = (counts[n] || 0) + 1);
  const list = Object.entries(counts).map(([n, c]) => `${c} ${n}${c > 1 ? (n.endsWith('y') ? 's' : n.endsWith('cake') ? 's' : 's') : ''}`).join(', ');
  let t = list ? `You bagged: ${list}.<br>` : 'You came back empty-handed. The squirrels are laughing at you.<br>';
  if (H.lbs) t += `That's ${H.lbs} lb of food.${H.lbs > cap ? ` <span class="bad">You can only carry ${cap} lb back to the Jeep.</span>` : ''} +${carried} lb food.`;
  if (H.cake) t += `<br><span class="hl">...and ${H.cake} wild white sheet cake${H.cake > 1 ? 's' : ''}?! +${H.cake * 6} slices. Nobody can explain this. Todd does not ask questions.</span>`;
  passDay('Spent the day hunting.');
  afterDay(() => say('Hunt Results', t, trailHub));
}

/* ============================================================
   PIXEL ART
   ============================================================ */
const hash = n => (((n * 2654435761) >>> 0) % 997);
let animHandle = null;
const marqueeImg = new Image();
marqueeImg.src = 'marquee-sign.png';

function animateScene(id, moving, duration, done) {
  const cv = document.getElementById(id);
  let ctx = null;
  try { ctx = cv && cv.getContext('2d'); } catch (e) { ctx = null; }
  if (!ctx) { if (done) setTimeout(done, duration ? 200 : 0); return; }
  cancelAnimationFrame(animHandle);
  const t0 = performance.now();
  let off = ((S && S.miles) || 0) * 37;
  if (!moving && !duration) { drawScene(ctx, off, t0, false); return; }
  const frame = t => {
    if (moving) off += 1.1;
    drawScene(ctx, off, t, moving);
    if (duration && t - t0 > duration) { if (done) done(); return; }
    if (!document.body.contains(cv)) return;
    animHandle = requestAnimationFrame(frame);
  };
  animHandle = requestAnimationFrame(frame);
}

function rect(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

function palm(ctx, x, y, s = 1) {
  for (let i = 0; i < 22 * s; i++) rect(ctx, '#8a6a3a', x + Math.round(Math.sin(i / 7) * 2), y - i, 2, 1);
  const tx = x + Math.round(Math.sin(21 * s / 7) * 2), ty = y - Math.round(22 * s);
  const dirs = [[-1, -0.25], [1, -0.25], [-1, 0.35], [1, 0.35], [-0.5, -0.8], [0.5, -0.8]];
  dirs.forEach(([dx, dy]) => { for (let k = 0; k < 9 * s; k++) rect(ctx, k % 3 ? '#2f8f3a' : '#3fae4a', tx + dx * k, ty + dy * k + (k * k) / 16, 2, 1); });
}

function drawScene(ctx, off, t, moving) {
  ctx.imageSmoothingEnabled = false;
  const rain = S && S.weather && S.weather.rain;
  const title = !S;
  // sky
  rect(ctx, title ? '#ff9a5a' : rain ? '#5b6b7a' : '#7fd3ff', 0, 0, 320, 30);
  rect(ctx, title ? '#ffb870' : rain ? '#687886' : '#9fe0ff', 0, 30, 320, 16);
  rect(ctx, title ? '#ffd28a' : rain ? '#74838f' : '#bfeaff', 0, 46, 320, 14);
  // sun / clouds
  if (!rain) { const sx = title ? 230 : 262, sy = title ? 30 : 10; rect(ctx, '#ffe066', sx, sy + 2, 14, 10); rect(ctx, '#ffe066', sx + 2, sy, 10, 14); }
  else for (let i = 0; i < 40; i++) { const rx = (hash(i * 7) + t / 6) % 320, ry = (hash(i * 13) + t / 3) % 60; rect(ctx, '#a9c0d4', rx, ry, 1, 3); }
  for (let i = 0; i < 4; i++) { const cx = ((i * 97 - off * 0.08) % 380 + 380) % 380 - 40; rect(ctx, '#ffffff', cx, 8 + i * 5, 26, 4); rect(ctx, '#ffffff', cx + 5, 5 + i * 5, 14, 4); }
  // far treeline / marsh
  const so = Math.floor(off * 0.25);
  for (let x = 0; x < 320; x++) { const h = 3 + (hash((x + so) >> 2) % 6); rect(ctx, '#3f7a4a', x, 58 - h, 1, h + 2); }
  // ground
  rect(ctx, '#58a14a', 0, 58, 320, 12);
  rect(ctx, '#666', 0, 70, 320, 20);
  rect(ctx, '#888', 0, 70, 320, 1); rect(ctx, '#888', 0, 89, 320, 1);
  const dash = Math.floor(off) % 24;
  for (let x = -dash; x < 320; x += 24) rect(ctx, '#ffd84a', x, 79, 12, 1);
  rect(ctx, '#d9c48a', 0, 90, 320, 10);
  // palms
  for (let i = 0; i < 6; i++) { const px = ((i * 71 - off) % 426 + 426) % 426 - 50; palm(ctx, px, 68, 1); }
  // DJ & Lindsey marquee on the side of the road (title screen)
  if (title) roadsideSign(ctx, 10, 1);
  // party
  const showBike = !title && has('Jennifer');
  const bob = moving && Math.floor(t / 110) % 2 ? 1 : 0;
  if (!S || S.gas > 0 || title) truck(ctx, 168, 58 - bob, t, moving);
  else walkers(ctx, 190, 66, t, moving);
  if (showBike) bike(ctx, 128, 67, t, moving);
}

/* Todd's black Jeep Gladiator: boxy cab, flat hood, square fenders, 7-slot grille, round headlights, pickup bed */
function roadsideSign(ctx, x, y) {
  const w = 98, h = 60;
  rect(ctx, '#2a2a2a', x + 18, y + h, 4, 69 - y - h); rect(ctx, '#2a2a2a', x + w - 22, y + h, 4, 69 - y - h);
  rect(ctx, '#1a1a1a', x - 1, y - 1, w + 2, h + 2);
  if (marqueeImg.complete && marqueeImg.naturalWidth) { ctx.imageSmoothingEnabled = true; ctx.drawImage(marqueeImg, x, y, w, h); ctx.imageSmoothingEnabled = false; }
  else rect(ctx, '#eee', x, y, w, h);
  rect(ctx, '#3f7a3a', x + 10, 66, 30, 4); rect(ctx, '#4f9a45', x + 44, 66, 30, 4);
}

function truck(ctx, x, y, t, moving) {
  const body = '#1c1c1f', hi = '#3a3a40', trim = '#0b0b0c';
  // bed
  rect(ctx, body, x, y + 6, 26, 8); rect(ctx, hi, x, y + 6, 26, 1);
  rect(ctx, trim, x + 25, y + 6, 1, 8);
  // cab (tall & square) with roll-bar style roof
  rect(ctx, body, x + 26, y - 1, 16, 15); rect(ctx, hi, x + 26, y - 1, 16, 1);
  rect(ctx, trim, x + 34, y, 1, 13);
  rect(ctx, '#9ed7ff', x + 28, y + 1, 5, 5); rect(ctx, '#9ed7ff', x + 36, y + 1, 5, 5);
  rect(ctx, '#7ab8e0', x + 28, y + 5, 5, 1); rect(ctx, '#7ab8e0', x + 36, y + 5, 5, 1);
  // flat hood + upright grille
  rect(ctx, body, x + 42, y + 5, 10, 9); rect(ctx, hi, x + 42, y + 5, 10, 1);
  rect(ctx, trim, x + 51, y + 5, 2, 9);
  for (let i = 0; i < 4; i++) rect(ctx, '#555', x + 52, y + 7 + i * 2, 1, 1);
  rect(ctx, '#ffffcc', x + 51, y + 6, 2, 2);
  // square flared fenders + rock rails
  rect(ctx, trim, x + 2, y + 11, 12, 2); rect(ctx, trim, x + 38, y + 11, 13, 2);
  rect(ctx, '#2a2a2e', x + 14, y + 13, 24, 1);
  rect(ctx, '#333', x + 52, y + 12, 2, 3);
  // spare tire on the tailgate
  rect(ctx, '#111', x - 3, y + 6, 3, 7); rect(ctx, '#444', x - 2, y + 9, 1, 1);
  // cargo
  rect(ctx, '#c9a26b', x + 3, y + 2, 6, 4); rect(ctx, '#3a6ac9', x + 10, y + 1, 5, 5); rect(ctx, '#e8e8e8', x + 16, y + 3, 7, 3); rect(ctx, '#f6a', x + 16, y + 2, 7, 1);
  if (S && S.panelsInstalled > 0) { rect(ctx, '#888', x + 2, y - 1, 1, 7); rect(ctx, '#888', x + 23, y - 1, 1, 7); rect(ctx, '#1b2a6b', x + 1, y - 2, 24, 3); for (let i = 0; i < 24; i += 5) rect(ctx, '#4a6bd6', x + 1 + i, y - 2, 1, 3); }
  // Todd at the wheel + DJ riding shotgun in his hat
  rect(ctx, '#e0b08a', x + 37, y + 2, 3, 3);
  if (S && has('DJ')) { rect(ctx, '#e0b08a', x + 29, y + 2, 3, 3); if (S.hat) { rect(ctx, '#3b2a1a', x + 27, y + 1, 7, 1); rect(ctx, '#3b2a1a', x + 28, y - 1, 5, 2); rect(ctx, '#c33', x + 28, y, 5, 1); } }
  // big off-road tires
  const spin = moving && Math.floor(t / 80) % 2;
  [x + 4, x + 40].forEach(wx => { rect(ctx, '#111', wx, y + 12, 9, 8); rect(ctx, '#222', wx + 1, y + 13, 7, 6); rect(ctx, spin ? '#777' : '#999', wx + 3, y + 15, 3, 2); });
}

function bike(ctx, x, y, t, moving) {
  const p = moving ? Math.floor(t / 120) % 2 : 0;
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
  [x + 3, x + 15].forEach(cx => { ctx.beginPath(); ctx.arc(cx + 0.5, y + 12.5, 3.5, 0, Math.PI * 2); ctx.stroke(); });
  rect(ctx, '#2aa198', x + 4, y + 9, 10, 1); rect(ctx, '#2aa198', x + 8, y + 9, 1, 4); rect(ctx, '#2aa198', x + 13, y + 6, 1, 4);
  rect(ctx, '#ff6fae', x + 7, y + 1, 3, 6);
  rect(ctx, '#e0b08a', x + 8, y - 3, 3, 3);
  rect(ctx, '#ffcc00', x + 7, y - 4, 5, 2);
  rect(ctx, '#f2f2f2', x + 6, y - 2, 2, 4); rect(ctx, '#f2f2f2', x + 7, y + 1, 1, 2); // white hair (Jennifer is very old)
  rect(ctx, '#bbb', x + 12, y - 2, 1, 1);
  rect(ctx, '#e0b08a', x + 10, y + 2, 4, 1);
  rect(ctx, '#334', x + 8, y + 7, 1, p ? 4 : 2); rect(ctx, '#334', x + 9, y + 7, 1, p ? 2 : 4);
  rect(ctx, '#8b5a2b', x - 1, y + 5, 5, 3);
}

function walkers(ctx, x, y, t, moving) {
  const ppl = active();
  const colors = { Todd: '#4a7a3a', Kirsten: '#c94a8a', DJ: '#d9822b', Jon: '#e8e8e8' };
  let i = 0;
  ppl.filter(n => n !== 'Jennifer').forEach(n => {
    const px = x + i * 9; i++;
    const step = moving && Math.floor(t / 150 + i) % 2;
    rect(ctx, '#e0b08a', px + 1, y - 4, 3, 3);
    rect(ctx, colors[n], px, y - 1, 5, 6);
    rect(ctx, '#334', px + 1, y + 5, 1, step ? 4 : 3); rect(ctx, '#334', px + 3, y + 5, 1, step ? 3 : 4);
    if (n === 'DJ' && S.hat) { rect(ctx, '#3b2a1a', px - 1, y - 5, 7, 1); rect(ctx, '#3b2a1a', px, y - 7, 5, 2); }
  });
}

function drawAnimal(ctx, a, now) {
  ctx.save();
  ctx.translate(Math.round(a.x), Math.round(a.y));
  if (a.dir < 0) { ctx.translate(a.w, 0); ctx.scale(-1, 1); }
  if (a.dead) { ctx.globalAlpha = Math.max(0, 1 - (now - a.dead) / 700); ctx.translate(0, a.h); ctx.scale(1, -1); }
  const leg = Math.floor(now / 120) % 2;
  const r = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  switch (a.type.n) {
    case 'feral hog':
      r('#5b3a29', 0, 2, 18, 7); r('#3a2418', 2, 1, 13, 1); r('#5b3a29', 16, 3, 6, 5); r('#d88', 21, 5, 2, 2); r('#000', 18, 4, 1, 1); r('#fff', 21, 7, 1, 1); r('#3a2418', -1, 3, 1, 2);
      r('#3a2418', 2, 9, 2, leg ? 3 : 2); r('#3a2418', 6, 9, 2, leg ? 2 : 3); r('#3a2418', 12, 9, 2, leg ? 3 : 2); r('#3a2418', 15, 9, 2, leg ? 2 : 3); break;
    case 'wild turkey':
      r('#8b5a2b', -2, 1, 3, 8); r('#6b4423', 0, 4, 9, 7); r('#4466aa', 8, 2, 2, 4); r('#d22', 9, 0, 3, 3); r('#d22', 10, 3, 1, 2); r('#c90', 3, 11, 1, leg ? 2 : 1); r('#c90', 6, 11, 1, leg ? 1 : 2); break;
    case 'armadillo':
      r('#9a9a8a', 1, 1, 9, 4); r('#77776a', 3, 1, 1, 4); r('#77776a', 6, 1, 1, 4); r('#9a9a8a', 10, 3, 2, 2); r('#9a9a8a', -1, 4, 2, 1); r('#77776a', 2, 5, 1, leg ? 2 : 1); r('#77776a', 8, 5, 1, leg ? 1 : 2); break;
    case 'squirrel':
      r('#999', 0, 0, 2, 4); r('#888', 2, 2, 4, 3); r('#888', 5, 1, 2, 2); r('#000', 6, 1, 1, 1); r('#666', 3, 5, 1, 1); r('#666', 5, 5, 1, 1); break;
    case 'white sheet cake':
      r('#fff', 0, 2, 14, 5); r('#f9c', 0, 1, 14, 2); r('#f9c', 2, 0, 2, 1); r('#f9c', 7, 0, 2, 1); r('#f9c', 11, 0, 2, 1); r('#ddd', 0, 7, 14, 1);
      r('#e0b08a', 2, 8, 1, leg ? 2 : 1); r('#e0b08a', 11, 8, 1, leg ? 1 : 2); break;
  }
  ctx.restore();
}

function drawHunt(ctx, now, H) {
  ctx.imageSmoothingEnabled = false;
  rect(ctx, '#9fe0ff', 0, 0, 320, 60);
  rect(ctx, '#bfeaff', 0, 50, 320, 20);
  for (let x = 0; x < 320; x++) { const h = 6 + (hash(x >> 2) % 8); rect(ctx, '#3f7a4a', x, 78 - h, 1, h + 2); }
  rect(ctx, '#6aa84f', 0, 78, 320, 102);
  for (let i = 0; i < 60; i++) rect(ctx, '#5a9442', hash(i * 31) % 320, 80 + hash(i * 17) % 98, 3, 1);
  palm(ctx, 30, 96, 1.2); palm(ctx, 280, 92, 1.1); palm(ctx, 205, 86, 0.9);
  H.animals.forEach(a => drawAnimal(ctx, a, now));
  // palmettos in foreground
  [[60, 172], [150, 176], [250, 174]].forEach(([x, y]) => { for (let k = -6; k <= 6; k++) rect(ctx, '#2f7a34', x + k * 2, y - (6 - Math.abs(k)), 1, 6 - Math.abs(k) + 4); });
  H.floaters = H.floaters.filter(f => now - f.t < 900);
  ctx.font = '8px monospace';
  H.floaters.forEach(f => { ctx.fillStyle = '#ffcc33'; ctx.fillText(f.txt, f.x, f.y - (now - f.t) / 40); });
  if (H.flash > 0) { ctx.fillStyle = 'rgba(255,255,200,.35)'; ctx.fillRect(0, 0, 320, 180); H.flash--; }
  if (H.aim.on) { const { x, y } = H.aim; rect(ctx, '#ff3333', x - 6, y, 4, 1); rect(ctx, '#ff3333', x + 3, y, 4, 1); rect(ctx, '#ff3333', x, y - 6, 1, 4); rect(ctx, '#ff3333', x, y + 3, 1, 4); }
}

/* ============================================================
   SUPPLIES SCREEN
   ============================================================ */
function supplies(back) {
  const rows = [['Cash', '$' + fmt(S.money)], ['Water', fmt(S.water) + ' gallons'], ['Food', fmt(S.food) + ' lb'], ['White cake', S.cake + ' slices'],
  ['Ammo', S.ammo + ' rounds'], ['Gas', S.gas + ' gallons'], ['First-aid kits', S.meds],
  ['Solar panels', `${S.panelsInstalled} installed${S.panels > S.panelsInstalled ? ` (+${S.panels - S.panelsInstalled} not installed)` : ''}`],
  ['Battery banks', S.batteries], ['Spare tires', S.spareTire], ['Rain barrel', S.rainBarrel ? 'yes' : 'no'], ['Bug spray', S.bugSpray], ['Bike parts', S.bikeParts], ['Cake stolen by Alex', `${S.alexStole || 0} slices${S.cakeSafe ? ' (cake is in the gun safe)' : ''}`]];
  let crew;
  if (S.phase === 'prep') {
    crew = [
      ['Kirsten', kirstenHint()],
      ['Jennifer', (S.jenn ? `Bike days together: ${S.jenn}` : `Hasn't been on a bike day yet`) + ' · age: very old'],
      ['DJ', S.djLoyal >= 2 ? 'Fiercely loyal (you found his hat)' : `Shifts worked: ${S.djShifts}`],
      ['Jon Galluzzo', S.metJon ? 'In! (10% off at stores)' : 'Never met. (Try the range or the office.)'],
      ['Matt', S.radioSetup ? 'On the ham radio' : 'No radio set up yet'],
    ];
  } else {
    crew = MEMBERS.filter(n => S.party[n].in || S.party[n].gone).map(n => [FULL[n], S.party[n].gone ? '<span class="bad">left the crew</span>' : `health: ${hpWord(S.party[n].hp)}${n === 'DJ' ? (S.hat ? ' · has hat' : ' · <span class="bad">NO HAT</span>') : ''}`]);
    crew.push(['Matt', S.radioSetup ? (radioPowered() ? 'on the radio' : 'radio has no power') : 'unreachable']);
  }
  const skills = [['Marksmanship', stars(S.marksman)], ['Water purification', S.purify ? 'yes' : 'no'], ['Tire repair', S.bikeRepair ? 'yes' : 'no'], ['Kirsten can shoot', S.kirstenShoots ? 'yes' : 'no'], ['Morale', `${moraleWord()} (${S.morale})`]];
  const intel = Object.keys(S.intel).filter(k => S.intel[k]);
  const tbl = r => `<table class="info">${r.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;
  scene({
    title: 'Supplies & Crew',
    html: `<h2>Crew</h2>${tbl(crew)}<h2>Supplies</h2>${tbl(rows)}<h2>Skills</h2>${tbl(skills)}${intel.length ? `<h2>Intel from Matt</h2><div class="text">${intel.map(k => '• ' + INTEL[k]).join('<br>')}</div>` : ''}`,
    choices: [{ label: 'Back', fn: back }],
  });
}

/* ============================================================
   THE WAWA (ENDING)
   ============================================================ */
function wawa() {
  S.phase = 'end'; clearSave(); fanfare();
  let t = `You see it before anything else: the red-and-yellow glow of the Wawa sign, humming on generator power, the only lit thing for miles. The parking lot is full of neighbors, lawn chairs and coolers. Someone has a grill going. Someone else is playing Jimmy Buffett. It smells like coffee and hoagies.<br><br>`;
  t += S.radioSetup
    ? `By the coffee station, a man holding three handheld radios and sitting on four crates of ammo turns around. It's <b>Matt</b>. "Todd. This is Matt. I can see you. Over." Todd hugs him. Matt whispers, "The squirrel story is a cover-up," then quietly says "over" one more time.<br><br>`
    : `By the coffee station, Todd spots <b>Matt</b>, who has been here since hour one. "Tried to radio you," Matt says. "You really need a ham radio, Todd."<br><br>`;
  if (has('DJ')) t += `DJ orders fourteen hoagies "for the DJ & Lindsey team" and puts them on the company card. ${S.hat ? 'His hat never left his head.' : ''} `;
  if (has('Jon')) t += 'Jon Galluzzo is immediately surrounded by grateful townspeople. He hands out coffee. He looks incredible. ';
  if (has('Jennifer')) t += `Jennifer, who is very old, locks her bike to the air pump and says it was "nothing compared to the winter of '51." `;
  t += `<br><br>Everyone's here. <b>Eliza</b> is reading palms by the ice machine and telling strangers she's very open-minded. <b>West</b> sits on a cooler, dispensing wisdom and hoagie recommendations. <b>Kelsey</b> is photographing the generator "for her scrapbook." And <b>Alex</b> is standing next to the empty bakery case with frosting on her lip, looking absolutely radiant and completely innocent.`;
  if (has('Kirsten')) t += `<br><br>Kirsten leans on Todd's shoulder. "You were right," she says. "Don't let it go to your head."`;
  say('YOU MADE IT TO THE WAWA!', t, scoreScreen, 'See your score');
}

const RANKS = [[0, 'Grid-Down Greenhorn'], [2500, 'Lieutenant of Lunchables'], [4000, 'Captain of Canned Goods'], [5500, 'Solar-Powered Sergeant'], [7500, 'Commander of White Cake'], [10000, 'Supreme Wawa Overlord']];
function computeScore() {
  const rows = [];
  active().forEach(n => { const hp = S.party[n].hp; rows.push([`${FULL[n]} arrived (${hpWord(hp)} health)`, hp > 70 ? 500 : hp > 45 ? 400 : hp > 20 ? 300 : 200]); });
  if (S.radioSetup) rows.push(['Matt, on the radio the whole way', 300]);
  rows.push([`${fmt(S.water)} gallons of water`, fmt(S.water) * 2]);
  rows.push([`${fmt(S.food)} lb of food`, fmt(S.food)]);
  rows.push([`${S.cake} slices of white cake`, S.cake * 15]);
  rows.push([`${S.ammo} rounds of ammo`, Math.floor(S.ammo / 2)]);
  rows.push([`$${fmt(S.money)} cash`, Math.floor(S.money / 5)]);
  rows.push([`Morale: ${moraleWord()}`, S.morale * 3]);
  rows.push([`${S.tday} days on the trail`, Math.max(0, (24 - S.tday) * 25)]);
  if (S.alexStole > 0) rows.push([`<span class="bad">DEMERIT: ${S.alexStole} slice${S.alexStole === 1 ? '' : 's'} of cake stolen by Alex</span>`, -S.alexStole * 20]);
  const sub = rows.reduce((t, r) => t + r[1], 0);
  const total = Math.max(0, Math.round(sub * S.scoreMult));
  let rank = RANKS[0][1]; RANKS.forEach(([min, nm]) => { if (total >= min) rank = nm; });
  return { rows, sub, total, rank };
}

function scoreScreen() {
  const sc = computeScore();
  const tbl = `<table class="score">${sc.rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}
    ${S.scoreMult !== 1 ? `<tr><td>${S.bg} bonus</td><td>×${S.scoreMult}</td></tr>` : ''}
    <tr class="total"><td>TOTAL</td><td>${sc.total}</td></tr></table>
    <div class="text" style="margin-top:12px">Rank: <span class="hl">${sc.rank}</span></div>
    <div class="text">Enter your name for the Wawa Hall of Fame:<br><input class="name" id="hofName" maxlength="24" placeholder="Your name"></div>`;
  scene({
    title: 'Final Score',
    html: tbl,
    choices: [
      { label: 'Save to the Hall of Fame', fn: () => { const nm = (document.getElementById('hofName') || {}).value || 'Anonymous Prepper'; addHof(nm.trim() || 'Anonymous Prepper', sc.total, sc.rank); epilogue(); } },
      { label: 'Skip', fn: epilogue },
    ],
  });
}

function epilogue() {
  say('Epilogue', `Three days later, the power came back on.<br><br>The utility company traced the outage to a single squirrel in a transformer. The squirrel is fine. The squirrel has been named Employee of the Month by no one.<br><br>Todd stood in the Wawa parking lot as the streetlights flickered back on, one by one, all along US-1. ${has('Kirsten') ? 'Kirsten squeezed his hand. ' : ''}${has('DJ') ? 'DJ honked a boat horn. ' : ''}West nodded slowly. Eliza said she was very open-minded about the squirrel theory. Kelsey quietly deleted something from her phone. Somewhere, Matt said "it wasn't a squirrel," and then "over."<br><br>When Todd finally got home, he stood at the edge of his unfinished pool. Gerald the frog looked up at him. "Next summer," Todd said. Gerald did not believe him either.<br><br>Todd looked down at ${S.cake ? 'his last slice of white cake' : 'the empty cake box'}.<br><br>"Next time," he whispered, "I'm going to need more cake."<br><br><span class="hl">THE END</span>`, () => hallOfFame(title), 'See the Hall of Fame');
}

/* ---- Hall of Fame ---- */
const HOF_SEED = [
  { n: 'Matt (40,000 rounds)', s: 7400, r: 'Solar-Powered Sergeant' },
  { n: `DJ's Hat`, s: 5100, r: 'Captain of Canned Goods' },
  { n: 'West', s: 6200, r: 'Solar-Powered Sergeant' },
  { n: 'Kelsey (from "Ohio")', s: 4100, r: 'Captain of Canned Goods' },
  { n: 'Captain Ray', s: 3300, r: 'Lieutenant of Lunchables' },
  { n: 'Alex (score is all stolen cake)', s: 2600, r: 'Lieutenant of Lunchables' },
  { n: 'Brenda from the HOA', s: 1200, r: 'Grid-Down Greenhorn' },
  { n: 'The Squirrel', s: 900, r: 'Grid-Down Greenhorn' },
  { n: 'Gerald (lives in the pool)', s: 650, r: 'Grid-Down Greenhorn' },
];
function getHof() { try { const t = localStorage.getItem(HOF_KEY); return t ? JSON.parse(t) : HOF_SEED.slice(); } catch (e) { return HOF_SEED.slice(); } }
function addHof(n, s, r) { const h = getHof(); h.push({ n, s, r }); h.sort((a, b) => b.s - a.s); try { localStorage.setItem(HOF_KEY, JSON.stringify(h.slice(0, 10))); } catch (e) { } }
function hallOfFame(back) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = getHof();
  scene({
    title: 'The Wawa Hall of Fame',
    text: 'The top ten preppers who made it to the Wawa (on this device):',
    html: `<table class="score">${h.map((e, i) => `<tr><td>${i + 1}. ${esc(e.n)} <span class="note">— ${esc(e.r)}</span></td><td>${e.s}</td></tr>`).join('')}</table>`,
    choices: [{ label: 'Back', fn: back }],
  });
}

/* ---------------- boot ---------------- */
title();
