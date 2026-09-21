'use strict';
(() => {
  const plans=[
    {id:'outbound',title:'Hinflug',number:'TK1208',date:'2026-10-03',dateLabel:'Sa, 3. Oktober',from:'ZRH',to:'IST',fromCity:'Zürich',toCity:'Istanbul',departure:'13:30',arrival:'17:30',board:'departures'},
    {id:'return',title:'Rückflug',number:'TK1207',date:'2026-10-07',dateLabel:'Mi, 7. Oktober',from:'IST',to:'ZRH',fromCity:'Istanbul',toCity:'Zürich',departure:'10:35',arrival:'12:35',board:'arrivals'}
  ];
  let snapshot=null,busy=false,lastError=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateText=d=>d?new Intl.DateTimeFormat('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(d)):'Noch kein Abgleich';
  const time=(d,airport='ZRH')=>d?new Intl.DateTimeFormat('de-CH',{timeZone:airport==='IST'?'Europe/Istanbul':'Europe/Zurich',hour:'2-digit',minute:'2-digit'}).format(new Date(d)):null;
  const row=(label,value)=>value?`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`:'';
  function card(p,compact=false){
    const f=snapshot?.flights?.find(f=>f.id===p.id&&f.date===p.date&&f.number===p.number);
    const tracker=f?.tracker,departure=p.id==='outbound';
    const isOld=record=>record?.available&&(record.state==='retained'||!record.observedAt||Date.now()-new Date(record.observedAt).getTime()>90*60*1000);
    const leg=(side,airport,booked)=>{
      const suffix=side==='departure'?'Departure':'Arrival';
      const useAirport=airport==='ZRH'&&f?.available&&f['scheduled'+suffix]&&(!tracker?.available||!isOld(f)||isOld(tracker));
      const record=useAirport?f:tracker?.available?tracker:null;
      const scheduled=record?time(record['scheduled'+suffix],airport):null;
      const expected=record?time(useAirport?(record['actual'+suffix]||record['estimated'+suffix]):record['estimatedActual'+suffix],airport):null;
      return {display:expected||scheduled||booked,scheduled,changed:scheduled&&scheduled!==booked,old:isOld(record),record,useAirport,
        label:scheduled?(isOld(record)?'Letzter bekannter Stand':expected?(record['actual'+suffix]?'Tatsächlich':'Erwartet'):'Aktuelle Planzeit'):'Buchungsstand',source:scheduled?(useAirport?'Flughafen Zürich':'FlightStats'):''};
    };
    const dep=leg('departure',p.from,p.departure),arr=leg('arrival',p.to,p.arrival);
    const from=dep.display,to=arr.display,old=dep.old||arr.old,available=f?.available||tracker?.available,changed=dep.changed||arr.changed;
    const statusWords={Arrived:'Gelandet',Departed:'Gestartet',Scheduled:'Geplant',Active:'Unterwegs',Canceled:'Annulliert',Cancelled:'Annulliert',Diverted:'Umgeleitet'};
    const statusRecord=f?.available&&!isOld(f)?f:tracker?.available?tracker:f;
    const unavailable=lastError||f?.state==='unreachable'||tracker?.state==='unreachable';
    const status=available?(old?'Letzter bekannter Stand':['Canceled','Cancelled'].includes(statusRecord?.status)?'Annulliert':statusRecord?.statusText||statusWords[statusRecord?.status]||statusRecord?.status||'Planzeiten veröffentlicht'):(unavailable?'Datenquelle gerade nicht erreichbar':'Für diesen Tag noch nicht veröffentlicht');
    const detail=(leg,field)=>leg.record?.[leg.useAirport?field:(leg===dep?'departure':'arrival')+field[0].toUpperCase()+field.slice(1)];
    const zurich=(departure?dep:arr).useAirport?f:null;
    const [year,month,date]=p.date.split('-').map(Number);
    const trackerLink=`https://www.flightstats.com/v2/flight-tracker/TK/${p.number.slice(2)}?year=${year}&month=${month}&date=${date}`;
    const url=`https://www.flughafen-zuerich.ch/en/passengers/fly/flightinformation/${p.board}`;
    return `<article class="flight-card ${compact?'compact':''}"><div class="flight-top"><span>${p.title} · ${p.dateLabel}</span><strong>${p.number}</strong></div><div class="flight-route"><div><span>${p.from} <small>${p.fromCity}</small></span><strong>${esc(from)}</strong><small>${dep.label}${dep.source?' · '+dep.source:''}</small></div><span class="flight-path" aria-hidden="true">✈</span><div><span>${p.to} <small>${p.toCity}</small></span><strong>${esc(to)}</strong><small>${arr.label}${arr.source?' · '+arr.source:''}</small></div></div><span class="flight-status ${old?'stale':''}">${esc(status)}</span>${changed?`<p class="flight-change">Planzeit geändert. Ursprünglich gebucht: ${p.departure} → ${p.arrival}. Reiseablauf und Transfers prüfen.</p>`:''}${available?`<dl class="flight-facts">${row('Gate '+p.from,detail(dep,'gate'))}${row('Gate '+p.to,detail(arr,'gate'))}${row('Check-in Zürich',departure?zurich?.checkin:null)}${row('Terminal '+p.from,detail(dep,'terminal'))}${row('Terminal '+p.to,detail(arr,'terminal'))}${row('Gepäckband '+p.to,arr.record?.baggage)}${row('Boarding Zürich',departure?time(zurich?.boardingTime):null)}${row('Flugzeug',zurich?.aircraft)}</dl>`:''}<p class="flight-note">${available?'Alle Zeiten lokal am jeweiligen Flughafen.':`Für ${p.dateLabel} liegt noch kein passender Datensatz vor. Angezeigt sind eure Buchungszeiten.`} ${f?.available?'Zürich abgerufen: '+dateText(f.observedAt)+'. ':''}${tracker?.available?'FlightStats abgerufen: '+dateText(tracker.observedAt)+'. ':''}Gate und Status vor dem Boarding auch auf der Flughafentafel prüfen.</p><div class="flight-links"><a href="${trackerLink}" target="_blank" rel="noopener">Flugtag bei FlightStats ↗</a><a href="${url}" target="_blank" rel="noopener">Flughafen Zürich ↗</a><a href="https://www.turkishairlines.com/en-int/flights/flight-status/" target="_blank" rel="noopener">${p.number} bei Airline prüfen ↗</a></div></article>`;
  }
  function render(){
    const panel=document.querySelector('#flight-panel');
    if(panel)panel.innerHTML=`<div class="flight-panel-heading"><div><p class="eyebrow">ANREISE & HEIMWEG</p><h3>Eure Flüge im Blick</h3></div><button class="secondary" data-refresh-flights ${busy?'disabled':''}>${busy?'Wird geladen …':'Stand aktualisieren ↻'}</button></div><div class="flight-grid">${plans.map(p=>card(p)).join('')}</div><p class="flight-sync" role="status">${lastError?'Abruf gerade nicht möglich; vorhandene Angaben bleiben sichtbar. ':''}Letzter Quellenabgleich: ${dateText(snapshot?.checkedAt)} (Zürich). Flughafen Zürich + FlightStats (Cirium). Automatischer Abgleich etwa alle 30 Minuten vom 28.09. bis 08.10.2026; Veröffentlichungen können verzögert sein. Der Knopf lädt den zuletzt veröffentlichten Stand.</p>`;
    document.querySelectorAll('[data-flight-slot]').forEach(el=>{const p=plans.find(p=>p.id===el.dataset.flightSlot);if(p)el.innerHTML=card(p,true);});
  }
  async function refresh(){
    if(busy)return;busy=true;render();
    try{const r=await fetch('./flights.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('flight snapshot');const data=await r.json();if(!Array.isArray(data.flights)||!data.checkedAt||!Number.isFinite(Date.parse(data.checkedAt)))throw Error('invalid snapshot');snapshot=data;lastError=false;}
    catch{lastError=true;}finally{busy=false;render();}
  }
  window.TripFlights={render,refresh};
  document.addEventListener('click',e=>{if(e.target.closest('[data-refresh-flights]'))refresh();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  setInterval(()=>{if(!document.hidden)refresh();},5*60*1000);
})();
