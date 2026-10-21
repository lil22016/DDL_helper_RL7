/* ==== Deadline Garden · Feeding (v2) ====
   Feed the food from your pantry to any of your characters (the ☰ menu lists them).
   Each character has a picture (plus optional "likes it" / "dislikes it" pictures) and a taste memory:
   tastes stay stable from day to day, disliked food can grow on them if you keep feeding it,
   and favourites can (rarely) get boring if you overdo it.
   Replies come from editable default lines, or — if you switch it on — from the AI in character. */
(function(){
'use strict';
const FEED_KEY='deadline-garden-feed-v1';
const zh=()=>typeof uiLanguage!=='undefined'&&uiLanguage==='zh';
const L=(en,cn)=>zh()?cn:en;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const say=(en,cn)=>{try{toast(L(en,cn))}catch{}};
const DAY=24*3600e3;

const DEFAULT_REPLIES={
  like:{en:['Mm! {food} is so good.','More {food}, please.','Okay, I like this one.','You remembered I like {food}?'],cn:['嗯！{food}好好吃。','还要{food}！','这个我喜欢。','你记得我喜欢{food}啊？']},
  dislike:{en:['Ugh, {food}…','I’d rather not eat {food}.','Why would you give me this?','No. Just no.'],cn:['呃，{food}……','{food}我不太想吃。','你为什么要给我这个？','不要，真的不要。']},
  bored:{en:['{food} again? I’m getting tired of it.','Can we have something other than {food}?'],cn:['又是{food}？有点吃腻了。','能不能换个别的，不要{food}了？']},
  acquired:{en:['Huh… {food} isn’t that bad actually.','Fine, I admit it. {food} grew on me.'],cn:['咦……{food}好像也没那么难吃。','好吧我承认，{food}吃着吃着就喜欢了。']},
  gift:{en:['For me? I’ll keep the {food}.','Thanks — {food} goes in my pantry.'],cn:['给我的？{food}我收下了。','谢啦，{food}放进我的仓库了。']},
  chat:{en:['Mm.','Is that so?','Feed me first, then we talk.'],cn:['嗯。','是吗？','先喂我，再聊。']},
};
const REPLY_GROUPS=['like','dislike','bored','acquired','gift','chat'];

/* ---------- state ---------- */
function blank(){return {pets:{},replies:{},useAI:false,active:'main',updatedAt:0}}
function normPet(p){
  if(!p||typeof p!=='object')return {img:'',imgLike:'',imgDislike:'',fit:{s:.9,x:0,y:0},prefs:{},hist:[],chat:[],updatedAt:0};
  const img=v=>typeof v==='string'&&v.startsWith('data:image/')?v:'';
  const prefs={};if(p.prefs&&typeof p.prefs==='object')for(const [k,v] of Object.entries(p.prefs))if(v&&typeof v==='object')prefs[k]={s:Math.max(-3,Math.min(3,Number(v.s)||0)),n:Math.max(0,Number(v.n)|0),last:Number(v.last)||0,...(v.was?{was:1}:{})};
  const f=p.fit&&typeof p.fit==='object'?p.fit:{},cl=(v,a,b,d)=>{v=Number(v);return Number.isFinite(v)?Math.max(a,Math.min(b,v)):d};
  return {img:img(p.img),imgLike:img(p.imgLike),imgDislike:img(p.imgDislike),fit:{s:cl(f.s,.35,1,.9),x:cl(f.x,-1,1,0),y:cl(f.y,-1,1,0)},prefs,hist:Array.isArray(p.hist)?p.hist.filter(h=>h&&h.food).slice(-60):[],chat:Array.isArray(p.chat)?p.chat.filter(m=>m&&m.id&&m.text).slice(-80):[],updatedAt:Number(p.updatedAt)||0};
}
function norm(f){
  const o=blank();if(!f||typeof f!=='object')return o;
  if(f.pets&&typeof f.pets==='object')for(const [k,v] of Object.entries(f.pets))o.pets[k]=normPet(v);
  if(f.replies&&typeof f.replies==='object')for(const k of REPLY_GROUPS)if(Array.isArray(f.replies[k]))o.replies[k]=f.replies[k].map(String).map(x=>x.trim()).filter(Boolean).slice(0,20);
  o.useAI=!!f.useAI;o.active=String(f.active||'main');o.updatedAt=Number(f.updatedAt)||0;return o;
}
function merge(a,b){
  const A=norm(a),B=norm(b),o=blank(),fresh=B.updatedAt>A.updatedAt?B:A;
  for(const k of new Set([...Object.keys(A.pets),...Object.keys(B.pets)])){const x=A.pets[k],y=B.pets[k];o.pets[k]=!x?y:!y?x:(y.updatedAt>x.updatedAt?y:x);
    if(x&&y){const m=new Map();for(const c of [...x.chat,...y.chat])if(!m.has(c.id))m.set(c.id,c);o.pets[k]={...o.pets[k],chat:[...m.values()].sort((a,b)=>a.at-b.at).slice(-80)}}}
  o.replies=fresh.replies;o.useAI=fresh.useAI;o.active=fresh.active;o.updatedAt=Math.max(A.updatedAt,B.updatedAt);return o;
}
let F=blank();
try{F=norm(JSON.parse(localStorage.getItem(FEED_KEY)||'null'))}catch{}
function persist(sync=true){F.updatedAt=Date.now();try{localStorage.setItem(FEED_KEY,JSON.stringify(F))}catch{say('Storage is full — try smaller pictures.','存储空间满了，换小一点的图片试试。')}if(sync)try{queueCloudSync()}catch{}}
const pet=id=>F.pets[id]||(F.pets[id]=normPet(null));
const touch=id=>{pet(id).updatedAt=Date.now()};
const profiles=()=>{try{return Char.profiles()}catch{return [{id:'main',main:true,name:L('Character','角色'),emoji:'✨',color:'#8b7bd8'}]}};
const profile=id=>profiles().find(p=>p.id===id)||profiles()[0];
const repl=k=>{const own=F.replies[k];return own&&own.length?own:DEFAULT_REPLIES[k][zh()?'cn':'en']};
const G=()=>window.DeadlineGarden;
const goods=()=>G()?.goods||{};
const gname=id=>G()?.goodName?.(id)||id;

/* ---------- taste: stable per character × food, nudged by every meal ---------- */
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)/4294967295}
function taste(cid,food){
  const p=pet(cid);
  if(!p.prefs[food]){const r=hash(cid+'|'+food),cooked=!!goods()[food]?.food;const s=r<.18?-2:r<.38?-1:r<(cooked?.48:.6)?0:r<.85?1:2;p.prefs[food]={s,n:0,last:0}}
  return p.prefs[food];
}
const recentCount=(cid,food)=>pet(cid).hist.filter(h=>h.food===food&&Date.now()-h.at<DAY).length;
function decideLocal(cid,food){
  const t=taste(cid,food),recent=recentCount(cid,food);let like,kind;
  if(t.s>=1){
    const bored=Math.random()<Math.min(.35,.04+.09*Math.max(0,recent-1));
    if(bored){like=false;kind='bored';t.s=Math.max(0,t.s-1)}else{like=true;kind='like';t.s=Math.min(3,t.s+.25)}
  }else if(t.s<=-1){
    t.s=Math.min(3,t.s+.5);t.was=1; // keep feeding it and it grows on them
    like=false;kind='dislike';
  }else{
    // undecided: the more often it's been fed, the more it leans towards liking it
    like=Math.random()<.5+Math.min(.35,t.n*.06);
    if(like&&t.was){kind='acquired';t.s=1;delete t.was}
    else{kind=like?'like':'dislike';t.s=Math.max(-3,Math.min(3,t.s+(like?.5:-.5)))}
  }
  return {like,kind};
}
function tasteWords(s){return s>=2?'one of your favourites':s>=1?'something you like':s<=-2?'something you really dislike':s<=-1?'something you dislike':'something you feel neutral about'}
async function decideAI(cid,food){
  const pf=profile(cid),t=taste(cid,food),recent=recentCount(cid,food),g=goods()[food];
  const user=`${(()=>{try{return Char.userName()}catch{return 'The user'}})()} feeds you ${g?.en||food} (${g?.e||''}).
Your taste memory: so far ${food} has been ${tasteWords(t.s)} (eaten ${t.n} times; ${recent} times in the last 24 hours).
Tastes are stable: don't flip without a reason. Things you dislike can slowly grow on you if you're fed them often; a favourite can get boring if you've had it too many times today.
Decide whether you like it this time and react in character in one short sentence.
JSON shape: {"like":true,"reply":"..."}`;
  const j=await Char.askJSON(Char.personaSystem(pf),user,{maxTokens:200});
  const like=!!j.like,before=t.s;
  if(like)t.s=Math.min(3,Math.max(t.s,0)+.4);else t.s=t.s<0?Math.min(3,t.s+.3):Math.max(-3,t.s-.8);
  const kind=like?(before<=-1||t.was?'acquired':'like'):(before>=1?'bored':'dislike');
  if(!like&&before<0)t.was=1;if(like)delete t.was;
  return {like,kind,reply:String(j.reply||'').trim().slice(0,240)};
}


