/* ==== Deadline Garden · Garden plot (v1) ====
   A fenced little garden in the ☰ menu. Every completed task/checklist item earns 1 ✓.
   Spend ✓ in the shop on flowers, trees, decor, fences, land, or your own uploaded PNGs,
   then drag them onto the grid. State lives in localStorage and rides along with cloud sync. */
(function(){
'use strict';
const GARDEN_KEY='deadline-garden-plot-v1';
const BASE_COLS=8,MAX_COLS=12,BASE_ROWS=5,MAX_ROWS=10,EXPAND_COST=6,CUSTOM_LIMIT=24,CUSTOM_MIN=3,CUSTOM_MAX=12;
const zh=()=>typeof uiLanguage!=='undefined'&&uiLanguage==='zh';
const L=(en,cn)=>zh()?cn:en;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const say=(en,cn)=>{try{toast(L(en,cn))}catch{}};

/* ---------- vector art ---------- */
const svg=(vb,body)=>`<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
const S='0 0 100 100',T='0 0 100 150';
const dots=(arr,fill)=>arr.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');
function head(cx,cy,r,n,petal,center,w=.32){let s='';for(let i=0;i<n;i++)s+=`<ellipse cx="${cx}" cy="${cy-r*.56}" rx="${r*w}" ry="${r*.56}" fill="${petal}" transform="rotate(${(360/n*i).toFixed(1)} ${cx} ${cy})"/>`;return s+`<circle cx="${cx}" cy="${cy}" r="${r*.34}" fill="${center}"/>`}
const stem=(d,c='#5c9a4e',w=3)=>`<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
const leaf=(d,c='#6bb35a')=>`<path d="${d}" fill="${c}"/>`;
const tulipCup=(x,y,c,c2)=>`<path d="M${x-9} ${y} C${x-11} ${y-12} ${x-7} ${y-19} ${x-4} ${y-16} L${x} ${y-21} L${x+4} ${y-16} C${x+7} ${y-19} ${x+11} ${y-12} ${x+9} ${y} C${x+6} ${y+7} ${x-6} ${y+7} ${x-9} ${y}Z" fill="${c}"/><path d="M${x} ${y-21} L${x+4} ${y-16} C${x+7} ${y-19} ${x+11} ${y-12} ${x+9} ${y} C${x+6} ${y+7} ${x+1} ${y+6} ${x} ${y+6}Z" fill="${c2}"/>`;
function lav(x,top,h){let s=stem(`M${x} 94 L${x} ${top}`,'#6d9a5b',2.5);for(let i=0;i<7;i++){const y=top+i*(h/7);s+=`<ellipse cx="${x+(i%2?3:-3)}" cy="${y}" rx="3.4" ry="4.6" fill="${i%3?'#9b7fd1':'#b59de6'}"/>`}return s}
function canopy(main,light,dark){return dots([[50,70,30],[26,80,20],[74,80,20],[36,50,22],[64,50,22],[50,36,20]],dark)+dots([[50,66,28],[28,76,18],[72,76,18],[37,47,20],[63,47,20],[50,33,18]],main)+dots([[42,40,9],[30,62,8],[58,56,9],[68,72,7]],light)}
const trunk=(c='#7a5233')=>`<path d="M44 146 C46 128 46 112 45 96 L55 96 C54 112 54 128 56 146Z" fill="${c}"/><path d="M50 112 L36 92 M51 104 L64 88" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
function tier(top,y,half,dark,light){return `<polygon points="50,${top} ${50-half},${y} ${50+half},${y}" fill="${dark}"/><polygon points="50,${top} ${50+half},${y} 50,${y}" fill="${light}"/>`}
function star(cx,cy,r,f){let p=[];for(let i=0;i<10;i++){const a=Math.PI/5*i-Math.PI/2,rr=i%2?r*.45:r;p.push(`${(cx+Math.cos(a)*rr).toFixed(1)},${(cy+Math.sin(a)*rr).toFixed(1)}`)}return `<polygon points="${p.join(' ')}" fill="${f}"/>`}

const ART={
tuft:svg(S,`<path d="M28 94 C30 80 26 72 22 66 C32 72 36 82 36 94Z" fill="#5aa34f"/><path d="M38 94 C40 74 40 62 46 52 C46 66 46 80 48 94Z" fill="#6fba5d"/><path d="M48 94 C52 78 58 68 66 62 C60 74 58 84 58 94Z" fill="#4f9446"/><path d="M58 94 C64 84 70 80 78 78 C72 84 68 88 68 94Z" fill="#7cc46a"/>`),
mushroom:svg(S,`<rect x="34" y="62" width="14" height="30" rx="6" fill="#f3e9d6"/><path d="M18 66 C18 44 64 44 64 66Z" fill="#d9534f"/>${dots([[30,56,3.5],[44,52,4],[54,60,3]],'#fff')}<rect x="64" y="76" width="9" height="16" rx="4" fill="#efe2cb"/><path d="M56 79 C56 66 82 66 82 79Z" fill="#e0763e"/>${dots([[64,73,2.2],[73,72,2]],'#fff')}`),
daisy:svg(S,stem('M38 94 C38 76 36 62 36 44')+stem('M64 94 C64 82 66 70 66 58')+leaf('M38 82 C28 78 24 70 26 66 C34 68 38 74 38 82Z')+leaf('M64 86 C74 82 78 76 76 72 C68 74 64 78 64 86Z')+head(36,38,22,10,'#fffdf7','#f2c14e')+head(66,54,16,9,'#fff6fa','#f2c14e')),
tulip:svg(S,stem('M32 94 C32 80 30 70 30 56')+stem('M50 94 L50 44')+stem('M68 94 C68 82 70 72 70 60')+leaf('M50 92 C38 84 36 70 40 62 C46 72 50 80 50 92Z')+leaf('M50 94 C62 86 66 76 64 68 C58 76 52 84 50 94Z','#5aa34f')+tulipCup(30,58,'#e85d75','#d2445e')+tulipCup(50,46,'#f6a33b','#e3862a')+tulipCup(70,62,'#c86dd7','#a955bb')),
sunflower:svg(S,stem('M50 96 C50 80 50 60 50 40','#4f8f43',4)+leaf('M50 76 C36 74 28 64 28 58 C40 60 48 66 50 76Z')+leaf('M50 66 C64 64 72 54 72 48 C60 50 52 56 50 66Z','#5aa34f')+head(50,32,30,16,'#f5c242','#6b4423',.24)+dots([[46,30,1.6],[53,29,1.6],[50,35,1.6],[45,35,1.4],[55,34,1.4]],'#3f2814')),
lavender:svg(S,lav(36,40,32)+lav(50,28,36)+lav(64,40,32)+lav(43,52,24)+lav(57,52,24)),
bush:svg(S,`<ellipse cx="50" cy="90" rx="38" ry="6" fill="rgba(0,0,0,.08)"/>`+dots([[30,72,20],[52,62,26],[72,74,18]],'#4f9446')+dots([[30,70,17],[52,59,23],[71,72,15]],'#5fa752')+dots([[44,50,8],[24,64,6],[66,64,6]],'#7cc46a')),
rosebush:svg(S,dots([[30,72,20],[52,62,26],[72,74,18]],'#3f8a46')+dots([[30,70,17],[52,59,23],[71,72,15]],'#4f9a4f')+[[32,62],[50,48],[64,58],[44,74],[72,74],[24,78]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7" fill="#d93f58"/><circle cx="${x}" cy="${y}" r="4" fill="#b52a44"/><circle cx="${x-1}" cy="${y-1}" r="1.6" fill="#f07a8e"/>`).join('')),
hydrangea:svg(S,dots([[30,74,18],[52,66,22],[72,76,16]],'#3f8a46')+[[32,60,'#8fb4f0'],[54,50,'#b2a4ef'],[70,64,'#8fb4f0'],[44,72,'#c9b8f5']].map(([x,y,c])=>dots([[x,y,9]],c)+dots([[x-4,y-3,3],[x+4,y-2,3],[x,y+4,3],[x-3,y+3,2.4],[x+4,y+4,2.4]],'rgba(255,255,255,.45)')).join('')),
cactus:svg(S,`<path d="M42 30 C42 22 58 22 58 30 L58 76 L42 76Z" fill="#5da263"/><path d="M42 56 L32 56 C27 56 26 52 26 48 L26 40 C26 35 33 35 33 40 L33 49 L42 49Z" fill="#5da263"/><path d="M58 50 L67 50 C72 50 74 46 74 42 L74 36 C74 31 67 31 67 36 L67 43 L58 43Z" fill="#5da263"/><path d="M50 26 L50 74" stroke="#79bb7e" stroke-width="2"/>${dots([[50,22,5]],'#f283a8')}${dots([[50,22,2]],'#ffd36b')}<path d="M32 76 L68 76 L64 96 L36 96Z" fill="#d07a4f"/><rect x="29" y="72" width="42" height="8" rx="2" fill="#e08d60"/>`),
pine:svg(T,`<rect x="45" y="118" width="10" height="28" rx="2" fill="#7a5233"/>`+tier(62,126,38,'#2f7a4b','#3b8c57')+tier(32,90,32,'#2f7a4b','#3b8c57')+tier(8,56,25,'#2f7a4b','#3b8c57')),
oak:svg(T,trunk()+canopy('#4f9a4a','#6cb35d','#3f8340')),
apple:svg(T,trunk()+canopy('#5aa64f','#76bd62','#478f42')+dots([[34,62,4.5],[58,44,4.5],[66,74,4.5],[44,82,4.5],[28,82,4],[72,58,4],[50,62,4]],'#d9463e')+dots([[33,61,1.4],[57,43,1.4],[65,73,1.4]],'#ff8b80')),
maple:svg(T,trunk('#6e4a33')+canopy('#e0703a','#f2a23e','#c3502f')+dots([[20,128,2.5],[80,134,2.5],[70,120,2]],'#e88a3c')),
cherry:svg(T,trunk('#6b4a3a')+canopy('#f4b6c8','#fbd9e3','#e693ad')+dots([[18,124,2.4],[82,130,2.4],[72,112,2],[28,138,2]],'#f4b6c8')),
christmas:svg(T,`<rect x="44" y="124" width="12" height="20" rx="2" fill="#6e4a33"/>`+tier(84,132,42,'#2a6b45','#367d52')+tier(56,106,34,'#2a6b45','#367d52')+tier(32,80,26,'#2a6b45','#367d52')+tier(12,54,18,'#2a6b45','#367d52')+`<path d="M36 46 Q52 56 64 44 M28 72 Q50 84 72 68 M22 98 Q48 112 78 94 M14 124 Q50 138 88 120" stroke="#f2c94c" stroke-width="2.4" fill="none"/>`+dots([[40,40,3.5],[60,34,3],[34,62,3.5],[56,64,3.5],[68,58,3],[30,90,4],[50,92,3.5],[72,88,4],[24,118,4],[46,122,4],[66,118,4],[82,122,3.5]],'#d9463e')+dots([[52,46,3],[44,74,3],[62,100,3.5],[36,104,3],[56,130,3.5]],'#4a90d9')+star(50,12,11,'#f7d046')+`<rect x="14" y="132" width="18" height="14" rx="1.5" fill="#d9463e"/><rect x="21" y="132" width="4" height="14" fill="#f7d046"/><rect x="66" y="128" width="22" height="18" rx="1.5" fill="#4a90d9"/><rect x="75" y="128" width="4" height="18" fill="#fff"/>`),
rock:svg(S,`<path d="M18 92 C14 76 26 60 42 58 C52 50 70 54 78 66 C88 74 88 88 82 92Z" fill="#949ea4"/><path d="M28 70 C34 62 46 60 54 62 C46 66 38 68 28 74Z" fill="#b8c1c5"/><path d="M70 90 C78 84 82 76 80 70" stroke="#7d878d" stroke-width="2" fill="none"/>`),
path:svg(S,`<ellipse cx="34" cy="80" rx="18" ry="10" fill="#b9b2a5"/><ellipse cx="34" cy="78" rx="16" ry="8" fill="#d2ccc0"/><ellipse cx="68" cy="66" rx="16" ry="9" fill="#b9b2a5"/><ellipse cx="68" cy="64" rx="14" ry="7" fill="#d2ccc0"/><ellipse cx="62" cy="90" rx="10" ry="5" fill="#c6bfb2"/>`),
pond:svg(S,`<ellipse cx="50" cy="72" rx="46" ry="24" fill="#8a9298"/><ellipse cx="50" cy="71" rx="41" ry="20" fill="#5fa6cf"/><ellipse cx="44" cy="66" rx="28" ry="10" fill="#86c3e3"/><path d="M62 80 a9 5 0 1 0 1 -.5 L60 78Z" fill="#5aa34f"/><circle cx="66" cy="77" r="3.2" fill="#f4a6c0"/><circle cx="66" cy="77" r="1.3" fill="#ffe08a"/>${dots([[8,74,3.5],[92,72,3.5],[24,92,3],[76,92,3],[50,48,3]],'#a7afb4')}`),
bench:svg(S,`<rect x="14" y="40" width="72" height="8" rx="2" fill="#b07d50"/><rect x="14" y="52" width="72" height="8" rx="2" fill="#a06f45"/><rect x="10" y="66" width="80" height="9" rx="2" fill="#c08a5a"/><rect x="18" y="38" width="6" height="56" rx="2" fill="#5b4636"/><rect x="76" y="38" width="6" height="56" rx="2" fill="#5b4636"/><rect x="26" y="75" width="5" height="19" fill="#5b4636"/><rect x="69" y="75" width="5" height="19" fill="#5b4636"/>`),
lamp:svg(S,`<circle cx="50" cy="26" r="20" fill="#ffe7a3" opacity=".35"/><rect x="47" y="34" width="6" height="56" fill="#3f4a4f"/><rect x="40" y="88" width="20" height="6" rx="2" fill="#3f4a4f"/><path d="M40 16 L60 16 L57 36 L43 36Z" fill="#ffe08a"/><path d="M38 14 L62 14 L56 8 L44 8Z" fill="#3f4a4f"/><rect x="40" y="35" width="20" height="4" rx="1" fill="#3f4a4f"/>`),
};

