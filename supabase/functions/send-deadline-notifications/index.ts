import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const url=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const pub=Deno.env.get('VAPID_PUBLIC_KEY')!;
const priv=Deno.env.get('VAPID_PRIVATE_KEY')!;
const subject=Deno.env.get('VAPID_SUBJECT')||'mailto:admin@example.com';
webpush.setVapidDetails(subject,pub,priv);
const db=createClient(url,service,{auth:{persistSession:false}});
const DEFAULT=[{type:'time',time:'08:00'},{type:'before',minutes:300},{type:'before',minutes:120},{type:'before',minutes:60},{type:'before',minutes:15}];

function parts(d:Date,tz:string){
  const a=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const o:any={};for(const p of a)if(p.type!=='literal')o[p.type]=p.value;return o;
}
function localStamp(d:Date,tz:string){const p=parts(d,tz);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`}
function zonedToUtc(date:string,time:string,tz:string){
  const [y,m,d]=date.split('-').map(Number),[hh,mm]=time.split(':').map(Number);let guess=Date.UTC(y,m-1,d,hh,mm);
  for(let i=0;i<3;i++){const p=parts(new Date(guess),tz);const seen=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);const wanted=Date.UTC(y,m-1,d,hh,mm);guess+=wanted-seen}return guess;
}
function validRules(v:any){const a=Array.isArray(v)?v:DEFAULT;const out:any[]=[];for(const r of a){if(r?.type==='time'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time||''))out.push({type:'time',time:r.time});else if(r?.type==='before'&&Number(r.minutes)>0)out.push({type:'before',minutes:Math.round(Number(r.minutes))})}return out.length?out:DEFAULT}
function dueTasks(state:any){return (state?.tasks||[]).filter((t:any)=>!t.done&&t.date&&t.eventType!=='duration')}
async function claim(userId:string,endpoint:string,key:string){const {error}=await db.from('push_notification_log').insert({user_id:userId,endpoint,reminder_key:key});return !error}
async function unclaim(userId:string,endpoint:string,key:string){await db.from('push_notification_log').delete().eq('user_id',userId).eq('endpoint',endpoint).eq('reminder_key',key)}
async function send(sub:any,title:string,body:string,key:string){if(!await claim(sub.user_id,sub.endpoint,key))return false;try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title,body,url:'./'}));return true}catch(e:any){await unclaim(sub.user_id,sub.endpoint,key);if(e?.statusCode===404||e?.statusCode===410)await db.from('push_subscriptions').update({enabled:false}).eq('user_id',sub.user_id).eq('endpoint',sub.endpoint);console.error(e);return false}}

Deno.serve(async()=>{
  const now=new Date(),windowMs=3*60*1000;
  const {data:subs,error}=await db.from('push_subscriptions').select('user_id,endpoint,p256dh,auth,timezone').eq('enabled',true);if(error)throw error;
  let sent=0;
  for(const sub of subs||[]){
    const {data:g}=await db.from('garden_state').select('state').eq('user_id',sub.user_id).maybeSingle();const state=g?.state||{};const rules=validRules(state.reminderRules);const tasks=dueTasks(state);const tz=sub.timezone||'UTC';const lp=parts(now,tz),today=`${lp.year}-${lp.month}-${lp.day}`;
    for(let i=0;i<rules.length;i++){
      const r=rules[i];
      if(r.type==='time'){
        const target=zonedToUtc(today,r.time,tz);if(Math.abs(now.getTime()-target)<=windowMs){const todayTasks=tasks.filter((t:any)=>t.date===today);if(todayTasks.length){const key=`daily:${today}:${r.time}`;if(await send(sub,'Deadline Garden',`${todayTasks.length} unfinished task${todayTasks.length===1?'':'s'} due today.`,key))sent++}}
      }else{
        for(const t of tasks){const due=zonedToUtc(t.date,t.time||'23:59',tz),target=due-r.minutes*60000;if(Math.abs(now.getTime()-target)<=windowMs){const key=`before:${t.id}:${r.minutes}:${t.date}:${t.time||'23:59'}`;const label=r.minutes%60===0?`${r.minutes/60} hour${r.minutes===60?'':'s'}`:`${r.minutes} minutes`;if(await send(sub,t.title||'Deadline approaching',`${label} left${t.course?` · ${t.course}`:''}`,key))sent++}}
      }
    }
  }
  // Keep the dedupe table small.
  await db.from('push_notification_log').delete().lt('sent_at',new Date(Date.now()-45*86400000).toISOString());
  return new Response(JSON.stringify({ok:true,sent}),{headers:{'content-type':'application/json'}});
});
