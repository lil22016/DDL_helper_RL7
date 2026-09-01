const DB_NAME='deadline-garden-db', DB_VERSION=1, STORE='tasks';
let db, currentMonth=new Date(), tasks=[], lastEmergencyTaskId=null;
const $=s=>document.querySelector(s);
const pad=n=>String(n).padStart(2,'0');
const fmtDateInput=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fmtTimeInput=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>{db=r.result;resolve(db)};r.onerror=()=>reject(r.error)})}
function idbGetAll(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
function idbPut(t){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(t);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
function idbDelete(id){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
function dueMs(t){if(!t.date)return Infinity;const time=t.time||'23:59';return new Date(`${t.date}T${time}:00`).getTime()}
function urgency(t){if(t.done)return 0;const diff=dueMs(t)-Date.now();if(diff<0)return 5;if(diff<=15*60e3)return 5;if(diff<=30*60e3)return 4;if(diff<=2*3600e3)return 4;if(diff<=6*3600e3)return 3;if(diff<=24*3600e3)return 3;if(diff<=3*86400e3)return 2;if(diff<=7*86400e3)return 1;return 0}
function formatDue(t){const d=new Date(`${t.date}T${t.time||'12:00'}:00`);const date=d.toLocaleDateString(undefined,{month:'short',day:'numeric'});return `${date}${t.time?` · ${d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}`:' · No specific time'}`}
function countdown(ms){const neg=ms<0;ms=Math.abs(ms);const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);if(h>=24){const d=Math.floor(h/24);return `${neg?'Overdue ':'Due in '}${d}d ${h%24}h`;}return `${neg?'Overdue by ':'Due in '}${pad(h)}:${pad(m)}:${pad(s)}`}
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

async function refresh(){tasks=await idbGetAll();tasks.sort((a,b)=>dueMs(a)-dueMs(b));renderAll()}
function renderAll(){renderHeader();renderCalendar();renderTodo();renderWarnings();}
function renderHeader(){const now=new Date();$('#todayHeading').textContent=now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});const pending=tasks.filter(t=>!t.done);const focus=getTodoGroups(pending).today.length;$('#summaryLine').textContent=focus?`${focus} task${focus===1?'':'s'} to focus on today`:'Nothing due today';$('#todoCount').textContent=focus;$('#todoToggle').setAttribute('aria-label',`Open to-do list: ${focus} tasks for today, including overdue`);const next=pending[0];if(!next){$('#nextTitle').textContent='Nothing due soon';$('#nextMeta').textContent='Your calendar is clear.';$('#nextCountdown').textContent='';return;}$('#nextTitle').textContent=`${next.course?next.course+' · ':''}${next.title}`;$('#nextMeta').textContent=formatDue(next);const diff=dueMs(next)-Date.now();$('#nextCountdown').textContent=diff<=2*3600e3?countdown(diff):''}
function renderCalendar(){const y=currentMonth.getFullYear(),m=currentMonth.getMonth();$('#monthLabel').textContent=currentMonth.toLocaleDateString(undefined,{month:'long',year:'numeric'});const first=new Date(y,m,1),start=new Date(y,m,1-first.getDay());let html='';for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const ds=fmtDateInput(d);const dayTasks=tasks.filter(t=>t.date===ds);const outside=d.getMonth()!==m, today=ds===fmtDateInput(new Date());html+=`<div class="day-cell ${outside?'outside':''} ${today?'today':''}" data-date="${ds}"><div class="day-number"><span>${d.getDate()}</span></div>${dayTasks.slice(0,5).map(t=>`<button class="event-chip ${t.done?'done':''} urgent${urgency(t)}" data-id="${t.id}">${escapeHtml(t.time?t.time+' ':'' )}${escapeHtml(t.title)}</button>`).join('')}${dayTasks.length>5?`<div class="tiny">+${dayTasks.length-5} more</div>`:''}</div>`}$('#calendarGrid').innerHTML=html;document.querySelectorAll('.event-chip').forEach(el=>el.onclick=e=>{e.stopPropagation();openTaskModal(tasks.find(t=>t.id===el.dataset.id))});document.querySelectorAll('.day-cell').forEach(el=>el.onclick=()=>openTaskModal(null,el.dataset.date))}
// Calendar boundaries use local dates, including weeks spanning DST and year changes.
function getTodoGroups(pending,now=new Date()){
  const today=fmtDateInput(now),monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  monday.setDate(monday.getDate()-((now.getDay()+6)%7));
  const nextMonday=new Date(monday);nextMonday.setDate(monday.getDate()+7);
  const followingMonday=new Date(nextMonday);followingMonday.setDate(nextMonday.getDate()+7);
  const next=fmtDateInput(nextMonday),following=fmtDateInput(followingMonday);
  const weekend=now.getDay()===6||now.getDay()===0;
  const groups={today:[],week:[],next:[],later:[],weekend};
  for(const t of [...pending].filter(t=>!t.done).sort((a,b)=>dueMs(a)-dueMs(b))){
    if(t.date<=today)groups.today.push(t);
    else if(t.date<next)groups.week.push(t);
    else if(weekend&&t.date<following)groups.next.push(t);
    else groups.later.push(t);
  }
  return groups;
}
const TODO_PREF_KEY='deadline-garden-todo-sections-v2';
let todoOpen={today:true,week:true,next:true,later:false},todoSignature='';
try{const saved=JSON.parse(localStorage.getItem(TODO_PREF_KEY)||'{}');for(const key of Object.keys(todoOpen))if(typeof saved[key]==='boolean')todoOpen[key]=saved[key]}catch{}
function renderTodo(){
  const pending=tasks.filter(t=>!t.done),groups=getTodoGroups(pending),today=fmtDateInput(new Date());
  const overdue=groups.today.filter(t=>t.date<today).length;
  $('#todoSubtitle').textContent=groups.today.length?`${groups.today.length} for today${overdue?' · includes overdue':''}`:'Nothing due today';
  // Only rebuild when task data or the calendar day changes. Timers update in place,
  // so one-second refreshes preserve focus, scrolling and collapsed sections.
  const signature=JSON.stringify([today,pending]);
  if(signature!==todoSignature){
    todoSignature=signature;
    const sections=[['today','Today',groups.today],['week','This week',groups.week]];
    if(groups.weekend)sections.push(['next','Next week',groups.next]);
    sections.push(['later','All later deadlines',groups.later]);
    $('#todoList').innerHTML=sections.map(([key,label,items])=>`<details class="todo-section" data-section="${key}" ${todoOpen[key]?'open':''}>
      <summary><span>${label}</span><span class="todo-section-count">${items.length}</span><span class="todo-chevron" aria-hidden="true">›</span></summary>
      <div class="todo-section-items">${items.length?items.map(t=>`<div class="todo-item">
        <label class="todo-check"><input type="checkbox" data-check="${escapeHtml(t.id)}" aria-label="Mark ${escapeHtml(t.title)} as done"></label>
        <div class="todo-content"><div class="todo-title">${escapeHtml(t.title)}</div>
          ${t.course?`<div class="todo-course">${escapeHtml(t.course)}</div>`:''}
          <div class="todo-meta">${escapeHtml(formatDue(t))}</div>
          <div class="todo-timer" data-timer="${escapeHtml(t.id)}"></div>
        </div></div>`).join(''):`<div class="todo-empty">${key==='today'?'All clear for today.':key==='week'?'No other tasks due this week.':key==='next'?'Nothing due next week.':'No later deadlines.'}</div>`}</div>
      </details>`).join('');
    document.querySelectorAll('[data-check]').forEach(c=>c.onchange=()=>completeTask(c.dataset.check));
    document.querySelectorAll('[data-section]').forEach(el=>el.ontoggle=()=>{
      todoOpen[el.dataset.section]=el.open;
      try{localStorage.setItem(TODO_PREF_KEY,JSON.stringify(todoOpen))}catch{}
    });
  }
  const byId=new Map(pending.map(t=>[t.id,t]));
  document.querySelectorAll('[data-timer]').forEach(el=>{
    const t=byId.get(el.dataset.timer);if(!t)return;
    const diff=dueMs(t)-Date.now();
    el.textContent=diff<=2*3600e3?countdown(diff):'';
    el.hidden=!el.textContent;
  });
}
function renderWarnings(){const active=tasks.filter(t=>!t.done).sort((a,b)=>dueMs(a)-dueMs(b))[0];const wb=$('#warningBackdrop');wb.className='warning-backdrop';$('#warningKicker').textContent='';$('#warningText').textContent='';if(!active)return;const diff=dueMs(active)-Date.now();if(diff>0&&diff<=30*60e3){const level=diff<=15*60e3?2:1;wb.classList.add(`level${level}`);$('#warningKicker').textContent=level===2?'URGENT DEADLINE':'DEADLINE APPROACHING';$('#warningText').textContent=`${active.title} · ${countdown(diff)}`;if(level===2&&lastEmergencyTaskId!==active.id){lastEmergencyTaskId=active.id;openEmergency(active,diff)}}}