/* fences: horizontal tile (48×30) and vertical tile (30×48) */
const FENCE_ART={
wood:{h:svg('0 0 48 30','<rect x="0" y="9" width="48" height="5" fill="#b07d50"/><rect x="0" y="19" width="48" height="5" fill="#a06f45"/><rect x="2" y="3" width="8" height="27" rx="1.5" fill="#8d5f3b"/><rect x="2" y="3" width="8" height="3" fill="#a87650"/>'),v:svg('0 0 30 48','<rect x="10" y="0" width="5" height="48" fill="#b07d50"/><rect x="17" y="0" width="5" height="48" fill="#a06f45"/><rect x="6" y="3" width="19" height="10" rx="2" fill="#8d5f3b"/>')},
picket:{h:svg('0 0 48 30','<rect x="0" y="12" width="48" height="4" fill="#dfe3e4"/><rect x="0" y="22" width="48" height="4" fill="#dfe3e4"/>'+[2,14,26,38].map(x=>`<path d="M${x} 30 L${x} 7 L${x+4} 2 L${x+8} 7 L${x+8} 30Z" fill="#fbfbf8" stroke="#cfd5d6" stroke-width="1"/>`).join('')),v:svg('0 0 30 48','<rect x="12" y="0" width="6" height="48" fill="#eef0f0" stroke="#cfd5d6"/>'+[4,28].map(y=>`<rect x="8" y="${y}" width="14" height="10" rx="2" fill="#fbfbf8" stroke="#cfd5d6"/>`).join(''))},
hedge:{h:svg('0 0 48 30','<rect x="0" y="10" width="48" height="20" fill="#3f8a46"/>'+dots([[6,12,8],[18,10,9],[30,12,8],[42,10,9]],'#4f9a4f')+dots([[8,9,3],[22,7,3],[40,8,3]],'#6cb35d')),v:svg('0 0 30 48','<rect x="4" y="0" width="22" height="48" fill="#3f8a46"/>'+dots([[8,8,8],[22,20,8],[8,32,8],[22,44,8]],'#4f9a4f')+dots([[8,6,3],[22,18,3],[8,30,3]],'#6cb35d'))},
stone:{h:svg('0 0 48 30','<rect x="0" y="4" width="48" height="26" fill="#8e979c"/><rect x="1" y="5" width="22" height="7" rx="1.5" fill="#b8c0c4"/><rect x="25" y="5" width="22" height="7" rx="1.5" fill="#a9b2b6"/><rect x="-11" y="14" width="22" height="7" rx="1.5" fill="#a9b2b6"/><rect x="13" y="14" width="22" height="7" rx="1.5" fill="#bcc4c7"/><rect x="37" y="14" width="22" height="7" rx="1.5" fill="#a9b2b6"/><rect x="1" y="23" width="22" height="7" rx="1.5" fill="#b0b8bc"/><rect x="25" y="23" width="22" height="7" rx="1.5" fill="#bcc4c7"/>'),v:svg('0 0 30 48','<rect x="3" y="0" width="24" height="48" fill="#8e979c"/><rect x="4" y="1" width="10" height="22" rx="1.5" fill="#b8c0c4"/><rect x="16" y="1" width="10" height="22" rx="1.5" fill="#a9b2b6"/><rect x="4" y="25" width="10" height="22" rx="1.5" fill="#a9b2b6"/><rect x="16" y="25" width="10" height="22" rx="1.5" fill="#bcc4c7"/>')},
iron:{h:svg('0 0 48 30','<rect x="0" y="10" width="48" height="2.5" fill="#2f3a40"/><rect x="0" y="24" width="48" height="2.5" fill="#2f3a40"/>'+[4,16,28,40].map(x=>`<rect x="${x}" y="6" width="2.5" height="24" fill="#2f3a40"/><path d="M${x-2} 7 L${x+1.25} 1 L${x+4.5} 7Z" fill="#c9a24a"/>`).join('')+'<circle cx="10" cy="18" r="3.5" fill="none" stroke="#2f3a40" stroke-width="1.6"/><circle cx="34" cy="18" r="3.5" fill="none" stroke="#2f3a40" stroke-width="1.6"/>'),v:svg('0 0 30 48','<rect x="10" y="0" width="2.5" height="48" fill="#2f3a40"/><rect x="18" y="0" width="2.5" height="48" fill="#2f3a40"/><rect x="8" y="20" width="15" height="6" rx="1" fill="#2f3a40"/><circle cx="15" cy="23" r="2" fill="#c9a24a"/>')},
};