/* ---------- chat log (per character) ---------- */
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
function log(cid,role,text,note=''){
  if(!text)return;const p=pet(cid);p.chat.push({id:uid(),role,text:String(text).slice(0,600),note,at:Date.now()});p.chat=p.chat.slice(-80);touch(cid);persist();
  if(isOpen()&&cid===cur)renderChat();
}
const who=()=>{try{return Char.userName()}catch{return L('You','你')}};
const charLine=(k,food,p)=>{const lines=repl(k);return lines[Math.floor(Math.random()*lines.length)].replace(/\{food\}/g,gname(food||'')).replace(/\{name\}/g,p.name)};
function tasteSummary(cid){
  const pr=pet(cid).prefs,likes=[],dislikes=[];
  for(const [k,v] of Object.entries(pr)){if(!v.n)continue;if(v.s>=1)likes.push(goods()[k]?.en||k);else if(v.s<=-1)dislikes.push(goods()[k]?.en||k)}
  return `Foods you like: ${likes.join(', ')||'none yet'}. Foods you dislike: ${dislikes.join(', ')||'none yet'}.`;
}
async function chatReply(cid,text){
  const p=profile(cid);let ai=false;try{ai=Char.hasAI()}catch{}
  if(!ai)return charLine('chat','',p);
  const hist=pet(cid).chat.slice(-14,-1).map(m=>`${m.role==='user'?who():p.name}: ${m.text}`).join('\n');
  const pantry=G()?.pantry?.()||{};
  const user=`You are in Deadline Garden's feeding corner; ${who()} feeds you food from their pantry. ${tasteSummary(cid)}
Their pantry right now: ${Object.entries(pantry).map(([k,n])=>`${goods()[k]?.en||k}×${n}`).join(', ')||'empty'}.
${hist?`Conversation so far:\n${hist}\n`:''}${who()} now says: "${text}"
Answer in character in 1-3 sentences.
JSON shape: {"reply":"..."}`;
  const j=await Char.askJSON(Char.personaSystem(p),user,{maxTokens:300});
  return String(j.reply||'').trim().slice(0,600)||charLine('chat','',p);
}