function showModal(html){$('#modalCard').innerHTML=html;$('#modalRoot').classList.remove('hidden')}
function closeModal(){$('#modalRoot').classList.add('hidden')}
$('#modalRoot').onclick=e=>{if(e.target===$('#modalRoot'))closeModal()}
function openTaskModal(task=null,prefillDate=''){const now=new Date(),t=task||{title:'',course:'',date:prefillDate||fmtDateInput(now),time:'',notes:'',done:false};showModal(`<h3>${task?'Edit task':'Add task'}</h3><div class="form-grid"><div class="field full"><label>Task name</label><input id="fTitle" value="${escapeHtml(t.title)}" placeholder="Reflection Paper"></div><div class="field"><label>Course (optional)</label><input id="fCourse" value="${escapeHtml(t.course||'')}" placeholder="PSYC 3500"></div><div class="field"><label>Date</label><input id="fDate" type="date" value="${t.date}"></div><div class="field"><label>Exact due time (optional)</label><input id="fTime" type="time" value="${t.time||''}"></div><div class="field full"><label>Notes</label><textarea id="fNotes">${escapeHtml(t.notes||'')}</textarea></div></div><div class="modal-actions">${task?'<button id="deleteTask" class="danger-btn">Delete</button>':''}<button id="cancelModal" class="soft-btn">Cancel</button><button id="saveTask" class="primary-btn">Save</button></div>`);$('#cancelModal').onclick=closeModal;$('#saveTask').onclick=async()=>{const title=$('#fTitle').value.trim(),date=$('#fDate').value;if(!title||!date)return toast('Task name and date are required.');const obj={...t,id:t.id||crypto.randomUUID(),title,course:$('#fCourse').value.trim(),date,time:$('#fTime').value,notes:$('#fNotes').value.trim(),done:t.done||false,updatedAt:Date.now()};await idbPut(obj);closeModal();await refresh();toast(task?'Task updated.':'Task added.');};if(task)$('#deleteTask').onclick=async()=>{await idbDelete(task.id);closeModal();await refresh();toast('Task deleted.')}}
function openEmergency(task,diff){showModal(`<div class="section-label">URGENT DEADLINE</div><h3 style="font-size:30px;margin-top:6px">${escapeHtml(countdown(diff))}</h3><div style="font-size:18px;font-weight:800">${escapeHtml(task.course?task.course+' · ':'')}${escapeHtml(task.title)}</div><div class="next-meta" style="margin-top:7px">${escapeHtml(formatDue(task))}</div><div class="modal-actions"><button id="emClose" class="soft-btn">Keep working</button><button id="emDone" class="primary-btn">Mark as done</button></div>`);$('#emClose').onclick=closeModal;$('#emDone').onclick=()=>{closeModal();completeTask(task.id)}}
async function completeTask(id){const t=tasks.find(x=>x.id===id);if(!t)return;t.done=true;t.completedAt=Date.now();await idbPut(t);confetti();await refresh();toast('Done. Nicely handled.')}