/* ---------- catalog ---------- */
const CATALOG=[
 {id:'tuft',cat:'flowers',price:1,en:'Grass tuft',cn:'草丛'},
 {id:'mushroom',cat:'flowers',price:2,en:'Mushrooms',cn:'小蘑菇'},
 {id:'daisy',cat:'flowers',price:3,en:'Daisies',cn:'雏菊'},
 {id:'tulip',cat:'flowers',price:3,en:'Tulips',cn:'郁金香'},
 {id:'sunflower',cat:'flowers',price:3,en:'Sunflower',cn:'向日葵'},
 {id:'lavender',cat:'flowers',price:3,en:'Lavender',cn:'薰衣草'},
 {id:'bush',cat:'flowers',price:4,en:'Shrub',cn:'灌木'},
 {id:'hydrangea',cat:'flowers',price:4,en:'Hydrangea',cn:'绣球花'},
 {id:'rosebush',cat:'flowers',price:4,en:'Rose bush',cn:'玫瑰丛'},
 {id:'cactus',cat:'flowers',price:4,en:'Potted cactus',cn:'盆栽仙人掌'},
 {id:'pine',cat:'trees',price:5,tall:true,en:'Pine',cn:'松树'},
 {id:'oak',cat:'trees',price:5,tall:true,en:'Oak',cn:'橡树'},
 {id:'apple',cat:'trees',price:6,tall:true,en:'Apple tree',cn:'苹果树'},
 {id:'maple',cat:'trees',price:6,tall:true,en:'Autumn maple',cn:'秋枫'},
 {id:'cherry',cat:'trees',price:7,tall:true,en:'Cherry blossom',cn:'樱花树'},
 {id:'christmas',cat:'trees',price:8,tall:true,en:'Christmas tree',cn:'圣诞树'},
 {id:'path',cat:'decor',price:1,ground:true,en:'Stepping stones',cn:'石板路'},
 {id:'rock',cat:'decor',price:2,en:'Boulder',cn:'石头'},
 {id:'lamp',cat:'decor',price:3,en:'Garden lamp',cn:'庭院灯'},
 {id:'bench',cat:'decor',price:4,en:'Bench',cn:'长椅'},
 {id:'pond',cat:'decor',price:6,ground:true,en:'Little pond',cn:'小池塘'},
];
const FENCES=[
 {id:'wood',price:0,en:'Wooden fence',cn:'木栅栏'},
 {id:'picket',price:4,en:'White picket',cn:'白色尖桩篱'},
 {id:'hedge',price:6,en:'Green hedge',cn:'绿篱'},
 {id:'stone',price:6,en:'Stone wall',cn:'石墙'},
 {id:'iron',price:8,en:'Iron railing',cn:'铁艺围栏'},
];
const TABS=[['flowers','Flowers','花草'],['trees','Trees','树木'],['decor','Decor','装饰'],['fences','Fences','围栏'],['land','Land','土地'],['custom','My uploads','自定义']];

