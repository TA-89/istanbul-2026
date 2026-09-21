const CACHE='istanbul-2026-v8';
const ROOT=new URL('./',self.location.href);
const FILES=['./','./index.html','./style.css','./modern.css','./catalog.js','./photos.js','./location.js','./flights.js','./flights.json','./data.js','./app.js','./manifest.webmanifest','./icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png','./assets/wir-zwei.jpeg','./assets/istanbul-panorama.jpg','./vendor/leaflet.js','./vendor/leaflet.css'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('istanbul-2026-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
  if(url.pathname.endsWith('/flights.json')){
    event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request)));return;
  }
  if(event.request.mode==='navigate'&&(url.pathname===ROOT.pathname||url.pathname===new URL('./index.html',ROOT).pathname)){
    event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(new URL('./index.html',ROOT),copy));}return response;}).catch(()=>caches.match(new URL('./index.html',ROOT))));return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
