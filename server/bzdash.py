#!/usr/bin/env python2.6
import datetime
import urllib
import config
import json
import re
import web
import bugcache

BASE_BZAPI_URL = 'https://api-dev.bugzilla.mozilla.org/latest'

urls = (
    '/test/', 'test',
    '/bugcache(.*)', 'bugcache_handler',
    '/division/(.*)', 'division',
    '/team/(.*)', 'team',
    '/prodcomp/(.*)', 'prodcomp',
    '/member/(.*)', 'member',
    '/user/(.*)', 'user',
    '/products/', 'products',
    '/login/', 'login'
)

class Log(object):
    def __init__(self):
        self.f = file('/tmp/bzdash.log', 'a')
    
    def __del__(self):
        self.f.close()
    
    def write(self, s):
        self.f.write(s + '\n')
        self.f.flush()
        
log = Log()
bc = bugcache.BugCache(config.db, BASE_BZAPI_URL, log)


app = web.application(urls, globals())
db = config.db

# extract nick if present, e.g. "Jane Doe [:jdoe]", "John Smith ( :jsmith )", etc. 
# some people skip the parentheses/brackets... in the interests of not making
# the first re more complicated, we use two patterns, from more to less specific.
nick_res = [re.compile('[\(\[][\s]*:([^\s\):,]*)[\s]*[\)\]]'), re.compile(':([^\s,:]*)')]

class LoginCache(object):
    
    EXPIRATION_TIME = datetime.timedelta(0, 60*5)
    
    def __init__(self):
        self.access_times = {}
    
    def update(self, username):
        self.access_times[username] = datetime.datetime.now()

    def invalidate(self, username):
        if username in self.access_times:
            self.access_times.pop(username)

    def is_valid(self, username):
        return username in self.access_times and datetime.datetime.now() - self.access_times[username] < LoginCache.EXPIRATION_TIME 

login_cache = LoginCache()


def do_login(username, password):
    # To verify, we just need to do any old request with the username and password.
    url = '%s/user/%s?username=%s&password=%s' % (BASE_BZAPI_URL, username, username, password)
    response = json.loads(urllib.urlopen(url).read())
    if 'error' in response:
        login_cache.invalidate(username)
    else:
        login_cache.update(username)
    return response


def get_nick(real_name):
    for r in nick_res:
        m = re.search(r, real_name)
        if m:
            return m.group(1)
    return real_name


def get_create_user(email, real_name):
    user = db.select('users', where=web.db.sqlwhere({'bugemail': email}))
    if len(user) == 0:
        nick = get_nick(real_name)
        db.insert('users', name=real_name, bugemail=email,
                  nick=nick, site_admin=0)
        user = db.select('users', where=web.db.sqlwhere({'bugemail': email}))
    return user[0]


class bugcache_handler:
    
    def GET(self, name):
        query = name + web.ctx.query
        results = bc.get(query)
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
    subobjects = []
    
    def _check_team_permission(self, username, team_id):
        if team_id == -1:
            return False
        user = db.select('users', where=web.db.sqlwhere({'bugemail': username}))
        if len(user) == 0:
            return False
        user_id = user[0]['id']
        member = db.select('members', where=web.db.sqlwhere({'user_id': user_id, 'team_id': team_id}))
        if len(member) == 0:
            return False
        return member[0]['team_admin']
    
    def _check_site_permission(self, username):
        user = db.select('users', where=web.db.sqlwhere({'bugemail': username}))
        if len(user) == 0:
            return False
        return user[0]['site_admin']

    def _check_permission(self, username, team_id, member_email):
        if self._check_site_permission(username):
            return True
        if self._check_team_permission(username, team_id):
            return True
        return username == member_email
        
    def check_auth(self, username, password, team_id=-1, member_email=''):
        if not login_cache.is_valid(username):
            response = do_login(username, password)
            if 'error' in response:
                return False
        return self._check_permission(username, team_id, member_email)
    
    def add_if_not_found(self, entities, keys_to_check):
        for e in entities:
            where_dict = {}
            for k in keys_to_check:
                where_dict[k] = e[k]
            if not where_dict or not db.select(self.table, where=web.db.sqlwhere(where_dict)):
                cols = {}
                for k, v in e.iteritems():
                    cols[k.encode('ascii')] = v
                db.insert(self.table, **cols)

    def _get(self, id):
        return self.do_json(self.get_dict(id))

    def get_dict(self, id, key='id'):
        if id:
            where = web.db.sqlwhere({key: id})
        else:
            where = None
        response = []
        for i in db.select(self.table, where=where):
            d = dict(i)
            for t in self.subobjects:
                cls = globals()[t[0]]
                if not issubclass(cls, DashObject):
                    continue
                d.update(cls().get_dict(d['id'], t[1]))
            response.append(d)
        return {self.table: response}

    def _update(self, id):
        for i in json.loads(web.data())[self.table]:
            cols = {}
            for k, v in i.iteritems():
                cols[k.encode('ascii')] = v
            db.update(self.table, where=web.db.sqlwhere({'id': id}), **cols)

    def PUT(self, id):
        web_data = json.loads(web.data())
        if not self.check_auth(web_data['username'], web_data['password']):
            return
        self._update(id)

    def get_query_dict(self):
        params = {}
        if web.ctx.query:
            for q in web.ctx.query[1:].split('&'):
                name, equals, value = q.partition('=')
                if equals:
                    params[name] = value
        return params

    def DEL(self, id):
        params = self.get_query_dict()
        if not self.check_auth(params['username'], params['password']):
            return False
        db.delete(self.table, where=web.db.sqlwhere({'id': id}));