/* ---------- state ---------- */
function blank(){return {version:1,earned:[],spent:0,inv:{},cells:{},rows:BASE_ROWS,cols:BASE_COLS,fence:'wood',fences:['wood'],custom:[],updatedAt:0}}
function normalize(g){
  const b=blank();if(!g||typeof g!=='object')return b;
  const out={...b,...g};
  out.earned=Array.isArray(g.earned)?[...new Set(g.earned.map(String))]:[];
  out.spent=Math.max(0,Number(g.spent)||0);
  out.inv=g.inv&&typeof g.inv==='object'?Object.fromEntries(Object.entries(g.inv).filter(([,n])=>Number(n)>0).map(([k,n])=>[k,Math.floor(n)])):{};
  out.cells=g.cells&&typeof g.cells==='object'?g.cells:{};
  out.rows=Math.min(MAX_ROWS,Math.max(BASE_ROWS,Number(g.rows)||BASE_ROWS));
  out.cols=Math.min(MAX_COLS,Math.max(BASE_COLS,Number(g.cols)||BASE_COLS));
  out.fences=Array.isArray(g.fences)&&g.fences.length?[...new Set(['wood',...g.fences])]:['wood'];
  if(!out.fences.includes(out.fence))out.fence='wood';
  out.custom=Array.isArray(g.custom)?g.custom.filter(c=>c&&c.id&&typeof c.img==='string'&&c.img.startsWith('data:image/')):[];
  return out;
}
let G=blank();
try{G=normalize(JSON.parse(localStorage.getItem(GARDEN_KEY)||'null'))}catch{}
function persist(sync=true){
  G.updatedAt=Date.now();
  try{localStorage.setItem(GARDEN_KEY,JSON.stringify(G))}catch{say('Storage is full — try removing an uploaded image.','存储空间已满，请删除一些上传的图片。')}
  if(sync)try{queueCloudSync()}catch{}
}
const earned=()=>G.earned.length;
const available=()=>Math.max(0,earned()-G.spent);
function charge(n){if(available()<n){say(`You need ${n-available()} more completed ✓.`,`还差 ${n-available()} 个已完成 ✓。`);return false}G.spent+=n;return true}

/* completed-task ledger: a task stays earned even if deleted later; un-completing removes it */
function reconcile(){
  if(typeof tasks==='undefined'||!Array.isArray(tasks))return;
  const set=new Set(G.earned);let changed=false;
  for(const t of tasks){const id=String(t.id);if(t.done&&!set.has(id)){set.add(id);changed=true}else if(!t.done&&set.has(id)){set.delete(id);changed=true}}
  if(changed){G.earned=[...set];persist();renderHud()}
}

function item(id){return CATALOG.find(x=>x.id===id)||G.custom.find(x=>x.id===id)||null}
const itemName=it=>it?(it.custom?it.name:L(it.en,it.cn)):'?';
function artHtml(it){if(!it)return'';if(it.custom)return `<img src="${esc(it.img)}" alt="" draggable="false">`;return ART[it.id]||''}
const plantedCount=id=>Object.values(G.cells).filter(c=>c&&c.item===id).length;

