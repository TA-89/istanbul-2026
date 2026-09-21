const CACHE='istanbul-2026-v4';
const ROOT=new URL('./',self.location.href);
const FILES=['./','./index.html','./style.css','./catalog.js','./data.js','./app.js','./manifest.webmanifest','./icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png','./assets/istanbul-panorama.jpg','./vendor/leaflet.js','./vendor/leaflet.css'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('istanbul-2026-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(new URL('./index.html',ROOT),copy));}return response;}).catch(()=>caches.match(new URL('./index.html',ROOT))));return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
