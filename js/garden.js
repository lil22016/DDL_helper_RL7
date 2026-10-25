/* ==== Deadline Garden · Garden plot (v2: your garden + the character's garden) ====
   A fenced little garden in the ☰ menu. Every completed task/checklist item earns 1 ✓.
   The character has a garden too, paid for by their own plans; you can borrow from them and suggest changes.
   Spend ✓ in the shop on flowers, trees, decor, fences, land, or your own uploaded PNGs,
   then drag them onto the grid. State lives in localStorage and rides along with cloud sync. */
(function(){
'use strict';
const GARDEN_KEY='deadline-garden-plot-v1';
const BASE_COLS=8,BASE_ROWS=5,MIN_SIDE=3,MAX_SIDE=16,MAX_PLOTS=120,EXPAND_COST=6,CUSTOM_LIMIT=24,CUSTOM_MIN=3,CUSTOM_MAX=12;
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
sprout:svg(S,`<ellipse cx="50" cy="92" rx="22" ry="5" fill="#7a5a3a" opacity=".55"/>${stem('M50 92 C50 82 50 76 50 70','#5c9a4e',3)}${leaf('M50 76 C40 74 34 66 36 60 C44 62 50 68 50 76Z','#7cc46a')}${leaf('M50 72 C60 70 66 62 64 56 C56 58 50 64 50 72Z','#6bb35a')}`),
wheat:svg(S,[30,40,50,60,70].map((x,i)=>{const h=i%2?34:42;return stem(`M${x} 94 L${x} ${94-h}`,'#c9a34a',2.4)+[0,1,2,3].map(k=>`<ellipse cx="${x+(k%2?3:-3)}" cy="${94-h+4+k*6}" rx="3" ry="5" fill="${k%2?'#e8c15a':'#dcae3f'}"/>`).join('')}).join('')),
carrot:svg(S,[34,50,66].map(x=>`<path d="M${x-6} 76 L${x+6} 76 L${x} 96Z" fill="#ef8a2e"/>`+leaf(`M${x} 76 C${x-12} 66 ${x-10} 52 ${x-6} 48 C${x-2} 58 ${x} 66 ${x} 76Z`,'#5aa34f')+leaf(`M${x} 76 C${x+12} 66 ${x+10} 54 ${x+6} 50 C${x+2} 60 ${x} 66 ${x} 76Z`,'#6fba5d')).join('')+`<rect x="20" y="74" width="60" height="6" rx="3" fill="#7a5a3a" opacity=".6"/>`),
tomato:svg(S,stem('M50 96 L50 24','#5c9a4e',3)+stem('M38 96 L38 40','#8a6a44',2)+stem('M62 96 L62 40','#8a6a44',2)+leaf('M50 60 C38 58 32 50 34 44 C42 46 48 52 50 60Z')+leaf('M50 46 C62 44 68 36 66 30 C58 32 52 38 50 46Z','#5aa34f')+leaf('M50 78 C62 76 68 68 66 62 C58 64 52 70 50 78Z','#5aa34f')+dots([[40,52,7],[60,38,6.5],[58,70,7.5],[42,80,6]],'#e2473b')+dots([[38,50,2],[58,36,2],[56,68,2]],'#ff8a7a')),
strawberry:svg(S,dots([[34,74,16],[52,66,18],[68,76,14]],'#4f9a4f')+dots([[30,70,5],[52,58,6],[70,72,5]],'#6cb35d')+[[30,84],[48,82],[64,86],[56,74]].map(([x,y])=>`<path d="M${x-6} ${y-4} Q${x} ${y-8} ${x+6} ${y-4} Q${x+5} ${y+6} ${x} ${y+9} Q${x-5} ${y+6} ${x-6} ${y-4}Z" fill="#e23b4e"/><circle cx="${x-2}" cy="${y}" r="1" fill="#ffe08a"/><circle cx="${x+2}" cy="${y+3}" r="1" fill="#ffe08a"/>`).join('')),
pumpkin:svg(S,`<path d="M50 50 C48 42 52 36 58 34" stroke="#5c7a3a" stroke-width="4" fill="none" stroke-linecap="round"/>${leaf('M58 40 C70 32 82 36 84 44 C74 46 66 46 58 40Z','#5aa34f')}<ellipse cx="50" cy="74" rx="34" ry="22" fill="#e07a24"/><ellipse cx="36" cy="74" rx="14" ry="20" fill="#ea8a30"/><ellipse cx="64" cy="74" rx="14" ry="20" fill="#ea8a30"/><ellipse cx="50" cy="74" rx="11" ry="22" fill="#f29a3a"/>`),
corn:svg(T,stem('M50 146 L50 24','#6d9a3d',5)+leaf('M50 120 C30 112 20 96 20 86 C34 92 46 104 50 120Z','#7cb14a')+leaf('M50 96 C70 88 82 72 82 62 C68 68 56 80 50 96Z','#6aa340')+leaf('M50 70 C34 62 28 50 28 42 C40 48 48 58 50 70Z','#7cb14a')+`<ellipse cx="60" cy="74" rx="8" ry="20" fill="#f3cf4a"/>`+[0,1,2,3,4].map(k=>`<line x1="54" y1="${62+k*6}" x2="66" y2="${62+k*6}" stroke="#d9ae2c" stroke-width="1.2"/>`).join('')+leaf('M60 96 C52 88 50 74 54 60 C56 76 60 86 60 96Z','#8ac25a')),
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
 {id:'daisy',cat:'flowers',crop:{y:'f_daisy',n:1,h:48},price:3,en:'Daisies',cn:'雏菊'},
 {id:'tulip',cat:'flowers',crop:{y:'f_tulip',n:1,h:48},price:3,en:'Tulips',cn:'郁金香'},
 {id:'sunflower',cat:'flowers',crop:{y:'f_sunflower',n:1,h:48},price:3,en:'Sunflower',cn:'向日葵'},
 {id:'lavender',cat:'flowers',crop:{y:'f_lavender',n:1,h:48},price:3,en:'Lavender',cn:'薰衣草'},
 {id:'bush',cat:'flowers',price:4,en:'Shrub',cn:'灌木'},
 {id:'hydrangea',cat:'flowers',crop:{y:'f_hydrangea',n:1,h:48},price:4,en:'Hydrangea',cn:'绣球花'},
 {id:'rosebush',cat:'flowers',crop:{y:'f_rose',n:1,h:48},price:4,en:'Rose bush',cn:'玫瑰丛'},
 {id:'cactus',cat:'flowers',price:4,en:'Potted cactus',cn:'盆栽仙人掌'},
 {id:'pine',cat:'trees',price:5,tall:true,en:'Pine',cn:'松树'},
 {id:'oak',cat:'trees',price:5,tall:true,en:'Oak',cn:'橡树'},
 {id:'apple',cat:'trees',price:6,tall:true,crop:{y:'apple',n:3},en:'Apple tree',cn:'苹果树'},
 {id:'maple',cat:'trees',price:6,tall:true,en:'Autumn maple',cn:'秋枫'},
 {id:'cherry',cat:'trees',price:7,tall:true,crop:{y:'cherry',n:4},en:'Cherry blossom',cn:'樱花树'},
 {id:'christmas',cat:'trees',price:8,tall:true,en:'Christmas tree',cn:'圣诞树'},
 {id:'wheat',cat:'crops',price:3,crop:{y:'wheat',n:3},en:'Wheat',cn:'麦子'},
 {id:'carrot',cat:'crops',price:2,crop:{y:'carrot',n:2},en:'Carrots',cn:'胡萝卜'},
 {id:'tomato',cat:'crops',price:3,crop:{y:'tomato',n:3},en:'Tomato vine',cn:'番茄'},
 {id:'strawberry',cat:'crops',price:4,crop:{y:'strawberry',n:3},en:'Strawberries',cn:'草莓'},
 {id:'pumpkin',cat:'crops',price:4,crop:{y:'pumpkin',n:1},en:'Pumpkin',cn:'南瓜'},
 {id:'corn',cat:'crops',price:3,tall:true,crop:{y:'corn',n:2},en:'Corn',cn:'玉米'},
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
/* ---------- farming: produce, food, recipes ----------
   Crops ripen every 24 h. Water (1 ✓) takes 6 h off, fertiliser (2 ✓) 12 h, each once per cycle.
   Produce and food live in the pantry; sell for 🪙 gold, buy food with gold, or cook. 10 🪙 = 1 ✓. */
const GROW_MS=24*3600e3,WATER_MS=6*3600e3,FERT_MS=12*3600e3,WATER_COST=1,FERT_COST=2,GOLD_PER_CHECK=10;
const GOODS={
  wheat:{e:'🌾',en:'Wheat',cn:'麦子',sell:2,buy:4},carrot:{e:'🥕',en:'Carrot',cn:'胡萝卜',sell:2,buy:4},tomato:{e:'🍅',en:'Tomato',cn:'番茄',sell:2,buy:4},
  strawberry:{e:'🍓',en:'Strawberry',cn:'草莓',sell:3,buy:6},pumpkin:{e:'🎃',en:'Pumpkin',cn:'南瓜',sell:6,buy:12},corn:{e:'🌽',en:'Corn',cn:'玉米',sell:3,buy:6},
  apple:{e:'🍎',en:'Apple',cn:'苹果',sell:3,buy:6},cherry:{e:'🍒',en:'Cherries',cn:'樱桃',sell:2,buy:4},
  bread:{e:'🍞',en:'Bread',cn:'小面包',sell:8,buy:12,food:1},cookie:{e:'🍪',en:'Cookie',cn:'饼干',sell:5,buy:8,food:1},applepie:{e:'🥧',en:'Apple pie',cn:'苹果派',sell:12,buy:18,food:1},
  juice:{e:'🧃',en:'Apple juice',cn:'苹果汁',sell:8,buy:12,food:1},cake:{e:'🍰',en:'Strawberry cake',cn:'草莓蛋糕',sell:16,buy:24,food:1},cupcake:{e:'🧁',en:'Cherry cupcake',cn:'樱桃纸杯蛋糕',sell:11,buy:16,food:1},
  soup:{e:'🍲',en:'Pumpkin soup',cn:'南瓜汤',sell:12,buy:18,food:1},salad:{e:'🥗',en:'Salad',cn:'沙拉',sell:6,buy:10,food:1},popcorn:{e:'🍿',en:'Popcorn',cn:'爆米花',sell:7,buy:10,food:1},
  milk:{e:'🥛',en:'Milk',cn:'牛奶',sell:2,buy:4},egg:{e:'🥚',en:'Egg',cn:'鸡蛋',sell:2,buy:4},
  /* flowers: not edible; 5 or more make a bouquet you can give */
  f_daisy:{e:'🌼',en:'Daisy',cn:'雏菊',sell:2,flower:1},f_tulip:{e:'🌷',en:'Tulip',cn:'郁金香',sell:2,flower:1},f_sunflower:{e:'🌻',en:'Sunflower',cn:'向日葵',sell:2,flower:1},
  f_lavender:{e:'🪻',en:'Lavender',cn:'薰衣草',sell:2,flower:1},f_hydrangea:{e:'🌸',en:'Hydrangea',cn:'绣球花',sell:3,flower:1},f_rose:{e:'🌹',en:'Rose',cn:'玫瑰',sell:3,flower:1},
  bouquet:{e:'💐',en:'Bouquet',cn:'花束',sell:15,gift:1},
};
const RECIPES=[
  {id:'bread',need:{wheat:3}},{id:'cookie',need:{wheat:2,egg:1}},{id:'applepie',need:{apple:2,wheat:1}},{id:'juice',need:{apple:2}},
  {id:'cake',need:{strawberry:2,wheat:2,egg:1}},{id:'cupcake',need:{cherry:3,wheat:1}},{id:'soup',need:{pumpkin:1,carrot:1,milk:1}},
  {id:'salad',need:{tomato:1,carrot:1}},{id:'popcorn',need:{corn:2}},
];
const goodName=id=>{const g=GOODS[id];return g?L(g.en,g.cn):id};
const isCrop=it=>!!(it&&it.crop);
const BOUQUET_MIN=5;
const growMs=c=>{const it=c&&item(c.item);return (it&&it.crop&&it.crop.h?it.crop.h*3600e3:GROW_MS)};
const readyAt=c=>(Number(c.t0)||0)+growMs(c)-(c.w?WATER_MS:0)-(c.f?FERT_MS:0);
const isEdible=id=>!!GOODS[id]&&!GOODS[id].flower&&!GOODS[id].gift;
const flowerCount=S=>Object.entries(S.pantry||{}).reduce((n,[k,v])=>n+(GOODS[k]?.flower?v:0),0);
const isRipe=c=>{const it=c&&item(c.item);return isCrop(it)&&Date.now()>=readyAt(c)};
function fmtLeft(ms){const t=Math.max(1,Math.ceil(Math.max(0,ms)/60e3)),h=Math.floor(t/60),m=t%60;return h?L(`${h}h ${m}m`,`${h}小时${m}分`):L(`${m}m`,`${m}分钟`)}
function shortLeft(ms){const h=ms/3600e3;return h>=1?`${Math.ceil(h)}h`:`${Math.max(1,Math.ceil(ms/60e3))}m`}
const ripeCells=S=>Object.keys(S.cells).filter(k=>isRipe(S.cells[k]));
const TABS=[['flowers','Flowers','花草'],['trees','Trees','树木'],['crops','Crops','可收成'],['decor','Decor','装饰'],['fences','Fences','围栏'],['land','Land','土地'],['custom','My uploads','自定义'],['market','Market','市场'],['kitchen','Kitchen','厨房']];

/* ---------- state ----------
   MINE  – your garden. ✓ = completed tasks (+ borrowed − repaid).
   CHARB – the character's garden. ✓ = their plans: done 1, changed plan 0.5, not done 0 (− lent + repaid).
   OPS   – your pending suggestions for the character's garden. They show in a draft until the character
           accepts them; nothing in CHARB changes without the character's say-so. */
const CHAR_KEY='deadline-garden-char-plot-v1',OPS_KEY='deadline-garden-char-suggest-v1';
const r1=n=>Math.round((Number(n)||0)*10)/10;
const fmt=n=>{n=r1(n);return Number.isInteger(n)?String(n):n.toFixed(1)};
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
function blank(kind){return {version:1,kind,earned:[],earnedMap:{},spent:0,inv:{},cells:{},rows:BASE_ROWS,cols:BASE_COLS,fence:'wood',fences:['wood'],custom:[],loans:[],repayOn:true,pantry:{},gifts:[],gold:0,boughtChecks:0,period:'none',periodKey:'',archives:[],autoPlant:true,lastAuto:'',news:null,updatedAt:0,editedAt:0}}
function normalize(g,kind='mine'){
  const b=blank(kind);if(!g||typeof g!=='object')return b;
  const out={...b,...g,kind};
  out.earned=Array.isArray(g.earned)?[...new Set(g.earned.map(String))]:[];
  out.earnedMap={};if(g.earnedMap&&typeof g.earnedMap==='object')for(const [k,v] of Object.entries(g.earnedMap)){const n=Number(v);if(n>0)out.earnedMap[k]=Math.min(1,n)}
  out.spent=Math.max(0,r1(g.spent));
  out.gold=Math.max(0,r1(g.gold));out.boughtChecks=Math.max(0,Math.floor(Number(g.boughtChecks)||0));
  out.pantry=g.pantry&&typeof g.pantry==='object'?Object.fromEntries(Object.entries(g.pantry).filter(([k,n])=>GOODS[k]&&Number(n)>0).map(([k,n])=>[k,Math.floor(n)])):{};
  /* gift box: keepsakes given / received — never back in a pantry, so they can't be re-gifted */
  out.gifts=Array.isArray(g.gifts)?g.gifts.filter(x=>x&&x.id&&GOODS[x.item]).map(x=>({id:String(x.id),dir:x.dir==='out'?'out':'in',item:String(x.item),cid:String(x.cid||'main'),at:Number(x.at)||0})).slice(-300):[];
  out.inv=g.inv&&typeof g.inv==='object'?Object.fromEntries(Object.entries(g.inv).filter(([,n])=>Number(n)>0).map(([k,n])=>[k,Math.floor(n)])):{};
  out.cells=g.cells&&typeof g.cells==='object'?g.cells:{};
  out.rows=Math.min(MAX_SIDE,Math.max(MIN_SIDE,Number(g.rows)||BASE_ROWS));
  out.cols=Math.min(MAX_SIDE,Math.max(MIN_SIDE,Number(g.cols)||BASE_COLS));
  out.period=['none','week','month'].includes(g.period)?g.period:'none';
  out.periodKey=String(g.periodKey||'');
  out.archives=Array.isArray(g.archives)?g.archives.filter(a=>a&&a.id&&a.cells&&typeof a.cells==='object').slice(-60):[];
  out.autoPlant=g.autoPlant!==false;out.lastAuto=String(g.lastAuto||'');
  out.news=g.news&&typeof g.news==='object'&&g.news.text?{text:String(g.news.text),note:String(g.news.note||''),at:Number(g.news.at)||0,seen:!!g.news.seen}:null;
  out.fences=Array.isArray(g.fences)&&g.fences.length?[...new Set(['wood',...g.fences])]:['wood'];
  if(!out.fences.includes(out.fence))out.fence='wood';
  out.custom=Array.isArray(g.custom)?g.custom.filter(c=>c&&c.id&&typeof c.img==='string'&&c.img.startsWith('data:image/')):[];
  out.loans=Array.isArray(g.loans)?g.loans.filter(l=>l&&l.id).map(l=>({id:String(l.id),at:Number(l.at)||0,asked:Math.max(0,Math.floor(Number(l.asked)||0)),dir:l.dir==='out'?'out':'in',amount:Math.max(0,Math.floor(Number(l.amount)||0)),repay:!!l.repay,repaid:Math.max(0,r1(l.repaid)),msg:String(l.msg||''),reply:String(l.reply||'')})):[];
  out.repayOn=g.repayOn!==false;
  out.allowVisits=!!g.allowVisits;out.lastGift=String(g.lastGift||'');out.lastVisitCheck=String(g.lastVisitCheck||'');
  out.visit=g.visit&&typeof g.visit==='object'&&g.visit.id&&['suggest','borrow'].includes(g.visit.kind)?{id:String(g.visit.id),at:Number(g.visit.at)||0,kind:g.visit.kind,ops:Array.isArray(g.visit.ops)?g.visit.ops.filter(o=>o&&o.t):[],amount:Math.max(0,Math.floor(Number(g.visit.amount)||0)),repay:g.visit.repay!==false,say:String(g.visit.say||'')}:null;
  out.updatedAt=Number(g.updatedAt)||0;
  // editedAt only moves on real actions (buy / place / borrow …), never on the automatic ✓ ledger.
  out.editedAt=Number(g.editedAt)||(hasContent(out)?(out.updatedAt||1):0);
  return out;
}
function hasContent(g){return !!(g&&(g.spent>0||g.gold>0||Object.keys(g.pantry||{}).length||Object.keys(g.cells||{}).length||Object.keys(g.inv||{}).length||(g.custom||[]).length||(g.loans||[]).length||(g.gifts||[]).length||(g.fences||[]).length>1||(g.archives||[]).length||g.rows*g.cols>BASE_ROWS*BASE_COLS))}
/* Merge this device's copy with the cloud's. The most recently *edited* copy decides layout, bag, spending and land;
   ledgers, fences, uploads and loans are unioned so nothing earned, bought or borrowed is lost. */
function mergeGardens(a,b,kind){
  const A=normalize(a,kind),B=normalize(b,kind);
  const base=B.editedAt>A.editedAt?B:A,other=base===B?A:B,fresher=B.updatedAt>A.updatedAt?B:A,staler=fresher===B?A:B;
  const out={...base};
  out.earned=[...new Set([...A.earned,...B.earned])];
  out.earnedMap={...staler.earnedMap,...fresher.earnedMap};
  out.fences=[...new Set([...A.fences,...B.fences])];
  const ids=new Set(base.custom.map(c=>c.id));out.custom=[...base.custom,...other.custom.filter(c=>!ids.has(c.id))];
  const lm=new Map();for(const l of [...A.loans,...B.loans]){const p=lm.get(l.id);lm.set(l.id,p?{...p,repaid:Math.max(p.repaid,l.repaid)}:l)}
  out.loans=[...lm.values()].sort((x,y)=>x.at-y.at);
  const gm=new Map();for(const x of [...A.gifts,...B.gifts])if(!gm.has(x.id))gm.set(x.id,x);out.gifts=[...gm.values()].sort((x,y)=>x.at-y.at).slice(-300);
  const am=new Map();for(const x of [...A.archives,...B.archives])if(!am.has(x.id))am.set(x.id,x);
  out.archives=[...am.values()].sort((x,y)=>(x.start||'').localeCompare(y.start||'')).slice(-60);
  out.lastAuto=[A.lastAuto,B.lastAuto].sort().pop()||'';
  out.news=fresher.news||staler.news;
  out.visit=fresher.visit===undefined?staler.visit:fresher.visit;out.lastVisitCheck=[A.lastVisitCheck,B.lastVisitCheck].sort().pop()||'';
  out.editedAt=Math.max(A.editedAt,B.editedAt);out.updatedAt=Math.max(A.updatedAt,B.updatedAt);
  return out;
}
const sig=g=>{g=normalize(g,g&&g.kind);return JSON.stringify([g.editedAt,g.spent,g.rows,g.cols,g.fence,g.cells,g.inv,[...g.earned].sort(),Object.entries(g.earnedMap).sort(),[...g.fences].sort(),g.custom.map(c=>c.id).sort(),g.loans.map(l=>[l.id,l.repaid]),g.repayOn,g.period,g.periodKey,g.archives.map(a=>a.id),g.autoPlant,g.lastAuto,g.gold,g.pantry,g.gifts.map(x=>x.id),g.boughtChecks,g.allowVisits,g.visit&&g.visit.id,g.lastVisitCheck,g.news&&g.news.at])};
const sameGarden=(a,b)=>sig(a)===sig(b);

let MINE=blank('mine'),CHARB=blank('char'),OPS=[],CHAT={msgs:[]};
const CHAT_KEY='deadline-garden-char-chat-v1',ZOOM_KEY='deadline-garden-zoom-v1';
try{const c=JSON.parse(localStorage.getItem(CHAT_KEY)||'null');if(c&&Array.isArray(c.msgs))CHAT={msgs:c.msgs.filter(m=>m&&m.id&&m.text)}}catch{}
const TOOLS_KEY='deadline-garden-tools-open-v1';let toolsOpen=false;try{toolsOpen=localStorage.getItem(TOOLS_KEY)==='1'}catch{}
let zoom=72;try{const z=Number(localStorage.getItem(ZOOM_KEY));if(z>=28&&z<=128)zoom=z}catch{}
function mergeChat(a,b){const m=new Map();for(const x of [...(a?.msgs||[]),...(b?.msgs||[])])if(x&&x.id&&!m.has(x.id))m.set(x.id,x);return {msgs:[...m.values()].sort((x,y)=>x.at-y.at).slice(-120)}}
function saveChat(sync=true){CHAT.msgs=CHAT.msgs.slice(-120);saveRaw(CHAT_KEY,CHAT);if(sync)try{queueCloudSync()}catch{}}
try{MINE=normalize(JSON.parse(localStorage.getItem(GARDEN_KEY)||'null'),'mine')}catch{}
try{CHARB=normalize(JSON.parse(localStorage.getItem(CHAR_KEY)||'null'),'char')}catch{}
try{const o=JSON.parse(localStorage.getItem(OPS_KEY)||'[]');if(Array.isArray(o))OPS=o.filter(x=>x&&x.t)}catch{}
let view='mine',G=MINE;
function saveRaw(key,obj){try{localStorage.setItem(key,JSON.stringify(obj))}catch{say('Storage is full — try removing an uploaded image.','存储空间已满，请删除一些上传的图片。')}}
function persistMine(edit=true,sync=true){MINE.updatedAt=Date.now();if(edit)MINE.editedAt=MINE.updatedAt;saveRaw(GARDEN_KEY,MINE);if(sync)try{queueCloudSync()}catch{}}
function persistChar(edit=true,sync=true){CHARB.updatedAt=Date.now();if(edit)CHARB.editedAt=CHARB.updatedAt;saveRaw(CHAR_KEY,CHARB);if(sync)try{queueCloudSync()}catch{}}
function saveOps(){saveRaw(OPS_KEY,OPS)}
/* Rebuild what you see: in the character's garden that's their real garden with your pending suggestions on top. */
function recompute(){
  if(view!=='char'){G=MINE;return}
  const d=clone(CHARB),kept=[];for(const op of OPS)if(applyOp(d,op))kept.push(op);
  if(kept.length!==OPS.length){OPS=kept;saveOps()}
  G=d;
}

/* ---------- credits ---------- */
/* loans: dir 'in' = the character lent to you, 'out' = you lent to the character */
const netToMine=()=>r1(MINE.loans.reduce((s,l)=>s+(l.dir==='out'?-1:1)*(l.amount-l.repaid),0));
const lentTotal=()=>MINE.loans.filter(l=>l.dir!=='out').reduce((s,l)=>s+l.amount,0);
const repaidTotal=()=>MINE.loans.filter(l=>l.dir!=='out').reduce((s,l)=>s+l.repaid,0);
const debt=()=>r1(MINE.loans.reduce((s,l)=>s+(l.dir!=='out'&&l.repay?Math.max(0,l.amount-l.repaid):0),0));
const charDebt=()=>r1(MINE.loans.reduce((s,l)=>s+(l.dir==='out'&&l.repay?Math.max(0,l.amount-l.repaid):0),0));
const earnedOf=S=>S.kind==='char'?r1(Object.values(S.earnedMap).reduce((a,b)=>a+b,0)):S.earned.length;
const availOf=S=>Math.max(0,r1(earnedOf(S)+(S.boughtChecks||0)-S.spent+(S.kind==='char'?-netToMine():netToMine())));
const available=()=>availOf(G);
let lastErr='';
function charge(S,n){if(availOf(S)+1e-9<n){lastErr=L(`You need ${fmt(n-availOf(S))} more ✓.`,`还差 ${fmt(n-availOf(S))} 个 ✓。`);return false}S.spent=r1(S.spent+n);return true}

/* your ledger: a task stays earned even if deleted later; un-completing removes it.
   New ✓ pay back what you owe first (oldest loan first) when the loan was marked "pay back". */
function repayFrom(n,dir='in'){
  let left=n;for(const l of MINE.loans){if(left<=0)break;if(!l.repay||(l.dir==='out')!==(dir==='out'))continue;const owe=r1(l.amount-l.repaid);if(owe<=0)continue;const x=Math.min(owe,left);l.repaid=r1(l.repaid+x);left=r1(left-x)}
  return r1(n-left);
}
function reconcileMine(){
  if(typeof tasks==='undefined'||!Array.isArray(tasks))return;
  const set=new Set(MINE.earned);let added=0,changed=false;
  for(const t of tasks){const id=String(t.id);if(t.done&&!set.has(id)){set.add(id);added++;changed=true}else if(!t.done&&set.has(id)){set.delete(id);changed=true}}
  if(!changed)return;
  MINE.earned=[...set];
  const paid=added&&debt()>0?repayFrom(added):0;
  persistMine(paid>0);
  if(paid>0)say(`${fmt(paid)} ✓ went to paying back ${cname()}.`,`有 ${fmt(paid)} 个 ✓ 自动还给了 ${cname()}。`);
  if(view==='mine')G=MINE;if(isOpen())render();
}
const STATUS_VALUE={done:1,changed:.5};
function reconcileChar(){
  if(typeof lokiData==='undefined'||!Array.isArray(lokiData.items))return;
  let changed=false;const before=earnedOf(CHARB);
  for(const it of lokiData.items){
    if(it.cid)continue; // other characters' schedules don't pay into the garden partner's ✓
    let st=it.status||'planned';try{st=lokiEffective(it).status}catch{}
    const v=STATUS_VALUE[st]||0,id=String(it.id),cur=CHARB.earnedMap[id]||0;
    if(st==='planned'&&!cur)continue;
    if(v!==cur){if(v)CHARB.earnedMap[id]=v;else delete CHARB.earnedMap[id];changed=true}
  }
  if(changed){
    const gain=r1(earnedOf(CHARB)-before),paid=gain>0&&charDebt()>0?repayFrom(gain,'out'):0;
    if(paid>0){persistMine(true);say(`${cname()} paid you back ✓ ${fmt(paid)}.`,`${cname()}还了你 ✓ ${fmt(paid)}。`)}
    persistChar(false);recompute();renderHud();
  }
}
function charCounts(){let d=0,c=0;for(const v of Object.values(CHARB.earnedMap)){if(v>=1)d++;else c++}return {d,c}}

function item(id){return CATALOG.find(x=>x.id===id)||MINE.custom.find(x=>x.id===id)||null}
const itemName=it=>it?(it.custom?it.name:L(it.en,it.cn)):'?';
function artHtml(it){if(!it)return'';if(it.custom)return `<img src="${esc(it.img)}" alt="" draggable="false">`;return ART[it.id]||''}
const plantedCount=id=>Object.values(G.cells).filter(c=>c&&c.item===id).length;
const cname=()=>{try{return Char.name()}catch{return L('Character','角色')}};
const cemoji=()=>{try{return Char.emoji()}catch{return '✨'}};
const inRange=(S,key)=>{const m=/^(\d+),(\d+)$/.exec(String(key||''));return !!m&&+m[1]<S.rows&&+m[2]<S.cols};

/* ---------- one mutation layer for both gardens ---------- */
function applyOp(S,op){
  lastErr='';
  switch(op&&op.t){
    case 'place':{if(!inRange(S,op.to)||S.cells[op.to]||!(S.inv[op.id]>0)||!item(op.id))return false;S.cells[op.to]={item:op.id,flip:false};if(isCrop(item(op.id)))S.cells[op.to].t0=op.at0||Date.now();if(--S.inv[op.id]<=0)delete S.inv[op.id];return true}
    case 'harvest':{const c=S.cells[op.at],it=c&&item(c.item);if(!isCrop(it)||!isRipe(c))return false;S.pantry[it.crop.y]=(S.pantry[it.crop.y]||0)+it.crop.n;c.t0=Date.now();delete c.w;delete c.f;return true}
    case 'tend':{const c=S.cells[op.at],it=c&&item(c.item),k=op.k==='f'?'f':'w';if(!isCrop(it)||isRipe(c)||c[k])return false;if(!charge(op.payer||S,k==='f'?FERT_COST:WATER_COST))return false;c[k]=1;return true}
    case 'sell':{const n=Math.min(S.pantry[op.id]||0,Math.max(1,op.n|0));if(!n||!GOODS[op.id])return false;S.pantry[op.id]-=n;if(!S.pantry[op.id])delete S.pantry[op.id];S.gold=r1((S.gold||0)+GOODS[op.id].sell*n);return true}
    case 'buyfood':{const g=GOODS[op.id];if(!g||!g.buy)return false;if((S.gold||0)<g.buy){lastErr=L(`You need ${g.buy-(S.gold||0)} more 🪙.`,`还差 ${g.buy-(S.gold||0)} 🪙。`);return false}S.gold=r1(S.gold-g.buy);S.pantry[op.id]=(S.pantry[op.id]||0)+1;return true}
    case 'cook':{const r=RECIPES.find(x=>x.id===op.id);if(!r)return false;for(const [k,n] of Object.entries(r.need))if((S.pantry[k]||0)<n){lastErr=L(`Not enough ${goodName(k)}.`,`${goodName(k)}不够。`);return false}for(const [k,n] of Object.entries(r.need)){S.pantry[k]-=n;if(!S.pantry[k])delete S.pantry[k]}S.pantry[r.id]=(S.pantry[r.id]||0)+1;return true}
    case 'bouquet':{const picks=op.picks||{},tot=Object.values(picks).reduce((a,b)=>a+(b|0),0);if(tot<BOUQUET_MIN){lastErr=L(`A bouquet needs at least ${BOUQUET_MIN} flowers.`,`花束至少要 ${BOUQUET_MIN} 朵花。`);return false}for(const [k,n] of Object.entries(picks))if(!GOODS[k]?.flower||(S.pantry[k]||0)<(n|0))return false;for(const [k,n] of Object.entries(picks)){S.pantry[k]-=n|0;if(!S.pantry[k])delete S.pantry[k]}S.pantry.bouquet=(S.pantry.bouquet||0)+1;return true}
    case 'exchange':{const n=Math.max(1,op.n|0);if((S.gold||0)<n*GOLD_PER_CHECK){lastErr=L(`You need ${n*GOLD_PER_CHECK} 🪙.`,`需要 ${n*GOLD_PER_CHECK} 🪙。`);return false}S.gold=r1(S.gold-n*GOLD_PER_CHECK);S.boughtChecks=(S.boughtChecks||0)+n;return true}
    case 'move':{if(op.from===op.to||!S.cells[op.from]||!inRange(S,op.to))return false;const a=S.cells[op.from],b=S.cells[op.to];S.cells[op.to]=a;if(b)S.cells[op.from]=b;else delete S.cells[op.from];return true}
    case 'store':{const c=S.cells[op.at];if(!c)return false;S.inv[c.item]=(S.inv[c.item]||0)+1;delete S.cells[op.at];return true}
    case 'flip':{const c=S.cells[op.at];if(!c)return false;c.flip=!c.flip;return true}
    case 'buy':{const it=item(op.id);if(!it||!charge(S,it.price))return false;S.inv[op.id]=(S.inv[op.id]||0)+1;return true}
    case 'fence':{const f=FENCES.find(x=>x.id===op.id);if(!f)return false;if(!S.fences.includes(f.id)){if(!charge(S,f.price))return false;S.fences.push(f.id)}S.fence=f.id;return true}
    case 'expand':{if(!canExpand(S,op.dir)){lastErr=L(`The garden can have at most ${MAX_PLOTS} plots.`,`花园最多 ${MAX_PLOTS} 格。`);return false}if(!charge(S,EXPAND_COST))return false;if(op.dir==='col')S.cols++;else S.rows++;return true}
    case 'shape':{const r=+op.rows,c=+op.cols;if(r*c!==S.rows*S.cols||r<MIN_SIDE||c<MIN_SIDE||r>MAX_SIDE||c>MAX_SIDE)return false;if(r===S.rows&&c===S.cols)return false;reshape(S,r,c);return true}
  }
  return false;
}
function canExpand(S,dir){const r=S.rows+(dir==='col'?0:1),c=S.cols+(dir==='col'?1:0);return r<=MAX_SIDE&&c<=MAX_SIDE&&r*c<=MAX_PLOTS}
/* Same number of plots, different rectangle. Things keep their row/column when it still exists;
   anything that would fall off the edge moves to the nearest free plot. */
function reshape(S,r,c){
  const keep={},out=[];
  for(const [k,v] of Object.entries(S.cells)){const [a,b]=k.split(',').map(Number);if(a<r&&b<c)keep[`${a},${b}`]=v;else out.push([a,b,v])}
  for(const [a,b,v] of out){
    let best=null,bd=1e9;for(let i=0;i<r;i++)for(let j=0;j<c;j++){const k=`${i},${j}`;if(keep[k])continue;const d=Math.abs(i-Math.min(a,r-1))+Math.abs(j-Math.min(b,c-1));if(d<bd){bd=d;best=k}}
    if(best)keep[best]=v;else S.inv[v.item]=(S.inv[v.item]||0)+1;
  }
  S.cells=keep;S.rows=r;S.cols=c;
}
function shapeOptions(S){const n=S.rows*S.cols,o=[];for(let r=MIN_SIDE;r<=MAX_SIDE;r++)if(n%r===0){const c=n/r;if(c>=MIN_SIDE&&c<=MAX_SIDE)o.push([r,c])}return o}

/* ---------- seasons: a fresh garden every week or month (like Forest). Land, fences, bag and ✓ carry over;
   what was planted goes into the album. ---------- */
function mondayOf(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
const ymd=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
function periodKey(period,d=new Date()){if(period==='week')return 'w:'+ymd(mondayOf(d));if(period==='month')return `m:${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return ''}
function periodRange(key){
  if(key.startsWith('w:')){const s=new Date(key.slice(2)+'T12:00:00'),e=new Date(s);e.setDate(e.getDate()+6);return [ymd(s),ymd(e)]}
  if(key.startsWith('m:')){const [y,m]=key.slice(2).split('-').map(Number);return [`${key.slice(2)}-01`,ymd(new Date(y,m,0))]}
  return ['',''];
}
function periodLabel(key){
  const [a,b]=periodRange(key);if(!a)return '';
  const f=(x,o)=>new Date(x+'T12:00:00').toLocaleDateString(uiLocale(),o);
  return key.startsWith('m:')?f(a,{year:'numeric',month:'long'}):`${f(a,{month:'short',day:'numeric'})} – ${f(b,{month:'short',day:'numeric'})}`;
}
function rollover(S){
  const key=periodKey(MINE.period);
  if(!key){if(S.periodKey){S.periodKey='';return 'meta'}return ''}
  if(!S.periodKey){S.periodKey=key;return 'meta'}
  if(S.periodKey===key)return '';
  const old=S.periodKey,[start,end]=periodRange(old);
  if(Object.keys(S.cells).length&&!S.archives.some(a=>a.id===old))S.archives.push({id:old,start,end,rows:S.rows,cols:S.cols,fence:S.fence,cells:clone(S.cells),at:Date.now()});
  S.archives=S.archives.slice(-60);S.cells={};S.periodKey=key;return 'new';
}
function checkSeasons(){
  const a=rollover(MINE),b=rollover(CHARB);
  if(a)persistMine(a==='new');if(b){if(b==='new'){OPS=[];saveOps()}persistChar(b==='new')}
  if(a==='new'||b==='new'){recompute();if(isOpen())render();say('A new garden season has started — last one is in the album.','新的花园周期开始了，上一期已经放进相册。')}
}

function doOp(op){
  if(view==='mine'){if(!applyOp(MINE,op)){if(lastErr)say(lastErr,lastErr);return false}persistMine();G=MINE;return true}
  const t=clone(G);if(!applyOp(t,op)){if(lastErr)say(lastErr,lastErr);return false}
  OPS.push(op);saveOps();G=t;return true;
}
/* ---------- DOM ---------- */
let bq={};
let root,sel={inv:null,cell:null},tab='flowers',shopOpen=false,uploadDraft=null,busy='',bubble=null,sheet='';
function ensureRoot(){
  if(root)return root;
  root=document.createElement('div');root.id='gardenRoot';root.className='gd-root hidden';root.setAttribute('aria-hidden','true');
  root.innerHTML=`<div class="gd-shell">
    <header class="gd-head">
      <button class="gd-btn gd-back" type="button" data-gd="close" aria-label="${L('Back','返回')}"><span aria-hidden="true">‹</span> ${L('Back','返回')}</button>
      <div class="gd-title" id="gdTitle"></div>
      <div class="gd-wallet" id="gdWallet"></div>
      <button class="gd-btn gd-quick" type="button" data-gd="toFeed" title="${L('Treats & Gifts','投喂与送礼')}">🧺 <span>${L('Treats & Gifts','投喂与送礼')}</span></button>
      <button class="gd-btn gd-btn-primary gd-shop-btn" type="button" data-gd="shop">${L('Shop','商城')}</button>
    </header>
    <nav class="gd-switch" id="gdSwitch" role="tablist"></nav>
    <div class="gd-social" id="gdSocial"></div>
    <div class="gd-say hidden" id="gdSay" aria-live="polite"></div>
    <div class="gd-tools" id="gdTools"></div>
    <div class="gd-stage"><div class="gd-plot" id="gdPlot"><div class="gd-fence gd-fence-top"></div><div class="gd-fence gd-fence-left"></div><div class="gd-fence gd-fence-right"></div><div class="gd-grid" id="gdGrid"></div><div class="gd-items" id="gdItems"></div><div class="gd-fence gd-fence-bottom"></div></div></div>
    <div class="gd-actionbar hidden" id="gdActions"></div>
    <section class="gd-tray" id="gdTray" aria-label="${L('Seed bag','背包')}"></section>
    <div class="gd-shop hidden" id="gdShop" role="dialog" aria-label="${L('Shop','商城')}"></div>
    <div class="gd-shop gd-sheet hidden" id="gdSheet" role="dialog"></div>
  </div><aside class="gd-chat hidden" id="gdChat" aria-label="Chat"></aside><div class="gd-ghost hidden" id="gdGhost"></div>`;
  document.body.appendChild(root);
  root.addEventListener('click',onClick);
  root.addEventListener('pointerdown',onPointerDown);
  root.addEventListener('change',onChange);
  root.addEventListener('input',onInput);
  return root;
}
function setView(v){view=v==='char'?'char':'mine';sel={inv:null,cell:null};if(!busy)bubble=null;if(view==='char')showNews();closeShop();closeSheet();if(tab==='custom'&&view==='char')uploadDraft=null;recompute();render()}
let fromMenu=false,closeTimer=null;
function openGarden(v,opts={}){
  fromMenu=!!opts.fromMenu;
  ensureRoot();clearTimeout(closeTimer);reconcileMine();reconcileChar();sel={inv:null,cell:null};
  if(v)view=v==='char'?'char':'mine';checkSeasons();recompute();if(view==='char')showNews();
  root.classList.remove('hidden','closing');root.setAttribute('aria-hidden','false');document.body.classList.add('gd-open');
  render();
  void root.offsetWidth;root.classList.add('show');
}
/* back = close the garden and, if it was opened from the ☰ menu, land back in the open menu */
function closeGarden(toMenu=fromMenu){
  if(!root||!isOpen())return;closeShop();closeSheet();closeChat();
  root.classList.remove('show');root.classList.add('closing');root.setAttribute('aria-hidden','true');document.body.classList.remove('gd-open');
  if(toMenu)setTimeout(()=>{try{openSidebar()}catch{}},120);
  clearTimeout(closeTimer);closeTimer=setTimeout(()=>{root.classList.add('hidden');root.classList.remove('closing')},240);
}
const isOpen=()=>root&&!root.classList.contains('hidden')&&!root.classList.contains('closing');

function renderHud(){
  if(!root)return;const w=root.querySelector('#gdWallet');if(!w)return;
  if(view==='char'){const {d,c}=charCounts();w.innerHTML=`<span class="gd-coin">✓ ${fmt(available())}</span><small>${L(`${d} done · ${c} changed · ${fmt(G.spent)} spent`,`完成 ${d} · 改计划 ${c} · 已花 ${fmt(G.spent)}`)}</small>`}
  else{const net=lentTotal()-repaidTotal();w.innerHTML=`<span class="gd-coin">✓ ${fmt(available())}</span><small>${L(`${earnedOf(MINE)} completed · ${fmt(MINE.spent)} spent`,`已完成 ${earnedOf(MINE)} · 已花 ${fmt(MINE.spent)}`)}${net?` · ${L('borrowed','借入')} ${fmt(net)}`:''}</small>`}
  w.insertAdjacentHTML('afterbegin',`<span class="gd-coin gd-coin-gold">🪙 ${fmt((view==='char'?CHARB:MINE).gold||0)}</span>`);
  const sw=root.querySelector('#gdShopWallet');if(sw)sw.textContent=`✓ ${fmt(available())}`;
}
function renderTitle(){
  root.querySelector('#gdTitle').innerHTML=view==='char'?`<div class="gd-label">${esc(cname().toUpperCase())} · ${L('GARDEN','花园')}</div><strong>${esc(cemoji())} ${esc(L(`${cname()}'s garden`,`${cname()}的花园`))}</strong>`:`<div class="gd-label">${L('MY GARDEN','我的花园')}</div><strong>${L('Garden','花园')}</strong>`;
  root.querySelector('#gdSwitch').innerHTML=`<button type="button" role="tab" class="${view==='mine'?'on':''}" data-gd="view" data-v="mine">🌳 ${L('My garden','我的花园')}</button><button type="button" role="tab" class="${view==='char'?'on':''}" data-gd="view" data-v="char">${esc(cemoji())} ${esc(L(`${cname()}'s garden`,`${cname()}的花园`))}${CHARB.news&&!CHARB.news.seen&&view!=='char'?'<i class="gd-dot"></i>':''}</button>`;
}
function renderSocial(){
  paintSocial();
  const el=root.querySelector('#gdSocial');
  el.insertAdjacentHTML('beforeend',`<button type="button" class="gd-icon gd-gear${toolsOpen?' on':''}" data-gd="tools" aria-expanded="${toolsOpen}" aria-controls="gdTools" title="${L('Garden settings: size, shape, seasons, album','花园设置：大小、形状、换新、相册')}" aria-label="${L('Garden settings','花园设置')}"><span>⚙︎</span></button>`);
}
function paintSocial(){
  const el=root.querySelector('#gdSocial'),nm=esc(cname()),dis=busy?' disabled':'';
  let mode='';try{mode=Char.mode()}catch{}
  if(view==='mine'){
    const d=debt();
    const v=MINE.visit,cd=charDebt();
    const ripeN=ripeCells(MINE).length;
    el.innerHTML=`${ripeN?`<button type="button" class="gd-btn gd-btn-primary gd-harvest-all" data-gd="harvestAll">🧺 ${L(`Harvest all (${ripeN})`,`全部收成（${ripeN}）`)}</button>`:''}${mode?`<button type="button" class="gd-btn gd-btn-primary" data-gd="chatOpen">💬 ${L(`Chat with ${nm}`,`和${nm}聊天`)}</button>`:''}${v?`<button type="button" class="gd-btn gd-visit" data-gd="visitOpen">📬 ${v.kind==='borrow'?L(`${nm} wants to borrow ✓ ${v.amount}`,`${nm}想借 ✓ ${v.amount}`):L(`${nm} left ${v.ops.length} suggestion${v.ops.length>1?'s':''}`,`${nm}留了 ${v.ops.length} 条建议`)}</button>`:''}${cd>0?`<span class="gd-debt gd-debt-in">${L(`${nm} owes you ✓ ${fmt(cd)}`,`${nm}欠你 ✓ ${fmt(cd)}`)}</span>`:''}<button type="button" class="gd-btn" data-gd="borrowOpen"${dis}>🤝 ${L(`Borrow ✓ from ${nm}`,`向${nm}借 ✓`)}</button>${d>0?`<span class="gd-debt">${L(`You owe ${nm} ✓ ${fmt(d)}`,`欠${nm} ✓ ${fmt(d)}`)}</span><button type="button" class="gd-btn" data-gd="repay"${dis}${available()<1?' disabled':''}>${L('Pay back','还')}</button>`:''}`;
  }else if(!mode){
    el.innerHTML=`<span class="gd-hint">${L('Set up your character first — their finished plans become their ✓.','先设置角色——角色完成的日程就是它的 ✓。')}</span><button type="button" class="gd-btn" data-gd="charSettings">🤖 ${L('Character & API','角色与 API')}</button>`;
  }else{
    const last=CHARB.lastAuto?(CHARB.lastAuto===ymd(new Date())?L('today','今天'):new Date(CHARB.lastAuto+'T12:00:00').toLocaleDateString(uiLocale(),{month:'short',day:'numeric'})):L('not yet','还没有');
    el.innerHTML=`<button type="button" class="gd-btn gd-btn-primary" data-gd="chatOpen">💬 ${L(`Chat with ${nm}`,`和${nm}聊天`)}</button><button type="button" class="gd-btn" data-gd="decorate"${dis}>✨ ${L(`Let ${nm} decorate`,`让${nm}自己布置`)}</button>
    <label class="gd-chipcheck" title="${L(`Once a day, when ${cname()} has ✓ to spare`,`每天一次，${cname()}有多余 ✓ 时`)}"><input type="checkbox" data-gd-auto ${CHARB.autoPlant?'checked':''}><span>🌱 ${L('Plants on their own','每天自己种')}<small>${L('last','上次')}：${esc(last)}</small></span></label>
    ${OPS.length?`<span class="gd-suggest">${L(`${OPS.length} suggested change${OPS.length>1?'s':''} — not applied yet`,`${OPS.length} 条修改建议，还没生效`)}</span><button type="button" class="gd-btn" data-gd="sendSuggest"${dis}>${L(`Send to ${nm}`,`发送给${nm}`)}</button><button type="button" class="gd-btn gd-btn-quiet" data-gd="undoSuggest"${dis}>${L('Undo all','全部撤销')}</button>`:`<span class="gd-hint">${L(`Anything you change here is a suggestion — ${nm} decides.`,`你在这里的修改都是建议，${nm}同意了才会生效。`)}</span>`}`;
  }
}
function renderSay(){
  const el=root.querySelector('#gdSay');
  if(busy&&!chatOpen){el.classList.remove('hidden');el.innerHTML=`<span class="gd-ava">${esc(cemoji())}</span><div><strong>${esc(cname())}</strong><p class="gd-typing">${esc(busy)}<i></i><i></i><i></i></p></div>`;return}
  if(!bubble||(busy&&chatOpen)){el.classList.add('hidden');el.innerHTML='';return}
  el.classList.remove('hidden');
  el.innerHTML=`<span class="gd-ava">${esc(cemoji())}</span><div><strong>${esc(cname())}</strong><p>${esc(bubble.text)}</p>${bubble.note?`<small>${esc(bubble.note)}</small>`:''}</div><button type="button" class="gd-icon gd-say-x" data-gd="sayClose" aria-label="${L('Dismiss','关闭')}">×</button>`;
}
function renderTools(){
  const box=root.querySelector('#gdTools');box.classList.toggle('open',toolsOpen);box.setAttribute('aria-hidden',String(!toolsOpen));
  if(!toolsOpen){box.innerHTML='';return}
  const el=box,S=view==='char'?CHARB:MINE,opts=shapeOptions(G),cur=MINE.period;
  el.innerHTML=`<label class="gd-tool gd-zoom"><span>${L('Size','大小')}</span><input id="gdZoom" type="range" min="28" max="128" step="2" value="${zoom}" aria-label="${L('Garden size','花园大小')}"></label>
  <label class="gd-tool"><span>${L('Shape','形状')}</span><select id="gdShape" aria-label="${L('Rows × columns','行 × 列')}">${opts.map(([r,c])=>`<option value="${r}x${c}" ${r===G.rows&&c===G.cols?'selected':''}>${L(`${r} rows × ${c} cols`,`${r} 排 × ${c} 列`)}</option>`).join('')}</select></label>
  <label class="gd-tool"><span>${L('New garden','换新花园')}</span><select id="gdPeriod">${[['none',L('Never','不换')],['week',L('Every week','每周')],['month',L('Every month','每月')]].map(([v,t])=>`<option value="${v}" ${cur===v?'selected':''}>${t}</option>`).join('')}</select></label>
  <button type="button" class="gd-btn" data-gd="album">🖼 ${L('Album','相册')} ${S.archives.length?`(${S.archives.length})`:''}</button>
  ${view==='mine'?`<label class="gd-chipcheck"><input type="checkbox" data-gd-visits ${MINE.allowVisits?'checked':''}><span>🚪 ${esc(L(`Let ${cname()} visit my garden`,`允许${cname()}来我的花园`))}<small>${L('suggests changes, may ask to borrow ✓','会给建议，也可能找你借 ✓')}</small></span></label>`:''}
  ${S.periodKey?`<span class="gd-season">${L('This season','本期')}：${esc(periodLabel(S.periodKey))}</span>`:''}`;
}
function render(){if(!isOpen())return;if(drag){drag.pendingRender=true;return}root.dataset.view=view;renderTitle();renderHud();renderSocial();renderSay();renderTools();renderPlot();if(chatOpen)renderChat();renderTray();renderActions();if(shopOpen)renderShop();if(sheet)renderSheet()}
function renderPlot(){
  const plot=root.querySelector('#gdPlot'),grid=root.querySelector('#gdGrid');
  const f=FENCE_ART[G.fence]||FENCE_ART.wood;
  plot.dataset.fence=G.fence;plot.classList.toggle('draft',view==='char'&&OPS.length>0);
  plot.style.setProperty('--gd-fh',`url("data:image/svg+xml,${encodeURIComponent(f.h)}")`);
  plot.style.setProperty('--gd-fv',`url("data:image/svg+xml,${encodeURIComponent(f.v)}")`);
  const items=root.querySelector('#gdItems');
  for(const el of [plot,grid,items]){el.style.setProperty('--gd-cols',G.cols);el.style.setProperty('--gd-rows',G.rows)}
  plot.style.setProperty('--gd-cell',zoom+'px');
  let h='',p='';
  for(let r=0;r<G.rows;r++)for(let c=0;c<G.cols;c++){
    const key=`${r},${c}`,cell=G.cells[key],it=cell&&item(cell.item);
    const cls=['gd-cell',(r+c)%2?'alt':'',sel.cell===key?'selected':'',!it&&(sel.inv||sel.cell)?'target':''].join(' ');
    h+=`<div class="${cls}" data-cell="${key}"></div>`;
    const changed=view==='char'&&OPS.length&&JSON.stringify(CHARB.cells[key]||null)!==JSON.stringify(cell||null);
    if(it){
      let extra='',art=artHtml(it),stage='';
      if(isCrop(it)){
        const left=readyAt(cell)-Date.now(),prog=1-Math.max(0,left)/growMs(cell);
        if(left<=0){extra=`<button type="button" class="gd-ripe" data-gd="harvest" data-at="${key}" title="${L('Harvest','收成')}">${GOODS[it.crop.y]?.e||'✨'}</button>`;stage=' ripe'}
        else{extra=`<span class="gd-timer${cell.w?' w':''}${cell.f?' f':''}">${cell.w?'💧':''}${cell.f?'🌱':''}${shortLeft(left)}</span>`;if(!it.tall&&!GOODS[it.crop.y]?.flower&&prog<.35){art=ART.sprout;stage=' young'}else stage=' growing'}
      }
      p+=`<div class="gd-slot" style="grid-row:${r+1};grid-column:${c+1};z-index:${it.ground?1:r*2+10}"><div class="gd-item${it.tall&&stage!==' young'?' tall':''}${it.ground?' ground':''}${cell.flip?' flip':''}${sel.cell===key?' selected':''}${changed?' suggested':''}${stage}" data-placed="${key}" title="${esc(itemName(it))}">${art}</div>${extra}</div>`;
    }
  }
  grid.innerHTML=h;items.innerHTML=p;
}
function renderTray(){
  const tray=root.querySelector('#gdTray');
  const ids=Object.keys(G.inv).filter(id=>G.inv[id]>0&&item(id));
  tray.innerHTML=`<div class="gd-tray-head"><span class="gd-label">${view==='char'?esc(L(`${cname().toUpperCase()}'S BAG`,`${cname()}的背包`)):L('SEED BAG','背包')}</span><small>${ids.length?L('Drag onto the garden, or tap an item then tap a plot.','拖到花园里，或先点物品再点格子。'):L('Empty — buy plants in the Shop.','空空的——去商城兑换植物吧。')}</small></div>
  <div class="gd-tray-items">${ids.map(id=>{const it=item(id);return `<button type="button" class="gd-chip${sel.inv===id?' selected':''}" data-inv="${esc(id)}" title="${esc(itemName(it))}"><span class="gd-chip-art">${artHtml(it)}</span><span class="gd-chip-count">×${G.inv[id]}</span></button>`}).join('')}</div>
  ${pantryRow(view==='char'?CHARB:MINE)}`;
}
function pantryRow(S){
  const ks=Object.keys(S.pantry||{}).filter(k=>S.pantry[k]>0);
  return `<div class="gd-pantry"><span class="gd-label">🧺 ${view==='char'?esc(L(`${cname().toUpperCase()}'S PANTRY`,`${cname()}的仓库`)):L('PANTRY','仓库')}</span><span class="gd-gold">🪙 ${fmt(S.gold||0)}</span>${ks.length?ks.map(k=>`<span class="gd-good" title="${esc(goodName(k))}">${GOODS[k].e}<b>${S.pantry[k]}</b></span>`).join(''):`<small>${L('Harvest crops to fill it.','收成后的作物会放在这里。')}</small>`}${view==='mine'?`<button type="button" class="gd-btn gd-btn-quiet" data-gd="openTab" data-tab="market">${L('Market','市场')} ›</button><button type="button" class="gd-btn gd-btn-quiet" data-gd="openTab" data-tab="kitchen">${L('Kitchen','厨房')} ›</button><button type="button" class="gd-btn gd-btn-quiet" data-gd="giftBox">🎁 ${L('Gift box','礼物箱')}${(S.gifts||[]).length?` · ${S.gifts.length}`:''}</button>`:''}</div>`;
}
function renderActions(){
  const bar=root.querySelector('#gdActions');
  const cell=sel.cell&&G.cells[sel.cell],it=cell&&item(cell.item);
  if(!it){bar.classList.add('hidden');bar.innerHTML='';return}
  bar.classList.remove('hidden');
  if(isCrop(it)){
    const left=readyAt(cell)-Date.now(),ripe=left<=0,g=GOODS[it.crop.y],mineView=view==='mine';
    const tend=(k,icon,label,cost)=>`<button type="button" class="gd-btn" data-gd="tend" data-k="${k}"${ripe||cell[k]||availOf(MINE)<cost?' disabled':''} title="${L(`${cost} ✓ · ${k==='f'?'12':'6'} h sooner`,`${cost} ✓ · 提前 ${k==='f'?12:6} 小时`)}">${icon} ${label} <small>✓${cost}</small></button>`;
    bar.innerHTML=`<strong>${esc(itemName(it))}</strong><span class="gd-crop-status">${ripe?L(`Ready — ${it.crop.n} ${g.e} ${goodName(it.crop.y)}`,`可以收成了：${g.e} ${goodName(it.crop.y)} ×${it.crop.n}`):L(`Ripe in ${fmtLeft(left)} · ${it.crop.n} ${g.e} every ${(it.crop.h||24)} h`,`还要 ${fmtLeft(left)} ${g.flower?'开花':'成熟'} · 每 ${(it.crop.h||24)} 小时收 ${g.e}×${it.crop.n}`)}${!mineView?` · ${L(`${cname()} harvests it`,`由${cname()}收成`)}`:''}</span>${ripe&&mineView?`<button type="button" class="gd-btn gd-btn-primary" data-gd="harvest" data-at="${sel.cell}">🧺 ${L('Harvest','收成')}</button>`:''}${!ripe?tend('w','💧',L('Water','浇水'),WATER_COST)+tend('f','🌱',L('Fertilise','施肥'),FERT_COST):''}<button type="button" class="gd-btn" data-gd="flip">↔</button><button type="button" class="gd-btn" data-gd="store">${L('Put in bag','收回背包')}</button><button type="button" class="gd-icon" data-gd="deselect" aria-label="${L('Done','完成')}">✓</button>`;
    return;
  }
  bar.innerHTML=`<strong>${esc(itemName(it))}</strong><span>${L('Tap an empty plot to move it','点空格子即可移动')}</span><button type="button" class="gd-btn" data-gd="flip">↔ ${L('Flip','翻转')}</button><button type="button" class="gd-btn" data-gd="store">${L('Put in bag','收回背包')}</button><button type="button" class="gd-icon" data-gd="deselect" aria-label="${L('Done','完成')}">✓</button>`;
}

/* ---------- farming actions ---------- */
function harvest(at){
  if(view!=='mine'){say(`That's ${cname()}'s — they harvest it.`,`这是${cname()}的，由它来收成。`);return}
  const c=MINE.cells[at],it=c&&item(c.item);
  if(!applyOp(MINE,{t:'harvest',at}))return;
  persistMine();G=MINE;celebrate();say(`+${it.crop.n} ${goodName(it.crop.y)}`,`收获 ${GOODS[it.crop.y].e} ${goodName(it.crop.y)} ×${it.crop.n}`);render();
}
function harvestAll(){
  const got={};for(const k of ripeCells(MINE)){const it=item(MINE.cells[k].item);if(applyOp(MINE,{t:'harvest',at:k}))got[it.crop.y]=(got[it.crop.y]||0)+it.crop.n}
  if(!Object.keys(got).length)return;persistMine();G=MINE;celebrate();
  say('Harvested: '+Object.entries(got).map(([k,n])=>`${GOODS[k].e}×${n}`).join(' '),'收成：'+Object.entries(got).map(([k,n])=>`${GOODS[k].e}×${n}`).join(' '));render();
}
/* water / fertilise — always paid with YOUR ✓; in the character's garden it's a gift (applied at once, not a suggestion) */
function tend(at,k){
  const S=view==='char'?CHARB:MINE,c=S.cells[at],it=c&&item(c.item);if(!c)return;
  if(!applyOp(S,{t:'tend',at,k,payer:MINE})){if(lastErr)say(lastErr,lastErr);return}
  persistMine();if(S===CHARB){persistChar();logChat('user',L(`${k==='f'?'🌱 Fertilised':'💧 Watered'} your ${itemName(it)}.`,`${k==='f'?'🌱 给你的':'💧 给你的'}${itemName(it)}${k==='f'?'施了肥':'浇了水'}。`))}
  recompute();say(k==='f'?'12 h sooner.':'6 h sooner.',k==='f'?'施肥了，提前 12 小时。':'浇水了，提前 6 小时。');render();
}
function market(act,id,n){
  const op=act==='sell'?{t:'sell',id,n}:act==='buyfood'?{t:'buyfood',id}:act==='cook'?{t:'cook',id}:{t:'exchange',n};
  if(!applyOp(MINE,op)){if(lastErr)say(lastErr,lastErr);return}
  persistMine();G=view==='mine'?MINE:G;
  if(act==='cook'){celebrate();say(`Made ${goodName(id)}!`,`做好了${GOODS[id].e}${goodName(id)}！`)}
  else if(act==='exchange'){celebrate();say(`+${n} ✓`,`换到 ${n} ✓`)}
  else if(act==='buyfood')say(`Bought ${goodName(id)}.`,`买了${GOODS[id].e}${goodName(id)}。`);
  render();renderShop();
}
/* now and then (at most once a day) the character gives you something from their pantry — a bouquet or cooked food.
   It goes into your gift box (a keepsake), not your pantry, so it can't be eaten, sold or given back. */
function charGift(){
  let mode='';try{mode=Char.mode()}catch{}
  const S=CHARB,today=ymd(new Date());if(!mode||S.lastGift===today)return;
  const rank=k=>k==='bouquet'?2:GOODS[k].food?1:GOODS[k].flower?-1:0;
  const ks=Object.keys(S.pantry).filter(k=>S.pantry[k]>0&&rank(k)>=0).sort((a,b)=>rank(b)-rank(a));if(!ks.length)return;
  S.lastGift=today;if(Math.random()>.4){persistChar(false);return}
  const id=ks[0];S.pantry[id]--;if(!S.pantry[id])delete S.pantry[id];MINE.gifts.push({id:uid(),dir:'in',item:id,cid:'main',at:Date.now()});MINE.gifts=MINE.gifts.slice(-300);
  let lr=(en,cn)=>L(en,cn);try{lr=Char.LR}catch{}
  const text=id==='bouquet'?lr('I picked these for you. Don’t make it weird.','这束花是给你的。别多想。'):lr(`I made too much. Here — ${GOODS[id].en} for you.`,`做多了，${GOODS[id].cn}给你。`);
  S.news={text,note:L(`${cname()} gave you ${GOODS[id].e} ${goodName(id)} · in your 🎁 gift box`,`${cname()}送了你 ${GOODS[id].e}${goodName(id)} · 已放进🎁礼物箱`),at:Date.now(),seen:false};
  persistChar(true);persistMine(true);recompute();
  logChat('char',text,S.news.note);try{window.Feed?.log('main','char',text,S.news.note)}catch{}
}
/* the character runs their own little farm: harvest what's ripe, cook when possible, sell the surplus, trade gold for ✓ */
function charFarm(){
  const S=CHARB,got={},made=[];let sold=0,ex=0;
  for(const k of ripeCells(S)){const it=item(S.cells[k].item);if(applyOp(S,{t:'harvest',at:k}))got[it.crop.y]=(got[it.crop.y]||0)+it.crop.n}
  for(let i=0;i<6;i++){const r=RECIPES.find(r=>Object.entries(r.need).every(([k,n])=>(S.pantry[k]||0)>=n)&&(S.pantry[r.id]||0)<2);if(!r||!applyOp(S,{t:'cook',id:r.id}))break;made.push(r.id)}
  if(flowerCount(S)>=BOUQUET_MIN&&!(S.pantry.bouquet>0)){const picks={};let need=BOUQUET_MIN;for(const [k,n] of Object.entries(S.pantry)){if(!GOODS[k]?.flower||need<=0)continue;const x=Math.min(n,need);picks[k]=x;need-=x}if(applyOp(S,{t:'bouquet',picks}))made.push('bouquet')}
  for(const [k,n] of Object.entries(S.pantry)){if(k==='bouquet'||GOODS[k]?.flower)continue;const keep=GOODS[k].food?2:3;if(n>keep){const g=S.gold;applyOp(S,{t:'sell',id:k,n:n-keep});sold+=S.gold-g}}
  const canEx=Math.floor((S.gold||0)/GOLD_PER_CHECK);if(canEx>0&&applyOp(S,{t:'exchange',n:canEx}))ex=canEx;
  charGift();
  if(!Object.keys(got).length&&!made.length&&!sold)return;
  const bits=[Object.keys(got).length?L('harvested ','收了 ')+Object.entries(got).map(([k,n])=>`${GOODS[k].e}×${n}`).join(' '):'',made.length?L('cooked ','做了 ')+made.map(k=>GOODS[k].e).join(''):'',sold?L(`sold for 🪙${fmt(sold)}`,`卖了 🪙${fmt(sold)}`):'',ex?L(`traded for ✓${ex}`,`换了 ✓${ex}`):''].filter(Boolean);
  S.news={text:'',note:`${cname()} · ${bits.join(' · ')}`,at:Date.now(),seen:false};
  persistChar(true);recompute();if(isOpen())render();
}

/* ---------- placing ---------- */
function place(id,key){
  if(!doOp({t:'place',id,to:key}))return false;
  if(!(G.inv[id]>0)&&sel.inv===id)sel.inv=null;
  pop(key);return true;
}
function move(from,to){if(from===to)return;if(doOp({t:'move',from,to})){if(sel.cell===from)sel.cell=to;pop(to)}}
function store(key){if(doOp({t:'store',at:key})&&sel.cell===key)sel.cell=null}
function pop(key){requestAnimationFrame(()=>{const el=root.querySelector(`[data-placed="${key}"]`);if(el){el.classList.add('pop');setTimeout(()=>el.classList.remove('pop'),420)}})}

/* ---------- pointer drag ---------- */
let drag=null;
function onPointerDown(e){
  if(e.button>0||drag)return;
  const src=e.target.closest('[data-placed],[data-inv]');if(!src||!root.contains(src)||src.closest('#gdShop,#gdSheet'))return;
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
    if(a.disabled)return;
    const act=a.dataset.gd;
    if(act==='close')return closeGarden();
    if(act==='view')return setView(a.dataset.v);
    if(act==='shop')return openShop();
    if(act==='shopClose')return closeShop();
    if(act==='sheetClose')return closeSheet();
    if(act==='sayClose'){bubble=null;return renderSay()}
    if(act==='flip'&&sel.cell&&G.cells[sel.cell]){doOp({t:'flip',at:sel.cell});return render()}
    if(act==='store'&&sel.cell){store(sel.cell);return render()}
    if(act==='deselect'){sel.cell=null;return render()}
    if(act==='tab'){tab=a.dataset.tab;return renderShop()}
    if(act==='buy')return buy(a.dataset.id);
    if(act==='fence')return buyFence(a.dataset.id);
    if(act==='expand')return expand(a.dataset.dir);
    if(act==='upload')return confirmUpload();
    if(act==='delCustom')return deleteCustom(a.dataset.id);
    if(act==='borrowOpen')return openSheet('borrow');
    if(act==='borrowStep'){const n=root.querySelector('#gdAmt');if(n){n.value=Math.max(1,Math.min(Number(n.max)||1,(Number(n.value)||1)+Number(a.dataset.d)));root.querySelector('#gdAmtVal').textContent=n.value}return}
    if(act==='borrowSend')return sendBorrow();
    if(act==='repay')return repayNow();
    if(act==='decorate')return letDecorate();
    if(act==='sendSuggest')return openSheet('suggest');
    if(act==='suggestSend')return sendSuggestions();
    if(act==='undoSuggest'){OPS=[];saveOps();recompute();sel={inv:null,cell:null};return render()}
    if(act==='charSettings'){closeGarden(false);try{Char.openSettings()}catch{}return}
    if(act==='tools'){toolsOpen=!toolsOpen;try{localStorage.setItem(TOOLS_KEY,toolsOpen?'1':'0')}catch{}renderSocial();renderTools();return}
    if(act==='chatOpen')return openChat();
    if(act==='chatClose')return closeChat();
    if(act==='chatSend')return sendChat();
    if(act==='album')return openSheet('album');
    if(act==='albumView'){albumId=a.dataset.id;return openSheet('albumView')}
    if(act==='visitOpen')return openSheet('visit');
    if(act==='harvest')return harvest(a.dataset.at);
    if(act==='harvestAll')return harvestAll();
    if(act==='tend')return tend(sel.cell,a.dataset.k);
    if(act==='openTab'){tab=a.dataset.tab;return openShop()}
    if(act==='bq'){const k=a.dataset.id;bq[k]=Math.max(0,Math.min(MINE.pantry[k]||0,(bq[k]||0)+Number(a.dataset.d)));if(!bq[k])delete bq[k];return renderShop()}
    if(act==='makeBouquet'){if(!applyOp(MINE,{t:'bouquet',picks:{...bq}})){if(lastErr)say(lastErr,lastErr);return}bq={};persistMine();celebrate();say('A bouquet! 💐','扎好了一束花 💐');render();return renderShop()}
    if(act==='giftBox'){const fm=fromMenu;closeGarden(false);setTimeout(()=>{try{window.Feed?.open('main',{fromMenu:fm,box:'in'})}catch{}},180);return}
    if(act==='giveBouquet'||act==='toFeed'){const fm=fromMenu;closeGarden(false);setTimeout(()=>{try{window.Feed?.open('main',{fromMenu:fm,mode:act==='giveBouquet'?'gift':'feed'})}catch{}},180);return}
    if(act==='sell'||act==='buyfood'||act==='cook'||act==='exchange')return market(act,a.dataset.id,+a.dataset.n||1);
    if(act==='visitAccept')return resolveVisit(true);
    if(act==='visitDecline')return resolveVisit(false);
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
function openShop(){closeSheet();shopOpen=true;const s=root.querySelector('#gdShop');s.classList.remove('hidden');requestAnimationFrame(()=>s.classList.add('open'));renderShop()}
function closeShop(){shopOpen=false;const s=root&&root.querySelector('#gdShop');if(!s)return;s.classList.remove('open');setTimeout(()=>{if(!shopOpen)s.classList.add('hidden')},220)}
function card(it,btn){
  const owned=(G.inv[it.id]||0)+plantedCount(it.id);
  return `<div class="gd-card"><div class="gd-card-art${it.tall?' tall':''}">${artHtml(it)}</div><div class="gd-card-name">${esc(itemName(it))}</div><div class="gd-card-meta">${owned?L(`Owned ${owned}`,`已拥有 ${owned}`):(it.tall?L('Tree','树木'):'&nbsp;')}</div>${btn}</div>`;
}
const priceBtn=(price,attrs,label)=>`<button type="button" class="gd-buy${available()<price?' poor':''}" ${attrs}>${label||`✓ ${price}`}</button>`;
/* market and kitchen bodies — also shown inside Treats & Gifts (inFeed) */
function marketBody(){
    const S=MINE,ks=Object.keys(S.pantry).filter(k=>S.pantry[k]>0),maxEx=Math.floor((S.gold||0)/GOLD_PER_CHECK);
    return `<div class="gd-market">
      <section><div class="gd-label">${L('SELL','卖出')}</div>${ks.length?`<div class="gd-goods">${ks.map(k=>`<div class="gd-goodrow"><span class="gd-goodico">${GOODS[k].e}</span><span><strong>${esc(goodName(k))}</strong><small>×${S.pantry[k]} · 🪙${GOODS[k].sell}</small></span><button type="button" class="gd-buy" data-gd="sell" data-id="${k}" data-n="1">${L('Sell 1','卖 1 个')}</button>${S.pantry[k]>1?`<button type="button" class="gd-btn" data-gd="sell" data-id="${k}" data-n="${S.pantry[k]}">${L('All','全部')} 🪙${GOODS[k].sell*S.pantry[k]}</button>`:''}</div>`).join('')}</div>`:`<p class="gd-note">${L('Nothing to sell yet — plant crops and harvest them.','还没有可卖的东西——种点作物收成吧。')}</p>`}</section>
      <section><div class="gd-label">${L('BUY WITH GOLD','用金币买')}</div><div class="gd-goods gd-goods-grid">${Object.entries(GOODS).filter(([,g])=>g.buy).map(([k,g])=>`<button type="button" class="gd-goodbuy${(S.gold||0)<g.buy?' poor':''}" data-gd="buyfood" data-id="${k}"><span>${g.e}</span><strong>${esc(goodName(k))}</strong><small>🪙${g.buy}</small></button>`).join('')}</div></section>
      <section><div class="gd-label">${L('EXCHANGE','兑换')}</div><div class="gd-goodrow"><span class="gd-goodico">🪙</span><span><strong>${GOLD_PER_CHECK} 🪙 → 1 ✓</strong><small>${L(`You have 🪙${fmt(S.gold||0)}`,`你有 🪙${fmt(S.gold||0)}`)}</small></span><button type="button" class="gd-buy" data-gd="exchange" data-n="1"${maxEx<1?' disabled':''}>${L('Exchange 1','换 1 个')}</button>${maxEx>1?`<button type="button" class="gd-btn" data-gd="exchange" data-n="${maxEx}">${L(`All (${maxEx} ✓)`,`全部（${maxEx} ✓）`)}</button>`:''}</div></section>
    </div>`;
}
function kitchenBody(inFeed){
    const S=MINE,fl=Object.keys(S.pantry).filter(k=>GOODS[k]?.flower&&S.pantry[k]>0);
    for(const k of Object.keys(bq))if(!fl.includes(k)||bq[k]>S.pantry[k])delete bq[k];
    const tot=Object.values(bq).reduce((a,b)=>a+b,0);
    const bouquet=`<section class="gd-bouquet"><div class="gd-label">💐 ${L('BOUQUET','花束')}</div><p class="gd-note">${L(`Pick at least ${BOUQUET_MIN} flowers.`,`至少选 ${BOUQUET_MIN} 朵花。`)} ${S.pantry.bouquet?L(`You have ${S.pantry.bouquet} bouquet(s).`,`你有 ${S.pantry.bouquet} 束花。`):''}</p>${fl.length?`<div class="gd-bq-picks">${fl.map(k=>`<span class="gd-bq-pick"><span>${GOODS[k].e}</span><button type="button" class="gd-icon" data-gd="bq" data-id="${k}" data-d="-1"${!bq[k]?' disabled':''}>−</button><b>${bq[k]||0}/${S.pantry[k]}</b><button type="button" class="gd-icon" data-gd="bq" data-id="${k}" data-d="1"${(bq[k]||0)>=S.pantry[k]?' disabled':''}>＋</button></span>`).join('')}</div>`:`<p class="gd-note">${L('No flowers yet — plant flowers and harvest them every 2 days.','还没有花——种花，每 2 天能收一次。')}</p>`}<div class="gd-row2"><button type="button" class="gd-buy" data-gd="makeBouquet"${tot<BOUQUET_MIN?' disabled':''}>💐 ${L(`Make a bouquet (${tot})`,`扎一束（${tot} 朵）`)}</button>${S.pantry.bouquet?`<button type="button" class="gd-btn" data-gd="giveBouquet">🎁 ${esc(L(`Give to ${cname()}`,`送给${cname()}`))}</button>`:''}</div></section>`;
    return bouquet+`<p class="gd-note gd-note-top">${L('Cook what you harvested. Missing an egg or milk? Buy it in the Market.','用收成的作物做吃的。缺鸡蛋或牛奶，可以去市场买。')}</p><div class="gd-cards gd-recipes">${RECIPES.map(r=>{const ok=Object.entries(r.need).every(([k,n])=>(S.pantry[k]||0)>=n);return `<div class="gd-card"><div class="gd-card-art gd-food-art">${GOODS[r.id].e}</div><div class="gd-card-name">${esc(goodName(r.id))}</div><div class="gd-card-meta gd-need">${Object.entries(r.need).map(([k,n])=>`<span class="${(S.pantry[k]||0)>=n?'ok':'no'}">${GOODS[k].e}${S.pantry[k]||0}/${n}</span>`).join(' ')}</div><button type="button" class="gd-buy${ok?'':' poor'}" data-gd="cook" data-id="${r.id}">${L('Cook','制作')}${S.pantry[r.id]?` · ${L('have','已有')} ${S.pantry[r.id]}`:''}</button></div>`}).join('')}</div>`;
}
function renderShop(){
  const s=root.querySelector('#gdShop'),isChar=view==='char';
  let body='';
  if(isChar&&(tab==='market'||tab==='kitchen'))tab='crops';
  if(['flowers','trees','decor'].includes(tab)){
    body=`${tab==='flowers'?`<p class="gd-note gd-note-top">${L(`Flowers bloom every 2 days — 1 flower each. ${BOUQUET_MIN} or more make a bouquet (Kitchen) you can give.`,`花每 2 天开一朵，可以收成。${BOUQUET_MIN} 朵以上能在厨房扎成花束送人。`)}</p>`:''}<div class="gd-cards">${CATALOG.filter(x=>x.cat===tab).map(it=>card(it,priceBtn(it.price,`data-gd="buy" data-id="${it.id}"`)).replace('<div class="gd-card-meta">',it.crop?`<div class="gd-card-meta">${GOODS[it.crop.y].e}×${it.crop.n}/${it.crop.h||24}h · `:'<div class="gd-card-meta">')).join('')}</div>`;
  }else if(tab==='crops'){
    body=`<p class="gd-note gd-note-top">${L(`Crops ripen every 24 hours. Water (✓${WATER_COST}) = 6 h sooner, fertiliser (✓${FERT_COST}) = 12 h sooner, once each per harvest.`,`作物每 24 小时成熟一次。浇水（✓${WATER_COST}）提前 6 小时，施肥（✓${FERT_COST}）提前 12 小时，每轮各一次。`)}</p><div class="gd-cards">${CATALOG.filter(x=>x.crop&&!GOODS[x.crop.y].flower).map(it=>card(it,priceBtn(it.price,`data-gd="buy" data-id="${it.id}"`)).replace('<div class="gd-card-meta">',`<div class="gd-card-meta">${GOODS[it.crop.y].e}×${it.crop.n}/24h · `)).join('')}</div>`;
  }else if(tab==='market'){
    body=marketBody();
  }else if(tab==='kitchen'){
    body=kitchenBody(false);
  }else if(tab==='fences'){
    body=`<div class="gd-cards wide">${FENCES.map(f=>{const own=G.fences.includes(f.id),cur=G.fence===f.id;const art=FENCE_ART[f.id];
      return `<div class="gd-card"><div class="gd-card-art fence" style="--gd-fh:url(&quot;data:image/svg+xml,${encodeURIComponent(art.h)}&quot;)"></div><div class="gd-card-name">${L(f.en,f.cn)}</div><div class="gd-card-meta">${cur?L('In use','使用中'):own?L('Owned','已拥有'):'&nbsp;'}</div>${cur?`<button type="button" class="gd-buy done" disabled>${L('Using','使用中')}</button>`:own?`<button type="button" class="gd-buy" data-gd="fence" data-id="${f.id}">${L('Use','使用')}</button>`:priceBtn(f.price,`data-gd="fence" data-id="${f.id}"`)}</div>`}).join('')}</div>`;
  }else if(tab==='land'){
    const rowOk=canExpand(G,'row'),colOk=canExpand(G,'col');
    const mini=(rows,cols,nr,nc)=>`<div class="gd-mini" style="--r:${rows};--c:${cols}">${Array.from({length:rows*cols},(_,i)=>{const r=Math.floor(i/cols),c=i%cols;return `<i class="${(nr&&r===rows-1)||(nc&&c===cols-1)?'new':''}"></i>`}).join('')}</div>`;
    const max=`<button type="button" class="gd-buy done" disabled>${L('Maxed out','已到最大')}</button>`;
    body=`<p class="gd-note gd-note-top">${L(`Now ${G.rows} × ${G.cols} = ${G.rows*G.cols} plots (max ${MAX_PLOTS}). To change the shape without buying land, use “Shape” above the garden.`,`现在 ${G.rows} × ${G.cols} = ${G.rows*G.cols} 格（最多 ${MAX_PLOTS} 格）。只想换形状、不加格子，用花园上方的「形状」。`)}</p><div class="gd-land-list">
      <div class="gd-land">${mini(G.rows+(rowOk?1:0),G.cols,rowOk,false)}<div><strong>${L('Add a row','加一排（横向）')}</strong><p>${L(`+${G.cols} plots.`,`增加 ${G.cols} 格。`)}</p>${rowOk?priceBtn(EXPAND_COST,'data-gd="expand" data-dir="row"',`✓ ${EXPAND_COST} · ${L('Add a row','加一排')}`):max}</div></div>
      <div class="gd-land">${mini(G.rows,G.cols+(colOk?1:0),false,colOk)}<div><strong>${L('Add a column','加一列（竖向）')}</strong><p>${L(`+${G.rows} plots.`,`增加 ${G.rows} 格。`)}</p>${colOk?priceBtn(EXPAND_COST,'data-gd="expand" data-dir="col"',`✓ ${EXPAND_COST} · ${L('Add a column','加一列')}`):max}</div></div>
    </div>`;
  }else if(tab==='custom'&&isChar){
    body=MINE.custom.length?`<p class="gd-note gd-note-top">${L('Your uploads are in this shop too. Uploading new ones happens in your own garden.','你上传的商品也会出现在这里。上传新图片请回到你自己的花园。')}</p><div class="gd-cards">${MINE.custom.map(it=>card(it,priceBtn(it.price,`data-gd="buy" data-id="${esc(it.id)}"`))).join('')}</div>`:`<p class="gd-note gd-note-top">${L('No uploads yet. Upload images from your own garden and they appear here too.','还没有上传的商品。在你自己的花园上传后，这里也能兑换。')}</p>`;
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
      ${MINE.custom.length?`<div class="gd-cards">${MINE.custom.map(it=>card(it,`<div class="gd-card-row">${priceBtn(it.price,`data-gd="buy" data-id="${esc(it.id)}"`)}<button type="button" class="gd-del" data-gd="delCustom" data-id="${esc(it.id)}" aria-label="${L('Remove product','删除商品')}">🗑</button></div>`)).join('')}</div>`:''}`;
  }
  s.innerHTML=`<div class="gd-shop-head"><div><div class="gd-label">${isChar?esc(L(`${cname().toUpperCase()}'S SHOP`,`${cname()}的商城`)):L('GARDEN SHOP','花园商城')}</div><strong>${isChar?esc(L(`Spend ${cname()}'s ✓ — as a suggestion`,`用${cname()}的 ✓ 兑换（作为建议）`)):L('Trade completed tasks for plants','用已完成事项兑换植物')}</strong></div>${!isChar?`<span class="gd-coin gd-coin-gold">🪙 ${fmt(MINE.gold||0)}</span>`:''}<span class="gd-coin" id="gdShopWallet">✓ ${fmt(available())}</span><button type="button" class="gd-icon" data-gd="shopClose" aria-label="${L('Close shop','关闭商城')}">×</button></div>
  <nav class="gd-tabs">${TABS.filter(([id])=>!(isChar&&(id==='market'||id==='kitchen'))).map(([id,en,cn])=>`<button type="button" class="${tab===id?'on':''}" data-gd="tab" data-tab="${id}">${L(en,cn)}</button>`).join('')}</nav>
  <div class="gd-shop-body">${body}</div>`;
}
/* actions from the market / kitchen panel inside Treats & Gifts; returns true when handled */
function panelAct(act,ds){
  if(act==='bq'){const k=ds.id;bq[k]=Math.max(0,Math.min(MINE.pantry[k]||0,(bq[k]||0)+Number(ds.d)));if(!bq[k])delete bq[k];return true}
  if(act==='makeBouquet'){if(!applyOp(MINE,{t:'bouquet',picks:{...bq}})){if(lastErr)say(lastErr,lastErr);return true}bq={};persistMine();celebrate();say('A bouquet! 💐','扎好了一束花 💐');if(isOpen())render();return true}
  if(act==='sell'||act==='buyfood'||act==='cook'||act==='exchange'){const id=ds.id,n=+ds.n||1;const op=act==='sell'?{t:'sell',id,n}:act==='buyfood'?{t:'buyfood',id}:act==='cook'?{t:'cook',id}:{t:'exchange',n};
    if(!applyOp(MINE,op)){if(lastErr)say(lastErr,lastErr);return true}persistMine();if(view==='mine')G=MINE;
    if(act==='cook')say(`Made ${goodName(id)}!`,`做好了${GOODS[id].e}${goodName(id)}！`);else if(act==='exchange')say(`+${n} ✓`,`换到 ${n} ✓`);else if(act==='buyfood')say(`Bought ${goodName(id)}.`,`买了${GOODS[id].e}${goodName(id)}。`);else say(`Sold for 🪙${fmt(GOODS[id].sell*n)}.`,`卖了 🪙${fmt(GOODS[id].sell*n)}。`);
    if(isOpen())render();return true}
  return false;
}
function celebrate(){try{confetti()}catch{}}
const suggested=()=>view==='char'?L(' (suggestion)','（建议）'):'';
function buy(id){
  const it=item(id);if(!it||!doOp({t:'buy',id}))return;
  if(view==='mine')celebrate();
  say(`${itemName(it)} added to the bag${suggested()}.`,`${itemName(it)} 已放入背包${suggested()}。`);render();renderShop();
}
function buyFence(id){if(doOp({t:'fence',id})){if(view==='mine')celebrate();render();renderShop()}}
function expand(dir){
  if(!doOp({t:'expand',dir}))return;
  if(view==='mine')celebrate();
  say(dir==='col'?`The garden grew by one column${suggested()}.`:`The garden grew by one row${suggested()}.`,dir==='col'?`花园扩建了一列${suggested()}。`:`花园扩建了一排${suggested()}。`);render();renderShop();
}

/* ---------- custom uploads (your garden only) ---------- */
function onChange(e){
  if(e.target.id==='gdShape'){const [r,c]=e.target.value.split('x').map(Number);if(doOp({t:'shape',rows:r,cols:c})){sel={inv:null,cell:null};if(view==='char')say('Shape change added as a suggestion.','形状修改已作为建议。')}render();return}
  if(e.target.id==='gdPeriod'){const v=e.target.value;MINE.period=v;MINE.periodKey=periodKey(v);CHARB.periodKey=periodKey(v);persistMine();persistChar(false);render();say(v==='none'?'Your gardens keep growing — no reset.':`A fresh garden every ${v}. What’s planted now stays until the ${v} ends.`,v==='none'?'花园会一直保留，不再换新。':`每${v==='week'?'周':'月'}一个新花园。现在种的会保留到本${v==='week'?'周':'月'}结束，之后进相册。`);return}
  if(e.target.matches('[data-gd-auto]')){CHARB.autoPlant=e.target.checked;persistChar();renderSocial();return}
  if(e.target.matches('[data-gd-visits]')){MINE.allowVisits=e.target.checked;if(!MINE.allowVisits)MINE.visit=null;persistMine();render();if(MINE.allowVisits)say(`${cname()} may drop by now and then.`,`${cname()}偶尔会过来看看。`);return}
  if(e.target.matches('[data-visit-op]')){renderVisitPreview();return}
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
  if(e.target.id==='gdZoom'){zoom=Number(e.target.value)||72;root.querySelector('#gdPlot')?.style.setProperty('--gd-cell',zoom+'px');try{localStorage.setItem(ZOOM_KEY,String(zoom))}catch{}return}
  if(!['gdPrice','gdName'].includes(e.target.id))return;if(!uploadDraft)uploadDraft={img:'',name:'',tall:false,price:5};
  if(e.target.id==='gdName')uploadDraft.name=e.target.value.slice(0,24);
  if(e.target.id==='gdPrice'){const p=Number(e.target.value);uploadDraft.price=p;root.querySelector('#gdPriceVal').textContent=`✓ ${p}`;const b=root.querySelector('[data-gd="upload"]');if(b){b.textContent=`✓ ${p} · ${L('Upload & add','上传并兑换')}`;b.classList.toggle('poor',available()<p)}}
}
document.addEventListener('click',e=>{const b=e.target.closest('#gardenRoot .gd-seg [data-size]');if(!b)return;if(!uploadDraft)uploadDraft={img:'',name:$name(),tall:false,price:5};uploadDraft.tall=b.dataset.size==='tall';renderShop()});
function confirmUpload(){
  if(view!=='mine')return;
  const d=uploadDraft;if(!d||!d.img)return say('Choose an image first.','请先选择图片。');
  if(MINE.custom.length>=CUSTOM_LIMIT)return say(`You can keep up to ${CUSTOM_LIMIT} uploads.`,`最多保存 ${CUSTOM_LIMIT} 个自定义商品。`);
  const name=(d.name||$name()).trim()||L('My plant','我的植物');
  if(!charge(MINE,d.price)){say(lastErr,lastErr);return}
  const it={id:'u_'+uid(),custom:true,name,img:d.img,tall:!!d.tall,price:d.price,cat:'custom'};
  MINE.custom.push(it);MINE.inv[it.id]=(MINE.inv[it.id]||0)+1;uploadDraft=null;persistMine();celebrate();
  say(`${name} is now in the shop and in your bag.`,`${name} 已上架商城并放入背包。`);render();renderShop();
}
function deleteCustom(id){
  const it=MINE.custom.find(x=>x.id===id);if(!it)return;
  const n=(MINE.inv[id]||0)+Object.values(MINE.cells).filter(c=>c&&c.item===id).length;
  if(!confirm(L(`Remove “${it.name}” from the shop?${n?` The ${n} you own will also disappear (no refund).`:''}`,`从商城删除「${it.name}」？${n?`你拥有的 ${n} 株也会一起消失（不退还）。`:''}`)))return;
  MINE.custom=MINE.custom.filter(x=>x.id!==id);
  for(const S of [MINE,CHARB]){delete S.inv[id];for(const k of Object.keys(S.cells))if(S.cells[k]?.item===id)delete S.cells[k]}
  if(sel.inv===id)sel.inv=null;persistMine();persistChar();recompute();render();renderShop();
}

/* ---------- sheets: borrow & send suggestions ---------- */
function openSheet(kind){closeShop();sheet=kind;const s=root.querySelector('#gdSheet');s.classList.remove('hidden');requestAnimationFrame(()=>s.classList.add('open'));renderSheet()}
function closeSheet(){sheet='';const s=root&&root.querySelector('#gdSheet');if(!s)return;s.classList.remove('open');setTimeout(()=>{if(!sheet)s.classList.add('hidden')},220)}
function sheetHead(label,title){return `<div class="gd-shop-head"><div><div class="gd-label">${label}</div><strong>${title}</strong></div><button type="button" class="gd-icon" data-gd="sheetClose" aria-label="${L('Close','关闭')}">×</button></div>`}
function renderSheet(){
  const s=root.querySelector('#gdSheet'),nm=esc(cname());
  if(sheet==='borrow'){
    const cAvail=availOf(CHARB),max=Math.max(1,Math.min(20,Math.floor(cAvail))),hist=MINE.loans.slice(-6).reverse();
    const prev=Number(root.querySelector('#gdAmt')?.value)||Math.min(3,max);
    s.innerHTML=sheetHead(L('BORROW','借 ✓'),L(`Borrow ✓ from ${nm}`,`向${nm}借 ✓`))+`<div class="gd-shop-body gd-form">
      <div class="gd-stats"><span>${esc(cemoji())} ${L(`${nm} has`,`${nm}有`)} <b>✓ ${fmt(cAvail)}</b></span><span>${L('You have','你有')} <b>✓ ${fmt(availOf(MINE))}</b></span>${debt()>0?`<span>${L('You owe','你欠')} <b>✓ ${fmt(debt())}</b></span>`:''}</div>
      <div class="gd-amount"><span>${L('How many','借多少')}</span><button type="button" class="gd-icon" data-gd="borrowStep" data-d="-1">−</button><strong id="gdAmtVal">${Math.min(prev,max)}</strong><button type="button" class="gd-icon" data-gd="borrowStep" data-d="1">＋</button><input id="gdAmt" type="hidden" value="${Math.min(prev,max)}" max="${max}"></div>
      <label class="gd-field">${L('Say something (optional)','想说点什么（可选）')}<textarea id="gdMsg" rows="2" maxlength="200" placeholder="${L('e.g. I really want that Christmas tree…','比如：我真的很想要那棵圣诞树……')}"></textarea></label>
      <label class="gd-toggle"><input id="gdRepay" type="checkbox" ${MINE.repayOn?'checked':''}><span><b>${L('I’ll pay it back','借了要还')}</b><small>${L(`On: your next finished tasks pay ${nm} back first. Off: it’s a gift from ${nm}.`,`打开：你之后完成的任务会先自动还给${nm}。关闭：相当于${nm}送你的。`)}</small></span></label>
      <button type="button" class="gd-buy gd-wide" data-gd="borrowSend"${busy||cAvail<1?' disabled':''}>${cAvail<1?L(`${nm} has no ✓ to lend`,`${nm}现在没有 ✓ 可以借`):L(`Ask ${nm}`,`问问${nm}`)}</button>
      ${hist.length?`<div class="gd-hist"><div class="gd-label">${L('HISTORY','记录')}</div>${hist.map(l=>`<div class="gd-hist-row"><span>${new Date(l.at).toLocaleDateString(uiLocale(),{month:'short',day:'numeric'})}</span><span>${l.amount?L(`lent ${l.amount}/${l.asked}`,`借到 ${l.amount}/${l.asked}`):L(`refused (${l.asked})`,`拒绝了（${l.asked}）`)}${l.amount?(l.repay?` · ${L('repaid','已还')} ${fmt(l.repaid)}/${l.amount}`:` · ${L('gift','送的')}`):''}</span>${l.reply?`<small>“${esc(l.reply)}”</small>`:''}</div>`).join('')}</div>`:''}
    </div>`;
  }else if(sheet==='visit'){
    const v=MINE.visit;if(!v){closeSheet();return}
    if(v.kind==='borrow'){
      s.innerHTML=sheetHead(L('VISIT','来访'),L(`${nm} wants to borrow ✓ ${v.amount}`,`${nm}想借 ✓ ${v.amount}`))+`<div class="gd-shop-body gd-form">
        ${v.say?`<div class="gd-quote"><span class="gd-ava">${esc(cemoji())}</span><p>${esc(v.say)}</p></div>`:''}
        <div class="gd-stats"><span>${L('You have','你有')} <b>✓ ${fmt(availOf(MINE))}</b></span><span>${esc(cemoji())} ${nm} <b>✓ ${fmt(availOf(CHARB))}</b></span><span>${v.repay?L('Will pay back from their next plans','之后完成的日程会先还你'):L('Asks it as a gift','想让你送')}</span></div>
        <div class="gd-row2"><button type="button" class="gd-buy gd-wide" data-gd="visitAccept"${busy||availOf(MINE)<1?' disabled':''}>${L(`Lend ✓ ${Math.min(v.amount,Math.floor(availOf(MINE)))}`,`借给${nm} ✓ ${Math.min(v.amount,Math.floor(availOf(MINE)))}`)}</button><button type="button" class="gd-btn gd-wide" data-gd="visitDecline"${busy?' disabled':''}>${L('Not this time','不借')}</button></div>
      </div>`;
    }else{
      s.innerHTML=sheetHead(L('VISIT','来访'),L(`${nm}'s suggestions for your garden`,`${nm}给你花园的建议`))+`<div class="gd-shop-body gd-form">
        ${v.say?`<div class="gd-quote"><span class="gd-ava">${esc(cemoji())}</span><p>${esc(v.say)}</p></div>`:''}
        <div class="gd-visit-grid"><ol class="gd-ops gd-checks">${v.ops.map((o,i)=>`<li><label><input type="checkbox" data-visit-op="${i}" checked> ${esc(opTextHuman(o))}</label></li>`).join('')}</ol><div class="gd-preview"><div class="gd-label">${L('PREVIEW','预览')}</div><div id="gdVisitPreview"></div></div></div>
        <div class="gd-row2"><button type="button" class="gd-buy gd-wide" data-gd="visitAccept"${busy?' disabled':''}>${L('Accept selected','接受勾选的')}</button><button type="button" class="gd-btn gd-wide" data-gd="visitDecline"${busy?' disabled':''}>${L('Keep mine as is','都不要')}</button></div>
      </div>`;
      renderVisitPreview();
    }
  }else if(sheet==='album'||sheet==='albumView'){
    const S=view==='char'?CHARB:MINE,list=[...S.archives].reverse(),title=view==='char'?L(`${cname()}'s album`,`${cname()}的相册`):L('Garden album','花园相册');
    if(sheet==='albumView'){const a=S.archives.find(x=>x.id===albumId);if(!a){sheet='album';return renderSheet()}
      const w=Math.min(window.innerWidth,760)-60,cell=Math.max(18,Math.min(64,Math.floor(w/a.cols)));
      s.innerHTML=sheetHead(L('ALBUM','相册'),esc(periodLabel(a.id)))+`<div class="gd-shop-body"><button type="button" class="gd-btn" data-gd="album">← ${L('All seasons','全部')}</button><div class="gd-album-big">${staticPlot(a,cell)}</div></div>`;
    }else{
      s.innerHTML=sheetHead(L('ALBUM','相册'),esc(title))+`<div class="gd-shop-body">${list.length?`<div class="gd-album">${list.map(a=>{const cell=Math.max(8,Math.floor(220/a.cols));return `<button type="button" class="gd-album-card" data-gd="albumView" data-id="${esc(a.id)}">${staticPlot(a,cell)}<strong>${esc(periodLabel(a.id))}</strong><small>${L(`${Object.keys(a.cells).length} planted`,`种了 ${Object.keys(a.cells).length} 样`)}</small></button>`}).join('')}</div>`:`<p class="gd-note gd-note-top">${MINE.period==='none'?L('Turn on “New garden: every week / month” above the garden. When a season ends, what was planted is saved here and a fresh plot starts.','在花园上方把「换新花园」设成每周或每月。每期结束时，种的东西会存到这里，然后开始一片新的空地。'):L('Nothing here yet — your first season is still growing.','还没有——第一期还在种。')}</p>`}</div>`;
    }
  }else if(sheet==='suggest'){
    s.innerHTML=sheetHead(L('SUGGESTIONS','修改建议'),L(`Send ${OPS.length} change${OPS.length>1?'s':''} to ${nm}`,`把 ${OPS.length} 条修改发给${nm}`))+`<div class="gd-shop-body gd-form">
      <ol class="gd-ops">${OPS.map(o=>`<li>${esc(opTextHuman(o))}</li>`).join('')}</ol>
      <label class="gd-field">${L('A note (optional)','附一句话（可选）')}<textarea id="gdNote" rows="2" maxlength="200" placeholder="${L('e.g. The pond would look nicer in front!','比如：池塘放前面更好看！')}"></textarea></label>
      <button type="button" class="gd-buy gd-wide" data-gd="suggestSend"${busy?' disabled':''}>${L(`Send to ${nm}`,`发送给${nm}`)}</button>
    </div>`;
  }
}
function staticPlot(a,cell){
  const f=FENCE_ART[a.fence]||FENCE_ART.wood,ft=Math.max(6,Math.round(cell*.33));let h='',p='';
  for(let r=0;r<a.rows;r++)for(let c=0;c<a.cols;c++){h+=`<div class="gd-cell${(r+c)%2?' alt':''}"></div>`;const v=a.cells[`${r},${c}`],it=v&&item(v.item);if(it)p+=`<div class="gd-slot" style="grid-row:${r+1};grid-column:${c+1};z-index:${it.ground?1:r*2+10}"><div class="gd-item${it.tall?' tall':''}${it.ground?' ground':''}${v.flip?' flip':''}">${artHtml(it)}</div></div>`}
  return `<div class="gd-plot gd-static" data-fence="${esc(a.fence)}" style="--gd-ft:${ft}px;--gd-cell:${cell}px;--gd-cols:${a.cols};--gd-rows:${a.rows};--gd-fh:url(&quot;data:image/svg+xml,${encodeURIComponent(f.h)}&quot;);--gd-fv:url(&quot;data:image/svg+xml,${encodeURIComponent(f.v)}&quot;)"><div class="gd-fence gd-fence-top"></div><div class="gd-fence gd-fence-left"></div><div class="gd-fence gd-fence-right"></div><div class="gd-grid" style="--gd-cols:${a.cols}">${h}</div><div class="gd-items" style="--gd-cols:${a.cols};--gd-rows:${a.rows}">${p}</div><div class="gd-fence gd-fence-bottom"></div></div>`;
}
function renderVisitPreview(){
  const box=root.querySelector('#gdVisitPreview'),v=MINE.visit;if(!box||!v)return;
  const picks=new Set([...root.querySelectorAll('[data-visit-op]')].filter(x=>x.checked).map(x=>+x.dataset.visitOp));
  const t=clone(MINE);v.ops.forEach((op,i)=>{if(picks.has(i))applyOp(t,op)});
  box.innerHTML=staticPlot(t,Math.max(10,Math.floor(Math.min(320,window.innerWidth-80)/t.cols)));
}
function opTextHuman(op){
  const nm=id=>itemName(item(id)),cell=k=>{const [r,c]=String(k).split(',');return L(`row ${+r+1}, col ${+c+1}`,`第 ${+r+1} 排第 ${+c+1} 列`)};
  switch(op.t){
    case 'buy':return L(`Buy ${nm(op.id)} (✓ ${item(op.id)?.price})`,`兑换 ${nm(op.id)}（✓ ${item(op.id)?.price}）`);
    case 'place':return L(`Plant ${nm(op.id)} at ${cell(op.to)}`,`把 ${nm(op.id)} 种在${cell(op.to)}`);
    case 'move':return L(`Move ${cell(op.from)} → ${cell(op.to)}`,`把${cell(op.from)}的东西移到${cell(op.to)}`);
    case 'store':return L(`Put ${cell(op.at)} back in the bag`,`把${cell(op.at)}的东西收回背包`);
    case 'flip':return L(`Flip ${cell(op.at)}`,`翻转${cell(op.at)}`);
    case 'fence':{const f=FENCES.find(x=>x.id===op.id);return L(`Use the ${f?.en||op.id}`,`换成${f?.cn||op.id}`)}
    case 'expand':return op.dir==='col'?L(`Add a column (✓ ${EXPAND_COST})`,`加一列（✓ ${EXPAND_COST}）`):L(`Add a row (✓ ${EXPAND_COST})`,`加一排（✓ ${EXPAND_COST}）`);
    case 'shape':return L(`Reshape the garden to ${op.rows} × ${op.cols} (same plots)`,`把花园改成 ${op.rows} 排 × ${op.cols} 列（格子数不变）`);
  }
  return op.t;
}
function setBusy(text){busy=text;if(isOpen()){renderSocial();renderSay();if(sheet)renderSheet()}}
function speak(text,note){bubble={text,note};busy='';if(isOpen())render()}
async function sendBorrow(){
  const amount=Math.max(1,Number(root.querySelector('#gdAmt')?.value)||1),msg=(root.querySelector('#gdMsg')?.value||'').trim().slice(0,200),repay=!!root.querySelector('#gdRepay')?.checked;
  MINE.repayOn=repay;
  const ctx={amount,msg,repay,charAvail:availOf(CHARB),myAvail:availOf(MINE),debt:debt(),history:MINE.loans.slice(-5)};
  closeSheet();setBusy(L('thinking','正在想'));
  logChat('user',L(`🤝 Can I borrow ✓ ${amount}?${msg?` ${msg}`:''}`,`🤝 能借我 ✓ ${amount} 吗？${msg?` ${msg}`:''}`),repay?L('I’ll pay it back','会还'):L('as a gift','当作送我'));
  let res;
  try{res=await Char.decideLoan(ctx)}catch(e){busy='';bubble={text:failMsg(e)};logChat('char',failMsg(e));render();return}
  const granted=Math.max(0,Math.min(res.amount|0,Math.floor(availOf(CHARB))));
  MINE.loans.push({id:uid(),at:Date.now(),asked:amount,amount:granted,repay,repaid:0,msg,reply:res.reply||''});
  persistMine();recompute();
  if(granted)celebrate();
  logChat('char',res.reply||'',granted?L(`lent you ✓ ${granted}`,`借给你 ✓ ${granted}`):L('declined','没借'));
  speak(res.reply||'',granted?L(`+✓ ${granted} from ${cname()}${repay?' · to pay back':' · a gift'}`,`${cname()}给了你 ✓ ${granted}${repay?' · 之后要还':' · 送你的'}`):L('Request declined.','没有借给你。'));
}
function repayNow(){
  const n=Math.min(Math.floor(availOf(MINE)),Math.ceil(debt()));if(n<=0)return;
  const paid=repayFrom(Math.min(n,debt()));if(!paid)return;
  persistMine();recompute();
  say(`Paid ${cname()} back ✓ ${fmt(paid)}.`,`还给${cname()} ✓ ${fmt(paid)}。`);render();
}
function resolveId(x){x=String(x||'').trim();if(item(x))return x;const lx=x.toLowerCase();const hit=[...CATALOG,...MINE.custom].find(i=>[i.en,i.cn,i.name].filter(Boolean).some(n=>String(n).toLowerCase()===lx));return hit?hit.id:''}
/* The AI always sees positions counted from 1 (row 1 = back), like a person would; we store them from 0. */
const toAI=k=>{const [r,c]=String(k).split(',').map(Number);return `${r+1},${c+1}`};
function cellKey(v){let a,b;if(Array.isArray(v)){a=+v[0];b=+v[1]}else{const m=/(\d+)\D+(\d+)/.exec(String(v||''));if(!m)return '';a=+m[1];b=+m[2]}if(!(a>=1&&b>=1))return '';return `${a-1},${b-1}`}
function decorateCtx(S=CHARB){
  const empty=[];for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++)if(!S.cells[`${r},${c}`])empty.push(toAI(`${r},${c}`));
  return {avail:availOf(S),rows:S.rows,cols:S.cols,expandCost:EXPAND_COST,
    catalog:[...CATALOG,...MINE.custom].map(i=>({id:i.id,name:itemName(i),price:i.price,kind:(i.crop?`crop: gives ${i.crop.n} ${GOODS[i.crop.y].en} every 24h, `:'')+(i.tall?'tree':i.ground?'ground decor':(i.cat==='decor'?'decor':'plant'))})),
    fences:FENCES.map(f=>({id:f.id,name:L(f.en,f.cn),price:f.price,owned:S.fences.includes(f.id)})),fence:S.fence,inv:{...S.inv},
    placed:Object.entries(S.cells).map(([at,c])=>({at:toAI(at),id:c.item,name:itemName(item(c.item))})),empty};
}
function opTextAI(op){
  const nm=id=>{const it=item(id);return it?(it.custom?it.name:it.en):id},cell=k=>`row ${+k.split(',')[0]+1} col ${+k.split(',')[1]+1}`;
  switch(op.t){
    case 'buy':return `buy ${nm(op.id)} (${item(op.id)?.price} ✓)`;
    case 'place':return `plant ${nm(op.id)} at ${cell(op.to)}`;
    case 'move':return `move what is at ${cell(op.from)} to ${cell(op.to)}`;
    case 'store':return `put what is at ${cell(op.at)} back in the bag`;
    case 'flip':return `flip what is at ${cell(op.at)}`;
    case 'fence':return `switch the fence to ${FENCES.find(f=>f.id===op.id)?.en||op.id}`;
    case 'expand':return op.dir==='col'?`add a column (${EXPAND_COST} ✓)`:`add a row (${EXPAND_COST} ✓)`;
    case 'shape':return `reshape to ${op.rows} rows × ${op.cols} columns (same number of plots)`;
  }
  return op.t;
}
/* turn an AI plan into ops for a garden (used for suggestions to YOUR garden) */
function planToOps(plan){
  const ops=[];if(!plan)return ops;
  for(const b of (plan.buy||[]).slice(0,10)){const id=resolveId(b);if(id)ops.push({t:'buy',id})}
  for(const p of (plan.place||[]).slice(0,20)){const id=resolveId(p&&(p.id||p.item)),to=cellKey(p&&(p.to||p.cell||p.at));if(id&&to)ops.push({t:'place',id,to})}
  for(const m of (plan.move||[]).slice(0,20)){const from=cellKey(m&&m.from),to=cellKey(m&&m.to);if(from&&to)ops.push({t:'move',from,to})}
  return ops;
}
function logChat(role,text,note=''){if(!text&&!note)return;CHAT.msgs.push({id:uid(),role,text:text||'…',note,at:Date.now()});saveChat();if(isOpen()&&chatOpen)renderChat()}
function applyPlan(plan){
  const S=CHARB;let n=0,bought=0;const run=op=>{if(applyOp(S,op)){if(op.t==='buy')bought++;else n++}};
  if(!plan)return 0;
  if(plan.expand==='row'||plan.expand==='col')run({t:'expand',dir:plan.expand});
  if(plan.fence&&FENCES.some(f=>f.id===plan.fence)&&plan.fence!==S.fence)run({t:'fence',id:plan.fence});
  for(const b of (plan.buy||[]).slice(0,20)){const id=resolveId(b);if(id)run({t:'buy',id})}
  for(const p of (plan.place||[]).slice(0,40)){const id=resolveId(p&&(p.id||p.item)),to=cellKey(p&&(p.to||p.cell||p.at));if(id&&to)run({t:'place',id,to})}
  for(const m of (plan.move||[]).slice(0,20)){const from=cellKey(m&&m.from),to=cellKey(m&&m.to);if(from&&to)run({t:'move',from,to})}
  return n||bought;
}
const failMsg=e=>L(`(Couldn’t reach ${cname()}: ${e.message})`,`（联系不上${cname()}：${e.message}）`);
async function letDecorate(){
  if(busy)return;setBusy(L('decorating','正在布置'));
  let plan;
  try{plan=await Char.decorate(decorateCtx())}catch(e){busy='';bubble={text:failMsg(e)};render();return}
  const n=applyPlan(plan);
  persistChar(n>0);recompute();
  logChat('char',plan.say||'',n?L(`decorated · ${n} change${n>1?'s':''}`,`布置了花园 · ${n} 处改动`):'');
  speak(plan.say||'',n?L(`${cname()} made ${n} change${n>1?'s':''}.`,`${cname()}做了 ${n} 处改动。`):L('Nothing changed.','没有改动。'));
}
/* the character tends their garden by themselves once a day when they have ✓ to spare */
let autoRunning=false;
async function maybeAutoPlant(){
  let mode='';try{mode=Char.mode()}catch{}
  if(!mode||!CHARB.autoPlant||autoRunning||busy)return;
  const today=ymd(new Date());if(CHARB.lastAuto===today||new Date().getHours()<8)return;
  reconcileChar();if(availOf(CHARB)<2)return;
  autoRunning=true;CHARB.lastAuto=today;persistChar(false);
  try{
    const plan=await Char.decorate({...decorateCtx(),auto:true});
    const n=applyPlan(plan);
    if(n){CHARB.news={text:plan.say||'',note:L(`${cname()} tended the garden on their own · ${n} change${n>1?'s':''}`,`${cname()}自己打理了花园 · ${n} 处改动`),at:Date.now(),seen:false};persistChar(true);recompute();logChat('char',plan.say||'',CHARB.news.note)}
    if(isOpen()){if(view==='char')showNews();render()}
  }catch(e){console.warn('auto plant failed',e)}
  finally{autoRunning=false}
}
/* the character visits YOUR garden now and then (only if you allow it) */
let visitRunning=false;
async function maybeVisit(force=false){
  let mode='';try{mode=Char.mode()}catch{}
  if(!mode||!MINE.allowVisits||visitRunning||busy||MINE.visit)return;
  const today=ymd(new Date());
  if(!force){if(MINE.lastVisitCheck===today||new Date().getHours()<10)return;MINE.lastVisitCheck=today;persistMine(false);if(Math.random()>.45)return}
  visitRunning=true;
  try{
    reconcileChar();const dc=decorateCtx(MINE);
    const res=await Char.visit({myGarden:{...dc,avail:availOf(MINE)},myAvail:availOf(MINE),charAvail:availOf(CHARB),charDebt:charDebt(),myDebt:debt()});
    let v=null;
    if(res.kind==='suggest'){const ops=planToOps(res.suggest);if(ops.length)v={kind:'suggest',ops}}
    else if(res.kind==='borrow'){const amount=Math.min(res.amount,Math.floor(availOf(MINE)));if(amount>=1)v={kind:'borrow',amount,repay:res.repay}}
    if(v){MINE.visit={id:uid(),at:Date.now(),ops:[],amount:0,repay:true,...v,say:res.say||''};persistMine();logChat('char',res.say||'',v.kind==='borrow'?L(`visited your garden · wants to borrow ✓ ${v.amount}${v.repay?' (will pay back)':''}`,`来了你的花园 · 想借 ✓ ${v.amount}${v.repay?'（会还）':''}`):L(`visited your garden · ${v.ops.length} suggestion${v.ops.length>1?'s':''}`,`来了你的花园 · 留了 ${v.ops.length} 条建议`))}
    if(isOpen())render();
  }catch(e){console.warn('visit failed',e)}
  finally{visitRunning=false}
}
async function resolveVisit(accept){
  const v=MINE.visit;if(!v||busy)return;
  let accepted=0,total=1,declinedText='';
  if(v.kind==='borrow'){
    const amount=Math.min(v.amount,Math.floor(availOf(MINE)));
    if(accept&&amount>=1){MINE.loans.push({id:uid(),at:Date.now(),asked:v.amount,amount,dir:'out',repay:v.repay,repaid:0,msg:'',reply:v.say});accepted=1;logChat('user',L(`Sure — here’s ✓ ${amount}.`,`好，借你 ✓ ${amount}。`),v.repay?L(`${cname()} will pay it back from their next plans`,`${cname()}之后完成的日程会先还给你`):'')}
    else logChat('user',L('Sorry, not this time.','这次不借了。'));
  }else{
    const picks=accept===false?[]:[...root.querySelectorAll('[data-visit-op]')].filter(x=>x.checked).map(x=>+x.dataset.visitOp);
    total=v.ops.length;const set=new Set(picks);
    v.ops.forEach((op,i)=>{if(set.has(i)&&applyOp(MINE,op))accepted++});
    declinedText=v.ops.filter((_,i)=>!set.has(i)).map(opTextAI).join('; ');
    logChat('user',accepted?L(`I took ${accepted} of your ${total} suggestions.`,`你的 ${total} 条建议我采纳了 ${accepted} 条。`):L('I’ll keep my garden as it is.','我还是保持原样吧。'));
  }
  MINE.visit=null;persistMine();recompute();closeSheet();
  setBusy(L('thinking','正在想'));
  let reply='';try{reply=await Char.react({kind:v.kind,accepted,total,amount:v.amount,declinedText})}catch(e){reply=failMsg(e)}
  logChat('char',reply);speak(reply,'');
}

function showNews(){if(CHARB.news&&!CHARB.news.seen){bubble={text:CHARB.news.text,note:CHARB.news.note};CHARB.news.seen=true;persistChar(false)}}

/* ---------- chat ---------- */
let chatOpen=false,albumId='';
function openChat(){chatOpen=true;const c=root.querySelector('#gdChat');c.classList.remove('hidden');root.classList.add('chat-open');requestAnimationFrame(()=>c.classList.add('open'));renderChat();setTimeout(()=>root.querySelector('#gdChatInput')?.focus(),50)}
function closeChat(){if(!root)return;chatOpen=false;const c=root.querySelector('#gdChat');root.classList.remove('chat-open');if(!c)return;c.classList.remove('open');setTimeout(()=>{if(!chatOpen)c.classList.add('hidden')},220)}
function renderChat(){
  const c=root.querySelector('#gdChat'),nm=esc(cname()),draft=root.querySelector('#gdChatInput')?.value||'';
  let ai=false;try{ai=Char.hasAI()}catch{}
  c.innerHTML=`<div class="gd-chat-head"><span class="gd-ava">${esc(cemoji())}</span><div><strong>${nm}</strong><small>${ai?L('in character · uses your Garden API','按人设回复 · 使用 Garden 的 API'):L('no API — simple replies','未配置 API · 简单回复')}</small></div><button type="button" class="gd-icon" data-gd="chatClose" aria-label="${L('Close chat','关闭聊天')}">×</button></div>
  <div class="gd-chat-log" id="gdChatLog">${CHAT.msgs.length?'':`<p class="gd-chat-empty">${L(`Try: “Want to plant something now?”, “Put a tree in the back row”, or “Can I borrow 2 ✓?”`,`试试：“现在想种点什么吗？”“在后排种棵树吧”或者“能借我 2 个 ✓ 吗？”`)}</p>`}${CHAT.msgs.slice(-60).map(m=>`<div class="gd-msg ${m.role==='user'?'me':'them'}"><p>${esc(m.text)}</p>${m.note?`<small>${esc(m.note)}</small>`:''}</div>`).join('')}${busy?`<div class="gd-msg them"><p class="gd-typing"><i></i><i></i><i></i></p></div>`:''}</div>
  <div class="gd-chat-input"><textarea id="gdChatInput" rows="1" maxlength="400" placeholder="${L(`Message ${nm}…`,`给${nm}发消息…`)}">${esc(draft)}</textarea><button type="button" class="gd-btn gd-btn-primary" data-gd="chatSend"${busy?' disabled':''}>${L('Send','发送')}</button></div>`;
  const log=c.querySelector('#gdChatLog');log.scrollTop=log.scrollHeight;
  const ta=c.querySelector('#gdChatInput');ta.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendChat()}};
}
async function sendChat(){
  const ta=root.querySelector('#gdChatInput'),text=(ta?.value||'').trim();if(!text||busy)return;
  ta.value='';
  CHAT.msgs.push({id:uid(),role:'user',text,at:Date.now()});saveChat();
  busy=L('typing','正在输入');renderChat();renderSocial();renderSay();
  const ctx={message:text,history:CHAT.msgs.slice(-13,-1),where:view,garden:decorateCtx(CHARB),myGarden:{...decorateCtx(MINE),avail:availOf(MINE)},myAvail:availOf(MINE),debt:debt(),repay:MINE.repayOn};
  let res;
  try{res=await Char.chat(ctx)}catch(e){busy='';CHAT.msgs.push({id:uid(),role:'char',text:failMsg(e),at:Date.now()});saveChat(false);render();return}
  const notes=[];
  const n=res.actions?applyPlan(res.actions):0;if(n){notes.push(L(`${n} change${n>1?'s':''} in the garden`,`花园里有 ${n} 处改动`));persistChar(true)}
  const lend=Math.min(res.lend|0,Math.floor(availOf(CHARB)));
  if(lend>0){MINE.loans.push({id:uid(),at:Date.now(),asked:lend,amount:lend,repay:MINE.repayOn,repaid:0,msg:text,reply:res.reply||''});persistMine();notes.push(L(`lent you ✓ ${lend}${MINE.repayOn?' (to pay back)':' (gift)'}`,`借给你 ✓ ${lend}${MINE.repayOn?'（要还）':'（送你）'}`));celebrate()}
  else if((res.lend|0)>0)notes.push(L(`${cname()} has no ✓ to spare — nothing was lent`,`${cname()}没有多余的 ✓，实际没借成`));
  const sops=planToOps(res.suggest);
  if(sops.length){MINE.visit={id:uid(),at:Date.now(),kind:'suggest',ops:sops,amount:0,repay:true,say:res.reply||''};persistMine();notes.push(L(`left ${sops.length} suggestion${sops.length>1?'s':''} for your garden`,`给你的花园留了 ${sops.length} 条建议`))}
  busy='';recompute();
  CHAT.msgs.push({id:uid(),role:'char',text:res.reply||'…',note:notes.join(' · '),at:Date.now()});saveChat();
  render();
}
async function sendSuggestions(){
  if(!OPS.length||busy)return;
  const note=(root.querySelector('#gdNote')?.value||'').trim().slice(0,200);
  const ops=[...OPS];closeSheet();setBusy(L('looking at your suggestions','正在看你的建议'));
  logChat('user',`📝 ${L('Suggestions for your garden','给你花园的建议')}：\n${ops.map((o,i)=>`${i+1}. ${opTextHuman(o)}`).join('\n')}${note?`\n${note}`:''}`);
  let res;
  const dc=decorateCtx(CHARB);
  const ctx={avail:availOf(CHARB),rows:CHARB.rows,cols:CHARB.cols,placed:dc.placed,empty:dc.empty,ops:ops.map(opTextAI),msg:note};
  try{res=await Char.review(ctx)}catch(e){busy='';bubble={text:failMsg(e)};logChat('char',failMsg(e));render();return}
  const acc=new Set(res.accepted);let n=0;
  ops.forEach((op,i)=>{if(acc.has(i)&&applyOp(CHARB,op))n++});
  OPS=[];saveOps();persistChar(n>0);recompute();sel={inv:null,cell:null};
  logChat('char',res.reply||'',L(`accepted ${n} of ${ops.length}`,`接受了 ${n}/${ops.length} 条`));
  speak(res.reply||'',L(`${cname()} accepted ${n} of ${ops.length}.`,`${cname()}接受了 ${n}/${ops.length} 条。`));
}

