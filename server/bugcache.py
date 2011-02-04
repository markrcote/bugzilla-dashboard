import datetime
import json
import urllib

QUERIES_TABLE = 'queries'

# cached results are good for 10 minutes
CACHE_EXPIRY = datetime.timedelta(seconds=10*60)

# clean expired cache entries every hour
CLEAN_PERIOD = datetime.timedelta(seconds=60*60)

class BugCache(object):
    
    def __init__(self, db, bzapi_url, log):
        self.db = db
        self.bzapi_url = bzapi_url
        self.log = log
        self.clean()
    
    def time_to_clean(self):
        return datetime.datetime.now() - self.last_clean_time >= CLEAN_PERIOD
    
    def clean(self):
        expiry_time = datetime.datetime.now() - CACHE_EXPIRY
        self.db.delete(QUERIES_TABLE, where="lastmod <= $expiry_time", vars=locals())
        self.last_clean_time = datetime.datetime.now() 
    
    def check_cache(self, search_string):
        return self.db.select(QUERIES_TABLE, vars={'search': search_string},
                              where="search = $search")
    
    def load_data(self, search_string):
        url = self.bzapi_url + search_string
        #print 'url is %s' % url
        attempts = 0
        while attempts < 3:
            u = urllib.urlopen(url)
            json_data = u.read()
            if u.getcode() == 200:
                tmp_json = json.loads(json_data)
                if 'error' not in tmp_json or not tmp_json['error']:
                    return json_data
            attempts += 1
        return ''
    
    def get(self, search_string):
        cached = None
        cached_rsp = self.check_cache(search_string)
        for r in cached_rsp:
            cached = r
        if cached:
            self.log.write('some sort of response')
        else:
            self.log.write('not found at all! --> %s' % search_string)
        if cached and datetime.datetime.now() < (cached.lastmod + CACHE_EXPIRY):
            self.log.write('it is cached')
            return cached.results
        
        self.log.write('not cached!')

        results = self.load_data(search_string)
        if self.time_to_clean():
            self.clean()
        if results:
            if cached:
                self.db.update(QUERIES_TABLE, vars={'search': search_string},
                               where="search = $search", search=search_string, results=results,
                               lastmod=datetime.datetime.now())
            else:
                self.db.insert(QUERIES_TABLE, search=search_string, results=results)
        return results
