'use strict';
(()=>{
  if(!window.TripApp)return; // The installing service worker reloads older cached app versions.
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const baseline=JSON.parse(JSON.stringify(TRIP)),place=new Map(TRIP.places.map(p=>[p.id,p]));
  const store=TripShared.create({config:window.TRIP_SYNC_CONFIG,defaults:TripPlanner.defaults,allowed:[...place.keys()],booked:TripPlanner.booked,storage:localStorage,fetcher:fetch});
  let lastContent='',previewRevision=null,preview=null;
  const has=id=>store.get().state.favorites.includes(id);
  const isBooked=id=>TripPlanner.booked.includes(id);
  const control=p=>p.id==='eminonu'?'':isBooked(p.id)?'<span class="favorite-booked">✓ Bereits reserviert</span>':`<label class="favorite-check ${has(p.id)?'selected':''}"><input type="checkbox" data-favorite="${p.id}" ${has(p.id)?'checked':''}><span aria-hidden="true">${has(p.id)?'★':'☆'}</span><span>Favorit</span><span class="sr-only">: ${esc(p.name)}</span></label>`;
  const time=stamp=>stamp?new Intl.DateTimeFormat('de-CH',{hour:'2-digit',minute:'2-digit'}).format(new Date(stamp)):'';
  function status(s){
    if(!s.configured)return 'Auf diesem Gerät gespeichert · gemeinsamer Speicher noch nicht verbunden';
    if(s.phase==='locked')return 'Gemeinsame Favoriten · bitte mit eurem Reisecode verbinden';
    if(s.pending)return `${s.pending} Änderung${s.pending===1?'':'en'} wartet auf den Geräteabgleich`;
    if(s.phase==='offline')return s.message||'Offline · letzter gemeinsamer Stand';
    if(s.busy)return 'Gemeinsamen Stand abgleichen …';
    return `Für beide Geräte gespeichert${s.state.updatedAt?' · '+time(s.state.updatedAt):''}`;
  }
  const canPlan=s=>!s.busy&&!s.pending&&(!s.configured||s.authenticated&&s.phase!=='offline');
  function notice(text){$('#favorite-notice').textContent=text;}
  function render(s){
    const planned=new Set(TRIP.days.flatMap(d=>d.events.filter(e=>e.status!=='pause').map(e=>e.place))),count=s.state.favorites.length;
    const countPlanned=s.state.favorites.filter(id=>planned.has(id)).length;
    const login=s.configured&&!s.authenticated?'<button class="secondary" data-open-sync>Reisecode eingeben</button>':'';
    $('#favorite-tools').innerHTML=`<div class="favorites-heading"><div><p class="eyebrow">EURE MERKLISTE</p><h3>${count} Favoriten <span>· ${countPlanned} im Tagesplan</span></h3></div><button class="secondary" data-only-favorites>Nur Favoriten anzeigen</button></div><p>Häkchen setzen und gemeinsam auswählen. Bereits reservierte Erlebnisse bleiben fest. Ein Favorit ist noch keine Buchung.</p><div class="sync-line" role="status"><span class="sync-dot ${s.phase}"></span><span>${esc(status(s))}</span>${login}${s.configured&&s.authenticated?'<button class="text-button" data-sync-refresh>Abgleichen ↻</button>':''}</div><button class="primary plan-match" data-plan-preview ${canPlan(s)?'':'disabled'}>Tagesprogramm mit Favoriten abgleichen</button>`;
    $('#plan-tools').innerHTML=`<div><strong>${s.state.activePlan?'Programm mit euren Favoriten':'Euer ursprüngliches Programm'}</strong><p>${count} Favoriten · ${countPlanned} eingeplant. Änderungen erst nach dem Abgleich.</p></div><div class="plan-tool-actions"><button class="primary" data-plan-preview ${canPlan(s)?'':'disabled'}>Tagesprogramm mit Favoriten abgleichen</button><button class="secondary" data-plan-undo ${canPlan(s)&&s.state.history.length?'':'disabled'}>↶ Zurück zum vorherigen Programm</button></div>${login}<p class="plan-sync" role="status">${esc(status(s))}</p>`;
    $('#sync-message').textContent=s.message;
    $('#sync-submit').disabled=s.busy;
  }
  function changed(s){
    const content=JSON.stringify({favorites:s.state.favorites,plan:s.state.activePlan});
    if(content!==lastContent){
      lastContent=content;
      const focused=document.activeElement?.dataset.favorite;
      const result=s.state.activePlan?TripPlanner.build(baseline,s.state.activePlan.favorites):{days:baseline.days};
      TRIP.days=JSON.parse(JSON.stringify(result.days));
      window.TripApp.refreshShared();
      if(focused)document.querySelector(`[data-favorite="${focused}"]`)?.focus({preventScroll:true});
    }
    render(s);
    if($('#program-dialog').open&&previewRevision!==s.state.revision){
      $('#program-accept').disabled=true;
      $('#program-message').textContent='Die Favoriten oder das Programm wurden inzwischen geändert. Bitte zurückgehen und den Abgleich neu öffnen.';
    }
  }
  function openLogin(){if(!$('#sync-dialog').open)$('#sync-dialog').showModal();$('#travel-code').focus();}
  function showPreview(){
    const current=store.get();if(current.configured&&!current.authenticated){openLogin();return;}
    preview=TripPlanner.build(baseline,current.state.favorites);previewRevision=current.state.revision;
    const diff=preview.days.map(d=>{
      const old=TRIP.days.find(x=>x.id===d.id);
      const added=d.events.filter(e=>!old.events.some(x=>JSON.stringify(x)===JSON.stringify(e)));
      const removed=old.events.filter(e=>!d.events.some(x=>JSON.stringify(x)===JSON.stringify(e)));
      return {day:d,added,removed};
    }).filter(x=>x.added.length||x.removed.length);
    const names=ids=>ids.map(id=>esc(place.get(id)?.name||id)).join(' · ');
    $('#program-preview').innerHTML=`<p class="eyebrow">IN RUHE AUSWÄHLEN</p><h2>So passen eure Favoriten.</h2><p class="preview-lead">${preview.planned.length} von ${current.state.favorites.length} Favoriten im Programm. Gebuchte Termine bleiben geschützt. Vorschläge ersetzen bestehende Punkte und werden nicht einfach angehängt.</p>${diff.length?diff.map(x=>`<article class="plan-diff"><h3>${esc(x.day.short)}</h3><p class="diff-label">Der Vorschlag</p><ul>${x.added.map(e=>`<li><strong>${esc(e.time)}${e.end?'–'+esc(e.end):''}</strong> ${esc(e.title)}</li>`).join('')}</ul><details><summary>Was dafür weicht oder angepasst wird</summary><ul>${x.removed.map(e=>`<li>${esc(e.time)} · ${esc(e.title)}</li>`).join('')}</ul></details></article>`).join(''):'<p class="unchanged-plan">Euer aktuelles Programm passt bereits zu dieser Auswahl. Es ist keine Änderung nötig.</p>'}<details class="kept-favorites"><summary>Bereits eingeplante Favoriten bleiben erhalten</summary><p>${names(preview.kept)||'Keine weiteren bestehenden Favoriten.'}</p></details>${preview.unplanned.length?`<section class="unplanned-favorites"><h3>Favoriten ohne festen Termin</h3><p>Bewusst frei gelassen, damit die Reise entspannt bleibt.</p>${preview.unplanned.map(item=>`<article><strong>${esc(place.get(item.id).name)}</strong><p>${esc(item.reason)}</p></article>`).join('')}</section>`:''}<p class="preview-fixed">Flüge, Ankunftstransfer, Kaffee, Yacht und reservierte Dinnerfahrt bleiben unverändert. Der bekannte Kaffee/Yacht-Konflikt und die offene Dinnerabholzeit müssen weiterhin geklärt werden.</p>`;
    $('#program-message').textContent='';$('#program-accept').disabled=!diff.length||!canPlan(current);
    $('#program-dialog').showModal();
  }
  async function apply(){
    $('#program-accept').disabled=true;
    try{await store.apply(previewRevision);$('#program-dialog').close();notice('Programm angepasst. Mit „Zurück“ stellt ihr den vorherigen Stand wieder her.');TripApp.showPlan();}
    catch(error){$('#program-message').textContent=error.message==='conflict'?'Der gemeinsame Stand wurde inzwischen geändert. Bitte zurück und erneut abgleichen.':'Speichern gerade nicht möglich. Das bisherige Programm bleibt sichtbar; Verbindung prüfen und erneut abgleichen.';await store.refresh();}
  }
  async function undo(){
    const revision=store.get().state.planRevision;
    try{await store.undo(revision);notice('Vorheriges Programm wiederhergestellt. Eure Favoriten bleiben angekreuzt.');}
    catch(error){notice(error.message==='conflict'?'Das Programm wurde auf dem anderen Gerät geändert. Zuerst den aktuellen Stand laden.':'Zurücksetzen gerade nicht möglich. Bitte die Verbindung prüfen.');await store.refresh();}
  }
  window.TripFavorites={has,isBooked,control};
  document.addEventListener('change',async event=>{
    const id=event.target.dataset.favorite;if(!id)return;
    try{await store.favorite(id,event.target.checked);}catch(error){event.target.checked=has(id);if(error.message==='auth')openLogin();else notice('Favorit konnte nicht gespeichert werden. Bitte nochmals versuchen.');}
  });
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-open-sync'))openLogin();
    if(b.hasAttribute('data-sync-refresh'))store.refresh();
    if(b.hasAttribute('data-only-favorites')){$('#benefit-filter').value='favorite';$('#benefit-filter').dispatchEvent(new Event('change'));}
    if(b.hasAttribute('data-plan-preview'))showPreview();
    if(b.hasAttribute('data-plan-undo'))undo();
  });
  $('#sync-form').addEventListener('submit',async event=>{event.preventDefault();const input=$('#travel-code');const code=input.value;input.value='';try{await store.login(code);$('#sync-dialog').close();notice('Gemeinsame Favoriten verbunden. Auf dem zweiten Gerät denselben Reisecode eingeben.');}catch{input.focus();}});
  $('#sync-close').addEventListener('click',()=>$('#sync-dialog').close());
  $('#program-back').addEventListener('click',()=>$('#program-dialog').close());
  $('#program-accept').addEventListener('click',apply);
  window.addEventListener('online',()=>store.refresh());
  window.addEventListener('storage',()=>store.receiveStorage());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)store.refresh();});
  setInterval(()=>{if(!document.hidden)store.refresh();},20000);
  store.subscribe(changed);changed(store.get());store.refresh();
})();
