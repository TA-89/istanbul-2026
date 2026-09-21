"""Readiness check during the trip period; no travel code or user data needed."""
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

today=datetime.now(timezone.utc).date().isoformat()
if not '2026-09-21' <= today <= '2026-10-08':
    print('Trip period finished; no network request.')
else:
    config=(Path(__file__).parents[1]/'dist/sync-config.js').read_text(encoding='utf-8').split('window.TRIP_SYNC_CONFIG=',1)[1].strip().rstrip(';')
    config=json.loads(config)
    request=Request(config['url']+'/rest/v1/rpc/istanbul_health',data=b'{}',headers={'apikey':config['key'],'Content-Type':'application/json'})
    with urlopen(request,timeout=30) as response:
        result=json.load(response)
    if result.get('ok') is not True:raise RuntimeError('Shared trip service is not ready')
    print('Shared trip database is reachable and ready. No personal data read.')