/* ---------- DOM ---------- */
let root,sel={inv:null,cell:null},tab='flowers',shopOpen=false,uploadDraft=null;
function ensureRoot(){
  if(root)return root;
  root=document.createElement('div');root.id='gardenRoot';root.className='gd-root hidden';root.setAttribute('aria-hidden','true');
  root.innerHTML=`<div class="gd-shell">
    <header class="gd-head">
      <button class="gd-icon gd-close" type="button" data-gd="close" aria-label="${L('Close garden','关闭花园')}">×</button>
      <div class="gd-title"><div class="gd-label">${L('MY GARDEN','我的花园')}</div><strong>${L('Garden','花园')}</strong></div>
      <div class="gd-wallet" id="gdWallet"></div>
      <button class="gd-btn gd-btn-primary gd-shop-btn" type="button" data-gd="shop">${L('Shop','商城')}</button>
    </header>
    <div class="gd-stage"><div class="gd-plot" id="gdPlot"><div class="gd-fence gd-fence-top"></div><div class="gd-fence gd-fence-left"></div><div class="gd-fence gd-fence-right"></div><div class="gd-grid" id="gdGrid"></div><div class="gd-items" id="gdItems"></div><div class="gd-fence gd-fence-bottom"></div></div></div>
    <div class="gd-actionbar hidden" id="gdActions"></div>
    <section class="gd-tray" id="gdTray" aria-label="${L('Seed bag','背包')}"></section>
    <div class="gd-shop hidden" id="gdShop" role="dialog" aria-label="${L('Shop','商城')}"></div>
  </div><div class="gd-ghost hidden" id="gdGhost"></div>`;
  document.body.appendChild(root);
  root.addEventListener('click',onClick);
  root.addEventListener('pointerdown',onPointerDown);
  root.addEventListener('change',onChange);
  root.addEventListener('input',onInput);
  return root;
}
function openGarden(){
  ensureRoot();reconcile();sel={inv:null,cell:null};
  root.classList.remove('hidden');root.setAttribute('aria-hidden','false');document.body.classList.add('gd-open');
  render();
}
function closeGarden(){if(!root)return;closeShop();root.classList.add('hidden');root.setAttribute('aria-hidden','true');document.body.classList.remove('gd-open')}
const isOpen=()=>root&&!root.classList.contains('hidden');

function renderHud(){
  const w=root&&root.querySelector('#gdWallet');if(!w)return;
  w.innerHTML=`<span class="gd-coin">✓ ${available()}</span><small>${L(`${earned()} completed · ${G.spent} spent`,`已完成 ${earned()} · 已花 ${G.spent}`)}</small>`;
  const sw=root.querySelector('#gdShopWallet');if(sw)sw.textContent=`✓ ${available()}`;
}
function render(){if(!isOpen())return;if(drag){drag.pendingRender=true;return}renderHud();renderPlot();renderTray();renderActions();if(shopOpen)renderShop()}
function renderPlot(){
  const plot=root.querySelector('#gdPlot'),grid=root.querySelector('#gdGrid');
  const f=FENCE_ART[G.fence]||FENCE_ART.wood;
  plot.dataset.fence=G.fence;
  plot.style.setProperty('--gd-fh',`url("data:image/svg+xml,${encodeURIComponent(f.h)}")`);
  plot.style.setProperty('--gd-fv',`url("data:image/svg+xml,${encodeURIComponent(f.v)}")`);
  const items=root.querySelector('#gdItems');
  for(const el of [grid,items]){el.style.setProperty('--gd-cols',G.cols);el.style.setProperty('--gd-rows',G.rows)}
  let h='',p='';
  for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++){
    const key=`${r},${c}`,cell=G.cells[key],it=cell&&item(cell.item);
    const cls=['gd-cell',(r+c)%2?'alt':'',sel.cell===key?'selected':'',!it&&(sel.inv||sel.cell)?'target':''].join(' ');
    h+=`<div class="${cls}" data-cell="${key}"></div>`;
    if(it)p+=`<div class="gd-slot" style="grid-row:${r+1};grid-column:${c+1};z-index:${it.ground?1:r*2+10}"><div class="gd-item${it.tall?' tall':''}${it.ground?' ground':''}${cell.flip?' flip':''}${sel.cell===key?' selected':''}" data-placed="${key}" title="${esc(itemName(it))}">${artHtml(it)}</div></div>`;
  }
  grid.innerHTML=h;items.innerHTML=p;
}
function renderTray(){
  const tray=root.querySelector('#gdTray');
  const ids=Object.keys(G.inv).filter(id=>G.inv[id]>0&&item(id));
  tray.innerHTML=`<div class="gd-tray-head"><span class="gd-label">${L('SEED BAG','背包')}</span><small>${ids.length?L('Drag onto the garden, or tap an item then tap a plot.','拖到花园里，或先点物品再点格子。'):L('Empty — buy plants in the Shop.','空空的——去商城兑换植物吧。')}</small></div>
  <div class="gd-tray-items">${ids.map(id=>{const it=item(id);return `<button type="button" class="gd-chip${sel.inv===id?' selected':''}" data-inv="${esc(id)}" title="${esc(itemName(it))}"><span class="gd-chip-art">${artHtml(it)}</span><span class="gd-chip-count">×${G.inv[id]}</span></button>`}).join('')}</div>`;
}
function renderActions(){
  const bar=root.querySelector('#gdActions');
  const cell=sel.cell&&G.cells[sel.cell],it=cell&&item(cell.item);
  if(!it){bar.classList.add('hidden');bar.innerHTML='';return}
  bar.classList.remove('hidden');
  bar.innerHTML=`<strong>${esc(itemName(it))}</strong><span>${L('Tap an empty plot to move it','点空格子即可移动')}</span><button type="button" class="gd-btn" data-gd="flip">↔ ${L('Flip','翻转')}</button><button type="button" class="gd-btn" data-gd="store">${L('Put in bag','收回背包')}</button><button type="button" class="gd-icon" data-gd="deselect" aria-label="${L('Done','完成')}">✓</button>`;
}

/* ---------- placing ---------- */
function place(id,key){
  if(G.cells[key])return false;
  if(!(G.inv[id]>0))return false;
  G.cells[key]={item:id,flip:false};
  if(--G.inv[id]<=0){delete G.inv[id];if(sel.inv===id)sel.inv=null}
  persist();pop(key);return true;
}
function move(from,to){
  if(from===to)return;
  const a=G.cells[from],b=G.cells[to];if(!a)return;
  G.cells[to]=a;if(b)G.cells[from]=b;else delete G.cells[from];
  if(sel.cell===from)sel.cell=to;
  persist();pop(to);
}
function store(key){
  const c=G.cells[key];if(!c)return;
  G.inv[c.item]=(G.inv[c.item]||0)+1;delete G.cells[key];if(sel.cell===key)sel.cell=null;persist();
}
function pop(key){requestAnimationFrame(()=>{const el=root.querySelector(`[data-placed="${key}"]`);if(el){el.classList.add('pop');setTimeout(()=>el.classList.remove('pop'),420)}})}

