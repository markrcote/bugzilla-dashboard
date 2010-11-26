import inspect
import os.path
import sys

def execution_path(filename):
  return os.path.join(os.path.dirname(inspect.getfile(sys._getframe(1))), filename)

sys.path.append(execution_path(''))

import config
import json
import web
import bugcache

bc = bugcache.BugCache(config.db)

urls = (
    '/bugcache(.*)', 'bugcache_handler'
)
app = web.application(urls, globals())
application = web.application(urls, globals()).wsgifunc()

class bugcache_handler:
    
    def GET(self, name):
        query = name + web.ctx.query
        results = bc.get(query)
        jsondata = json.dumps(results)
        web.header('Content-Length', len(results))
        web.header('Vary', 'Content-Type')
        web.header('Content-Type', 'application/json; charset=utf-8')
        return results

if __name__ == "__main__":
    app.run()
