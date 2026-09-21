"""Read the official public Zurich board; match exact flight/date/direction only."""
import json, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ENDPOINT='https://flightdata.flughafen-zuerich.ch/flights'
TARGETS=[{'id':'outbound','number':'TK1208','date':'2026-10-03','direction':'D','routeField':'PDS'},
         {'id':'return','number':'TK1207','date':'2026-10-07','direction':'A','routeField':'POR'}]
FIELDS={'STD':'scheduledDeparture','ETD':'estimatedDeparture','ATD':'actualDeparture','STA':'scheduledArrival','ETA':'estimatedArrival','ATA':'actualArrival','EBT':'boardingTime','GAT':'gate','TER':'terminal','CIR':'checkin','RTK':'baggage','model':'aircraft','statusTextDe':'statusText'}

def tracker_url(target):
    year,month,day=map(int,target['date'].split('-'))
    return f"https://www.flightstats.com/v2/flight-tracker/TK/{target['number'][2:]}?year={year}&month={month}&date={day}"

def parse_tracker(page,target,checked_at):
    match=re.search(r'__NEXT_DATA__\s*=\s*',page)
    if not match:raise ValueError('FlightStats page format changed')
    data=json.JSONDecoder().raw_decode(page[match.end():].lstrip())[0]
    f=data.get('props',{}).get('initialState',{}).get('flightTracker',{}).get('flight') or {}
    header=f.get('resultHeader',{});schedule=f.get('schedule',{})
    dep=f.get('departureAirport',{});arr=f.get('arrivalAirport',{})
    departure,arrival=('ZRH','IST') if target['id']=='outbound' else ('IST','ZRH')
    if not (header.get('carrier',{}).get('fs')=='TK' and str(header.get('flightNumber'))==target['number'][2:]
            and dep.get('iata')==departure and arr.get('iata')==arrival and str(schedule.get('scheduledDeparture',''))[:10]==target['date']):
        return {'available':False,'state':'not-published','checkedAt':checked_at,'sourceUrl':tracker_url(target)}
    result={'available':True,'state':'matched','checkedAt':checked_at,'observedAt':checked_at,'sourceUrl':tracker_url(target),
            'status':f.get('status',{}).get('status'),'departureGate':dep.get('gate'),'arrivalGate':arr.get('gate'),
            'departureTerminal':dep.get('terminal'),'arrivalTerminal':arr.get('terminal'),'baggage':arr.get('baggage')}
    for side in ['Departure','Arrival']:
        for prefix in ['scheduled','estimatedActual']:
            key=prefix+side+'UTC';value=schedule.get(key)
            if value:
                parsed=datetime.fromisoformat(value.replace('Z','+00:00'))
                if parsed.tzinfo is None:raise ValueError('Flight timestamp without timezone')
                result[prefix+side]=parsed.isoformat()
        result['actual'+side]=schedule.get('estimatedActual'+side+'Title')=='Actual'
    return result

def build_snapshot(rows,checked_at,previous=None):
    if not isinstance(rows,list) or not rows or not any(isinstance(r,dict) and 'SDT' in r and 'FLC' in r for r in rows):
        raise ValueError('Airport data schema is not a flight list')
    flights=[]
    for target in TARGETS:
        candidates=[r for r in rows if r.get('FLC')=='TK' and str(r.get('FLN','')).lstrip('0')==target['number'][2:]
                    and r.get('SDT')==target['date'] and r.get('flightType')==target['direction'] and r.get(target['routeField'])=='IST']
        result={**target,'checkedAt':checked_at,'available':False,'state':'not-published'}
        if len(candidates)==1:
            row=candidates[0]
            result.update({k:row[v] for v,k in FIELDS.items() if row.get(v) is not None})
            result.update(available=True,state='matched',observedAt=checked_at)
        elif len(candidates)>1:
            result['state']='ambiguous'
        else:
            old=next((f for f in (previous or {}).get('flights',[]) if f.get('id')==target['id'] and f.get('date')==target['date'] and f.get('number')==target['number'] and f.get('observedAt') and f.get('available')),None)
            if old: result={**old,'checkedAt':checked_at,'state':'retained'}
        flights.append(result)
    dates=sorted({r['SDT'] for r in rows if isinstance(r,dict) and r.get('SDT')})
    return {'checkedAt':checked_at,'sourceName':'Flughafen Zürich','sourceUrl':'https://www.flughafen-zuerich.ch/en/passengers/fly/flightinformation/departures',
            'coverage':{'from':dates[0],'to':dates[-1]},'flights':flights}

def main():
    path=Path(__file__).resolve().parents[1]/'dist/flights.json'
    previous=json.loads(path.read_text(encoding='utf-8')) if path.exists() else None
    checked_at=datetime.now(timezone.utc).isoformat()
    try:
        with urlopen(Request('https://ta-89.github.io/istanbul-2026/flights.json',headers={'Cache-Control':'no-cache'}),timeout=15) as response:
            published=json.load(response)
        if isinstance(published,dict) and isinstance(published.get('flights'),list):previous=published
    except Exception:
        pass
    try:
        with urlopen(Request(ENDPOINT,headers={'User-Agent':'IstanbulPersonalTravelPlanner/1.0','Accept':'application/json'}),timeout=35) as response:
            rows=json.load(response)
        snapshot=build_snapshot(rows,checked_at,previous)
    except Exception as error:
        # An airport outage must not prevent the independent tracker refresh.
        results=[]
        for target in TARGETS:
            old=next((f for f in (previous or {}).get('flights',[]) if f.get('id')==target['id'] and f.get('date')==target['date'] and f.get('number')==target['number']),None)
            results.append({**(old or target),'available':bool(old and old.get('available')),'state':'retained' if old and old.get('available') else 'unreachable','checkedAt':checked_at})
        snapshot={'checkedAt':checked_at,'flights':results,'coverage':(previous or {}).get('coverage'),'sourceUrl':'https://www.flughafen-zuerich.ch/en/passengers/fly/flightinformation/departures'}
        print('Airport unavailable; keeping its previous observation time and checking FlightStats separately.')
    for target,result in zip(TARGETS,snapshot['flights']):
        old=next((f.get('tracker') for f in (previous or {}).get('flights',[]) if f.get('id')==target['id'] and f.get('date')==target['date'] and f.get('number')==target['number']),None)
        try:
            with urlopen(Request(tracker_url(target),headers={'User-Agent':'Mozilla/5.0','Accept':'text/html'}),timeout=25) as response:
                tracker=parse_tracker(response.read().decode('utf-8'),target,checked_at)
        except Exception:
            tracker={'available':False,'state':'unreachable','checkedAt':checked_at,'sourceUrl':tracker_url(target)}
        if not tracker['available'] and old and old.get('available'):
            tracker={**old,'state':'retained','checkedAt':checked_at}
        result['tracker']=tracker
    snapshot['sourceName']='Flughafen Zürich & FlightStats (Cirium)'
    path.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Official airport board checked. Exact trip flights found:',sum(f['state']=='matched' for f in snapshot['flights']))
if __name__=='__main__':main()
