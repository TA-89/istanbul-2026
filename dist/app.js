'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const places = new Map(TRIP.places.map(p=>[p.id,p]));
  const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(new Date());
  let day = TRIP.days.find(d=>d.id===today) || TRIP.days[1];
  let mapReturnFocus=null, mapReturnScroll=0;
  let view='plan', mapFilter='day', map, markers, deferredInstall, locationControl, resumeLocation=false;
  const benefitLabels = {included:'E-Pass inklusive',free:'Frei zugänglich',discount:'Mit Vergünstigung',paid:'Separat bezahlen',booked:'Gebucht'};
  const badge = (text,type='') => `<span class="badge ${esc(type)}">${esc(text)}</span>`;
  const external = (url,label,cls='') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  const mapsUrl = p => p.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.coords ? p.coords.join(',') : p.name+' Istanbul')}`;
  const favoriteControl=p=>window.TripFavorites?.control(p)||'';
  const isFavorite=id=>window.TripFavorites?.has(id)||false;
  const placeBadge = p => badge(p.closed?'Zurzeit geschlossen':benefitLabels[p.benefit]||p.benefit,p.closed?'closed':p.benefit);
  const dayPlaceIds = () => [...new Set(day.events.map(e=>e.place).filter(Boolean))];
  const findPlace = id => places.get(id);
  const photo = (p,variant='card') => {
    const f=window.PLACE_PHOTOS?.[p?.id];if(!f)return '';
    return `<figure class="place-photo ${variant}"><img src="${esc(f.src)}" alt="${esc(f.alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"><figcaption>${external(f.source,'Foto: '+f.credit+' ↗')}</figcaption><span class="photo-unavailable">Foto derzeit nicht verfügbar</span></figure>`;
  };
  const distanceLabel=p=>{const d=locationControl?.distanceTo(p.coords);return d==null?'':d<1000?`${Math.round(d/10)*10} m Luftlinie`:`${(d/1000).toLocaleString('de-CH',{maximumFractionDigits:1})} km Luftlinie`;};

  $('#intro-photo').innerHTML='<img src="./assets/wir-zwei.jpeg" alt="Euer gemeinsames Reisefoto" width="1368" height="1824"><span class="photo-label">Wir zwei. Auf Entdeckungstour.</span>';
  $('#open-issues').innerHTML='<div class="issue-strip"><span><strong>2 Punkte noch offen</strong><span class="issue-expanded"> · Ebru und Rücktransfer</span></span><button data-view="bookings">Prüfen ↗</button></div>';
  const legend='<span class="booked">Gebucht</span><span class="planned">Weitere Orte</span><span class="attention">Noch klären</span><span class="tip">Tipps</span><span class="favorite">Favoriten</span><span class="gps">Dein Standort</span>';
  document.querySelectorAll('.map-legend').forEach(el=>el.innerHTML=legend);

  function renderDay(){
    $('#days').innerHTML=TRIP.days.map(d=>`<button class="${d.id===day.id?'active ':''}${d.id==='2026-10-07'?'departure':''}" data-day="${d.id}" aria-pressed="${d.id===day.id}"><span>${d.short}</span><strong>${d.label}</strong></button>`).join('');
    const shownPhotos=new Set();
    $('#itinerary').innerHTML=`<div class="day-header"><p class="eyebrow">${esc(day.short)} · ${esc(day.area)}</p><h2>${esc(day.title)}</h2><p class="day-subtitle">${esc(day.subtitle)}</p><div class="day-meta"><span class="mini-pill">${esc(day.pace)}</span><span class="mini-pill">Wege & Pausen eingeplant</span></div></div>${day.alert?`<details class="day-alert"><summary>${esc(day.id==='2026-10-06'?'Dinner-Abholung: ab 19:15 Uhr bereit':'Führungszeiten am Vorabend prüfen')}</summary><p>${esc(day.alert)}</p></details>`:''}<div class="timeline">${day.events.map(e=>{
      const p=findPlace(e.place);
      if(e.flight)return `<article class="event flight-event"><div class="event-time">Flug</div><span class="event-dot" aria-hidden="true"></span><div data-flight-slot="${e.flight}"></div></article>`;
      const eventPhoto=p&&!shownPhotos.has(p.id)&&e.status!=='pause'?photo(p,'timeline-photo'):'';if(eventPhoto)shownPhotos.add(p.id);
      return `<article class="event ${esc(e.status||'')}"><div class="event-time">${esc(e.time)}${e.end?`<small>– ${esc(e.end)}</small>`:''}</div><span class="event-dot" aria-hidden="true"></span><div class="event-card">${eventPhoto}<div class="event-top"><h3 class="event-title">${esc(e.title)}</h3>${e.label?badge(e.label,e.status||''):''}</div>${isFavorite(e.place)?'<span class="favorite-tag">★ Favorit</span>':''}<p>${esc(e.text)}</p>${e.note?`<p class="small-note">${esc(e.note)}</p>`:''}${p?`<div class="event-actions"><button class="text-button" data-detail="${p.id}">Details</button><button class="text-button" data-map="${p.id}">Auf Karte</button>${external(mapsUrl(p),'Weg öffnen ↗')}${p.restaurant&&p.source?external(p.source,'Restaurant ↗'):''}</div>`:''}</div></article>${e.travel?`<p class="travel-note">↳ ${esc(e.travel)}</p>`:''}`;
    }).join('')}</div>`;
    $('#day-extras').innerHTML=`<div class="extra-panel"><p class="eyebrow">${day.extras.length?'WENN NOCH ZEIT BLEIBT':'FÜR EINEN GUTEN ABSCHLUSS'}</p><h3>${day.extras.length?'Ein bisschen mehr Istanbul.':'Entspannt nach Hause.'}</h3><p>${esc(day.extraText)}</p>${day.extras.map(id=>{const p=findPlace(id);return `<button class="extra-option" data-detail="${id}"><strong>${esc(p.name)} ↗</strong><span>${esc(p.duration||p.area)} · ${esc(benefitLabels[p.benefit])}</span></button>`}).join('')}</div>`;
    window.TripFlights?.render();renderMap();
  }

  function initMap(){
    if(!window.L){$('#map').innerHTML='<div class="offline-map">Die Karte konnte nicht geladen werden. Alle Orte bleiben unter „Entdecken“ verfügbar.</div>';return;}
    map=L.map('map',{scrollWheelZoom:false,zoomControl:true}).setView([41.016,28.986],13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',crossOrigin:true}).addTo(map);
    markers=L.layerGroup().addTo(map);
    locationControl=window.createTripLocation({map,onState:s=>{
      $('#location-status').textContent=s.kind==='idle'?'':s.message;
      $('#location-status').dataset.state=s.kind;
      $('#locate-stop').hidden=!s.active&&s.kind!=='paused';
      $('#locate-me').textContent=s.active?'Auf mich zentrieren':'Mein Standort';
      $('#locate-me').setAttribute('aria-pressed',String(s.active));
      document.querySelectorAll('[data-distance]').forEach(el=>{const p=findPlace(el.dataset.distance);el.textContent=p?distanceLabel(p):'';});
    }});
  }

  function mapPlaces(){
    const ids=dayPlaceIds();
    if(view==='plan'&&!$('#map-dialog').open || mapFilter==='day') return TRIP.places.filter(p=>p.coords&&(ids.includes(p.id)||p.id==='hotel'));
    if(mapFilter==='booked') return TRIP.places.filter(p=>p.coords && ['hotel','airport','ep4','ep12','ep25'].includes(p.id));
    if(mapFilter==='included') return TRIP.places.filter(p=>p.coords&&p.benefit==='included'&&!p.closed);
    if(mapFilter==='discount') return TRIP.places.filter(p=>p.coords&&p.benefit==='discount'&&!p.closed);
    if(mapFilter==='favorite') return TRIP.places.filter(p=>p.coords&&isFavorite(p.id));
    if(mapFilter==='restaurants') return TRIP.places.filter(p=>p.coords&&p.restaurant);
    if(mapFilter==='tips') return TRIP.places.filter(p=>p.coords&&p.tip);
    return TRIP.places.filter(p=>p.coords);
  }
  function renderMap(focusId){
    if(!map) return;
    markers.clearLayers();
    const points=mapPlaces();
    if(focusId&&!points.some(p=>p.id===focusId)){const p=findPlace(focusId);if(p?.coords)points.push(p);}
    const groups=new Map();
    points.forEach(p=>{const key=p.coords.map(c=>c.toFixed(4)).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);});
    let focusMarker;
    groups.forEach(group=>{
      const p=group.find(x=>x.status==='attention')||group.find(x=>x.status==='booked')||group[0];
      const state=p.id==='hotel'?'hotel':p.status|| (isFavorite(p.id)?'favorite':p.tip?'tip':'');
      const ids=dayPlaceIds(); const n=ids.indexOf(p.id)+1;
      const label=p.id==='hotel'?'H':group.length>1?group.length:(view==='plan'&&!$('#map-dialog').open||mapFilter==='day')&&n?n:isFavorite(p.id)?'★':'•';
      const icon=L.divIcon({className:'map-pin',html:`<span class="pin ${state}"><b>${label}</b></span>`,iconSize:[29,35],iconAnchor:[15,32],popupAnchor:[0,-28]});
      const m=L.marker(p.coords,{icon,title:group.map(x=>x.name).join(' · '),alt:p.name}).addTo(markers);
      m.getElement()?.setAttribute('aria-label',group.map(x=>x.name).join(' · '));
      m.bindPopup(group.map(x=>`<b>${esc(x.name)}</b><p>${esc(x.area)} · ${esc(x.status==='attention'?'Noch klären':benefitLabels[x.benefit])}</p><button data-detail="${x.id}">Details öffnen</button>`).join('<hr>'),{maxHeight:260});
      if(group.some(x=>x.id===focusId))focusMarker=m;
    });
    map.invalidateSize();
    if(focusMarker){map.setView(focusMarker.getLatLng(),15);focusMarker.openPopup();}
    else if(points.length) map.fitBounds(L.latLngBounds(points.map(p=>p.coords)),{padding:[32,32],maxZoom:14});
    $('#map-results').innerHTML=`${points.length?points.map(p=>`<button class="map-result ${isFavorite(p.id)?'is-favorite':''}" data-focus="${p.id}"><span>${esc(p.name)}</span><small data-distance="${p.id}">${distanceLabel(p)}</small></button>`).join(''):'Keine Orte für diesen Filter.'}`;
    $('#map-filters').innerHTML=[['day','Tagesorte'],['booked','Gebucht'],['included','E-Pass inklusive'],['discount','Mit Vergünstigung'],['favorite','Favoriten'],['restaurants','Restaurants'],['tips','Tipps'],['all','Alle Orte']].map(([id,name])=>`<button data-map-filter="${id}" class="${mapFilter===id?'active':''}" aria-pressed="${mapFilter===id}">${name}</button>`).join('');
    $('#map-context').textContent=`${points.length} Orte · Details durch Antippen`;
  }

  function setView(next){
    if(!['plan','map','bookings','discover','info'].includes(next))next='plan';
    if($('#map-dialog').open)$('#map-dialog').close();
    const changed=view!==next;
    view=next;
    document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==next+'-view');
    document.querySelectorAll('.main-nav button').forEach(el=>{el.classList.toggle('active',el.dataset.view===next);el.setAttribute('aria-current',el.dataset.view===next?'page':'false');});
    document.body.classList.toggle('map-page',next==='map');
    (next==='map'?$('#map-large'):$('#map-home')).append($('#map-unit'));
    history.replaceState(null,'','#'+next);
    requestAnimationFrame(()=>{renderMap();if(changed)$('#'+next+'-view').scrollIntoView({block:'start'});});
  }
  function openMapFullscreen(){
    if($('#map-dialog').open)return;
    mapReturnFocus=document.activeElement;mapReturnScroll=window.scrollY;
    history.pushState({mapFullscreen:true},'',location.href);
    $('#map-dialog').showModal();document.body.classList.add('map-is-fullscreen');
    $('#map-fullscreen-filters').append($('#map-filters'));
    $('#map-fullscreen-body').append($('#map-unit'));
    requestAnimationFrame(()=>renderMap());
  }
  function closeMapFullscreen(){
    document.body.classList.remove('map-is-fullscreen');
    $('#map-context').before($('#map-filters'));
    (view==='map'?$('#map-large'):$('#map-home')).append($('#map-unit'));
    if(history.state?.mapFullscreen)history.back();
    requestAnimationFrame(()=>{renderMap();window.scrollTo({top:mapReturnScroll,behavior:'instant'});mapReturnFocus?.focus({preventScroll:true});});
  }
  $('#map-dialog').addEventListener('close',closeMapFullscreen);
  $('#map-close').addEventListener('click',()=>$('#map-dialog').close());
  $('#map-fullscreen').addEventListener('click',openMapFullscreen);
  window.addEventListener('popstate',()=>{if($('#map-dialog').open&&!history.state?.mapFullscreen)$('#map-dialog').close();});
  window.addEventListener('resize',()=>map?.invalidateSize());
  function showOnMap(id){
    const p=findPlace(id);if(!p)return;locationControl?.release();
    if(!p.coords){showDetail(id);return;}
    mapFilter='all';setView('map');
    requestAnimationFrame(()=>{renderMap(id);$('#map-view').scrollIntoView({block:'start',behavior:'smooth'});});
  }
  function showDetail(id){
    const p=findPlace(id);if(!p)return;
    $('#place-detail').innerHTML=`${photo(p,'detail-photo')}<p class="eyebrow">${esc(p.area)} · ${esc(p.category)}</p><h2>${esc(p.name)}</h2><div class="detail-meta">${placeBadge(p)}${p.duration?badge(p.duration,'free'):''}${p.status?badge(p.status==='booked'?'Bestätigt':'Noch klären',p.status):''}</div>${favoriteControl(p)}<p>${esc(p.description)}</p>${p.notes?`<div class="detail-note"><p>${esc(p.notes)}</p></div>`:''}${p.address?`<p><strong>Adresse:</strong> ${esc(p.address)}</p>`:''}${p.hours?`<p><strong>Zeiten:</strong> ${esc(p.hours)}</p>`:''}${p.mode?`<p><strong>Zugang:</strong> ${esc(p.mode)}</p>`:''}<p class="muted">${esc(p.mapNote||'Kartenpunkt zur Orientierung. Exakten Eingang oder Treffpunkt vor dem Besuch prüfen.')}</p><div class="actions">${external(mapsUrl(p),'Ort / Treffpunkt öffnen ↗','primary')}${p.source?external(p.source,p.sourceLabel||'Anbieter & aktuelle Details ↗','secondary'):''}${p.phone?`<a class="secondary" href="tel:${esc(p.phone)}">Anbieter anrufen</a>`:''}${p.email?`<a class="secondary" href="mailto:${esc(p.email)}">Anbieter mailen</a>`:''}</div><p class="muted">Recherche: ${esc(p.checked||TRIP.checked)}. ${p.restaurant?'Restaurantvorschlag, nicht reserviert. Essen und Getränke separat; kein E-Pass-Angebot.':'E-Pass-Verfügbarkeit im persönlichen Dashboard prüfen.'} Angegebene Besuchs- und Wegzeiten sind Planungswerte.</p>`;
    $('#place-dialog').showModal();
  }
  $('#close-dialog').addEventListener('click',()=>$('#place-dialog').close());
  $('#place-dialog').addEventListener('click',e=>{if(e.target===$('#place-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});

  function renderBookings(){
    $('#bookings').innerHTML=TRIP.bookings.filter(b=>b.title!=='Flüge Zürich ↔ Istanbul').map(b=>`<article class="booking-card">${photo(findPlace(b.place),'booking-photo')}<p class="booking-date">${esc(b.date)}</p>${badge(b.label,b.status)}<h3>${esc(b.title)}</h3><div class="booking-time">${esc(b.time)}</div><p>${esc(b.text)}</p><p class="muted">Quelle: ${esc(b.source)}</p><div class="event-actions"><button class="text-button" data-detail="${b.place}">Details</button><button class="text-button" data-map="${b.place}">Auf Karte</button>${b.phone?`<a href="tel:${esc(b.phone)}">Anbieter anrufen ↗</a>`:''}${b.email?`<a href="mailto:${esc(b.email)}">Anbieter mailen ↗</a>`:''}</div></article>`).join('');
  }
  const normal = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase();
  function renderDiscover(){
    const q=normal($('#search').value.trim()),filter=$('#benefit-filter').value;
    let list=TRIP.places.filter(p=>!['hotel','airport','eminonu'].includes(p.id));
    list=list.filter(p=>normal([p.name,p.originalName,p.area,p.category,p.description].join(' ')).includes(q));
    if(filter==='favorite')list=list.filter(p=>isFavorite(p.id));
    else if(filter==='restaurant')list=list.filter(p=>p.restaurant);
    else if(filter==='tip')list=list.filter(p=>p.tip);
    else if(filter!=='all')list=list.filter(p=>p.benefit===filter);
    list.sort((a,b)=>(a.closed?100:0)+(a.priority||10)-((b.closed?100:0)+(b.priority||10))||a.name.localeCompare(b.name,'de'));
    $('#result-count').textContent=`${list.length} Angebote & Orte · ${list.filter(p=>p.coords).length} auf der Karte · zuerst eure Highlights`;
    $('#discover').innerHTML=list.length?list.map(p=>`<article class="place-card">${photo(p)}${favoriteControl(p)}<p class="card-category">${esc(p.area)} · ${esc(p.category)}</p><h3>${esc(p.name)}</h3><div>${placeBadge(p)}</div><p>${esc(p.description)}</p><div class="card-bottom"><button class="text-button" data-detail="${p.id}">Details & Zeiten ↗</button>${p.coords?`<button class="text-button" data-map="${p.id}">Auf Karte</button>`:external(mapsUrl(p),'Standort beim Anbieter ↗')}</div></article>`).join(''):'<p class="empty">Keine passenden Orte. Probiert einen anderen Suchbegriff oder „Alle Angebote“.</p>';
  }
  function renderInfo(){
    $('#info').innerHTML=`
    <article class="info-card"><p class="eyebrow">EURE BASIS</p><h3>Wyndham Istanbul Old City</h3><p>Şehzadebaşı Cd. No:1, Fatih. Vier Nächte, Doppelzimmer und Frühstück. Abends führen euch die T1-Haltestelle Laleli und der kurze Fussweg zurück ins Hotel.</p><p>Frühstück laut Reisebeschreibung 07:00–10:00 Uhr. Für Mittwoch ein Frühstückspaket anfragen. Zeiten an der Rezeption bestätigen.</p><div class="event-actions"><button class="text-button" data-map="hotel">Hotel auf Karte</button><a href="tel:+902125111579">Hotel anrufen</a></div></article>
    <article class="info-card"><p class="eyebrow">E-PASS</p><h3>3.–7. Oktober · 5-Tage-Pass</h3><p>Euer Pass gilt für zwei Erwachsene. Die Flüge ergeben drei volle Stadttage und den Ankunftsabend; Mittwoch ist Abreisetag.</p><p>„Inklusive“ bezeichnet die auf der jeweiligen Anbieterseite genannte Leistung. Bei Audioguides sind der Audioguide und oft ein ohnehin frei zugänglicher Ort gemeint. „Aufpreis“ bedeutet nur einen Rabatt.</p><p>QR-Codes direkt im Dashboard öffnen. Führungen auf Englisch; 10 Minuten vor der veröffentlichten Startzeit beim Guide sein. Sicherheitskontrollen können trotzdem Wartezeit verursachen.</p>${external('https://yourepass.com/dashboard','Persönliches E-Pass-Dashboard ↗','primary')}</article>
    <article class="info-card"><p class="eyebrow">STANDORT & EMPFEHLUNGEN</p><h3>Mit Orientierung unterwegs</h3><p>„Mein Standort“ zeigt eure Position und einen Genauigkeitskreis auf der Karte. Nach eurer Browser-Freigabe wird die Position aktualisiert, solange die App sichtbar ist. „Aus“ beendet die Standortabfrage. Eure Koordinaten werden von dieser App weder gespeichert noch hochgeladen.</p><p>Beim Zentrieren lädt OpenStreetMap die Kartenkacheln des angezeigten Gebiets. Entfernungen sind Luftlinie, keine Fusswege. In Gebäuden kann die Ortung ungenau sein.</p><p>„Tipps“ verbinden eure zugesandten Empfehlungen mit recherchierten Vorschlägen passend zu euren Wegen. Bei Restaurants stehen Adresse, Webseite und Planungshinweise in den Ortsdetails.</p></article><article class="info-card"><p class="eyebrow">KURZE WEGE</p><h3>Tram & Fähre</h3><p><strong>T1:</strong> Laleli → Beyazıt → Sultanahmet → Gülhane → Sirkeci → Eminönü → Karaköy → Tophane → Kabataş. Für die Rückfahrt Richtung Bağcılar fahren.</p><p><strong>Fähre:</strong> Eminönü / Karaköy ↔ Kadıköy. Die Abfahrtsfenster im Plan enthalten Wartezeit; sie sind keine reservierten Verbindungen. Fahrplan vor Ort oder beim Betreiber prüfen.</p><p>Öffentliche Verkehrsmittel sind nicht automatisch im E-Pass enthalten. Eine Istanbulkart mit Guthaben ist praktisch. Wegzeiten sind vorsichtige Schätzungen, keine Live-Routen.</p><div class="source-list">${external('https://www.metro.istanbul/en/Hatlarimiz/HatDetay?hat=T1','Offizielle T1-Linie ↗')}${external('https://sehirhatlari.istanbul/tr/seferler/ic-hatlar/istanbul-ici-hatlar/kadikoy-karakoy-163','Offizieller Fährfahrplan ↗')}</div></article>
    <article class="info-card"><p class="eyebrow">BEIM BESUCH</p><h3>Kleine Dinge, die helfen</h3><ul><li>Alle Programmzeiten gelten in Istanbul, UTC+3. Zürich liegt zu euren Reisedaten eine Stunde zurück; Flugzeiten sind jeweils lokal.</li><li>Bequeme Schuhe, Wasser, Kopftuch und eine Windjacke für die Yacht mitnehmen.</li><li>In Moscheen Schultern und Knie bedecken und Besuchsunterbrechungen während der Gebete respektieren.</li><li>Für Dolmabahçe den Ausweis oder Pass für den Audioguide bereithalten.</li><li>Topkapı ist dienstags, Dolmabahçe montags und der Grosse Basar sonntags geschlossen. Im Plan berücksichtigt.</li><li>Bei Wartezeiten zuerst optionale Extras streichen; die gebuchten Schiffe und ihre Treffzeiten haben Vorrang.</li></ul></article>
    <article class="info-card"><p class="eyebrow">AUF DEM HANDY</p><h3>Als Webapp mitnehmen</h3><p><strong>iPhone:</strong> Die veröffentlichte HTTPS-Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“.</p><p><strong>Android:</strong> In Chrome öffnen → Menü → „App installieren“ oder „Zum Startbildschirm hinzufügen“.</p><button id="install-app" class="primary install" hidden>Webapp installieren</button><div class="install-note"><p>Nach dem ersten vollständigen Laden stehen Programm, Buchungen und Ortsdetails offline bereit. Die interaktive Kartenbasis, Live-Fahrpläne und externen Links brauchen Internet. Der E-Pass und seine QR-Codes bleiben im separaten Dashboard.</p><p id="offline-status" class="offline-status">Offline-Verfügbarkeit wird geprüft …</p></div></article>
    <article class="info-card"><p class="eyebrow">NOCH ERLEDIGEN</p><h3>Zwei offene Punkte</h3><ol><li>Ebru für Sonntag 13:00 Uhr reservieren, sofern verfügbar.</li><li>Rücktransfer am Mittwoch vereinbaren; 06:35 Uhr ist der Planungswert.</li></ol><p>Diese Webseite hat keine Buchung geändert und keinen neuen Termin reserviert.</p><p>E-Pass-Support: <a href="tel:+908503023812">+90 850 302 3812</a></p></article>
    <article class="info-card wide"><p class="eyebrow">TRANSPARENTE PLANUNG</p><h3>Quellen & Aktualität</h3><p>Restauranttipps aus euren Unterlagen ergänzt und online geprüft: 25.09.2026. Die Çiçek-Passage ist ein Tipp aus dem Dokument; Seviç wurde als konkrete Restaurantoption darin recherchiert. Essenszeiten und Wege sind Vorschläge, keine Tischreservierungen. Katalog- und Dashboardabgleich: 21.09.2026. Reservationsstand sowie Kaffee-Dauer und Fussweg erneut geprüft: 23.09.2026. Die neue Dinnerbestätigung wurde über dieselbe Reservierung mit dem bereits gebuchten Datum 06.10.2026 verknüpft. Insgesamt acht Reservationsmails liegen vor. Der ältere PDF-Stadtführer weicht bei manchen Leistungen und Öffnungen ab; aktuelle Detailseiten haben für Vorschläge Vorrang.</p><p>„Bestätigt“ beruht auf einer Bestätigungsmail bzw. den Reiseunterlagen. Die Dinnerfahrt ist mit Mail vom 23.09.2026 bestätigt: ab 19:15 Uhr bereit sein, Abholung 19:15–19:45 und Rücktransfer zum Hotel. Alle weiteren Tageszeiten sind Vorschläge. Keine Live-Synchronisation der Reservierungen mit dem E-Pass. Die Fluganzeige nutzt separat die offizielle Zürcher Flugtafel und FlightStats (Cirium) mit sichtbarem Datenstand.</p><p>Der Katalog enthält ${window.EPASS_CATALOG.length} öffentlich gelistete Stadtattraktionen, einschliesslich klar markierter vorübergehender Schliessungen. Tages- und Mehrtagestouren sowie reine Zusatzservices sind ausgelassen. Das persönliche Dashboard bestimmt, was mit eurem konkreten Pass verfügbar ist. Karte: Anbieter-Kartenpunkte und Orientierungspunkte; einzelne Marker zeigen Treffpunkte statt Gebäude. Die drei Angebote ohne eindeutigen Punkt bleiben über ihre Anbieterlinks erreichbar.</p><div class="source-list">${external('https://istanbulepass.com/guided-tours-timetable','E-Pass-Führungszeiten ↗')}${external('https://istanbulepass.com/istanbul-attractions/','E-Pass-Katalog ↗')}${external('https://yourepass.com/reservations','Eure Reservierungen ↗')}${external('https://goturkiye.com/istanbul/kadikoy','Kadıköy · GoTürkiye ↗')}${external('https://goturkiye.com/istanbul/moda','Moda · GoTürkiye ↗')}</div><details><summary>Spontan ein Konzert oder Event?</summary><p>Die Links aus euren Reisetipps: Veranstaltungen für Istanbul und den 03.–06.10.2026 filtern. Ein Abendevent ersetzt einen Restaurantabend; die beiden gebuchten Schifffahrten bleiben fix.</p><div class="source-list">${external('https://www.passo.com.tr/en','Passo · Events ↗')}${external('https://www.biletix.com/anasayfa/ISTANBUL/tr','Biletix · Istanbul ↗')}</div></details><details><summary>Bildnachweis & technische Hinweise</summary><p>Favoriten und übernommene Tagespläne werden automatisch bei Supabase gespeichert. Zum Speichern ist eine freigeschaltete Sitzung erforderlich. Offline gesetzte Häkchen werden bei der nächsten Verbindung übertragen. GPS-Koordinaten und Buchungsunterlagen werden nicht dorthin gesendet.</p><p>Euer gemeinsames Foto: von euch bereitgestellt. Attraktionsfotos: Istanbul E-pass, direkt von der jeweiligen Anbieterseite eingebunden und dort verlinkt. Diese Fotos benötigen Internet und werden erst beim Anzeigen geladen.</p><p>Weiteres Stadtpanorama: Juraj Patekar, <a href="https://commons.wikimedia.org/wiki/File:Wv_Istanbul_banner.jpg" target="_blank" rel="noopener">Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener">CC BY 2.0</a>, im Layout zugeschnitten. Karte: OpenStreetMap-Mitwirkende; Kartenbibliothek Leaflet, BSD-2-Clause.</p><p>Keine Analyse- oder Werbetracker. Kartenkacheln werden von OpenStreetMap, Attraktionsfotos von Istanbul E-pass geladen; bei externen Links öffnet sich der jeweilige Anbieter. Reiseprogramm und öffentliche Anbieter-Kontakte sind Teil der Webseite. Buchungscodes, Passnummern, QR-Codes, Geburtsdaten und Originaldokumente werden nicht veröffentlicht.</p></details></article>`;
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button,a');if(!b)return;
    if(b.dataset.view){e.preventDefault();setView(b.dataset.view);}
    if(b.dataset.day){locationControl?.release();day=TRIP.days.find(d=>d.id===b.dataset.day);renderDay();$('#plan-view').scrollIntoView({block:'start'});}
    if(b.dataset.detail)showDetail(b.dataset.detail);
    if(b.dataset.map)showOnMap(b.dataset.map);
    if(b.dataset.focus){locationControl?.release();renderMap(b.dataset.focus);}
    if(b.dataset.mapFilter){locationControl?.release();mapFilter=b.dataset.mapFilter;renderMap();document.querySelector(`[data-map-filter="${mapFilter}"]`)?.focus({preventScroll:true});}
  });
  $('#map-expand').addEventListener('click',()=>{mapFilter='day';openMapFullscreen();});
  $('#map-fit').addEventListener('click',()=>{locationControl?.release();renderMap();});
  $('#locate-me').addEventListener('click',()=>locationControl?.center());
  $('#locate-stop').addEventListener('click',()=>{resumeLocation=false;locationControl?.stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){resumeLocation=locationControl?.active; if(resumeLocation)locationControl.pause();}else if(resumeLocation){resumeLocation=false;locationControl?.start();}});
  document.addEventListener('error',e=>{if(e.target.matches?.('.place-photo img'))e.target.closest('.place-photo').classList.add('unavailable');},true);
  $('#search').addEventListener('input',renderDiscover);
  $('#benefit-filter').addEventListener('change',renderDiscover);
  window.TripApp={refreshShared(){day=TRIP.days.find(d=>d.id===day.id)||TRIP.days[1];renderDay();renderDiscover();if($('#place-dialog').open){const id=$('#place-detail [data-favorite]')?.dataset.favorite;if(id)showDetail(id);}},showPlan(){setView('plan');}};
  renderInfo();renderBookings();renderDiscover();initMap();renderDay();setView(location.hash.slice(1)||'plan');
  window.TripFlights?.refresh();
  window.addEventListener('hashchange',()=>setView(location.hash.slice(1)));
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#install-app').hidden=false;});
  $('#install-app').addEventListener('click',async()=>{if(deferredInstall){await deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#install-app').hidden=true;}});
  if('serviceWorker' in navigator && location.protocol!=='file:'){
    navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('#offline-status').textContent='Programm und Ortsdetails sind für die Offline-Nutzung gespeichert.';}).catch(()=>{$('#offline-status').textContent='Offline-Speicherung ist hier nicht verfügbar. Die Seite funktioniert online.';});
  }else $('#offline-status').textContent='Die Offline-Funktion wird über HTTPS oder in der lokalen Vorschau aktiviert.';
})();