function parseBatch(text){const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);const out=[];for(const line of lines){if(line.startsWith('#'))continue;const parts=line.split('|').map(s=>s.trim());if(parts.length>=4){const [course,dateRaw,timeRaw,...titleParts]=parts;const date=parseDateLoose(dateRaw),time=parseTimeLoose(timeRaw),title=titleParts.join(' | ').trim();out.push({course,date,time,title,raw:line,ok:!!(date&&title)});continue;}const guess=parseLooseLine(line);out.push(guess)}return out}
function parseDateLoose(s){if(!s)return'';let d=new Date(s);if(!isNaN(d))return fmtDateInput(d);const m=s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);if(m){let y=+m[3];if(y<100)y+=2000;return `${y}-${pad(+m[1])}-${pad(+m[2])}`}return''}
function parseTimeLoose(s){if(!s)return'';s=s.trim();let m=s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);if(m){let h=+m[1],min=+m[2];const ap=(m[3]||'').toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;return `${pad(h)}:${pad(min)}`}m=s.match(/^(\d{1,2})\s*(am|pm)$/i);if(m){let h=+m[1];if(m[2].toLowerCase()==='pm'&&h<12)h+=12;if(m[2].toLowerCase()==='am'&&h===12)h=0;return `${pad(h)}:00`}return''}
function parseLooseLine(line){const dateMatch=line.match(/(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?/i);const timeMatch=line.match(/\b\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/i);const date=dateMatch?parseDateLoose(dateMatch[0] + (/,\s*\d{4}/.test(dateMatch[0])?'':`, ${new Date().getFullYear()}`)):'';const time=timeMatch?parseTimeLoose(timeMatch[0]):'';let title=line;if(dateMatch)title=title.replace(dateMatch[0],'');if(timeMatch)title=title.replace(timeMatch[0],'');title=title.replace(/^[\s—–\-:]+|[\s—–\-:]+$/g,'').trim();return{course:'',date,time,title,raw:line,ok:!!(date&&title)}}
function openBatch(){showModal(`<h3>Batch Paste</h3><div class="field"><label>Recommended format</label><textarea id="batchText" placeholder="PSYC 3500 | Sep 8, 2026 | 11:59 PM | Reflection Paper\nHDFS 2300 | Sep 18, 2026 | | Discussion Post"></textarea></div><div class="next-meta" style="margin-top:10px">One task per line. Exact time may be left blank. Nothing is imported until you review it.</div><div class="modal-actions"><button id="backupBtn" class="soft-btn" style="margin-right:auto">Backup / Restore</button><button id="cancelModal" class="soft-btn">Cancel</button><button id="previewBatch" class="primary-btn">Preview</button></div>`);$('#cancelModal').onclick=closeModal;$('#previewBatch').onclick=()=>previewBatch($('#batchText').value);$('#backupBtn').onclick=openBackup}
function previewBatch(text){const parsed=parseBatch(text);if(!parsed.length)return toast('Paste at least one line.');const existingKey=new Set(tasks.map(t=>`${(t.course||'').toLowerCase()}|${t.date}|${t.time||''}|${t.title.toLowerCase()}`));parsed.forEach((p,i)=>{p.duplicate=existingKey.has(`${(p.course||'').toLowerCase()}|${p.date}|${p.time||''}|${p.title.toLowerCase()}`);p.idx=i});showModal(`<h3>${parsed.length} line${parsed.length===1?'':'s'} detected</h3><div class="preview-list">${parsed.map(p=>`<label class="preview-row ${!p.ok||p.duplicate?'bad':''}"><input type="checkbox" data-import="${p.idx}" ${p.ok&&!p.duplicate?'checked':''} ${!p.ok?'disabled':''}><div><strong>${escapeHtml(p.title||'Could not identify task')}</strong><div class="tiny">${escapeHtml(p.course||'No course')} · ${escapeHtml(p.date||'Date not recognized')} · ${escapeHtml(p.time||'No specific time')}${p.duplicate?' · Possible duplicate':''}</div></div></label>`).join('')}</div><div class="modal-actions"><button id="backBatch" class="soft-btn">Back</button><button id="doImport" class="primary-btn">Import selected</button></div>`);$('#backBatch').onclick=openBatch;$('#doImport').onclick=async()=>{const selected=[...document.querySelectorAll('[data-import]:checked')].map(x=>parsed[+x.dataset.import]);for(const p of selected){await idbPut({id:crypto.randomUUID(),title:p.title,course:p.course,date:p.date,time:p.time,notes:'',done:false,createdAt:Date.now()})}closeModal();await refresh();toast(`Imported ${selected.length} task${selected.length===1?'':'s'}.`)}}
function openBackup(){showModal(`<h3>Backup / Restore</h3><div class="next-meta">Export creates a JSON backup of every task and completion state. Restore merges the backup and keeps task IDs intact.</div><div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap"><button id="exportJson" class="primary-btn">Export JSON</button><label class="soft-btn" style="cursor:pointer">Restore JSON<input id="restoreFile" type="file" accept="application/json" hidden></label><button id="cancelModal" class="soft-btn">Close</button></div>`);$('#cancelModal').onclick=closeModal;$('#exportJson').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),tasks},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`deadline-garden-backup-${fmtDateInput(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};$('#restoreFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text()),arr=Array.isArray(data)?data:data.tasks;if(!Array.isArray(arr))throw Error();for(const t of arr){if(t.id&&t.title&&t.date)await idbPut(t)}closeModal();await refresh();toast(`Restored ${arr.length} tasks.`)}catch{toast('That backup file could not be read.')}}}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2200)}
function confetti(){const c=$('#confettiCanvas'),ctx=c.getContext('2d'),dpr=devicePixelRatio||1;c.width=innerWidth*dpr;c.height=innerHeight*dpr;ctx.scale(dpr,dpr);let ps=Array.from({length:60},()=>({x:innerWidth/2,y:innerHeight*.3,vx:(Math.random()-.5)*8,vy:Math.random()*-7-3,g:.18,s:Math.random()*5+3,a:1}));let frame=0;(function anim(){ctx.clearRect(0,0,innerWidth,innerHeight);ps.forEach((p,i)=>{p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.a-=.012;ctx.globalAlpha=Math.max(0,p.a);ctx.fillStyle=['#5f9c71','#9bc3a5','#d5b85a','#f0c7c7'][i%4];ctx.fillRect(p.x,p.y,p.s,p.s)});ctx.globalAlpha=1;if(frame++<90)requestAnimationFrame(anim);else ctx.clearRect(0,0,innerWidth,innerHeight)})()}

$('#addBtn').onclick=()=>openTaskModal();$('#importBtn').onclick=openBatch;$('#todoToggle').onclick=()=>{$('#todoPanel').classList.toggle('open');$('#todoPanel').setAttribute('aria-hidden',!$('#todoPanel').classList.contains('open'))};$('#closeTodo').onclick=()=>{$('#todoPanel').classList.remove('open');$('#todoPanel').setAttribute('aria-hidden','true')};$('#prevMonth').onclick=()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1);renderCalendar()};$('#nextMonth').onclick=()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1);renderCalendar()};$('#todayBtn').onclick=()=>{currentMonth=new Date();renderCalendar()};

(async()=>{await openDB();await refresh();setInterval(()=>{renderHeader();renderTodo();renderWarnings()},1000);if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{})})();