/* ---------- DOM ---------- */
let root,cur='main',busy=false,fromMenu=false,closeTimer=null,bubbleTimer=null,showSettings=false,mode='feed',drag=null,shopOpen=false;
function ensureRoot(){
  if(root)return root;
  root=document.createElement('div');root.id='feedRoot';root.className='fd-root hidden';root.setAttribute('aria-hidden','true');
  document.body.appendChild(root);
  root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('input',onInput);root.addEventListener('pointerdown',onDown);
  return root;
}
const isOpen=()=>root&&!root.classList.contains('hidden')&&!root.classList.contains('closing');
function open(id,opts={}){
  ensureRoot();clearTimeout(closeTimer);fromMenu=!!opts.fromMenu;
  cur=profiles().some(p=>p.id===id)?id:(profiles().some(p=>p.id===F.active)?F.active:'main');
  if(F.active!==cur){F.active=cur;persist(false)}
  showSettings=false;shopOpen=false;mode=opts.mode==='gift'?'gift':'feed';
  root.classList.remove('hidden','closing');root.setAttribute('aria-hidden','false');document.body.classList.add('gd-open');
  render();void root.offsetWidth;root.classList.add('show');
}
function close(toMenu=fromMenu){
  if(!isOpen())return;root.classList.remove('show');root.classList.add('closing');root.setAttribute('aria-hidden','true');document.body.classList.remove('gd-open');
  if(toMenu)setTimeout(()=>{try{openSidebar()}catch{}},120);
  clearTimeout(closeTimer);closeTimer=setTimeout(()=>{root.classList.add('hidden');root.classList.remove('closing')},240);
}
function avatar(p,cls='fd-ava'){const im=pet(p.id).img;return im?`<span class="${cls}"><img src="${esc(im)}" alt=""></span>`:`<span class="${cls} fd-ava-emoji" style="--c:${esc(p.color)}">${esc(p.emoji)}</span>`}
/* the picture always stays inside the stage: size 35–100 % of the frame, offset only within the room left over */
function fitStyle(f){const s=f.s,room=(1-s)*50;return `width:${s*100}%;height:${s*100}%;left:${room+f.x*room}%;top:${room+f.y*room}%`}
const canGift=()=>cur==='main'&&!!G()?.giftToChar;
function render(){
  if(!root)return;
  const p=profile(cur),pt=pet(cur),pantry=G()?.pantry?.()||{},gs=goods();
  if(!canGift())mode='feed';
  const edible=k=>G()?.isEdible?G().isEdible(k):!gs[k]?.flower;
  const rank=k=>k==='bouquet'?3:gs[k].food?2:gs[k].flower?0:1;
  const foods=Object.keys(pantry).filter(k=>pantry[k]>0&&gs[k]&&(mode==='gift'||edible(k))).sort((a,b)=>rank(b)-rank(a));
  const mem=Object.entries(pt.prefs).filter(([,v])=>v.n>0).sort((a,b)=>b[1].last-a[1].last);
  if(!canGift())mode='feed';
  let ai=false;try{ai=Char.hasAI()}catch{}
  root.innerHTML=`<div class="fd-shell">
    <header class="fd-head"><button type="button" class="gd-btn gd-back" data-fd="back"><span aria-hidden="true">‹</span> ${L('Back','返回')}</button><div class="fd-title"><div class="gd-label">${showSettings?L('FEEDING · SETTINGS','喂食 · 设置'):L('FEEDING','喂食')}</div><strong>${esc(p.name)}</strong></div><div class="fd-quick"><span class="gd-coin gd-coin-gold">🪙 ${Math.round((G()?.gold?.()||0)*10)/10}</span><button type="button" class="gd-btn" data-fd="shop">🛒 <span>${L('Food shop','食物商店')}</span></button><button type="button" class="gd-btn" data-fd="garden">🌳 <span>${L('Garden','花园')}</span></button><button type="button" class="gd-icon gd-gear${showSettings?' on':''}" data-fd="settings" aria-label="${L('Feeding settings','喂食设置')}"><span>⚙︎</span></button></div></header>
    <nav class="fd-who">${profiles().map(x=>`<button type="button" class="${x.id===cur?'on':''}" data-fd="who" data-id="${esc(x.id)}" title="${x.id===cur&&showSettings?L('Back to feeding','回到喂食'):''}">${avatar(x,'fd-mini')}<span>${esc(x.name)}</span>${x.id===cur&&showSettings?'<i class="fd-backhint">‹</i>':''}</button>`).join('')}</nav>
    <section class="fd-stage${mode==='gift'?' gift':''}" id="fdStage">
      <div class="fd-frame"><div class="fd-pet" id="fdPet" style="${fitStyle(pt.fit)}"><div class="fd-body">${pt.img?`<img src="${esc(pt.img)}" alt="${esc(p.name)}" id="fdImg" draggable="false">`:`<span class="fd-placeholder" style="--c:${esc(p.color)}"><b>${esc(p.emoji)}</b><small>${L('Add a picture in ⚙︎','在 ⚙︎ 里上传图片')}</small></span>`}</div></div></div>
      <div class="fd-fx" id="fdFx" aria-hidden="true"></div>
      <div class="fd-bubble hidden" id="fdBubble"></div>
      <div class="fd-drophint">${mode==='gift'?L('Drop here to give','拖到这里送给它'):L('Drop here to feed','拖到这里喂它')}</div>
    </section>
    ${showSettings?settingsHtml(p,ai):''}
    ${showSettings?'':`<section class="fd-tray"><div class="gd-tray-head"><span class="gd-label">🧺 ${L('YOUR PANTRY','你的仓库')}</span>${canGift()?`<span class="fd-modes" role="radiogroup"><button type="button" class="${mode==='feed'?'on':''}" data-fd="mode" data-m="feed">🍽 ${L('Feed','喂')}</button><button type="button" class="${mode==='gift'?'on':''}" data-fd="mode" data-m="gift">🎁 ${esc(L(`Give to ${p.name}'s pantry`,`送进${p.name}的仓库`))}</button></span>`:''}<small>${foods.length?(mode==='gift'?L('Tap or drag to give it — food, flowers or a bouquet.','点一下或拖过去就送给它——吃的、花、花束都可以。'):L('Tap, or drag it onto them.','点一下，或者拖到它身上。')):L('Nothing to eat yet — tap 🛒 Food shop at the top, or harvest and cook in the Garden.','还没有吃的——点右上角的 🛒 食物商店，或者去花园收成、做饭。')}</small></div>
      <div class="fd-foods">${foods.map(k=>`<button type="button" class="fd-food" data-fd="feed" data-id="${k}" ${busy?'disabled':''} title="${esc(gname(k))}"><span>${gs[k].e}</span><b>×${pantry[k]}</b><small>${esc(gname(k))}</small></button>`).join('')}</div>
    </section>
    <section class="fd-chat"><div class="gd-label">💬 ${esc(L(`CHAT WITH ${p.name.toUpperCase()}`,`和${p.name}聊天`))}</div><div class="fd-log" id="fdLog"></div><div class="fd-input"><textarea id="fdMsg" rows="1" maxlength="400" placeholder="${esc(L(`Say something to ${p.name}…`,`和${p.name}说点什么……`))}"></textarea><button type="button" class="gd-btn gd-btn-primary" data-fd="send"${busy?' disabled':''}>${L('Send','发送')}</button></div>${ai?'':`<small class="fd-noai">${L('No API set up — replies use the default lines.','还没配置 API，回复会用默认台词。')}</small>`}</section>
    ${mem.length?`<section class="fd-mem"><div class="gd-label">${L('TASTE MEMORY','口味记忆')}</div><div class="fd-memlist">${mem.map(([k,v])=>`<span class="fd-memitem ${v.s>=1?'love':v.s<=-1?'hate':''}" title="${esc(gname(k))} · ${v.n}×">${gs[k]?.e||'?'} ${v.s>=2?'💖':v.s>=1?'♥':v.s<=-1?'✖':'·'}</span>`).join('')}</div></section>`:''}`}
  </div><div class="fd-ghost hidden" id="fdGhost"></div>${shopOpen?shopHtml():''}`;
  if(!showSettings)renderChat();
  const ta=root.querySelector('#fdMsg');if(ta)ta.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}};
}
/* a food-only shop, right here — buys with the same 🪙 as the garden market */
function shopHtml(){
  const gs=goods(),gold=G()?.gold?.()||0,pantry=G()?.pantry?.()||{};
  const list=Object.entries(gs).filter(([k,g])=>g.buy&&!g.flower&&!g.gift);
  const sec=(title,arr)=>arr.length?`<div class="gd-label">${title}</div><div class="fd-shopgrid">${arr.map(([k,g])=>`<button type="button" class="fd-shopitem${gold<g.buy?' poor':''}" data-fd="buy" data-id="${k}"><span>${g.e}</span><strong>${esc(gname(k))}</strong><small>🪙${g.buy}${pantry[k]?` · ${L('have','有')} ${pantry[k]}`:''}</small></button>`).join('')}</div>`:'';
  return `<div class="fd-shopwrap" data-fd="shopClose"><div class="fd-shop" role="dialog" aria-label="${L('Food shop','食物商店')}">
    <div class="fd-shop-head"><div><div class="gd-label">${L('FOOD SHOP','食物商店')}</div><strong>${L('Buy something to eat','买点吃的')}</strong></div><span class="gd-coin gd-coin-gold">🪙 ${Math.round(gold*10)/10}</span><button type="button" class="gd-icon" data-fd="shopClose" aria-label="${L('Close','关闭')}">×</button></div>
    <div class="fd-shop-body">${sec(L('READY TO EAT','现成的'),list.filter(([,g])=>g.food))}${sec(L('FRUIT, VEG & INGREDIENTS','水果蔬菜和食材'),list.filter(([,g])=>!g.food))}
    <p class="gd-note">${L('Earn 🪙 by selling crops in the Garden market.','🪙 可以在花园的市场里卖作物赚。')}</p></div></div></div>`;
}
function renderChat(){
  const box=root&&root.querySelector('#fdLog');if(!box)return;const p=profile(cur),msgs=pet(cur).chat.slice(-40);
  box.innerHTML=msgs.length?msgs.map(m=>`<div class="gd-msg ${m.role==='user'?'me':m.role==='sys'?'sys':'them'}"><p>${esc(m.text)}</p>${m.note?`<small>${esc(m.note)}</small>`:''}</div>`).join('')+(busy?'<div class="gd-msg them"><p class="gd-typing"><i></i><i></i><i></i></p></div>':''):`<p class="gd-chat-empty">${esc(L(`Feed ${p.name} something, or just say hi.`,`喂${p.name}点东西，或者打个招呼吧。`))}</p>`;
  box.scrollTop=box.scrollHeight;
}
function settingsHtml(p,ai){
  const pt=pet(p.id),slot=(k,label)=>`<label class="fd-up">${pt[k]?`<img src="${esc(pt[k])}" alt="">`:'<span>＋</span>'}<small>${label}</small><input type="file" accept="image/*" data-fd-img="${k}" hidden>${pt[k]?`<button type="button" class="fd-x" data-fd="rmimg" data-k="${k}" aria-label="${L('Remove','删除')}">×</button>`:''}</label>`;
  const area=(k,label)=>`<label class="gd-field">${label}<textarea data-fd-reply="${k}" rows="3">${esc(repl(k).join('\n'))}</textarea></label>`;
  const rng=(k,label,min,max,val)=>`<label class="fd-range"><span>${label}</span><input type="range" min="${min}" max="${max}" value="${val}" data-fd-fit="${k}"></label>`;
  return `<section class="fd-settings">
    <p class="fd-backline">${esc(L(`Tap ${p.name} above to go back to feeding.`,`点上面的「${p.name}」就能回到喂食。`))}</p>
    <div class="gd-label">${esc(L(`${p.name.toUpperCase()}'S PICTURES`,`${p.name}的图片`))}</div>
    <p class="gd-note">${L('Transparent PNGs look best. If “likes it” / “dislikes it” are empty, the normal picture is used.','透明底 PNG 效果最好。没传“喜欢 / 不喜欢”的话就用平时那张。')}</p>
    <div class="fd-ups">${slot('img',L('Normal','平时'))}${slot('imgLike',L('Likes it','喜欢'))}${slot('imgDislike',L('Dislikes it','不喜欢'))}</div>
    <div class="gd-label" style="margin-top:14px">${L('SIZE & POSITION','大小和位置')}</div>
    <p class="gd-note">${L('The picture always stays inside the box — the preview above updates live.','图片始终在框里，上面的预览会实时变化。')}</p>
    <div class="fd-fit">${rng('s',L('Size','大小'),35,100,Math.round(pt.fit.s*100))}${rng('x',L('Left ↔ right','左 ↔ 右'),-100,100,Math.round(pt.fit.x*100))}${rng('y',L('Up ↕ down','上 ↕ 下'),-100,100,Math.round(pt.fit.y*100))}<button type="button" class="gd-btn" data-fd="fitReset">${L('Reset','恢复默认')}</button></div>
    <div class="gd-label" style="margin-top:14px">${L('REPLIES','回复')}</div>
    <label class="gd-toggle"><input type="checkbox" data-fd-ai ${F.useAI?'checked':''} ${ai?'':'disabled'}><span><b>${L('Let the AI decide and reply','让 AI 决定喜不喜欢并回复')}</b><small>${ai?L('Uses your Garden API and the character’s persona (costs tokens). Off = default lines below, no tokens. Chat messages always use the AI when one is set up.','用 Garden 的 API 和角色人设（会消耗 token）。关闭则用下面的默认回复，不消耗 token。聊天消息只要配了 API 就会用 AI 回复。'):L('Add an API in ☰ → Character & API to use this.','先在 ☰ →「角色与 API」里填好 API 才能用。')}</small></span></label>
    <p class="gd-note">${L('One line each. {food} = the food, {name} = the character.','每行一句。{food} 代表食物，{name} 代表角色名。')}</p>
    <div class="fd-replies">${area('like',L('Likes it','喜欢的时候'))}${area('dislike',L('Dislikes it','不喜欢的时候'))}${area('bored',L('Bored of it','吃腻了'))}${area('acquired',L('Grew to like it','吃着吃着喜欢上了'))}${area('gift',L('Gets a gift','收到你送的'))}${area('chat',L('Chat (no API)','聊天（没配 API 时）'))}</div>
    <div class="fd-row"><button type="button" class="gd-btn" data-fd="resetReplies">${L('Restore defaults','恢复默认回复')}</button><button type="button" class="gd-btn" data-fd="resetTaste">${L('Forget tastes','清空口味记忆')}</button><button type="button" class="gd-btn" data-fd="clearChat">${L('Clear chat','清空聊天')}</button><button type="button" class="gd-btn" data-fd="chars">👥 ${L('Manage characters','管理角色')}</button></div>
  </section>`;
}

/* ---------- feeding / giving / chatting ---------- */
const happy=k=>k==='like'||k==='acquired'||k==='gift'||k==='bouquet';
function fx(kind){
  const box=root.querySelector('#fdFx'),body=root.querySelector('#fdPet .fd-body');if(!box||!body)return;
  body.classList.remove('bounce','shake');void body.offsetWidth;body.classList.add(happy(kind)?'bounce':'shake');
  const set=kind==='bouquet'?['💐','🌸','🌷','💖','✨']:kind==='gift'?['🎁','✨','💝']:happy(kind)?['💖','💕','❤️','💗','✨']:['🤢','💦','〰️','😖','💨'];
  const r=root.querySelector('#fdPet').getBoundingClientRect(),s=root.querySelector('#fdStage').getBoundingClientRect();
  for(let i=0;i<9;i++){const e=document.createElement('span');e.className='fd-p '+(happy(kind)?'up':'puff');e.textContent=set[i%set.length];e.style.left=(r.left-s.left+r.width*(.2+Math.random()*.6))+'px';e.style.top=(r.top-s.top+r.height*(happy(kind)?.55:.3))+'px';e.style.animationDelay=(i*70)+'ms';e.style.setProperty('--dx',(Math.random()*80-40)+'px');box.appendChild(e);setTimeout(()=>e.remove(),1700)}
}
function showBubble(text,kind){
  const b=root.querySelector('#fdBubble');if(!b)return;
  b.className='fd-bubble '+(happy(kind)?'good':'bad');b.textContent=text;
  clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>b.classList.add('hidden'),5200);
}
function swapImg(kind){
  const pt=pet(cur),im=root.querySelector('#fdImg');if(!im)return;
  im.src=happy(kind)?(pt.imgLike||pt.img):(pt.imgDislike||pt.img);
  clearTimeout(swapImg.t);swapImg.t=setTimeout(()=>{const x=root.querySelector('#fdImg');if(x)x.src=pet(cur).img},3200);
}
function react(text,kind){requestAnimationFrame(()=>{swapImg(kind);fx(kind);showBubble(text,kind)})}
async function feed(food){
  if(busy||!G()?.consume)return;
  if(mode==='gift')return give(food);
  if(!G().consume(food)){say('You don’t have that any more.','已经没有了。');render();return}
  const p=profile(cur),g=goods()[food];busy=true;
  log(cur,'user',L(`${g?.e||''} You fed ${p.name} ${gname(food)}.`,`${g?.e||''} 你喂了${p.name}${gname(food)}。`));
  render();root.querySelector('#fdPet .fd-body')?.classList.add('eating');
  let res;
  if(F.useAI){try{res=await decideAI(cur,food)}catch(e){res={...decideLocal(cur,food),note:L(`AI unavailable: ${e.message}`,`AI 暂时用不了：${e.message}`)}}}
  else res=decideLocal(cur,food);
  const t=taste(cur,food);t.n++;t.last=Date.now();
  const pt=pet(cur);pt.hist.push({food,like:res.like,kind:res.kind,at:Date.now()});pt.hist=pt.hist.slice(-60);touch(cur);
  const text=res.reply||charLine(res.kind,food,p);
  busy=false;log(cur,'char',text,[{like:L('liked it','喜欢'),dislike:L('didn’t like it','不喜欢'),bored:L('bored of it','吃腻了'),acquired:L('grew to like it','喜欢上了')}[res.kind],res.note].filter(Boolean).join(' · '));
  render();react(text,res.kind);
}
async function give(food){
  if(busy||!canGift())return;
  const p=profile(cur),g=goods()[food];
  if(!G().giftToChar(food)){say('You don’t have that any more.','已经没有了。');render();return}
  log(cur,'user',food==='bouquet'?L(`💐 You gave ${p.name} a bouquet.`,`💐 你送了${p.name}一束花。`):L(`🎁 You gave ${p.name} ${gname(food)} for their pantry.`,`🎁 你送了${p.name}${gname(food)}，放进它的仓库。`));
  busy=true;render();
  let text='';
  if(F.useAI){try{const j=await Char.askJSON(Char.personaSystem(p),`${who()} gives you ${food==='bouquet'?'a bouquet of flowers they grew and picked themselves':`${g?.en||food} (${g?.e||''}) to keep in your pantry`} in Deadline Garden. ${tasteSummary(cur)}\nReact in character in one short sentence.\nJSON shape: {"reply":"..."}`,{maxTokens:150});text=String(j.reply||'').trim().slice(0,300)}catch{}}
  text=text||charLine('gift',food,p);
  busy=false;log(cur,'char',text);render();react(text,food==='bouquet'?'bouquet':'gift');
}
async function send(){
  const ta=root.querySelector('#fdMsg'),text=(ta?.value||'').trim();if(!text||busy)return;
  ta.value='';log(cur,'user',text);busy=true;renderChat();root.querySelector('[data-fd=send]')?.setAttribute('disabled','');
  let reply;try{reply=await chatReply(cur,text)}catch(e){reply=L(`(Couldn’t reach ${profile(cur).name}: ${e.message})`,`（联系不上${profile(cur).name}：${e.message}）`)}
  busy=false;log(cur,'char',reply);root.querySelector('[data-fd=send]')?.removeAttribute('disabled');
  const b=root.querySelector('#fdBubble');if(b){b.className='fd-bubble good';b.textContent=reply;clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>b.classList.add('hidden'),5200)}
}

/* ---------- drag food onto the character ---------- */
function onDown(e){
  const src=e.target.closest('.fd-food');if(!src||src.disabled||e.button>0||drag)return;
  if(e.pointerType==='mouse')e.preventDefault();
  drag={src,id:src.dataset.id,x:e.clientX,y:e.clientY,on:false,pid:e.pointerId};
  try{root.setPointerCapture(e.pointerId)}catch{}
  window.addEventListener('pointermove',onMove,{passive:false});window.addEventListener('pointerup',onUp);window.addEventListener('pointercancel',onCancel);
}
const overStage=(x,y)=>{const r=root.querySelector('#fdStage')?.getBoundingClientRect();return r&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom};
function onMove(e){
  if(!drag||e.pointerId!==drag.pid)return;
  if(!drag.on){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;drag.on=true;const g=root.querySelector('#fdGhost');g.textContent=goods()[drag.id]?.e||'?';g.classList.remove('hidden');drag.src.classList.add('dragging');root.classList.add('fd-dragging')}
  e.preventDefault();
  const g=root.querySelector('#fdGhost');g.style.transform=`translate(${e.clientX-24}px,${e.clientY-40}px)`;
  root.querySelector('#fdStage')?.classList.toggle('over',overStage(e.clientX,e.clientY));
}
function endDrag(){
  window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',onCancel);
  try{root.releasePointerCapture(drag.pid)}catch{}
  drag.src.classList.remove('dragging');root.classList.remove('fd-dragging');root.querySelector('#fdGhost')?.classList.add('hidden');root.querySelector('#fdStage')?.classList.remove('over');
}
function onCancel(){if(!drag)return;endDrag();drag=null}
function onUp(e){
  if(!drag||e.pointerId!==drag.pid)return;
  const d=drag;endDrag();drag=null;
  if(!d.on){feed(d.id);return}           // a plain tap
  if(overStage(e.clientX,e.clientY))feed(d.id);
}

/* ---------- images, settings, clicks ---------- */
function readImage(file,cb){
  if(!file||!file.type.startsWith('image/'))return say('Please choose an image.','请选择图片。');
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{const max=384,k=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*k)),h=Math.max(1,Math.round(img.height*k));const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);let d=c.toDataURL('image/webp',.88);if(!d.startsWith('data:image/webp'))d=c.toDataURL('image/png');URL.revokeObjectURL(url);cb(d)};
  img.onerror=()=>{URL.revokeObjectURL(url);say('That image could not be read.','无法读取这张图片。')};img.src=url;
}
function onClick(e){
  if(e.target.closest('.fd-food'))return; // handled by pointer events (tap or drag)
  const a=e.target.closest('[data-fd]');if(!a||a.disabled)return;
  const act=a.dataset.fd;
  if(act==='back')return close();
  if(act==='who'){if(a.dataset.id===cur&&showSettings){showSettings=false;return render()}cur=a.dataset.id;F.active=cur;persist(false);return render()}
  if(act==='settings'){showSettings=!showSettings;return render()}
  if(act==='mode'){mode=a.dataset.m==='gift'?'gift':'feed';return render()}
  if(act==='send')return send();
  if(act==='garden'){const fm=fromMenu;close(false);setTimeout(()=>G()?.open('mine',{fromMenu:fm}),180);return}
  if(act==='market'){close(false);setTimeout(()=>G()?.openMarket?.(),200);return}
  if(act==='shop'){shopOpen=true;return render()}
  if(act==='shopClose'){if(e.target.closest('.fd-shop')&&!a.matches('.gd-icon'))return;shopOpen=false;return render()}
  if(act==='buy'){if(G()?.buyFood?.(a.dataset.id))say(`Bought ${gname(a.dataset.id)}.`,`买了${goods()[a.dataset.id]?.e||''}${gname(a.dataset.id)}。`);return render()}
  if(act==='chars'){close(false);try{Char.openCharacters()}catch{}return}
  if(act==='rmimg'){e.preventDefault();pet(cur)[a.dataset.k]='';touch(cur);persist();return render()}
  if(act==='fitReset'){pet(cur).fit={s:.9,x:0,y:0};touch(cur);persist();return render()}
  if(act==='resetReplies'){F.replies={};persist();return render()}
  if(act==='resetTaste'){if(!confirm(L('Forget everything this character remembers about food?','清空这个角色的口味记忆？')))return;const pt=pet(cur);pt.prefs={};pt.hist=[];touch(cur);persist();return render()}
  if(act==='clearChat'){if(!confirm(L('Clear this chat?','清空这段聊天记录？')))return;pet(cur).chat=[];touch(cur);persist();return render()}
}
function onInput(e){
  const t=e.target;if(!t.matches('[data-fd-fit]'))return;
  const f=pet(cur).fit,k=t.dataset.fdFit,v=Number(t.value)/100;f[k]=k==='s'?Math.max(.35,Math.min(1,v)):Math.max(-1,Math.min(1,v));
  const el=root.querySelector('#fdPet');if(el)el.setAttribute('style',fitStyle(f));
}
function onChange(e){
  const t=e.target;
  if(t.matches('[data-fd-fit]')){touch(cur);persist();return}
  if(t.matches('[data-fd-img]')){const k=t.dataset.fdImg;readImage(t.files&&t.files[0],d=>{pet(cur)[k]=d;touch(cur);persist();render()});return}
  if(t.matches('[data-fd-ai]')){F.useAI=t.checked;persist();return}
  if(t.matches('[data-fd-reply]')){F.replies[t.dataset.fdReply]=t.value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,20);persist();return}
}

/* ---------- menu + sync ---------- */
function injectMenu(){
  const body=document.querySelector('#sidebarBody');if(!body||body.querySelector('#sbFeed'))return;
  const act=profile(F.active);
  const bar=document.createElement('button');bar.id='sbFeed';bar.type='button';bar.className='soft-btn sidebar-item sidebar-feedbar';
  bar.innerHTML=`<span>🍽 ${L('Feeding','喂食')}</span>${avatar(act,'sb-feed-ava')}`;
  bar.onclick=()=>{try{closeSidebar()}catch{}open(F.active,{fromMenu:true})};
  /* characters are not only for feeding — each can have a schedule on the calendar — so they get their own section */
  const sec=document.createElement('div');sec.id='sbChars';sec.className='sidebar-section sidebar-chars';
  sec.innerHTML=`<div class="section-label">👥 ${L('CHARACTERS','角色')}</div><div class="sb-feed-list">${profiles().map(p=>`<button type="button" class="sb-feed-who" data-sb-char="${esc(p.id)}" title="${L('Edit','编辑')}">${avatar(p,'sb-feed-ava')}<span>${esc(p.name)}</span></button>`).join('')}<button type="button" class="sb-feed-who sb-feed-add" data-sb-add>＋<span>${L('Add','添加')}</span></button></div>`;
  const g=body.querySelector('#sbGarden');if(g)g.after(bar);else body.prepend(bar);
  bar.after(sec);
  sec.querySelectorAll('[data-sb-char]').forEach(b=>b.onclick=()=>{try{closeSidebar()}catch{}const id=b.dataset.sbChar;try{if(id==='main')Char.openSettings();else Char.openCharacters(id)}catch{}});
  sec.querySelector('[data-sb-add]').onclick=()=>{try{closeSidebar()}catch{}try{Char.openCharacters('new')}catch{}};
}
try{const _o=openSidebar;openSidebar=function(){_o.apply(this,arguments);injectMenu()};const sb=document.querySelector('#sidebarBtn');if(sb)sb.onclick=openSidebar}catch{}
try{const _c=collectGardenState;collectGardenState=async function(){const s=await _c.apply(this,arguments);s.feed=F;return s}}catch{}
try{const _a=applyCloudState;applyCloudState=async function(state){
  let push=false;
  if(state&&typeof state==='object'){if(state.feed){const m=merge(F,state.feed);push=JSON.stringify(m)!==JSON.stringify(norm(state.feed));F=m;try{localStorage.setItem(FEED_KEY,JSON.stringify(F))}catch{}}else if(Object.keys(F.pets).length)push=true}
  await _a.apply(this,arguments);if(isOpen())render();if(push)setTimeout(()=>{try{queueCloudSync()}catch{}},800);
}}catch{}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen()){if(showSettings){showSettings=false;render()}else close()}});
window.Feed={open,close,refresh:()=>{if(isOpen())render()},log,_state:()=>F};
})();
