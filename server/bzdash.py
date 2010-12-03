#!/usr/bin/env python2.6
import inspect
import os.path
import sys
import urllib

def execution_path(filename):
  return os.path.join(os.path.dirname(inspect.getfile(sys._getframe(1))), filename)

sys.path.append(execution_path(''))

import config
import json
import web
import bugcache

BASE_BZAPI_URL = 'https://api-dev.bugzilla.mozilla.org/latest'

bc = bugcache.BugCache(config.db, BASE_BZAPI_URL)

urls = (
    '/test/', 'test',
    '/bugcache(.*)', 'bugcache_handler',
    '/division/(.*)', 'division',
    '/team/(.*)', 'team',
    '/prodcomp/(.*)', 'prodcomp',
    '/member/(.*)', 'member',
    '/products/', 'products',
    '/login/', 'login'
)
app = web.application(urls, globals())
application = web.application(urls, globals()).wsgifunc()
db = config.db

class bugcache_handler:
    
    def GET(self, name):
        query = name + web.ctx.query
        results = bc.get(query)
        jsondata = json.dumps(results)
        web.header('Content-Length', len(results))
        web.header('Vary', 'Content-Type')
        web.header('Content-Type', 'application/json; charset=utf-8')
        return results


class JsonData(object):

    def do_json(self, data):
        results = json.dumps(data) 
        web.header('Content-Length', len(results))
        web.header('Content-Type', 'application/json; charset=utf-8')
        return results
    

class DashObject(JsonData):

    table = ''
    
    def add_if_not_found(self, entities, keys_to_check):
        for e in entities:
            where_dict = {}
            for k in keys_to_check:
                where_dict[k] = e[k]
            if not where_dict or not db.select(self.table, where=web.db.sqlwhere(where_dict)):
                db.insert(self.table, **e)

    def _get(self, id, subtables=[], supertables=[]):
        if id:
            where = web.db.sqlwhere({'id': id})
        else:
            where = None
        response = []
        for i in db.select(self.table, where=where):
            d = dict(i)
            for t in subtables:
                d[t[0]] = self.get_subtable(t[0], d[t[1]])
            for t in supertables:
                d[t[0]] = self.get_supertable(t[0], d['id'], t[1])
            response.append(d)
        return self.do_json({self.table: response})

    def PUT(self, id):
        for i in json.loads(web.data())[self.table]:
            db.update(self.table, where=web.db.sqlwhere({'id': id}), **i)

    def get_supertable(self, table, id, foreign_key):
        return map(lambda x: dict(x), db.select(table, where=web.db.sqlwhere({foreign_key: id})))

    def get_subtable(self, table, id):
        return [dict(db.select(table, where=web.db.sqlwhere({'id': id}))[0])]

    def DEL(self, id):
        db.delete(self.table, where=web.db.sqlwhere({'id': id}));


class test(JsonData):
    
    def GET(self):
        return self.do_json({'test': True}) 


class division(DashObject):
    
    table = 'divisions'
    
    def POST(self, id=None):
        self.add_if_not_found(json.loads(web.data())['divisions'], ('name',))
    
    def GET(self, id):
        return self._get(id, [], [('teams', 'division_id')])


class team(DashObject):
    
    table = 'teams'
    
    def POST(self, id=None):
        self.add_if_not_found(json.loads(web.data())['teams'], ('name',))

    def GET(self, id):
        return self._get(id, [('divisions', 'division_id')], [('members', 'team_id'), ('prodcomps', 'team_id')])


class prodcomp(DashObject):
    
    table = 'prodcomps'

    def POST(self, id=None):
        self.add_if_not_found(json.loads(web.data())['prodcomps'], ('product', 'component', 'team_id'))
    
    def GET(self, id):
        return self._get(id, [('teams', 'team_id')], [])


class member(DashObject):
    
    table = 'members'

    def POST(self, id=None):
        self.add_if_not_found(json.loads(web.data())['members'], [])

    def GET(self, id):
        return self._get(id, [('teams', 'team_id')])


class products(JsonData):
    
    def GET(self):
        val = bc.get('/configuration')
        config = json.loads(val)
        result = {'products': {}}
        for k, v in config['product'].iteritems():
            comps = v['component'].keys()
            result['products'][k] = {'components': comps}
        return self.do_json(result) 


class login(JsonData):
    
    def POST(self):
        login_data = json.loads(web.data())['login']
        # To verify, we just need to do any old request with the username and password.
        url = '%s/user/%s?username=%s&password=%s' % (BASE_BZAPI_URL, login_data['username'],
                                                      login_data['username'], login_data['password'])
        response = json.loads(urllib.urlopen(url).read())
        if 'error' in response:
            return self.do_json(response)
        return self.do_json({'error': 0})

if __name__ == "__main__":
    app.run()
