const CACHE='deadline-garden-v16-17-sync-courseicon-modal-i18n';
const ASSETS=['./','./index.html','./styles.css?v=1617','./app.js?v=1617','./manifest.webmanifest','./background-keepalive.js','./favicon.ico?v=1612','./apple-touch-icon.png?v=1612','./icon-192.png?v=1612','./icon-512.png?v=1612'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request))));

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||'You have a reminder.'}}
  event.waitUntil(self.registration.showNotification(data.title||'Deadline Garden',{
    body:data.body||'You have a reminder.',
    icon:'./icon-192.png?v=1612',
    badge:'./icon-192.png?v=1612',
    tag:data.tag||'deadline-garden',
    renotify:true,
    data:{url:data.url||'./'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url||'./';
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){if('focus' in client){await client.focus();return}}
    if(clients.openWindow)return clients.openWindow(url);
  })());
});
