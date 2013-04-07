var helpers = require('../lib/helpers')
  , async = require('async')
  , assert = require('assert')
  , db = require('mongoskin').db(helpers.getDbUri('acl'), helpers.getDbOptions())
  , aclColl = db.collection('acl')
  , groupsColl = db.collection('groups')
  , Acl = require('../lib/models/Acl');

require('./helpers/dataGenerators');
require('./helpers/dataAccessors');
require('./helpers/dataVerifiers');

describe('Create ACLs', function () {
  before(function (done) {
    db.dropDatabase(function (err) {
      assert(!err);
      ensureIndexes(done);
    });
  });

  function aclCallback(err, expected, done) {
    assert(!err);

    aclColl.find({resource: expected.resource}).toArray(function (err, docs) {
      assert(!err);

      assert(docs.length == 10);

      done();
    });
  }
  
  it('creates an entry in the db', function (done) {
    var fields = {
      resource: 'item',
      create: ['create_items', 'root'],
      read: ['registered', 'root'],
      update: ['edit_items', 'root'],
      delete: ['remove_items', 'root'],
      access: ['registered', 'root']
    };
    
    Acl.createAction('item', {
      create: ['create_items', 'root'],
      read: ['registered', 'root'],
      update: ['edit_items', 'root'],
      delete: ['remove_items', 'root'],
      access: ['registered', 'root']
    }, function (err) {
      aclCallback(err, fields, done);
    });

  });

  it('fails to create duplicate entries', function (done) {
    Acl.createAction('item', {
      create: ['create_items', 'root'],
      read: ['registered', 'root'],
      update: ['edit_items', 'root'],
      delete: ['remove_items', 'root'],
      access: ['registered', 'root']
    }, function (err) {
      assert.equal(err.code, 11000);
      done();
    });
  });
});





describe('Create groups', function () {
  before(function (done) {
    db.dropDatabase(done);
  });
  
  it('creates a new group', function (done) {
    Acl.createGroup('dummy', ['root_user'], /* no inherited */ function (err) {
      assert(!err);
      
      getGroup('dummy', function (err, group) {
        compareGroups(
          group,
          {name: 'dummy', members: ['root_user'], inherits: [] }
        );
        
        done();
      });
    });
  });

  it('does not create an existing group', function (done) {
    Acl.createGroup('dummy', ['root_user'], /* no inherited */ function (err) {
      assert(err.code, 11000);
      done();
    });
  });
});





describe('Get groups', function () {
  before(repopulate);
  
  it('returns all inherited groups of group "special"', function (done) {
    Acl.group.getInheritedGroups('special', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['root', 'admin', 'registered'].sort());
      done();
    });
  });

  it('returns all groups of group "root"', function (done) {
    Acl.group.getInheritedGroups('root', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['admin', 'registered', 'special'].sort());
      done();
    });
  });  
});









describe('Query ACLs', function () {
  before(function (done) {
    repopulate(done);
  });
  
  // see pre-populated data in helpers/dataGenerators
  it('return all resources for which group "root" has action "access"', function (done) {
    Acl.group.availableResources('root', 'access', function (err, resources) {
      assert(!err);
      assert(resources.length === 3);
      done();
    })
  });
  
  it('check if group "registered" can "access" "users"', function (done) {
    Acl.group.isAllowed('registered', 'users', 'access', function (err, allowed) {
      assert(!err);
      assert(allowed === false);
      done();
    })
  });

  it('check if group "root" can "access" "users"', function (done) {
    Acl.group.isAllowed('root', 'users', 'access', function (err, allowed) {
      assert(!err);
      assert(allowed === true);
      done();
    })
  });

  it('check if group "root" can "access" "item" via inheritance', function (done) {
    Acl.group.isAllowed('root', 'item', 'access', function (err, allowed) {
      assert(!err);
      assert(allowed === true);
      done();
    })
  });

  it('check if group "special" can "access" "item" via inheritance', function (done) {
    Acl.group.isAllowed('special', 'item', 'access', function (err, allowed) {
      assert(!err);
      assert(allowed === true);
      done();
    })
  });
  
  it('returns "root" group', function (done) {
    Acl.group.get("root", function (err, list) {
      assert(!err);
      assert(list._id == 'root');
      done();
    });
  });
  
  it('returns a list of all defined groups', function (done) {
    Acl.group.get(function (err, list) {
      assert(!err);
      assert(list.length == 4);
      done();
    });
  });
  
  
});