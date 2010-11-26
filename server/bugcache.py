import datetime
import urllib

BASE_BZAPI_URL = 'https://api-dev.bugzilla.mozilla.org/latest'
QUERIES_TABLE = 'queries'

CACHE_EXPIRY = datetime.timedelta(seconds=5*60)

class BugCache(object):
    
    def __init__(self, db):
        self.db = db
    
    def check_cache(self, search_string):
        return self.db.select(QUERIES_TABLE, vars={'search': search_string},
                              where="search = $search")
    
    def load_data(self, search_string):
        url = BASE_BZAPI_URL + search_string
        #print 'url is %s' % url
        json_data = urllib.urlopen(url).read()
        
        return json_data
    
    def get(self, search_string):
        cached = None
        cached_rsp = self.check_cache(search_string)
        for r in cached_rsp:
            cached = r
        if not cached or datetime.datetime.now() > (cached.lastmod + CACHE_EXPIRY):
            results = self.load_data(search_string)
            if cached:
                self.db.update(QUERIES_TABLE, vars={'search': search_string},
                              where="search = $search", search=search_string, results=results,
                              lastmod=datetime.datetime.now())
            else:
                self.db.insert(QUERIES_TABLE, search=search_string, results=results)
            return results
        return cached.results
