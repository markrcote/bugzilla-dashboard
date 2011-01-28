import web
import json
import bzdash
import sys
import threading
import time
import unittest
import urllib
import urllib2

TEST_DB = 'testbugcache'

username = 'foo@mozilla.com'
if len(sys.argv) < 2:
    port = 8080
else:
    try:
        port = int(sys.argv[1])
    except ValueError:
        print 'Invalid port "%s"' % sys.argv[1]
        sys.exit(1)
        
    
server_url = 'http://localhost:%d' % port

def auth_request(d):
    d['username'] = username
    d['password'] = 'bar'
    return json.dumps(d)


class TestAdmin(unittest.TestCase):

    def setUp(self):
        self.db = web.database(dbn='mysql', db=TEST_DB, user='bugcache', pw='bugcache')
        self.db.update('users', where=web.db.sqlwhere({'bugemail': username}), site_admin=True)
        self.db.delete('divisions', where='id >= 0')
        self.db.delete('teams', where='id >= 0')
        self.db.delete('members', where='id >= 0')
        self.db.delete('prodcomps', where='id >= 0')
        self.db.delete('users', where='bugemail != "%s"' % username)

    def create_division(self, name):
        urllib.urlopen(server_url + '/division/',
                       data=auth_request({'divisions': [{'name': name}]}))
        divs = self.db.select('divisions', where=web.db.sqlwhere({'name': name}))
        if not divs:
            return -1
        return divs[0]['id']
    
    def create_team(self, name, division_id):
        urllib.urlopen(server_url + '/team/',
                       data=auth_request({'teams': [{'name': name, 'division_id': division_id}]}))
        teams = self.db.select('teams', where=web.db.sqlwhere({'name': name}))
        if not teams:
            return -1
        return teams[0]['id']
    
    def create_member(self, name, email, team_id):
        urllib.urlopen(server_url + '/member/',
                       data=auth_request({'members': [{'name': name, 'bugemail': email, 'team_id': team_id}]}))
        users = self.db.select('users', where=web.db.sqlwhere({'bugemail': email}))
        if not users:
            return -1
        members = self.db.select('members', where=web.db.sqlwhere({'team_id': team_id, 'user_id': users[0]['id']}))
        if not members:
            return -1
        return members[0]['id']

    def create_prodcomp(self, product, component, team_id):
        urllib.urlopen(server_url + '/prodcomp/',
                       data=auth_request({'prodcomps': [{'product': product, 'component': component, 'team_id': team_id}]}))
        prodcomps = self.db.select('prodcomps', where=web.db.sqlwhere({'product': product, 'component': component, 'team_id': team_id}))
        if not prodcomps:
            return -1
        return prodcomps[0]['id']

    def test_divisions(self):
        self.assertNotEqual(self.create_division('FooDivision'), -1)
        response = urllib.urlopen(server_url + '/division/').read()
        divisions = json.loads(response)['divisions']
        self.assertEqual(len(divisions), 1)
        self.assertEqual(divisions[0]['name'], 'FooDivision')
        self.assertNotEqual(self.create_division('BarDivision'), -1)
        response = urllib.urlopen(server_url + '/division/').read()
        divisions = json.loads(response)['divisions']
        self.assertEqual(len(divisions), 2)
        names = set(['FooDivision', 'BarDivision'])
        for d in divisions:
            names.remove(d['name'])
        self.assertEqual(len(names), 0)

    def test_teams(self):
        foo_id = self.create_division('FooDivision')
        bar_id = self.create_division('BarDivision')
        foo_team_id = self.create_team('FooTeam', foo_id)
        self.assertNotEqual(foo_team_id, -1)
        self.assertNotEqual(self.create_team('Foo2Team', foo_id), -1)
        self.assertNotEqual(self.create_team('BarTeam', bar_id), -1)
        teams = json.loads(urllib.urlopen(server_url + '/team/').read())['teams']
        self.assertEqual(len(teams), 3)
        matches = set([('FooTeam', foo_id), ('Foo2Team', foo_id), ('BarTeam', bar_id)])
        for t in teams:
            matches.remove((t['name'], t['division_id']))
        self.assertEqual(len(matches), 0)
        self.assertNotEqual(self.create_member('Mr. Foo', 'foo@bar.com', foo_team_id), -1)
        self.assertNotEqual(self.create_prodcomp('BarProduct', 'BarComponent', foo_team_id), -1)
        teams = json.loads(urllib.urlopen(server_url + '/team/%d' % foo_team_id).read())['teams']
        self.assertEqual(len(teams), 1)
        self.assertEqual(teams[0]['members'][0]['bugemail'], 'foo@bar.com')
        self.assertEqual(teams[0]['prodcomps'][0]['product'], 'BarProduct')
        divisions = json.loads(urllib.urlopen(server_url + '/division/%d' % foo_id).read())['divisions']
        self.assertEqual(len(divisions), 1)
        self.assertEqual(divisions[0]['teams'][0]['members'][0]['bugemail'], 'foo@bar.com')
        self.assertEqual(divisions[0]['teams'][0]['prodcomps'][0]['product'], 'BarProduct')

    def test_members(self):
        foo_div_id = self.create_division('FooDivision')
        foo_team_id = self.create_team('FooTeam', foo_div_id)
        self.assertNotEqual(self.create_member('Mr. Foo', 'foo@bar.com', foo_team_id), -1)
        self.assertNotEqual(self.create_member('Mr. Bar', 'bar@bar.com', foo_team_id), -1)
        members = json.loads(urllib.urlopen(server_url + '/member/').read())['members']
        self.assertEqual(len(members), 2)
        matches = set([('Mr. Foo', 'foo@bar.com', foo_team_id), ('Mr. Bar', 'bar@bar.com', foo_team_id)])
        for m in members:
            self.assertEqual(m['site_admin'], False)
            matches.remove((m['name'], m['bugemail'], m['team_id']))
        self.assertEqual(len(matches), 0)
    
    def test_prodcomps(self):
        foo_div_id = self.create_division('FooDivision')
        foo_team_id = self.create_team('FooTeam', foo_div_id)
        self.assertNotEqual(self.create_prodcomp('FooProduct', 'FooComponent', foo_team_id), -1)
        self.assertNotEqual(self.create_prodcomp('BarProduct', 'BarComponent', foo_team_id), -1)
        response = urllib.urlopen(server_url + '/prodcomp/').read()
        prodcomps = json.loads(response)['prodcomps']
        self.assertEqual(len(prodcomps), 2)
        matches = set([('FooProduct', 'FooComponent'), ('BarProduct', 'BarComponent')])
        for p in prodcomps:
            self.assertEqual(p['team_id'], foo_team_id)
            matches.remove((p['product'], p['component']))
        self.assertEqual(len(matches), 0)

    def do_put(self, url, data):
        opener = urllib2.build_opener(urllib2.HTTPHandler)
        request = urllib2.Request(url, data=data)
        request.add_header('Content-Type', 'application/json')
        request.get_method = lambda: 'PUT'
        return opener.open(request)

    def test_team_admin(self):
        foo_div_id = self.create_division('FooDivision')
        foo_team_id = self.create_team('FooTeam', foo_div_id)
        bar_team_id = self.create_team('BarTeam', foo_div_id)
        foo_member_id = self.create_member('foo', username, foo_team_id) 
        self.do_put(server_url + '/member/%d' % foo_member_id, auth_request({'members': [{'team_admin': True}]})).read()
        members = json.loads(urllib.urlopen(server_url + '/member/').read())['members']
        self.assertTrue(members[0]['team_admin'])
        self.db.update('users', where=web.db.sqlwhere({'bugemail': username}), site_admin=False)
        
        self.assertEqual(self.create_division('BarDivision'), -1)
        self.assertEqual(self.create_team('Foo2Team', foo_div_id), -1)
        self.assertNotEqual(self.create_member('Mr. Foo', 'foo@bar.com', foo_team_id), -1)
        self.assertEqual(self.create_member('Mr. Foo', 'foo@bar.com', bar_team_id), -1)
        self.assertNotEqual(self.create_prodcomp('FooProduct', 'FooComponent', foo_team_id), -1)
        self.assertEqual(self.create_prodcomp('BarProduct', 'BarComponent', bar_team_id), -1)
        # should be able to add self to other team
        self.assertNotEqual(self.create_member('foo', 'foo@mozilla.com', bar_team_id), -1)

    def test_no_admin(self):
        foo_div_id = self.create_division('FooDivision')
        foo_team_id = self.create_team('FooTeam', foo_div_id)
        foo_member_id = self.create_member('foo', username, foo_team_id) 
        members = json.loads(urllib.urlopen(server_url + '/member/').read())['members']
        self.assertFalse(members[0]['team_admin'])
        self.db.update('users', where=web.db.sqlwhere({'bugemail': username}), site_admin=False)
        
        self.assertEqual(self.create_division('BarDivision'), -1)
        self.assertEqual(self.create_team('Foo2Team', foo_div_id), -1)
        self.assertEqual(self.create_member('Mr. Foo', 'foo@bar.com', foo_team_id), -1)
        self.assertEqual(self.create_prodcomp('FooProduct', 'FooComponent', foo_team_id), -1)
        # should be able to add self to other team
        self.assertNotEqual(self.create_member('foo', 'foo@mozilla.com', foo_team_id), -1)


def main():
    import _mysql_exceptions
    bzdash.db = web.database(dbn='mysql', db=TEST_DB, user='bugcache', pw='bugcache')
    bzdash.login_cache.update(username)
    try:
        bzdash.get_create_user(username, 'foo')
    except _mysql_exceptions.OperationalError:
        print 'You need a db called "%s" with username/password' % TEST_DB
        print '"bugcache"/"bugcache" set up for these tests'
        sys.exit(1)
    
    def run_server():
        bzdash.app.run()
    
    t = threading.Thread(target=run_server)
    t.daemon = True
    t.start()
    time.sleep(1)
    suite = unittest.TestLoader().loadTestsFromModule(__import__('__main__'))
    unittest.TextTestRunner(verbosity=2).run(suite)


if __name__ == '__main__':
    main()