/* ---------- hooks into the app ---------- */
document.addEventListener('dragstart',e=>{if(root&&root.contains(e.target))e.preventDefault()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){onPointerCancel();return}if(e.key==='Escape'&&isOpen()){if(sheet)closeSheet();else if(shopOpen)closeShop();else if(chatOpen)closeChat();else closeGarden()}});
try{const _ra=renderAll;renderAll=function(){_ra.apply(this,arguments);try{reconcileMine()}catch(err){console.error(err)}}}catch{}
try{const _rl=renderLoki;renderLoki=function(){_rl.apply(this,arguments);try{reconcileChar();if(isOpen())render()}catch(err){console.error(err)}}}catch{}
try{const _collect=collectGardenState;collectGardenState=async function(){const s=await _collect.apply(this,arguments);s.garden=MINE;s.charGarden=CHARB;s.charChat=CHAT;return s}}catch{}
try{const _apply=applyCloudState;applyCloudState=async function(state){
  let pushBack=false;
  if(state&&typeof state==='object'){
    for(const [field,key,kind] of [['garden',GARDEN_KEY,'mine'],['charGarden',CHAR_KEY,'char']]){
      const local=kind==='mine'?MINE:CHARB,remote=state[field]&&typeof state[field]==='object'?state[field]:null;
      if(remote){
        const merged=mergeGardens(local,remote,kind);
        if(hasContent(local)&&merged.editedAt>local.editedAt&&!sameGarden(local,merged))try{localStorage.setItem(key+'-backup',JSON.stringify(local))}catch{}
        if(!sameGarden(merged,remote))pushBack=true;
        if(kind==='mine')MINE=merged;else CHARB=merged;saveRaw(key,merged);
      }else if(hasContent(local)||Object.keys(local.earnedMap||{}).length)pushBack=true;
    }
    if(state.charChat&&Array.isArray(state.charChat.msgs)){const m=mergeChat(CHAT,state.charChat);if(m.msgs.length!==state.charChat.msgs.length)pushBack=true;CHAT=m;saveChat(false)}else if(CHAT.msgs.length)pushBack=true;
    recompute();
  }
  await _apply.apply(this,arguments);
  checkSeasons();if(isOpen()&&chatOpen)renderChat();
  if(isOpen())render();
  if(pushBack)setTimeout(()=>{try{uploadGardenState().catch(console.error)}catch{}},400);
}}catch{}
function injectMenuItem(){
  const body=document.querySelector('#sidebarBody');if(!body||body.querySelector('#sbGarden'))return;
  const b=document.createElement('button');b.id='sbGarden';b.type='button';b.className='soft-btn sidebar-item sidebar-garden';
  b.innerHTML=`<span>🌳 ${L('Garden','花园')}</span><small>✓ ${fmt(availOf(MINE))}</small>`;
  b.onclick=()=>{try{closeSidebar()}catch{}openGarden(null,{fromMenu:true})};
  body.prepend(b);
}
try{const _open=openSidebar;openSidebar=function(){_open.apply(this,arguments);injectMenuItem()};const sb=document.querySelector('#sidebarBtn');if(sb)sb.onclick=openSidebar}catch{}
setTimeout(()=>{try{reconcileChar();checkSeasons()}catch{}},1200);
setTimeout(()=>{maybeAutoPlant().catch(()=>{})},9000);
setTimeout(()=>{try{charFarm()}catch(e){console.warn(e)}},5000);
setInterval(()=>{try{if(!document.hidden)charFarm()}catch{}},20*60000);
setInterval(()=>{if(isOpen()&&!drag&&!document.hidden){renderPlot();renderActions();if(view==='mine')renderSocial()}},30000);
setTimeout(()=>{maybeVisit().catch(()=>{})},15000);
setInterval(()=>{if(!document.hidden)maybeVisit().catch(()=>{})},45*60000);
setInterval(()=>{if(!document.hidden){try{checkSeasons()}catch{}maybeAutoPlant().catch(()=>{})}},30*60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){try{checkSeasons()}catch{}setTimeout(()=>maybeAutoPlant().catch(()=>{}),4000)}});
window.DeadlineGarden={open:openGarden,close:closeGarden,refresh:()=>{recompute();render()},
  /* pantry access for the feeding screen */
  goods:GOODS,goodName,pantry:()=>({...MINE.pantry}),
  consume:id=>{if(!(MINE.pantry[id]>0))return false;MINE.pantry[id]--;if(!MINE.pantry[id])delete MINE.pantry[id];persistMine();if(view==='mine')G=MINE;if(isOpen())render();return true},
  openMarket:()=>{openGarden('mine');tab='market';openShop()},
  charPantry:()=>({...CHARB.pantry}),isEdible,
  buyFood:id=>{if(!applyOp(MINE,{t:'buyfood',id})){if(lastErr)say(lastErr,lastErr);return false}persistMine();if(view==='mine')G=MINE;if(isOpen())render();return true},
  gold:()=>MINE.gold||0,
  giftToChar:id=>{if(!(MINE.pantry[id]>0))return false;MINE.pantry[id]--;if(!MINE.pantry[id])delete MINE.pantry[id];MINE.gifts.push({id:uid(),dir:'out',item:id,cid:'main',at:Date.now()});MINE.gifts=MINE.gifts.slice(-300);persistMine();recompute();if(isOpen())render();return true},
  gifts:()=>MINE.gifts.map(x=>({...x})),panelHtml:tab=>tab==='kitchen'?kitchenBody(true):marketBody(),panelAct,_autoPlant:()=>{CHARB.lastAuto='';return maybeAutoPlant()},_visit:()=>maybeVisit(true)};
})();