/* ---------- pointer drag ---------- */
let drag=null;
function onPointerDown(e){
  if(e.button>0||drag)return;
  const src=e.target.closest('[data-placed],[data-inv]');if(!src||!root.contains(src)||src.closest('#gdShop'))return;
  if(e.pointerType==='mouse')e.preventDefault(); // no native image drag / text selection
  const from=src.dataset.placed?{type:'cell',key:src.dataset.placed}:{type:'inv',id:src.dataset.inv};
  drag={from,src,x:e.clientX,y:e.clientY,active:false,pid:e.pointerId,target:null};
  try{root.setPointerCapture(e.pointerId)}catch{}
  window.addEventListener('pointermove',onPointerMove,{passive:false});
  window.addEventListener('pointerup',onPointerUp);
  window.addEventListener('pointercancel',onPointerCancel);
  window.addEventListener('blur',onPointerCancel);
}
function cellSize(){const c=root.querySelector('.gd-cell');return c?c.getBoundingClientRect().width:48}
function cellAt(x,y){
  const g=root.querySelector('#gdGrid');if(!g)return null;const r=g.getBoundingClientRect();
  if(x<r.left||x>=r.right||y<r.top||y>=r.bottom)return null;
  const col=Math.floor((x-r.left)/(r.width/G.cols)),row=Math.floor((y-r.top)/(r.height/G.rows));
  return `${Math.min(G.rows-1,Math.max(0,row))},${Math.min(G.cols-1,Math.max(0,col))}`;
}
function onPointerMove(e){
  if(!drag||e.pointerId!==drag.pid)return;
  if(!drag.active){
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;
    const id=drag.from.type==='cell'?G.cells[drag.from.key]?.item:drag.from.id,it=item(id);
    if(!it){cancelDrag();return}
    drag.active=true;
    const g=root.querySelector('#gdGhost');g.innerHTML=artHtml(it);
    const w=cellSize()*(it.tall?1.25:1);g.style.width=w+'px';g.dataset.tall=it.tall?'1':'';
    g.classList.toggle('flip',drag.from.type==='cell'&&!!G.cells[drag.from.key]?.flip);
    g.classList.remove('hidden');drag.src.classList.add('dragging');root.classList.add('gd-dragging');
  }
  e.preventDefault();
  const g=root.querySelector('#gdGhost'),w=parseFloat(g.style.width)||48;
  g.style.transform=`translate(${e.clientX-w/2}px,${e.clientY-w*(g.dataset.tall?1.3:.85)}px)`;
  root.querySelectorAll('.gd-cell.over,.gd-tray.over').forEach(x=>x.classList.remove('over'));
  drag.target=null;
  const key=cellAt(e.clientX,e.clientY);
  if(key){root.querySelector(`[data-cell="${key}"]`)?.classList.add('over');drag.target={type:'cell',key}}
  else if(drag.from.type==='cell'){const t=root.querySelector('#gdTray'),r=t.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){t.classList.add('over');drag.target={type:'tray'}}}
}
function endDrag(){
  if(!drag)return;
  window.removeEventListener('pointermove',onPointerMove);window.removeEventListener('pointerup',onPointerUp);window.removeEventListener('pointercancel',onPointerCancel);window.removeEventListener('blur',onPointerCancel);
  try{root.releasePointerCapture(drag.pid)}catch{}
  drag.src.classList.remove('dragging');root.classList.remove('gd-dragging');
  const g=root.querySelector('#gdGhost');g.classList.add('hidden');g.innerHTML='';
  root.querySelectorAll('.gd-cell.over,.gd-tray.over').forEach(x=>x.classList.remove('over'));
}
function cancelDrag(){const pending=drag&&drag.pendingRender;endDrag();drag=null;if(pending)render()}
function onPointerCancel(){cancelDrag();render()}
function onPointerUp(e){
  if(!drag||e.pointerId!==drag.pid)return;
  const d=drag;endDrag();drag=null;
  if(!d.active){tap(d.from);return}
  const t=d.target;
  if(t&&d.from.type==='inv'&&t.type==='cell'){
    if(G.cells[t.key])say('That spot is taken — pick an empty plot.','这个格子已经有东西了，换个空格子吧。');else{place(d.from.id,t.key);sel.cell=null}
  }else if(t&&d.from.type==='cell'&&t.type==='cell')move(d.from.key,t.key);
  else if(t&&d.from.type==='cell'&&t.type==='tray')store(d.from.key);
  render();
}
function tap(from){
  if(from.type==='inv'){sel.inv=sel.inv===from.id?null:from.id;sel.cell=null}
  else{sel.cell=sel.cell===from.key?null:from.key;sel.inv=null}
  render();
}

/* ---------- clicks ---------- */
function onClick(e){
  const a=e.target.closest('[data-gd]');
  if(a){
    const act=a.dataset.gd;
    if(act==='close')return closeGarden();
    if(act==='shop')return openShop();
    if(act==='shopClose')return closeShop();
    if(act==='flip'&&sel.cell&&G.cells[sel.cell]){G.cells[sel.cell].flip=!G.cells[sel.cell].flip;persist();return render()}
    if(act==='store'&&sel.cell){store(sel.cell);return render()}
    if(act==='deselect'){sel.cell=null;return render()}
    if(act==='tab'){tab=a.dataset.tab;return renderShop()}
    if(act==='buy')return buy(a.dataset.id);
    if(act==='fence')return buyFence(a.dataset.id);
    if(act==='expand')return expand(a.dataset.dir);
    if(act==='upload')return confirmUpload();
    if(act==='delCustom')return deleteCustom(a.dataset.id);
    return;
  }
  if(e.target.closest('[data-placed],[data-inv]'))return; // handled by pointer events
  const cell=e.target.closest('.gd-cell');
  if(cell&&!G.cells[cell.dataset.cell]){
    if(sel.inv){place(sel.inv,cell.dataset.cell);render()}
    else if(sel.cell){move(sel.cell,cell.dataset.cell);sel.cell=null;render()}
    return;
  }
  if(e.target.closest('.gd-stage')&&!cell&&(sel.cell||sel.inv)){sel={inv:null,cell:null};render()}
}

