'use strict';
((root)=>{
  const DEFAULTS=['ep32','ep11','ep0','ep56','ep2','ep92','ep45','ep5','ep1'];
  const BOOKED=['hotel','airport','ep4','ep12','ep25'];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const visit=(place,time,end,text,note)=>({place,time,end,title:'',text,note,label:'Favorit · Vorschlag',favoritePlan:true});
  const pause=(time,end,title,text,place)=>({time,end,title,text,place,status:'pause'});
  // Only researched, bounded alternatives are assigned times. Unknown tours stay on the wishlist.
  // A block includes its access/return buffer; its original favourite stops may never be replaced.
  const alternatives={
    ep11:[{day:1,from:'14:00',through:'14:00',events:[visit('ep11','14:05','15:05','Optische Täuschungen und Fotomotive auf der Istiklal. Ab dem Ebru-Atelier rund 20 Minuten bergauf einplanen.','Anschliessend 20–30 Minuten zum Kaffee-Atelier; bis 15:50 Uhr dort sein. Bei längerer Wartezeit auslassen.')] }],
    ep56:[{day:3,from:'09:00',through:'11:15',events:[visit('ep56','09:15','10:45','Mit T1 und Fusswegen nach Gülhane, dann in Ruhe Modelle zu Astronomie, Technik und Medizin entdecken.','Ab Hotel etwa 35–45 Minuten einplanen. Öffnung im Oktober laut E-Pass täglich ab 09:00 Uhr.'),pause('10:45','11:15','Çay-Pause in Gülhane','Sitzen, trinken und den Park geniessen. Danach etwa 20 Minuten zum Gewürzbasar.','gulhane')]},
      {day:2,from:'14:00',through:'14:00',events:[visit('ep56','14:00','15:30','Das Wissenschaftsmuseum in Gülhane statt des Topkapı-Palasts besuchen.'),pause('15:30','16:15','Pause & Weg zur Zisterne','In Ruhe sitzen und danach zum Busforus-Stopp gehen. Bis 16:35 Uhr am Treffpunkt sein.','gulhane')]}],
    ep92:[{day:3,from:'13:00',through:'18:00',events:[{...pause('13:00','14:00','Zum Goldenen Horn','Nach dem Lunch nach Fener/Balat fahren. Für Fusswege, T5 ab Eminönü und Warten zusammen rund eine Stunde einplanen.','eminonu'),status:undefined},visit('ep92','14:00','16:00','Farbige Häuser, Gassen und Cafés in Fener und Balat mit dem E-Pass-Audioguide entdecken. Eine Café-Pause gehört dazu.','Dieser Block ersetzt Kadıköy und Moda vollständig. Die Wege sind teilweise steil.'),pause('16:00','18:00','Rückweg & Hotelpause','Mit T5 und den weiteren Fuss-/Tramwegen zurück zum Hotel. 60–75 Minuten Reisezeit plus Reserve zum Frischmachen und Packen.','hotel')]}],
    ep37:[{day:1,from:'14:00',through:'14:00',events:[visit('ep37','14:00','15:10','Zum Galataturm und bei kurzer Warteschlange hinauf. Der Eintritt ist mit E-Pass vergünstigt, nicht gratis.','Bei mehr als 15 Minuten Wartezeit nur den Platz ansehen. Danach zum Kaffee-Atelier; Ankunft spätestens 15:50 Uhr.')]}],
    ep19:[{day:2,from:'14:00',through:'14:00',events:[visit('ep19','14:00','15:00','Das Hagia-Sophia-Geschichtsmuseum statt Topkapı besuchen. Es ist ein eigenes Museum, nicht die Hagia Sophia selbst.'),pause('15:00','16:15','Altstadtpause','Çay, freie Zeit und danach zum Zisternen-Treffpunkt; bis 16:35 Uhr dort sein.')]}],
    gulhane:[{day:2,from:'14:00',through:'14:00',events:[visit('gulhane','14:00','15:00','Einen ausgedehnten Parkspaziergang statt des Palastbesuchs machen.'),pause('15:00','16:15','Zeit zum Durchatmen','Sitzen, trinken und entspannt zum Treffpunkt für die Zisterne gehen.')]}],
    ep33:[{day:3,from:'09:00',through:'11:15',events:[visit('ep33','09:15','10:30','Die Chora-Mosaike statt des Basar- und Süleymaniye-Vormittags ansehen.','Ab Hotel 45–60 Minuten Anfahrt vorsehen. Besuchsunterbrechungen und Ticketverfügbarkeit vorher prüfen.'),pause('10:30','11:35','Richtung Eminönü','Für die Rückfahrt zum Gewürzbasar etwa 60 Minuten mit Reserve einplanen.','eminonu')]}],
    ep32:[{day:2,from:'16:45',through:'18:00',events:[pause('16:15','17:45','Pause vor der Abendfahrt','Nach dem letzten Besuch ausruhen und etwas essen. Die Fahrt ist nur eine zusätzliche Option.'),visit('ep32','18:15','20:15','Zusätzliche Golden-Horn- und Bosporusfahrt. Treffpunkt laut E-Pass am Zeitungskiosk gegenüber der Hagia Sophia um 18:00 Uhr.','Dritte Schifffahrt dieser Reise; nur wählen, wenn ihr dafür den Zisternen-Abschluss auslassen möchtet. Startzeit am Vorabend prüfen.'),pause('20:15','21:15','Rückweg zum Hotel','Nach der Fahrt ohne weitere Programmpunkte zurückfahren.','hotel')]}]
  };
  function build(trip,favorites){
    const days=clone(trip.days),known=new Map(trip.places.map(p=>[p.id,p]));
    const ids=[...new Set(favorites)].filter(id=>known.has(id)&&!BOOKED.includes(id));
    const selected=new Set(ids),original=new Set(days.flatMap(d=>d.events.filter(e=>e.status!=='pause').map(e=>e.place))),changes=[];
    const reasons=new Map(),occupied=new Set();
    // Existing favourites are protected before considering any new insertion, independent of click order.
    for(const id of [...ids].sort((a,b)=>(DEFAULTS.indexOf(a)<0?100:DEFAULTS.indexOf(a))-(DEFAULTS.indexOf(b)<0?100:DEFAULTS.indexOf(b))||a.localeCompare(b))){
      if(original.has(id))continue;
      const p=known.get(id);if(p.closed){reasons.set(id,'Zurzeit geschlossen; bleibt auf eurer Merkliste.');continue;}
      let placed=false;
      for(const option of alternatives[id]||[]){
        const d=days[option.day],base=trip.days[option.day];
        const start=base.events.findIndex(e=>e.time===option.from),end=base.events.findIndex((e,i)=>i>=start&&(e.time===option.through||e.end===option.through));
        if(start<0||end<start)continue;
        const source=base.events.slice(start,end+1);
        const keys=source.map(e=>`${option.day}:${e.time}:${e.title}`);
        if(keys.some(k=>occupied.has(k))||source.some(e=>e.flight||e.status==='booked'||BOOKED.includes(e.place)&&e.status!=='pause'||selected.has(e.place)&&e.status!=='pause'))continue;
        const positions=source.map(e=>d.events.findIndex(x=>x.time===e.time&&x.title===e.title));
        if(positions.some(i=>i<0))continue;
        const events=clone(option.events).map(e=>e.place&&e.favoritePlan?{...e,title:known.get(e.place).name}:e);
        d.events.splice(positions[0],source.length,...events);keys.forEach(k=>occupied.add(k));
        changes.push({day:d.id,added:id,removed:source.filter(e=>e.place&&e.status!=='pause').map(e=>e.place)});
        placed=true;break;
      }
      if(!placed)reasons.set(id,id==='ep32'?'Schon zwei Schifffahrten reserviert. Der weitere Abend ist mit euren bestehenden Favoriten gefüllt; deshalb kein zusätzlicher Pflichttermin.':alternatives[id]?'Kein passendes Zeitfenster, ohne einen bereits eingeplanten Favoriten oder eine Buchung zu verdrängen.':'Für diesen Ort sind Dauer, Führung oder passende Wege noch nicht ausreichend abgesichert. Als freie Alternative merken und die Anbieterdetails prüfen.');
    }
    const changedDays=new Set(changes.map(c=>c.day));
    for(const d of days){
      if(!changedDays.has(d.id))continue;
      d.title=d.id==='2026-10-04'?'Palast, Farben & eure Favoriten.':d.id==='2026-10-05'?'Eure Favoriten in der Altstadt.':'Eure Favoriten zwischen Stadt & Ufer.';
      d.subtitle='Auf eure Favoriten abgestimmt. Vorschläge können weichen; Buchungen und Pausen bleiben berücksichtigt.';
      d.area=[...new Set(d.events.filter(e=>e.favoritePlan).map(e=>known.get(e.place)?.area).filter(Boolean))].join(' → ');
      d.pace='Mit Wegen, Pausen und Reserve';
      if(d.id==='2026-10-06'&&d.events.some(e=>e.place==='ep92'))d.label='Goldenes Horn';
      d.extras=[];d.extraText='Dieser Tag ist bereits abgestimmt. Weitere Favoriten nur als Alternative wählen.';
      // Remove access directions tied to a replaced activity, retaining all reservation wording verbatim.
      if(d.id==='2026-10-06'&&changes.some(c=>c.day===d.id&&c.added==='ep56'))d.events[0]={...d.events[0],title:'Frühstück & Fahrt nach Gülhane',text:'Frühstück im Hotel. Gegen 08:30 Uhr mit T1 und Fusswegen nach Gülhane fahren.',end:'08:30'};
      if(d.id==='2026-10-06'&&changes.some(c=>c.day===d.id&&c.added==='ep33'))d.events[0]={...d.events[0],title:'Frühstück & Fahrt nach Edirnekapı',text:'Frühstück und gegen 08:15 Uhr losfahren. Für den Weg zur Chora 45–60 Minuten einplanen.',end:'08:15'};
      if(d.id==='2026-10-06'&&changes.some(c=>c.day===d.id&&c.added==='ep92')){const lunch=d.events.find(e=>e.time==='12:15');if(lunch)lunch.text='In Eminönü in Ruhe etwas essen. Danach bleibt genug Zeit für die Fahrt nach Fener und Balat.';}
      if(d.id==='2026-10-05'&&changes.some(c=>c.day===d.id&&['ep56','ep19','gulhane'].includes(c.added))){const lunch=d.events.find(e=>e.time==='12:15');if(lunch)lunch.travel='Nach dem Essen ohne Eile zum nächsten Besuch gehen. Die Mittagspause bleibt erhalten.';}
    }
    // Invariant: all reserved, arrival and departure records are preserved byte-for-byte.
    const fixed=trip.days.flatMap(d=>d.events.filter(e=>e.flight||e.status==='booked'||BOOKED.includes(e.place)&&e.status!=='pause').map(e=>({day:d.id,event:e})));
    if(fixed.some(({day,event})=>!days.find(d=>d.id===day).events.some(e=>JSON.stringify(e)===JSON.stringify(event))))throw Error('Protected booking changed');
    const planned=new Set(days.flatMap(d=>d.events.filter(e=>e.status!=='pause').map(e=>e.place)));
    return {version:1,days,changes,planned:ids.filter(id=>planned.has(id)),kept:ids.filter(id=>original.has(id)),unplanned:ids.filter(id=>!planned.has(id)).map(id=>({id,reason:reasons.get(id)||'Bleibt als Alternative vorgemerkt.'}))};
  }
  const api={build,defaults:DEFAULTS,booked:BOOKED,version:1};
  root.TripPlanner=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
