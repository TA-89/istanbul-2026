'use strict';
// Location stays in memory on this device. It is never included in app URLs or uploads.
window.createTripLocation = ({map, geolocation=navigator.geolocation, onState=()=>{}, now=()=>Date.now()}) => {
  let watch=null, dot=null, accuracyCircle=null, last=null, follow=false, requested=false, generation=0;
  const emit=(message,kind='idle')=>onState({message,kind,active:requested,following:follow,last});
  const clear=()=>{if(watch!==null){geolocation?.clearWatch(watch);watch=null;}};
  const paint=()=>{
    if(!last)return;
    const at=[last.lat,last.lng];
    if(!dot){accuracyCircle=L.circle(at,{radius:last.accuracy,color:'#3277ed',weight:1,fillOpacity:.12,interactive:false}).addTo(map);dot=L.circleMarker(at,{radius:8,color:'#fff',weight:3,fillColor:'#2875ed',fillOpacity:1}).addTo(map).bindTooltip('Dein Standort');}
    dot.setLatLng(at);accuracyCircle.setLatLng(at).setRadius(last.accuracy);
    if(follow)map.setView(at,Math.max(14,Math.min(map.getZoom(),17)),{animate:false});
  };
  const start=()=>{
    if(requested)return;
    if(!geolocation){emit('Standort ist in diesem Browser nicht verfügbar.','error');return;}
    requested=true;follow=true;const run=++generation;
    emit('Standort wird gesucht. Bitte die Freigabe am Handy erlauben.','loading');
    const id=geolocation.watchPosition(position=>{
      if(!requested||generation!==run)return;
      const c=position.coords;
      if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||!Number.isFinite(c.accuracy))return;
      last={lat:c.latitude,lng:c.longitude,accuracy:Math.max(0,c.accuracy),timestamp:position.timestamp||now()};paint();
      emit(`Standort aktiv · Genauigkeit ca. ${Math.round(last.accuracy)} m`,'active');
    },error=>{
      if(!requested||generation!==run)return;
      if(error.code===1){stop();emit('Standort nicht freigegeben. In den Browser-Einstellungen erlauben und erneut starten.','error');}
      else{follow=false;emit(error.code===3?'GPS-Suche dauert länger. Im Freien erneut zentrieren; der letzte Punkt kann veraltet sein.':'Standort vorübergehend nicht verfügbar. Der letzte Punkt kann veraltet sein.','error');}
    },{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
    if(requested&&generation===run)watch=id;else geolocation.clearWatch(id);
  };
  const stop=()=>{clear();++generation;requested=false;follow=false;last=null;if(dot)map.removeLayer(dot);if(accuracyCircle)map.removeLayer(accuracyCircle);dot=accuracyCircle=null;emit('Standort aus. Zum Anzeigen „Mein Standort“ antippen.');};
  const pause=()=>{clear();++generation;follow=false;requested=false;emit('Standort pausiert, solange die App im Hintergrund ist.','paused');};
  const center=()=>{if(!requested){start();return;}if(last&&now()-last.timestamp>120000){clear();requested=false;start();return;}follow=true;if(last){paint();emit(`Standort aktiv · Genauigkeit ca. ${Math.round(last.accuracy)} m`,'active');}else emit('Standort wird noch gesucht.','loading');};
  const release=()=>{follow=false;};
  map.on('dragstart',release);
  const distanceTo=coords=>{
    if(!last||!coords||now()-last.timestamp>120000)return null;
    const rad=Math.PI/180,a=last.lat*rad,b=coords[0]*rad,dlat=(coords[0]-last.lat)*rad,dlng=(coords[1]-last.lng)*rad;
    const h=Math.sin(dlat/2)**2+Math.cos(a)*Math.cos(b)*Math.sin(dlng/2)**2;
    return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
  };
  return {start,stop,pause,center,release,distanceTo,get active(){return requested;},get following(){return follow;}};
};