/* ---------- shop ---------- */
function openShop(){shopOpen=true;const s=root.querySelector('#gdShop');s.classList.remove('hidden');requestAnimationFrame(()=>s.classList.add('open'));renderShop()}
function closeShop(){shopOpen=false;const s=root&&root.querySelector('#gdShop');if(!s)return;s.classList.remove('open');setTimeout(()=>{if(!shopOpen)s.classList.add('hidden')},220)}
function card(it,btn){
  const owned=(G.inv[it.id]||0)+plantedCount(it.id);
  return `<div class="gd-card"><div class="gd-card-art${it.tall?' tall':''}">${artHtml(it)}</div><div class="gd-card-name">${esc(itemName(it))}</div><div class="gd-card-meta">${owned?L(`Owned ${owned}`,`已拥有 ${owned}`):(it.tall?L('Tree','树木'):'&nbsp;')}</div>${btn}</div>`;
}
const priceBtn=(price,attrs,label)=>`<button type="button" class="gd-buy${available()<price?' poor':''}" ${attrs}>${label||`✓ ${price}`}</button>`;
function renderShop(){
  const s=root.querySelector('#gdShop');
  let body='';
  if(['flowers','trees','decor'].includes(tab)){
    body=`<div class="gd-cards">${CATALOG.filter(x=>x.cat===tab).map(it=>card(it,priceBtn(it.price,`data-gd="buy" data-id="${it.id}"`))).join('')}</div>`;
  }else if(tab==='fences'){
    body=`<div class="gd-cards wide">${FENCES.map(f=>{const own=G.fences.includes(f.id),cur=G.fence===f.id;const art=FENCE_ART[f.id];
      return `<div class="gd-card"><div class="gd-card-art fence" style="--gd-fh:url(&quot;data:image/svg+xml,${encodeURIComponent(art.h)}&quot;)"></div><div class="gd-card-name">${L(f.en,f.cn)}</div><div class="gd-card-meta">${cur?L('In use','使用中'):own?L('Owned','已拥有'):'&nbsp;'}</div>${cur?`<button type="button" class="gd-buy done" disabled>${L('Using','使用中')}</button>`:own?`<button type="button" class="gd-buy" data-gd="fence" data-id="${f.id}">${L('Use','使用')}</button>`:priceBtn(f.price,`data-gd="fence" data-id="${f.id}"`)}</div>`}).join('')}</div>`;
  }else if(tab==='land'){
    const rowFull=G.rows>=MAX_ROWS,colFull=G.cols>=MAX_COLS;
    const mini=(rows,cols,nr,nc)=>`<div class="gd-mini" style="--r:${rows};--c:${cols}">${Array.from({length:rows*cols},(_,i)=>{const r=Math.floor(i/cols),c=i%cols;return `<i class="${(nr&&r===rows-1)||(nc&&c===cols-1)?'new':''}"></i>`}).join('')}</div>`;
    body=`<div class="gd-land-list">
      <div class="gd-land">${mini(Math.min(G.rows+1,MAX_ROWS),G.cols,!rowFull,false)}<div><strong>${L('Add a row','加一排（横向）')}</strong><p>${L(`One more row of ${G.cols} plots. Now ${G.rows} rows (max ${MAX_ROWS}).`,`增加一排 ${G.cols} 格。目前 ${G.rows} 排，最多 ${MAX_ROWS} 排。`)}</p>${rowFull?`<button type="button" class="gd-buy done" disabled>${L('Maxed out','已到最大')}</button>`:priceBtn(EXPAND_COST,'data-gd="expand" data-dir="row"',`✓ ${EXPAND_COST} · ${L('Add a row','加一排')}`)}</div></div>
      <div class="gd-land">${mini(G.rows,Math.min(G.cols+1,MAX_COLS),false,!colFull)}<div><strong>${L('Add a column','加一列（竖向）')}</strong><p>${L(`One more column of ${G.rows} plots. Now ${G.cols} columns (max ${MAX_COLS}).`,`增加一列 ${G.rows} 格。目前 ${G.cols} 列，最多 ${MAX_COLS} 列。`)}</p>${colFull?`<button type="button" class="gd-buy done" disabled>${L('Maxed out','已到最大')}</button>`:priceBtn(EXPAND_COST,'data-gd="expand" data-dir="col"',`✓ ${EXPAND_COST} · ${L('Add a column','加一列')}`)}</div></div>
    </div>`;
  }else if(tab==='custom'){
    const d=uploadDraft;
    body=`<div class="gd-upload">
      <label class="gd-drop${d?.img?' has':''}" for="gdFile">${d?.img?`<img src="${esc(d.img)}" alt="">`:`<span>＋</span><small>${L('Choose a PNG with a transparent background','选择透明底 PNG 图片')}</small>`}</label>
      <input id="gdFile" type="file" accept="image/png,image/webp,image/gif,image/*" hidden>
      <div class="gd-upload-form">
        <label>${L('Name','名称')}<input id="gdName" type="text" maxlength="24" value="${esc(d?.name||'')}" placeholder="${L('e.g. My bonsai','例如：我的盆景')}"></label>
        <div class="gd-seg" role="radiogroup"><span>${L('Size','大小')}</span><button type="button" class="${d?.tall?'':'on'}" data-size="small">${L('Plant','小植物')}</button><button type="button" class="${d?.tall?'on':''}" data-size="tall">${L('Tree','树木')}</button></div>
        <label>${L('Price','价格')} <strong id="gdPriceVal">✓ ${d?.price||5}</strong><input id="gdPrice" type="range" min="${CUSTOM_MIN}" max="${CUSTOM_MAX}" value="${d?.price||5}"></label>
        <p class="gd-note">${L('Uploading costs the price once and gives you the first copy. After that it stays in the shop at that price.','上传时扣除一次该价格并获得第一株；之后它会作为商品留在商城，按此价格兑换。')}</p>
        ${priceBtn(d?.price||5,`data-gd="upload"${d?.img?'':' disabled'}`,`✓ ${d?.price||5} · ${L('Upload & add','上传并兑换')}`)}
      </div></div>
      ${G.custom.length?`<div class="gd-cards">${G.custom.map(it=>card(it,`<div class="gd-card-row">${priceBtn(it.price,`data-gd="buy" data-id="${esc(it.id)}"`)}<button type="button" class="gd-del" data-gd="delCustom" data-id="${esc(it.id)}" aria-label="${L('Remove product','删除商品')}">🗑</button></div>`)).join('')}</div>`:''}`;
  }
  s.innerHTML=`<div class="gd-shop-head"><div><div class="gd-label">${L('GARDEN SHOP','花园商城')}</div><strong>${L('Trade completed tasks for plants','用已完成事项兑换植物')}</strong></div><span class="gd-coin" id="gdShopWallet">✓ ${available()}</span><button type="button" class="gd-icon" data-gd="shopClose" aria-label="${L('Close shop','关闭商城')}">×</button></div>
  <nav class="gd-tabs">${TABS.map(([id,en,cn])=>`<button type="button" class="${tab===id?'on':''}" data-gd="tab" data-tab="${id}">${L(en,cn)}</button>`).join('')}</nav>
  <div class="gd-shop-body">${body}</div>`;
}
function celebrate(){try{confetti()}catch{}}
function buy(id){
  const it=item(id);if(!it||!charge(it.price))return;
  G.inv[id]=(G.inv[id]||0)+1;persist();celebrate();
  say(`${itemName(it)} added to your seed bag.`,`${itemName(it)} 已放入背包。`);render();renderShop();
}
function buyFence(id){
  const f=FENCES.find(x=>x.id===id);if(!f)return;
  if(!G.fences.includes(id)){if(!charge(f.price))return;G.fences.push(id);celebrate()}
  G.fence=id;persist();render();renderShop();
}
function expand(dir){
  if(dir==='col'){if(G.cols>=MAX_COLS||!charge(EXPAND_COST))return;G.cols++;say('Your garden grew by one column.','花园扩建了一列。')}
  else{if(G.rows>=MAX_ROWS||!charge(EXPAND_COST))return;G.rows++;say('Your garden grew by one row.','花园扩建了一排。')}
  persist();celebrate();render();renderShop();
}

