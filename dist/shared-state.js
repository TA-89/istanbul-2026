'use strict';
((root)=>{
  const copy=x=>JSON.parse(JSON.stringify(x));
  const initial=defaults=>({revision:0,planRevision:0,favorites:[...defaults],activePlan:null,history:[],updatedAt:null});
  function reduce(state,operation){
    const next=copy(state),op=operation;
    if(op.kind==='favorite'){
      next.favorites=next.favorites.filter(id=>id!==op.id);if(op.value)next.favorites.push(op.id);
    }else if(op.kind==='apply'){
      if(op.expectedRevision!==state.revision)throw Error('conflict');
      next.history=[...next.history,next.activePlan].slice(-10);
      next.activePlan={favorites:[...state.favorites],version:1};next.planRevision++;
    }else if(op.kind==='undo'){
      if(op.expectedPlanRevision!==state.planRevision)throw Error('conflict');
      if(!next.history.length)throw Error('no-history');
      next.activePlan=next.history.pop();next.planRevision++;
    }else throw Error('invalid-operation');
    next.revision++;next.updatedAt=new Date().toISOString();return next;
  }
  function create({config,defaults,allowed,booked,storage,fetcher,onChange=()=>{},uuid=()=>crypto.randomUUID()}){
    const key='istanbul-shared-v1',sessionKey=key+'-session',configured=!!(config.url&&config.key);
    const read=(key,fallback)=>{try{return JSON.parse(storage.getItem(key))||fallback;}catch{return fallback;}};
    const saved=read(key,null);let state=saved?.state||initial(defaults),pending=saved?.pending||[],token=read(sessionKey,null),busy=false,phase=configured?(token?'connecting':'locked'):'local',message='';
    const valid=new Set(allowed),fixed=new Set(booked);let listeners=[];
    const visible=()=>pending.reduce((s,op)=>reduce(s,op),copy(state));
    function persist(){try{storage.setItem(key,JSON.stringify({state,pending}));}catch{message='Speicherung auf diesem Gerät nicht möglich. Diesen Tab geöffnet lassen.';}}
    const get=()=>({state:visible(),pending:pending.length,busy,phase,configured,authenticated:!!token,message});
    function emit(){onChange(get());listeners.forEach(fn=>fn(get()));}
    function accept(value){
      if(!value||!Array.isArray(value.favorites)||!Array.isArray(value.history)||!Number.isInteger(value.revision))throw Error('invalid-response');
      if(value.activePlan&&value.activePlan.version!==1)throw Error('update-required');
      state=copy(value);persist();
    }
    async function rpc(name,args){
      const response=await fetcher(config.url.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:config.key},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('network');const data=await response.json();if(!data?.ok)throw Error(data?.error||'network');return data;
    }
    function fail(error){
      if(error.message==='auth'){token=null;storage.removeItem(sessionKey);phase='locked';message='Bitte den Reisecode erneut eingeben.';}
      else {phase='offline';message=error.message==='update-required'?'Neue App-Version benötigt. Bitte neu laden.':'Verbindung unterbrochen. Der letzte Stand bleibt sichtbar.';}
    }
    async function refresh(){
      if(!configured||!token||busy)return;busy=true;message='';emit();
      try{
        const latest=await rpc('istanbul_state',{p_token:token});accept(latest.state);
        while(pending.length){const op=pending[0];const result=await rpc('istanbul_change',{p_token:token,p_operation:op});pending.shift();accept(result.state);}
        phase='synced';
      }catch(error){fail(error);}finally{busy=false;persist();emit();}
    }
    async function login(code){
      if(!configured)throw Error('not-configured');if(busy)return;busy=true;message='';emit();
      try{const result=await rpc('istanbul_login',{p_code:code});token=result.token;storage.setItem(sessionKey,JSON.stringify(token));accept(result.state);phase='synced';}
      catch(error){phase='locked';message=error.message==='auth'?'Der Reisecode stimmt nicht.':error.message==='rate-limit'?'Zu viele Versuche. Bitte später nochmals probieren.':'Verbindung zum gemeinsamen Speicher gerade nicht möglich.';throw error;}
      finally{busy=false;emit();}
      await refresh();
    }
    async function favorite(id,value){
      if(!valid.has(id)||fixed.has(id))return;
      if(configured&&!token)throw Error('auth');
      const op={kind:'favorite',id,value:!!value,operationId:uuid()};
      if(!configured){state=reduce(state,op);persist();emit();return;}
      pending.push(op);persist();emit();await refresh();
    }
    async function change(op){
      if(busy||pending.length)throw Error('pending');
      op={...op,operationId:uuid()};
      if(!configured){state=reduce(state,op);persist();emit();return;}
      if(!token)throw Error('auth');busy=true;emit();
      try{const result=await rpc('istanbul_change',{p_token:token,p_operation:op});accept(result.state);phase='synced';message='';}
      catch(error){
        if(error.message==='conflict'){message='Auf dem anderen Gerät wurde etwas geändert. Vorschau bitte neu erstellen.';phase='synced';}
        else fail(error);
        throw error;
      }finally{busy=false;emit();}
    }
    function receiveStorage(){if(busy||pending.length)return;const cached=read(key,null);if(cached?.state){state=cached.state;pending=cached.pending||[];emit();}}
    const api={get,login,favorite,refresh,receiveStorage,subscribe:fn=>{listeners.push(fn);return()=>listeners=listeners.filter(x=>x!==fn);},apply:revision=>change({kind:'apply',expectedRevision:revision}),undo:planRevision=>change({kind:'undo',expectedPlanRevision:planRevision})};
    persist();return api;
  }
  const api={create,initial,reduce};root.TripShared=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