class test(JsonData):
    
    def GET(self):
        return self.do_json({'test': True}) 


class division(DashObject):
    
    table = 'divisions'
    subobjects = [('team', 'division_id')]
    
    def POST(self, id=None):
        web_data = json.loads(web.data())
        if not self.check_auth(web_data['username'], web_data['password']):
            return
        self.add_if_not_found(web_data['divisions'], ('name',))
    
    def GET(self, id):
        divisions = self.get_dict(id)
        for d in divisions['divisions']:
            for t in d['teams']:
                team.get_member_details(t['members'])
        return self.do_json(divisions)


class team(DashObject):
    
    table = 'teams'
    subobjects = [('member', 'team_id'), ('prodcomp', 'team_id')]
    
    def POST(self, id=None):
        web_data = json.loads(web.data())
        if not self.check_auth(web_data['username'], web_data['password']):
            return
        self.add_if_not_found(web_data['teams'], ('name',))

    @classmethod
    def get_member_details(cls, members):
        for m in members:
            users = db.select('users', where=web.db.sqlwhere({'id': m['user_id']}))
            if users:
                u = dict(users[0])
                del u['id']
                m.update(u)
        return members

    def GET(self, id):
        t = self.get_dict(id)
        team.get_member_details(t['teams'][0]['members'])
        return self.do_json(t)


class prodcomp(DashObject):
    
    table = 'prodcomps'
    
    def POST(self, id=None):
        web_data = json.loads(web.data())
        prodcomps = []
        for p in web_data['prodcomps']:
            if self.check_auth(web_data['username'], web_data['password'], p['team_id']):
                prodcomps.append(p)
        if prodcomps:
            self.add_if_not_found(prodcomps, ('product', 'component', 'team_id'))
    
    def GET(self, id):
        return self._get(id)

    def DEL(self, id):
        params = self.get_query_dict()
        if not self.check_auth(params['username'], params['password'], id):
            return False
        db.delete(self.table, where=web.db.sqlwhere({'id': id}));


class member(DashObject):
    
    table = 'members'

    def POST(self, id=None):
        web_data = json.loads(web.data())
        for m in web_data['members']:
            if not self.check_auth(web_data['username'], web_data['password'], m['team_id'], m['bugemail']):
                return False
            user = get_create_user(m['bugemail'], m['name'])
            self.add_if_not_found([{'team_id': m['team_id'], 'user_id': user['id'], 'team_admin': False}], ('team_id', 'user_id'))

    def GET(self, id):
        members = self.get_dict(id)
        for m in members['members']:
            users = db.select('users', where=web.db.sqlwhere({'id': m['user_id']}))
            if users:
                u = dict(users[0])
                del u['id']
                m.update(u)
        return self.do_json(members)

    def PUT(self, id):
        web_data = json.loads(web.data())
        members = db.select('members', where=web.db.sqlwhere({'id': id}))
        if not members:
            return
        if not self.check_auth(web_data['username'], web_data['password'], members[0]['team_id']):
            return
        self._update(id)

    def DEL(self, id):
        username = ''
        params = self.get_query_dict()
        members = db.select('members', where=web.db.sqlwhere({'id': id}))
        if not members:
            return
        users = db.select('users', where=web.db.sqlwhere({'id': members[0].user_id}))
        if users:
            username = users[0]['bugemail']
        if not self.check_auth(params['username'], params['password'], id, username):
            return
        db.delete(self.table, where=web.db.sqlwhere({'id': id}));


class user(DashObject):
    
    table = 'users'
    
    def GET(self, id):
        return self._get(id)


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
        response = do_login(login_data['username'], login_data['password'])
        if 'error' in response:
            return self.do_json(response)
        login_cache.update(login_data['username'])
        user = dict(get_create_user(login_data['username'], response['real_name']))
        user['team_admins'] = []
        memberships = db.select('members', where=web.db.sqlwhere({'user_id': user['id']}))
        for m in memberships:
            if m['team_admin']:
                user['team_admins'].append(m['team_id'])
        d = {'error': False, 'user': user}
        return self.do_json(d)


if __name__ == '__main__':
    app.run()