/* ---------- custom uploads ---------- */
function onChange(e){
  if(e.target.id!=='gdFile')return;
  const f=e.target.files&&e.target.files[0];if(!f)return;
  if(!f.type.startsWith('image/'))return say('Please choose an image file.','请选择图片文件。');
  if(f.size>15*1024*1024)return say('Please keep the image under 15 MB.','图片请控制在 15 MB 以内。');
  const url=URL.createObjectURL(f),img=new Image();
  img.onload=()=>{
    const max=256,k=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*k)),h=Math.max(1,Math.round(img.height*k));
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
    let data=c.toDataURL('image/webp',.9);if(!data.startsWith('data:image/webp'))data=c.toDataURL('image/png');
    URL.revokeObjectURL(url);
    const base=(f.name||'').replace(/\.[^.]+$/,'').slice(0,24);
    uploadDraft={img:data,name:uploadDraft?.name||$name()||base,tall:uploadDraft&&uploadDraft.img===''?uploadDraft.tall:h>w*1.25,price:uploadDraft?.price||5};
    renderShop();
  };
  img.onerror=()=>{URL.revokeObjectURL(url);say('That image could not be read.','无法读取这张图片。')};
  img.src=url;
}
function $name(){return root.querySelector('#gdName')?.value.trim()||''}
function onInput(e){
  if(!uploadDraft&&!['gdPrice','gdName'].includes(e.target.id))return;if(!uploadDraft)uploadDraft={img:'',name:'',tall:false,price:5};
  if(e.target.id==='gdName'&&uploadDraft)uploadDraft.name=e.target.value.slice(0,24);
  if(e.target.id==='gdPrice'){const p=Number(e.target.value);if(uploadDraft)uploadDraft.price=p;root.querySelector('#gdPriceVal').textContent=`✓ ${p}`;const b=root.querySelector('[data-gd="upload"]');if(b){b.textContent=`✓ ${p} · ${L('Upload & add','上传并兑换')}`;b.classList.toggle('poor',available()<p)}}
}
document.addEventListener('click',e=>{const b=e.target.closest('#gardenRoot .gd-seg [data-size]');if(!b)return;if(!uploadDraft)uploadDraft={img:'',name:$name(),tall:false,price:5};uploadDraft.tall=b.dataset.size==='tall';renderShop()});
function confirmUpload(){
  const d=uploadDraft;if(!d||!d.img)return say('Choose an image first.','请先选择图片。');
  if(G.custom.length>=CUSTOM_LIMIT)return say(`You can keep up to ${CUSTOM_LIMIT} uploads.`,`最多保存 ${CUSTOM_LIMIT} 个自定义商品。`);
  const name=(d.name||$name()).trim()||L('My plant','我的植物');
  if(!charge(d.price))return;
  const it={id:'u_'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)),custom:true,name,img:d.img,tall:!!d.tall,price:d.price,cat:'custom'};
  G.custom.push(it);G.inv[it.id]=(G.inv[it.id]||0)+1;uploadDraft=null;persist();celebrate();
  say(`${name} is now in the shop and in your bag.`,`${name} 已上架商城并放入背包。`);render();renderShop();
}
function deleteCustom(id){
  const it=G.custom.find(x=>x.id===id);if(!it)return;
  const n=(G.inv[id]||0)+plantedCount(id);
  if(!confirm(L(`Remove “${it.name}” from the shop?${n?` The ${n} you own will also disappear (no refund).`:''}`,`从商城删除「${it.name}」？${n?`你拥有的 ${n} 株也会一起消失（不退还）。`:''}`)))return;
  G.custom=G.custom.filter(x=>x.id!==id);delete G.inv[id];
  for(const k of Object.keys(G.cells))if(G.cells[k]?.item===id)delete G.cells[k];
  if(sel.inv===id)sel.inv=null;persist();render();renderShop();
}

/* ---------- hooks into the app ---------- */
document.addEventListener('dragstart',e=>{if(root&&root.contains(e.target))e.preventDefault()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){onPointerCancel();return}if(e.key==='Escape'&&isOpen()){if(shopOpen)closeShop();else closeGarden()}});
try{const _ra=renderAll;renderAll=function(){_ra.apply(this,arguments);try{reconcile()}catch(err){console.error(err)}}}catch{}
try{const _collect=collectGardenState;collectGardenState=async function(){const s=await _collect.apply(this,arguments);s.garden=G;return s}}catch{}
try{const _apply=applyCloudState;applyCloudState=async function(state){
  if(state&&state.garden&&typeof state.garden==='object'&&(Number(state.garden.updatedAt)||0)>=(G.updatedAt||0)-1000){G=normalize(state.garden);persist(false)}
  await _apply.apply(this,arguments);if(isOpen())render();
}}catch{}
function injectMenuItem(){
  const body=document.querySelector('#sidebarBody');if(!body||body.querySelector('#sbGarden'))return;
  const b=document.createElement('button');b.id='sbGarden';b.type='button';b.className='soft-btn sidebar-item sidebar-garden';
  b.innerHTML=`<span>🌳 ${L('Garden','花园')}</span><small>✓ ${available()}</small>`;
  b.onclick=()=>{try{closeSidebar()}catch{}openGarden()};
  body.prepend(b);
}
try{const _open=openSidebar;openSidebar=function(){_open.apply(this,arguments);injectMenuItem()};const sb=document.querySelector('#sidebarBtn');if(sb)sb.onclick=openSidebar}catch{}
window.DeadlineGarden={open:openGarden,close:closeGarden};
})();
