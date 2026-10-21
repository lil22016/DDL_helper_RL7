/* ==== Deadline Garden · Feeding (v1) ====
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
};

/* ---------- state ---------- */
function blank(){return {pets:{},replies:{},useAI:false,active:'main',updatedAt:0}}
function normPet(p){
  if(!p||typeof p!=='object')return {img:'',imgLike:'',imgDislike:'',prefs:{},hist:[],updatedAt:0};
  const img=v=>typeof v==='string'&&v.startsWith('data:image/')?v:'';
  const prefs={};if(p.prefs&&typeof p.prefs==='object')for(const [k,v] of Object.entries(p.prefs))if(v&&typeof v==='object')prefs[k]={s:Math.max(-3,Math.min(3,Number(v.s)||0)),n:Math.max(0,Number(v.n)|0),last:Number(v.last)||0,...(v.was?{was:1}:{})};
  return {img:img(p.img),imgLike:img(p.imgLike),imgDislike:img(p.imgDislike),prefs,hist:Array.isArray(p.hist)?p.hist.filter(h=>h&&h.food).slice(-60):[],updatedAt:Number(p.updatedAt)||0};
}
function norm(f){
  const o=blank();if(!f||typeof f!=='object')return o;
  if(f.pets&&typeof f.pets==='object')for(const [k,v] of Object.entries(f.pets))o.pets[k]=normPet(v);
  if(f.replies&&typeof f.replies==='object')for(const k of Object.keys(DEFAULT_REPLIES))if(Array.isArray(f.replies[k]))o.replies[k]=f.replies[k].map(String).map(x=>x.trim()).filter(Boolean).slice(0,20);
  o.useAI=!!f.useAI;o.active=String(f.active||'main');o.updatedAt=Number(f.updatedAt)||0;return o;
}
function merge(a,b){
  const A=norm(a),B=norm(b),o=blank(),fresh=B.updatedAt>A.updatedAt?B:A;
  for(const k of new Set([...Object.keys(A.pets),...Object.keys(B.pets)])){const x=A.pets[k],y=B.pets[k];o.pets[k]=!x?y:!y?x:(y.updatedAt>x.updatedAt?y:x)}
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

/* ---------- DOM ---------- */
let root,cur='main',busy=false,fromMenu=false,closeTimer=null,bubbleTimer=null,showSettings=false;
function ensureRoot(){
  if(root)return root;
  root=document.createElement('div');root.id='feedRoot';root.className='fd-root hidden';root.setAttribute('aria-hidden','true');
  document.body.appendChild(root);
  root.addEventListener('click',onClick);root.addEventListener('change',onChange);
  return root;
}
const isOpen=()=>root&&!root.classList.contains('hidden')&&!root.classList.contains('closing');
function open(id,opts={}){
  ensureRoot();clearTimeout(closeTimer);fromMenu=!!opts.fromMenu;
  cur=profiles().some(p=>p.id===id)?id:(profiles().some(p=>p.id===F.active)?F.active:'main');
  if(F.active!==cur){F.active=cur;persist(false)}
  showSettings=false;
  root.classList.remove('hidden','closing');root.setAttribute('aria-hidden','false');document.body.classList.add('gd-open');
  render();void root.offsetWidth;root.classList.add('show');
}
function close(toMenu=fromMenu){
  if(!isOpen())return;root.classList.remove('show');root.classList.add('closing');root.setAttribute('aria-hidden','true');document.body.classList.remove('gd-open');
  if(toMenu)setTimeout(()=>{try{openSidebar()}catch{}},120);
  clearTimeout(closeTimer);closeTimer=setTimeout(()=>{root.classList.add('hidden');root.classList.remove('closing')},240);
}
function avatar(p,cls='fd-ava'){const im=pet(p.id).img;return im?`<img class="${cls}" src="${esc(im)}" alt="">`:`<span class="${cls} fd-ava-emoji" style="--c:${esc(p.color)}">${esc(p.emoji)}</span>`}
function render(){
  if(!isOpen()&&!root.classList.contains('show')&&root.classList.contains('hidden'))return;
  const p=profile(cur),pt=pet(cur),pantry=G()?.pantry?.()||{},gs=goods();
  const foods=Object.keys(pantry).filter(k=>pantry[k]>0&&gs[k]).sort((a,b)=>(gs[b].food?1:0)-(gs[a].food?1:0));
  const mem=Object.entries(pt.prefs).filter(([,v])=>v.n>0).sort((a,b)=>b[1].last-a[1].last);
  let ai=false;try{ai=Char.hasAI()}catch{}
  root.innerHTML=`<div class="fd-shell">
    <header class="fd-head"><button type="button" class="gd-btn gd-back" data-fd="back"><span aria-hidden="true">‹</span> ${L('Back','返回')}</button><div class="fd-title"><div class="gd-label">${L('FEEDING','喂食')}</div><strong>${esc(p.name)}</strong></div><button type="button" class="gd-icon gd-gear${showSettings?' on':''}" data-fd="settings" aria-label="${L('Feeding settings','喂食设置')}"><span>⚙︎</span></button></header>
    <nav class="fd-who">${profiles().map(x=>`<button type="button" class="${x.id===cur?'on':''}" data-fd="who" data-id="${esc(x.id)}">${avatar(x,'fd-mini')}<span>${esc(x.name)}</span></button>`).join('')}</nav>
    ${showSettings?settingsHtml(p,ai):''}
    <section class="fd-stage" id="fdStage">
      <div class="fd-bubble hidden" id="fdBubble"></div>
      <div class="fd-pet" id="fdPet">${pt.img?`<img src="${esc(pt.img)}" alt="${esc(p.name)}" id="fdImg">`:`<span class="fd-placeholder" style="--c:${esc(p.color)}">${esc(p.emoji)}<small>${L('Add a picture in ⚙︎','在 ⚙︎ 里上传图片')}</small></span>`}</div>
      <div class="fd-fx" id="fdFx" aria-hidden="true"></div>
    </section>
    <section class="fd-tray"><div class="gd-tray-head"><span class="gd-label">🧺 ${L('YOUR PANTRY','你的仓库')}</span><small>${foods.length?L('Tap something to feed it.','点一下就喂给它。'):L('Nothing to eat yet — harvest crops, cook, or buy food in the Market.','还没有吃的——去收成、做饭，或者在市场买。')}</small></div>
      <div class="fd-foods">${foods.map(k=>`<button type="button" class="fd-food" data-fd="feed" data-id="${k}" ${busy?'disabled':''} title="${esc(gname(k))}"><span>${gs[k].e}</span><b>×${pantry[k]}</b><small>${esc(gname(k))}</small></button>`).join('')}</div>
      ${foods.length?'':`<div class="fd-row"><button type="button" class="gd-btn" data-fd="garden">🌳 ${L('Garden','花园')}</button><button type="button" class="gd-btn" data-fd="market">🪙 ${L('Market','市场')}</button></div>`}
    </section>
    ${mem.length?`<section class="fd-mem"><div class="gd-label">${L('TASTE MEMORY','口味记忆')}</div><div class="fd-memlist">${mem.map(([k,v])=>`<span class="fd-memitem ${v.s>=1?'love':v.s<=-1?'hate':''}" title="${esc(gname(k))} · ${v.n}×">${gs[k]?.e||'?'} ${v.s>=2?'💖':v.s>=1?'♥':v.s<=-1?'✖':'·'}</span>`).join('')}</div></section>`:''}
  </div>`;
}
function settingsHtml(p,ai){
  const pt=pet(p.id),slot=(k,label)=>`<label class="fd-up">${pt[k]?`<img src="${esc(pt[k])}" alt="">`:'<span>＋</span>'}<small>${label}</small><input type="file" accept="image/*" data-fd-img="${k}" hidden>${pt[k]?`<button type="button" class="fd-x" data-fd="rmimg" data-k="${k}" aria-label="${L('Remove','删除')}">×</button>`:''}</label>`;
  const area=(k,label)=>`<label class="gd-field">${label}<textarea data-fd-reply="${k}" rows="3">${esc(repl(k).join('\n'))}</textarea></label>`;
  return `<section class="fd-settings">
    <div class="gd-label">${esc(L(`${p.name.toUpperCase()}'S PICTURES`,`${p.name}的图片`))}</div>
    <p class="gd-note">${L('Transparent PNGs look best. If “likes it” / “dislikes it” are empty, the normal picture is used.','透明底 PNG 效果最好。没传“喜欢 / 不喜欢”的话就用平时那张。')}</p>
    <div class="fd-ups">${slot('img',L('Normal','平时'))}${slot('imgLike',L('Likes it','喜欢'))}${slot('imgDislike',L('Dislikes it','不喜欢'))}</div>
    <div class="gd-label" style="margin-top:14px">${L('REPLIES','回复')}</div>
    <label class="gd-toggle"><input type="checkbox" data-fd-ai ${F.useAI?'checked':''} ${ai?'':'disabled'}><span><b>${L('Let the AI decide and reply','让 AI 决定喜不喜欢并回复')}</b><small>${ai?L('Uses your Garden API and the character’s persona (costs tokens). Off = default lines below, no tokens.','用 Garden 的 API 和角色人设（会消耗 token）。关闭则用下面的默认回复，不消耗 token。'):L('Add an API in ☰ → Character & API to use this.','先在 ☰ →「角色与 API」里填好 API 才能用。')}</small></span></label>
    <p class="gd-note">${L('One line each. {food} = the food, {name} = the character.','每行一句。{food} 代表食物，{name} 代表角色名。')}</p>
    <div class="fd-replies">${area('like',L('Likes it','喜欢的时候'))}${area('dislike',L('Dislikes it','不喜欢的时候'))}${area('bored',L('Bored of it','吃腻了'))}${area('acquired',L('Grew to like it','吃着吃着喜欢上了'))}</div>
    <div class="fd-row"><button type="button" class="gd-btn" data-fd="resetReplies">${L('Restore defaults','恢复默认回复')}</button><button type="button" class="gd-btn" data-fd="resetTaste">${L('Forget tastes','清空口味记忆')}</button><button type="button" class="gd-btn" data-fd="chars">👥 ${L('Manage characters','管理角色')}</button></div>
  </section>`;
}

/* ---------- feeding ---------- */
function fx(kind){
  const box=root.querySelector('#fdFx'),pet=root.querySelector('#fdPet');if(!box||!pet)return;
  pet.classList.remove('bounce','shake');void pet.offsetWidth;pet.classList.add(kind==='like'||kind==='acquired'?'bounce':'shake');
  const set=kind==='like'||kind==='acquired'?['💖','💕','❤️','💗','✨']:['🤢','💦','〰️','😖','💨'];
  for(let i=0;i<9;i++){const s=document.createElement('span');s.className='fd-p '+(kind==='like'||kind==='acquired'?'up':'puff');s.textContent=set[i%set.length];s.style.left=(30+Math.random()*40)+'%';s.style.animationDelay=(i*70)+'ms';s.style.setProperty('--dx',(Math.random()*80-40)+'px');box.appendChild(s);setTimeout(()=>s.remove(),1700)}
}
function showBubble(text,kind){
  const b=root.querySelector('#fdBubble');if(!b)return;
  b.className='fd-bubble '+(kind==='like'||kind==='acquired'?'good':'bad');b.textContent=text;
  clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>b.classList.add('hidden'),5200);
}
function swapImg(kind){
  const pt=pet(cur),im=root.querySelector('#fdImg');if(!im)return;
  const src=(kind==='like'||kind==='acquired')?(pt.imgLike||pt.img):(pt.imgDislike||pt.img);
  im.src=src;clearTimeout(swapImg.t);swapImg.t=setTimeout(()=>{if(root.querySelector('#fdImg'))root.querySelector('#fdImg').src=pet(cur).img},3200);
}
async function feed(food){
  if(busy||!G()?.consume)return;
  if(!G().consume(food)){say('You don’t have that any more.','已经没有了。');render();return}
  const p=profile(cur);busy=true;render();
  const pf=root.querySelector('#fdPet');pf?.classList.add('eating');
  let res;
  if(F.useAI){try{res=await decideAI(cur,food)}catch(e){res={...decideLocal(cur,food),note:L(`(AI unavailable: ${e.message})`,`（AI 暂时用不了：${e.message}）`)}}}
  else res=decideLocal(cur,food);
  const t=taste(cur,food);t.n++;t.last=Date.now();
  const pt=pet(cur);pt.hist.push({food,like:res.like,kind:res.kind,at:Date.now()});pt.hist=pt.hist.slice(-60);touch(cur);persist();
  const lines=repl(res.kind),text=res.reply||lines[Math.floor(Math.random()*lines.length)].replace(/\{food\}/g,gname(food)).replace(/\{name\}/g,p.name);
  busy=false;render();
  requestAnimationFrame(()=>{swapImg(res.kind);fx(res.kind);showBubble(text+(res.note?` ${res.note}`:''),res.kind)});
}
function readImage(file,cb){
  if(!file||!file.type.startsWith('image/'))return say('Please choose an image.','请选择图片。');
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{const max=384,k=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*k)),h=Math.max(1,Math.round(img.height*k));const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);let d=c.toDataURL('image/webp',.88);if(!d.startsWith('data:image/webp'))d=c.toDataURL('image/png');URL.revokeObjectURL(url);cb(d)};
  img.onerror=()=>{URL.revokeObjectURL(url);say('That image could not be read.','无法读取这张图片。')};img.src=url;
}
function onClick(e){
  const a=e.target.closest('[data-fd]');if(!a||a.disabled)return;
  const act=a.dataset.fd;
  if(act==='back')return close();
  if(act==='who'){cur=a.dataset.id;F.active=cur;persist(false);return render()}
  if(act==='settings'){showSettings=!showSettings;return render()}
  if(act==='feed')return feed(a.dataset.id);
  if(act==='garden'){close(false);setTimeout(()=>G()?.open('mine'),200);return}
  if(act==='market'){close(false);setTimeout(()=>G()?.openMarket?.(),200);return}
  if(act==='chars'){close(false);try{Char.openCharacters()}catch{}return}
  if(act==='rmimg'){e.preventDefault();pet(cur)[a.dataset.k]='';touch(cur);persist();return render()}
  if(act==='resetReplies'){F.replies={};persist();return render()}
  if(act==='resetTaste'){if(!confirm(L('Forget everything this character remembers about food?','清空这个角色的口味记忆？')))return;const pt=pet(cur);pt.prefs={};pt.hist=[];touch(cur);persist();return render()}
}
function onChange(e){
  const t=e.target;
  if(t.matches('[data-fd-img]')){const k=t.dataset.fdImg;readImage(t.files&&t.files[0],d=>{pet(cur)[k]=d;touch(cur);persist();render()});return}
  if(t.matches('[data-fd-ai]')){F.useAI=t.checked;persist();return}
  if(t.matches('[data-fd-reply]')){F.replies[t.dataset.fdReply]=t.value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,20);persist();return}
}

/* ---------- menu + sync ---------- */
function injectMenu(){
  const body=document.querySelector('#sidebarBody');if(!body||body.querySelector('#sbFeed'))return;
  const sec=document.createElement('div');sec.id='sbFeed';sec.className='sidebar-section sidebar-feed';
  sec.innerHTML=`<div class="section-label">🍽 ${L('FEEDING','喂食')}</div><div class="sb-feed-list">${profiles().map(p=>`<button type="button" class="sb-feed-who" data-sb-feed="${esc(p.id)}">${avatar(p,'sb-feed-ava')}<span>${esc(p.name)}</span></button>`).join('')}<button type="button" class="sb-feed-who sb-feed-add" data-sb-chars>＋<span>${L('Add','添加')}</span></button></div>`;
  const g=body.querySelector('#sbGarden');if(g)g.after(sec);else body.prepend(sec);
  sec.querySelectorAll('[data-sb-feed]').forEach(b=>b.onclick=()=>{try{closeSidebar()}catch{}open(b.dataset.sbFeed,{fromMenu:true})});
  const add=sec.querySelector('[data-sb-chars]');if(add)add.onclick=()=>{try{closeSidebar()}catch{}try{Char.openCharacters()}catch{}};
}
try{const _o=openSidebar;openSidebar=function(){_o.apply(this,arguments);injectMenu()};const sb=document.querySelector('#sidebarBtn');if(sb)sb.onclick=openSidebar}catch{}
try{const _c=collectGardenState;collectGardenState=async function(){const s=await _c.apply(this,arguments);s.feed=F;return s}}catch{}
try{const _a=applyCloudState;applyCloudState=async function(state){
  let push=false;
  if(state&&typeof state==='object'){if(state.feed){const m=merge(F,state.feed);push=JSON.stringify(m)!==JSON.stringify(norm(state.feed));F=m;try{localStorage.setItem(FEED_KEY,JSON.stringify(F))}catch{}}else if(Object.keys(F.pets).length)push=true}
  await _a.apply(this,arguments);if(isOpen())render();if(push)setTimeout(()=>{try{queueCloudSync()}catch{}},800);
}}catch{}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen())close()});
window.Feed={open,close,refresh:()=>{if(isOpen())render()},_state:()=>F};
})();
