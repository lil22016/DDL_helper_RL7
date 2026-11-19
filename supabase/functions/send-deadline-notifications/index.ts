import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

/* Runs every 5 minutes (pg_cron job "deadline-garden-notifications").
   Reads only what it needs via reminder_inputs(): users with push on, their reminder rules,
   and their unfinished tasks within a few days — not the whole garden_state. */
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')||'mailto:deadline-garden@example.com',Deno.env.get('VAPID_PUBLIC_KEY')!,Deno.env.get('VAPID_PRIVATE_KEY')!);
const DEFAULT=[{type:'time',time:'08:00'},{type:'before',minutes:300},{type:'before',minutes:120},{type:'before',minutes:60},{type:'before',minutes:15}];
const WINDOW=3*60*1000; // cron every 5 min → every target is within 2.5 min of some run

function parts(d:Date,tz:string){const o:any={};for(const p of new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d))if(p.type!=='literal')o[p.type]=p.value;return o}
function zonedToUtc(date:string,time:string,tz:string){
  const [y,m,d]=date.split('-').map(Number),[hh,mm]=time.split(':').map(Number);const wanted=Date.UTC(y,m-1,d,hh,mm);let guess=wanted;
  for(let i=0;i<3;i++){const p=parts(new Date(guess),tz);guess+=wanted-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute)}return guess;
}
function validRules(v:any){const out:any[]=[];for(const r of Array.isArray(v)?v:DEFAULT){if(r?.type==='time'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time||''))out.push({type:'time',time:r.time});else if(r?.type==='before'&&Number(r.minutes)>0)out.push({type:'before',minutes:Math.round(Number(r.minutes))})}return out.length?out:DEFAULT}
const fmtLeft=(min:number)=>min%60===0?`${min/60} hour${min===60?'':'s'}`:min>60?`${Math.floor(min/60)} h ${min%60} min`:`${min} minute${min===1?'':'s'}`;

/* dedupe in the existing push_notification_log (unique on user_id, task_id, kind, scheduled_key); task_id '' for daily so the unique index applies */
async function once(userId:string,taskId:string,kind:string,key:string){
  const {error}=await db.from('push_notification_log').insert({user_id:userId,task_id:taskId,kind,scheduled_key:key});
  if(error&&error.code!=='23505')console.error('log insert failed',error);
  return !error;
}
async function sendAll(userId:string,payload:any){
  const {data:subs}=await db.from('push_subscriptions').select('endpoint,p256dh,auth').eq('user_id',userId).eq('enabled',true);
  let n=0;
  for(const s of subs||[]){
    try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify(payload));n++}
    catch(e:any){console.error('push failed',e?.statusCode);if(e?.statusCode===404||e?.statusCode===410)await db.from('push_subscriptions').update({enabled:false}).eq('endpoint',s.endpoint)}
  }
  return n;
}

Deno.serve(async()=>{
  const now=Date.now();
  const {data:rows,error}=await db.rpc('reminder_inputs');
  if(error){console.error('reminder_inputs failed',error);return new Response(error.message,{status:500})}
  let sent=0;
  for(const row of rows||[]){
    const tz=row.timezone||'UTC',rules=validRules(row.rules),tasks:any[]=Array.isArray(row.tasks)?row.tasks:[];
    const lp=parts(new Date(now),tz),today=`${lp.year}-${lp.month}-${lp.day}`;
    for(const r of rules){
      if(r.type==='time'){
        if(Math.abs(now-zonedToUtc(today,r.time,tz))>WINDOW)continue;
        const n=tasks.filter(t=>t.date===today).length;if(!n)continue;
        if(await once(row.user_id,'','daily',`${today} ${r.time}`))sent+=await sendAll(row.user_id,{title:'Deadline Garden',body:`${n} unfinished task${n===1?'':'s'} due today.`,tag:`daily-${today}-${r.time}`,url:'./'});
      }else{
        for(const t of tasks){
          if(!t.date)continue;const time=t.time||'23:59',due=zonedToUtc(t.date,time,tz);
          if(due<=now||Math.abs(now-(due-r.minutes*60000))>WINDOW)continue;
          if(await once(row.user_id,String(t.id||t.title),`before-${r.minutes}`,`${t.date} ${time}`))sent+=await sendAll(row.user_id,{title:'Deadline Garden',body:`${t.title}${t.course?` · ${t.course}`:''} is due in ${fmtLeft(r.minutes)}.`,tag:`task-${t.id}-${r.minutes}`,url:'./'});
        }
      }
    }
  }
  // keep the dedupe table small
  await db.from('push_notification_log').delete().lt('sent_at',new Date(now-45*86400000).toISOString());
  return Response.json({ok:true,users:(rows||[]).length,sent});
});
