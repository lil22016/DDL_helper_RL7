/* ==== Deadline Garden · Character (v1) ====
   Who the character is, where their schedule comes from, and how they "think".
   • Uranus mode: schedule comes from the Companion link (existing Loki mirror). Name is typed here.
     An API is optional and only used for in-character replies (lending ✓, decorating, reviewing suggestions).
   • Own-API mode: once a day the character's schedule is generated from the persona with the user's API.
   Without an API every decision falls back to simple rules, so nothing breaks. */
(function(){
'use strict';
const CFG_KEY='deadline-garden-char-cfg-v1',SCHED_KEY='deadline-garden-char-sched-v1',LOCK_KEY='deadline-garden-char-gen-lock';
const zh=()=>typeof uiLanguage!=='undefined'&&uiLanguage==='zh';
const L=(en,cn)=>zh()?cn:en;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const day=d=>{const x=d||new Date();return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const OUTCOMES=['done','changed','failed','cancelled'];

/* ---------- config ---------- */
function blankCfg(){return {mode:'',name:'',userName:'',persona:'',background:'',extra:'',provider:'openai',baseUrl:'',apiKey:'',model:'',updatedAt:0}}
function normCfg(c){const b=blankCfg();if(!c||typeof c!=='object')return b;const o={...b};for(const k of Object.keys(b))if(c[k]!=null)o[k]=typeof b[k]==='number'?Number(c[k])||0:String(c[k]);if(!['','uranus','api'].includes(o.mode))o.mode='';if(!['openai','anthropic'].includes(o.provider))o.provider='openai';return o}
let cfg=blankCfg();
try{cfg=normCfg(JSON.parse(localStorage.getItem(CFG_KEY)||'null'))}catch{}
try{if(!cfg.mode&&typeof lokiCfg!=='undefined'&&lokiCfg.url&&lokiCfg.token)cfg.mode='uranus'}catch{}
function saveCfg(sync=true){cfg.updatedAt=Date.now();try{localStorage.setItem(CFG_KEY,JSON.stringify(cfg))}catch{}if(sync)try{queueCloudSync()}catch{}}
const hasAI=()=>!!(cfg.apiKey&&cfg.model);
const charName=()=>cfg.name.trim()||(typeof lokiData!=='undefined'&&lokiData.name)||L('Character','角色');
const charEmoji=()=>{try{return lokiCfg.emoji||'✨'}catch{return '✨'}};
const userName=()=>cfg.userName.trim()||L('the user','用户');

/* ---------- AI client (OpenAI-compatible or Anthropic, straight from the browser) ---------- */
async function post(url,headers,body,timeout=70000){
  const ac=new AbortController(),t=setTimeout(()=>ac.abort(),timeout);
  try{
    const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:ac.signal});
    const txt=await r.text();let j=null;try{j=JSON.parse(txt)}catch{}
    if(!r.ok){const m=j?.error?.message||j?.message||txt.slice(0,200)||`HTTP ${r.status}`;const e=new Error(m);e.status=r.status;throw e}
    return j;
  }catch(e){if(e.name==='AbortError')throw new Error(L('The API took too long to answer.','API 响应超时。'));if(e instanceof TypeError)throw new Error(L('Could not reach the API (network or CORS). Check the Base URL.','连不上 API（网络或跨域限制），请检查 Base URL。'));throw e}
  finally{clearTimeout(t)}
}
async function ask(system,user,{maxTokens=900,temperature=0.9}={}){
  if(!hasAI())throw new Error(L('No API configured.','还没有配置 API。'));
  if(cfg.provider==='anthropic'){
    const base=(cfg.baseUrl||'https://api.anthropic.com').replace(/\/+$/,'').replace(/\/v1(\/messages)?$/,'');
    const j=await post(`${base}/v1/messages`,{'content-type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},{model:cfg.model,max_tokens:maxTokens,temperature,system,messages:[{role:'user',content:user}]});
    return (j?.content||[]).map(b=>b.text||'').join('').trim();
  }
  let base=(cfg.baseUrl||'https://api.openai.com/v1').replace(/\/+$/,'');
  const url=/\/chat\/completions$/.test(base)?base:`${base}/chat/completions`;
  const headers={'content-type':'application/json',authorization:`Bearer ${cfg.apiKey}`};
  const messages=[{role:'system',content:system},{role:'user',content:user}];
  let j;
  try{j=await post(url,headers,{model:cfg.model,messages,temperature,max_tokens:maxTokens})}
  catch(e){if(e.status===400)j=await post(url,headers,{model:cfg.model,messages});else throw e} // some models reject temperature / max_tokens
  return String(j?.choices?.[0]?.message?.content||'').trim();
}
function parseJSON(text){
  let s=String(text||'').replace(/```(?:json)?/gi,'').trim();
  const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a<0||b<=a)throw new Error(L('The AI reply was not JSON.','AI 回复的不是 JSON。'));
  return JSON.parse(s.slice(a,b+1));
}
async function askJSON(system,user,opts){return parseJSON(await ask(system,user+`\n\n${L('Respond with ONLY the JSON object, no other text.','只输出 JSON 对象，不要输出其他文字。')}`,opts))}

function personaSystem(){
  const lines=[`You are role-playing ${charName()}. Stay fully in character at all times; never mention being an AI or a model.`];
  if(cfg.persona.trim())lines.push(`Persona / personality:\n${cfg.persona.trim()}`);
  if(cfg.background.trim())lines.push(`Background:\n${cfg.background.trim()}`);
  if(cfg.extra.trim())lines.push(`Other details:\n${cfg.extra.trim()}`);
  lines.push(`The person you talk to is ${userName()}. You both use an app called Deadline Garden: finishing plans earns ✓ (check marks), and ✓ buy plants and decorations for your own little fenced garden.`);
  lines.push(`Language: write every human-readable text (titles, replies) in ${zh()?'Simplified Chinese':'English'} unless your persona clearly speaks another language.`);
  return lines.join('\n\n');
}

/* ---------- daily schedule for own-API mode ---------- */
function blankSched(){return {days:{},error:'',updatedAt:0}}
function normSched(s){const o=blankSched();if(!s||typeof s!=='object')return o;if(s.days&&typeof s.days==='object')for(const [d,v] of Object.entries(s.days))if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&v&&Array.isArray(v.items))o.days[d]={at:Number(v.at)||0,items:v.items.filter(i=>i&&i.id&&i.title)};o.error=String(s.error||'');o.updatedAt=Number(s.updatedAt)||0;return o}
let sched=blankSched();
try{sched=normSched(JSON.parse(localStorage.getItem(SCHED_KEY)||'null'))}catch{}
function saveSched(sync=true){
  sched.updatedAt=Date.now();
  const keys=Object.keys(sched.days).sort();while(keys.length>60)delete sched.days[keys.shift()];
  try{localStorage.setItem(SCHED_KEY,JSON.stringify(sched))}catch{}
  if(sync)try{queueCloudSync()}catch{}
}
function mergeSched(a,b){
  const A=normSched(a),B=normSched(b),o=blankSched();
  for(const d of new Set([...Object.keys(A.days),...Object.keys(B.days)])){const x=A.days[d],y=B.days[d];o.days[d]=!x?y:!y?x:(y.at>x.at?y:x)}
  o.error=(B.updatedAt>A.updatedAt?B:A).error;o.updatedAt=Math.max(A.updatedAt,B.updatedAt);return o;
}
const hhmm=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v||''))?String(v):'';
function endMs(it){const e=it.end||it.time;return e?new Date(`${it.date}T${e}:00`).getTime():new Date(`${it.date}T23:59:59`).getTime()}
/* Outcomes are decided when the day is planned but only revealed once each activity has ended. */
function schedItems(){
  const out=[],now=Date.now();
  for(const [d,v] of Object.entries(sched.days))for(const it of v.items){
    const base={id:it.id,date:d,time:it.time||'',end:it.end||'',title:it.title,desc:it.desc||''};
    out.push({...base,status:now>endMs(base)?(OUTCOMES.includes(it.outcome)?it.outcome:'done'):'planned'});
  }
  return out;
}
function loadIntoLoki(){
  if(typeof lokiData==='undefined')return;
  const today=sched.days[day()];
  lokiData={name:charName(),items:schedItems(),fetchedAt:today?.at||0,error:sched.error||''};
}
let generating=false;
async function generateDay(force=false){
  if(cfg.mode!=='api'||!hasAI()||generating)return false;
  const d=day();if(!force&&sched.days[d])return false;
  try{const lk=JSON.parse(localStorage.getItem(LOCK_KEY)||'null');if(!force&&lk&&lk.day===d&&Date.now()-lk.at<120000)return false}catch{}
  try{localStorage.setItem(LOCK_KEY,JSON.stringify({day:d,at:Date.now()}))}catch{}
  generating=true;notify();
  try{
    const now=new Date(),weekday=now.toLocaleDateString('en-US',{weekday:'long'});
    const recent=Object.keys(sched.days).filter(x=>x<d).sort().slice(-2).map(x=>`${x}: `+sched.days[x].items.map(i=>`${i.time||'?'} ${i.title} (${i.outcome||'done'})`).join('; ')).join('\n');
    const user=`Today is ${d} (${weekday}). Plan ${charName()}'s day: 4 to 8 activities with specific start and end times, realistic for the persona and background, in character.
For each activity also decide in advance how it will actually turn out (revealed only after it ends): "done" for most, "changed" when the plan changes (about 15%), "failed" when it doesn't get done (about 10%), "cancelled" rarely.
${recent?`Recent days, for continuity:\n${recent}\n`:''}
JSON shape: {"items":[{"time":"HH:MM","end":"HH:MM","title":"short title (max 16 chars)","desc":"one sentence","outcome":"done"}]}`;
    const j=await askJSON(personaSystem(),user,{maxTokens:1400});
    const items=(Array.isArray(j.items)?j.items:[]).slice(0,10).map((x,i)=>({id:`ai-${d}-${i}`,time:hhmm(x.time),end:hhmm(x.end),title:String(x.title||'').trim().slice(0,60),desc:String(x.desc||'').trim().slice(0,240),outcome:OUTCOMES.includes(x.outcome)?x.outcome:'done'})).filter(x=>x.title);
    if(!items.length)throw new Error(L('The AI returned an empty schedule.','AI 返回的日程是空的。'));
    items.sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));
    sched.days[d]={at:Date.now(),items};sched.error='';saveSched();
    return true;
  }catch(e){sched.error=String(e?.message||e);saveSched(false);return false}
  finally{generating=false;try{localStorage.removeItem(LOCK_KEY)}catch{}refreshLoki();notify()}
}
function refreshLoki(){if(cfg.mode==='api'){loadIntoLoki();try{renderLoki();updateLokiStatus()}catch{}}}
const listeners=new Set();function notify(){for(const f of listeners)try{f()}catch{}}

/* ---------- in-character decisions (with rule-based fallbacks) ---------- */
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const fmt=n=>Number.isInteger(n)?String(n):n.toFixed(1);
function fallbackLoan(c){
  const cap=Math.floor(c.charAvail);if(cap<1)return {agree:false,amount:0,reply:L(`I don't have any ✓ to spare right now.`,`我自己现在也没有多余的 ✓ 了。`)};
  let p=.85-.12*Math.min(4,c.debt)-.45*Math.min(1,c.amount/Math.max(1,c.charAvail));if(!c.repay)p-=.1;
  if(Math.random()>Math.max(.1,p))return {agree:false,amount:0,reply:rnd(L(['Not this time — finish a couple of your own first.','Hmm… no. You still owe me, remember?','I need mine for my garden today.'],['这次不行，先自己完成几个吧。','嗯……不借。你上次的还没还呢。','我今天要用来布置花园。']))};
  const amount=Math.max(1,Math.min(cap,c.amount));
  return {agree:true,amount,reply:amount<c.amount?L(`I can only spare ${amount}.`,`我只能借你 ${amount} 个。`):rnd(L(['Fine. Take them.','Here you go — spend them well.','Okay, just this once.'],['好吧，拿去。','给你，好好用。','行，就这一次。']))};
}
async function decideLoan(c){
  if(Math.floor(c.charAvail)<1)return fallbackLoan(c);
  if(!hasAI())return fallbackLoan(c);
  const hist=(c.history||[]).map(h=>`- asked ${h.asked}, ${h.amount?`lent ${h.amount}`:'refused'}${h.repay?` (to repay, ${fmt(h.repaid)} repaid)`:' (gift)'}`).join('\n');
  const user=`${userName()} asks to borrow ${c.amount} ✓ from you.
Your balance: ${fmt(c.charAvail)} ✓ (you earn 1 per finished plan, 0.5 per changed plan). Their balance: ${fmt(c.myAvail)} ✓. They currently owe you ${fmt(c.debt)} ✓.
${c.repay?'They promise to pay it back from the next plans they finish.':'This would be a gift — they will not pay it back.'}
${c.msg?`Their message: "${c.msg}"`:'They did not add a message.'}
${hist?`Earlier requests:\n${hist}`:''}
Decide in character whether to lend, and how many (whole number, 0 to ${Math.min(c.amount,Math.floor(c.charAvail))}). You may lend fewer than asked.
JSON shape: {"agree":true,"amount":${c.amount},"reply":"what you say to them, 1-3 sentences"}`;
  const j=await askJSON(personaSystem(),user,{maxTokens:400});
  const amount=j.agree?Math.max(0,Math.min(Math.floor(c.charAvail),c.amount,Math.round(Number(j.amount)||0))):0;
  return {agree:amount>0,amount,reply:String(j.reply||'').trim().slice(0,400)||(amount?L('Here.','给你。'):L('No.','不借。'))};
}
function fallbackDecorate(c){
  const plan={buy:[],place:[],say:''};let budget=Math.floor(c.avail*.7),empty=[...c.empty];
  const buyable=c.catalog.filter(x=>x.price<=budget);
  for(let i=0;i<8&&budget>0&&empty.length;i++){const opts=c.catalog.filter(x=>x.price<=budget);if(!opts.length)break;const it=rnd(opts);plan.buy.push(it.id);budget-=it.price;const k=empty.splice(Math.floor(Math.random()*empty.length),1)[0];plan.place.push({id:it.id,to:k})}
  for(const [id,n] of Object.entries(c.inv))for(let i=0;i<n&&empty.length;i++){const k=empty.splice(Math.floor(Math.random()*empty.length),1)[0];plan.place.push({id,to:k})}
  plan.say=plan.place.length?rnd(L(['There. Much better.','I like it like this.','Done — don’t touch anything.'],['好了，好看多了。','我喜欢这样。','布置好了，别乱动。'])):L('Nothing to add today.','今天没什么要加的。');
  if(!buyable.length&&!plan.place.length)plan.say=L('I need more ✓ before I can buy anything.','我得再攒点 ✓ 才能买东西。');
  return plan;
}
async function decorate(c){
  if(!hasAI())return fallbackDecorate(c);
  const user=`You are decorating YOUR OWN garden in Deadline Garden. It is a grid of ${c.rows} rows × ${c.cols} columns; cells are written "row,col" starting at 0,0 (row 0 is the back, the last row is the front).
You have ${fmt(c.avail)} ✓ to spend. Shop (id | name | price | kind):
${c.catalog.map(x=>`${x.id} | ${x.name} | ${x.price} | ${x.kind}`).join('\n')}
Fences (id | name | price | owned): ${c.fences.map(f=>`${f.id} | ${f.name} | ${f.price} | ${f.owned?'owned':'no'}`).join('; ')}. Current fence: ${c.fence}.
Adding a row or a column costs ${c.expandCost} ✓.
Already in your bag (not placed): ${Object.entries(c.inv).map(([k,n])=>`${k}×${n}`).join(', ')||'nothing'}.
Currently placed: ${c.placed.map(p=>`${p.at}=${p.id}`).join(', ')||'nothing yet'}.
Decorate it the way ${charName()} would, with your own taste. Spend at most your balance. Every item you buy must be placed on an empty cell (or kept in the bag). You may move things too.
JSON shape: {"buy":["id",...],"place":[{"id":"id","to":"r,c"}],"move":[{"from":"r,c","to":"r,c"}],"fence":"id or empty","expand":"row|col|empty","say":"one or two sentences in character about your garden"}`;
  const j=await askJSON(personaSystem(),user,{maxTokens:900,temperature:1});
  return {buy:Array.isArray(j.buy)?j.buy.map(String):[],place:Array.isArray(j.place)?j.place:[],move:Array.isArray(j.move)?j.move:[],fence:String(j.fence||''),expand:String(j.expand||''),say:String(j.say||'').trim().slice(0,400)};
}
function fallbackReview(c){
  const accepted=c.ops.map((_,i)=>i).filter(()=>Math.random()<.72);
  const reply=accepted.length===c.ops.length?rnd(L(['Fine, your way.','Okay, I like that.'],['行，听你的。','嗯，这样也不错。'])):accepted.length?L('Some of it. Not all.','一部分可以，其他的不行。'):rnd(L(['No. It’s my garden.','I’d rather keep it as it is.'],['不要，这是我的花园。','我还是喜欢原来的样子。']));
  return {accepted,reply};
}
async function review(c){
  if(!hasAI())return fallbackReview(c);
  const user=`${userName()} suggests changes to YOUR garden (they cannot change it without your approval). Grid ${c.rows}×${c.cols}, cells "row,col". Your balance before the changes: ${fmt(c.avail)} ✓ — purchases are paid with your ✓.
Currently placed: ${c.placed.map(p=>`${p.at}=${p.name}`).join(', ')||'nothing'}.
Suggested steps (later steps may depend on earlier ones):
${c.ops.map((o,i)=>`#${i} ${o}`).join('\n')}
${c.msg?`Their note: "${c.msg}"`:''}
Decide in character which steps you accept.
JSON shape: {"accepted":[0,1],"reply":"what you say to them, 1-3 sentences"}`;
  const j=await askJSON(personaSystem(),user,{maxTokens:400});
  return {accepted:(Array.isArray(j.accepted)?j.accepted:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<c.ops.length),reply:String(j.reply||'').trim().slice(0,400)};
}

/* ---------- settings modal ---------- */
function field(id,label,val,ph='',type='text'){return `<div class="field full"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(val)}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="false"></div>`}
function area(id,label,val,ph=''){return `<div class="field full"><label for="${id}">${label}</label><textarea id="${id}" rows="3" placeholder="${esc(ph)}">${esc(val)}</textarea></div>`}
function openSettings(){
  try{closeSidebar()}catch{}
  const link=(()=>{try{return lokiCfg.url&&lokiCfg.token?`${lokiCfg.url}/garden/feed?t=${lokiCfg.token}`:''}catch{return ''}})();
  let mode=cfg.mode||(link?'uranus':'api');
  const html=()=>`<div class="section-label">${L('CHARACTER','角色')}</div><h3>${L('Character & API','角色与 API')}</h3>
  <div class="cs-modes" role="radiogroup">
    <button type="button" class="cs-mode${mode==='uranus'?' on':''}" data-cs-mode="uranus"><strong>${L('Connected to Uranus','已连接 Uranus')}</strong><small>${L('Schedule comes from Companion. Only a name is needed.','日程来自 Companion，只需填角色名。')}</small></button>
    <button type="button" class="cs-mode${mode==='api'?' on':''}" data-cs-mode="api"><strong>${L('Use my own API','使用自己的 API')}</strong><small>${L('Garden writes the character’s schedule every day.','Garden 每天用你的 API 给角色生成日程。')}</small></button>
  </div>
  <div class="form-grid">
    ${field('csName',L('Character name','角色名'),cfg.name,mode==='uranus'?(typeof lokiData!=='undefined'&&lokiData.name)||'Loki':L('e.g. Alex','例如：阿澈'))}
    ${field('csUser',L('What the character calls you (optional)','角色怎么称呼你（可选）'),cfg.userName,L('e.g. your nickname','例如：你的昵称'))}
  </div>
  ${mode==='uranus'?`<div class="cs-block"><div class="cs-block-title">${L('Companion link','Companion 链接')}</div><div class="next-meta">Companion → Settings → “DDL Garden connection”: ${L('generate, copy the link, paste it here once.','生成并复制链接，粘贴到这里一次即可。')}</div>
    <div class="cs-row"><input id="csLink" type="text" autocomplete="off" spellcheck="false" placeholder="https://…/garden/feed?t=…" value="${esc(link)}"><button id="csLinkSave" class="soft-btn" type="button">${L('Save & sync','保存并同步')}</button></div><div id="lokiConnStatus" class="next-meta"></div></div>`:''}
  <details class="cs-block" ${mode==='api'||cfg.apiKey?'open':''}><summary class="cs-block-title">${mode==='api'?L('API','API'):L('API for in-character replies (optional)','用于角色回复的 API（可选）')}</summary>
    <div class="next-meta">${mode==='api'?L('Used to write the daily schedule and the character’s replies.','用来每天生成日程，以及角色的回复。'):L('Used only when you borrow ✓, ask the character to decorate, or send suggestions. Without it the character answers with simple rules.','只在借 ✓、让角色布置、发送修改建议时调用。不填的话角色会按简单规则回复。')} ${L('The key is saved with your account so every device can use it.','Key 会随账号同步，所有设备都能用。')}</div>
    <div class="form-grid">
      <div class="field full"><label for="csProvider">${L('Format','接口格式')}</label><select id="csProvider"><option value="openai" ${cfg.provider==='openai'?'selected':''}>${L('OpenAI-compatible (OpenAI, DeepSeek, OpenRouter, Gemini…)','OpenAI 兼容（OpenAI、DeepSeek、OpenRouter、Gemini 等）')}</option><option value="anthropic" ${cfg.provider==='anthropic'?'selected':''}>Anthropic (Claude)</option></select></div>
      ${field('csBase','Base URL',cfg.baseUrl,cfg.provider==='anthropic'?'https://api.anthropic.com':'https://api.openai.com/v1')}
      ${field('csKey','API Key',cfg.apiKey,'sk-…','password')}
      ${field('csModel',L('Model','模型'),cfg.model,cfg.provider==='anthropic'?'claude-…':'gpt-4o-mini / deepseek-chat')}
    </div>
    <div class="cs-row"><button id="csTest" class="soft-btn" type="button">${L('Test connection','测试连接')}</button><span id="csTestOut" class="next-meta"></span></div>
    <div class="next-meta">${L('The API must allow direct browser requests (CORS).','API 需要允许浏览器直接请求（CORS）。')}</div>
  </details>
  <details class="cs-block" ${mode==='api'?'open':''}><summary class="cs-block-title">${mode==='api'?L('Who the character is','角色设定'):L('Character profile for replies (optional)','回复用的角色设定（可选）')}</summary>
    <div class="form-grid">
      ${area('csPersona',L('Personality','人设 / 性格'),cfg.persona,L('How they talk, what they care about…','说话方式、性格、在意什么……'))}
      ${area('csBackground',L('Background','背景'),cfg.background,L('Job, routine, where they live…','职业、日常、住在哪里……'))}
      ${area('csExtra',L('Anything else','其他'),cfg.extra,L('Relationship with you, habits…','和你的关系、习惯……'))}
    </div>
  </details>
  ${mode==='api'?`<div class="cs-block"><div class="cs-block-title">${L('Daily schedule','每日日程')}</div><div id="csSchedStatus" class="next-meta"></div><div class="cs-row"><button id="csGen" class="soft-btn" type="button">${sched.days[day()]?L('Regenerate today','重新生成今天'):L('Generate today now','现在生成今天')}</button></div></div>`:''}
  <div class="modal-actions"><button id="csCancel" class="soft-btn" type="button">${L('Close','关闭')}</button><button id="csSave" class="primary-btn" type="button">${L('Save','保存')}</button></div>`;
  const read=()=>{const v=id=>document.getElementById(id)?.value??null;const set=(k,id,trim=true)=>{const x=v(id);if(x!=null)cfg[k]=trim?x.trim():x};
    cfg.mode=mode;set('name','csName');set('userName','csUser');set('provider','csProvider');set('baseUrl','csBase');set('apiKey','csKey');set('model','csModel');set('persona','csPersona',false);set('background','csBackground',false);set('extra','csExtra',false)};
  const statusText=()=>{const t=sched.days[day()];return generating?L('Writing today’s schedule…','正在生成今天的日程…'):sched.error?L(`Last attempt failed: ${sched.error}`,`上次生成失败：${sched.error}`):t?L(`Today: ${t.items.length} activities · generated ${new Date(t.at).toLocaleTimeString(uiLocale(),{hour:'numeric',minute:'2-digit'})}`,`今天：${t.items.length} 项活动 · ${new Date(t.at).toLocaleTimeString(uiLocale(),{hour:'numeric',minute:'2-digit'})} 生成`):(hasAI()?L('Not generated yet — it happens automatically when Garden opens each day.','今天还没生成——每天打开 Garden 时会自动生成。'):L('Add an API key and model to start.','填好 API Key 和模型后开始。'))};
  const bind=()=>{
    document.querySelectorAll('[data-cs-mode]').forEach(b=>b.onclick=()=>{read();mode=b.dataset.csMode;draw()});
    const prov=document.getElementById('csProvider');if(prov)prov.onchange=()=>{read();draw()};
    document.getElementById('csCancel').onclick=()=>{listeners.delete(onUpd);closeModal()};
    document.getElementById('csSave').onclick=()=>{
      const prevMode=cfg.mode;read();saveCfg();
      if(prevMode!==cfg.mode){try{if(cfg.mode==='api'){loadIntoLoki()}else{lokiData={name:'',items:[],fetchedAt:0,error:''}}}catch{}}
      try{applyLokiAppearance();if(cfg.mode==='api')refreshLoki();else fetchLoki().catch(()=>{});renderLoki()}catch{}
      listeners.delete(onUpd);closeModal();toast(L('Character saved.','角色设置已保存。'));
      if(cfg.mode==='api')generateDay().catch(()=>{});
      try{window.DeadlineGarden?.refresh()}catch{}
    };
    const test=document.getElementById('csTest');if(test)test.onclick=async()=>{read();const out=document.getElementById('csTestOut');out.textContent=L('Testing…','测试中…');try{const t=await ask('Reply with the single word OK.','Say OK.',{maxTokens:10,temperature:0});out.textContent=L(`Works ✓ (${t.slice(0,30)||'empty reply'})`,`可以用 ✓（${t.slice(0,30)||'空回复'}）`)}catch(e){out.textContent=L(`Failed: ${e.message}`,`失败：${e.message}`)}};
    const gen=document.getElementById('csGen');if(gen)gen.onclick=async()=>{read();cfg.mode='api';saveCfg();gen.disabled=true;await generateDay(true);gen.disabled=false;draw()};
    const ls=document.getElementById('csLinkSave');if(ls)ls.onclick=async()=>{
      const raw=document.getElementById('csLink').value.trim(),st=document.getElementById('lokiConnStatus');
      if(!raw){lokiCfg.url='';lokiCfg.token='';lokiData={name:'',items:[],fetchedAt:0,error:''};saveLokiCfg();try{localStorage.removeItem(LOKI_CACHE_KEY)}catch{}queueCloudSync();renderLoki();updateLokiStatus();return}
      const p=lokiParseLink(raw);if(!p||!p.token){st.textContent=L('That doesn’t look like a Companion link (it needs ?t=…).','这不像 Companion 链接（需要带 ?t=…）。');return}
      read();cfg.mode='uranus';saveCfg();lokiCfg.url=p.url;lokiCfg.token=p.token;saveLokiCfg();queueCloudSync();
      st.textContent=L('Connecting…','连接中…');await fetchLoki();if(!lokiData.error)pushDdlSnapshot(true).catch(()=>{});
    };
    try{updateLokiStatus()}catch{}
    const ss=document.getElementById('csSchedStatus');if(ss)ss.textContent=statusText();
  };
  const draw=()=>{const card=document.getElementById('modalCard');if(!card)return;card.innerHTML=html();card.classList.add('cs-card');bind()};
  const onUpd=()=>{const ss=document.getElementById('csSchedStatus');if(ss)ss.textContent=statusText()};
  listeners.add(onUpd);
  showModal(html());document.getElementById('modalCard')?.classList.add('cs-card');bind();
}

/* ---------- hooks ---------- */
try{const _c=collectGardenState;collectGardenState=async function(){const s=await _c.apply(this,arguments);s.charCfg={...cfg};s.charSched=sched;return s}}catch{}
try{const _a=applyCloudState;applyCloudState=async function(state){
  let push=false;
  if(state&&typeof state==='object'){
    if(state.charCfg&&typeof state.charCfg==='object'){const r=normCfg(state.charCfg);if(r.updatedAt>cfg.updatedAt){cfg=r;try{localStorage.setItem(CFG_KEY,JSON.stringify(cfg))}catch{}}else if(cfg.updatedAt>r.updatedAt)push=true}else if(cfg.updatedAt)push=true;
    if(state.charSched){const m=mergeSched(sched,state.charSched);push=push||JSON.stringify(m.days)!==JSON.stringify(normSched(state.charSched).days);sched=m;try{localStorage.setItem(SCHED_KEY,JSON.stringify(sched))}catch{}}else if(Object.keys(sched.days).length)push=true;
  }
  await _a.apply(this,arguments);
  if(cfg.mode==='api'){refreshLoki();setTimeout(()=>generateDay().catch(()=>{}),1500)}
  if(push)setTimeout(()=>{try{queueCloudSync()}catch{}},600);
}}catch{}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&cfg.mode==='api')generateDay().catch(()=>{})});
setInterval(()=>{if(!document.hidden&&cfg.mode==='api')generateDay().catch(()=>{})},10*60000);
setTimeout(()=>{if(cfg.mode==='api'){refreshLoki();generateDay().catch(()=>{})}},2500);

window.Char={
  get cfg(){return cfg},get sched(){return sched},saveCfg,name:charName,emoji:charEmoji,userName,hasAI,mode:()=>cfg.mode,
  ask,askJSON,decideLoan,decorate,review,openSettings,generateDay,loadIntoLoki,isGenerating:()=>generating,
  onChange(f){listeners.add(f);return()=>listeners.delete(f)},fmt
};
})();
