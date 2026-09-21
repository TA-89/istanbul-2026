import importlib.util
from pathlib import Path
import unittest
import json
spec=importlib.util.spec_from_file_location('flights',Path(__file__).parents[1]/'scripts/update_flights.py')
flights=importlib.util.module_from_spec(spec);spec.loader.exec_module(flights)

class FlightMatching(unittest.TestCase):
    def departure(self,**changes):
        return {'FLC':'TK','FLN':'1208','SDT':'2026-10-03','flightType':'D','PDS':'IST','STD':'2026-10-03T11:30:00Z',**changes}
    def test_exact_flight_date_route_and_direction(self):
        rows=[self.departure(SDT='2026-10-02'),self.departure(FLC='LH'),self.departure(PDS='SAW'),self.departure(flightType='A'),self.departure(GAT='E42')]
        found=flights.build_snapshot(rows,'2026-10-03T08:00:00+00:00')['flights'][0]
        self.assertTrue(found['available']);self.assertEqual(found['gate'],'E42')
    def test_future_date_does_not_adopt_other_day(self):
        found=flights.build_snapshot([self.departure(SDT='2026-09-21')],'2026-09-21T08:00:00+00:00')['flights'][0]
        self.assertFalse(found['available']);self.assertNotIn('scheduledDeparture',found)
    def test_return_only_contains_supplied_arrival_fields(self):
        r={'FLC':'TK','FLN':'01207','SDT':'2026-10-07','flightType':'A','POR':'IST','STA':'2026-10-07T10:35:00Z','ETA':'2026-10-07T10:50:00Z','RTK':'25'}
        found=flights.build_snapshot([r],'2026-10-07T10:00:00+00:00')['flights'][1]
        self.assertTrue(found['available']);self.assertEqual(found['estimatedArrival'],r['ETA']);self.assertNotIn('scheduledDeparture',found)
    def test_duplicates_are_not_guessed(self):
        f=flights.build_snapshot([self.departure(),self.departure()],'2026-10-03T08:00:00Z')['flights'][0]
        self.assertEqual(f['state'],'ambiguous');self.assertFalse(f['available'])
    def test_old_data_retains_original_observation_time(self):
        first=flights.build_snapshot([self.departure()],'2026-10-03T08:00:00Z')
        second=flights.build_snapshot([self.departure(SDT='2026-10-04')],'2026-10-04T08:00:00Z',first)['flights'][0]
        self.assertEqual(second['state'],'retained');self.assertEqual(second['observedAt'],'2026-10-03T08:00:00Z')
    def test_invalid_feed_fails(self):
        for rows in [[],{},[{'foo':'bar'}]]:
            with self.assertRaises(ValueError):flights.build_snapshot(rows,'2026-10-03T08:00:00Z')
    def tracker_page(self,date='2026-10-07',arrival='ZRH'):
        data={'props':{'initialState':{'flightTracker':{'flight':{'resultHeader':{'carrier':{'fs':'TK'},'flightNumber':'1207'},'departureAirport':{'iata':'IST','gate':'A12'},'arrivalAirport':{'iata':arrival},'schedule':{'scheduledDeparture':date+'T10:35:00','scheduledDepartureUTC':date+'T07:35:00Z','scheduledArrivalUTC':date+'T10:35:00Z'},'status':{'status':'Scheduled'}}}}}}
        return '__NEXT_DATA__ = '+json.dumps(data)+'; ignoredScript();'
    def test_tracker_exact_date_and_route(self):
        result=flights.parse_tracker(self.tracker_page(),flights.TARGETS[1],'2026-10-07T05:00:00Z')
        self.assertTrue(result['available']);self.assertEqual(result['departureGate'],'A12');self.assertEqual(result['scheduledDeparture'],'2026-10-07T07:35:00+00:00')
        for page in [self.tracker_page(date='2026-10-06'),self.tracker_page(arrival='GVA')]:
            self.assertFalse(flights.parse_tracker(page,flights.TARGETS[1],'2026-10-07T05:00:00Z')['available'])
if __name__=='__main__':unittest.main()
