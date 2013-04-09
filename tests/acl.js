var helpers = require('../lib/helpers')
  , async = require('async')
  , assert = require('assert')
  , db = require('mongoskin').db(helpers.getDbUri('acl'), helpers.getDbOptions())
  , resColl = db.collection('resources')
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

    resColl.find({resource: expected.resource}).toArray(function (err, docs) {
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
    
    Acl.addResource('item', {
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
    Acl.addResource('item', {
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
    Acl.addGroup('dummy', ['root_user'], /* no includes */ function (err) {
      assert(!err);
      
      getGroup('dummy', function (err, group) {
        compareGroups(
          group,
          {name: 'dummy', members: ['root_user'], includes: [] }
        );
        
        done();
      });
    });
  });

  it('does not create an existing group', function (done) {
    Acl.addGroup('dummy', ['root_user'], /* no includes */ function (err) {
      assert(err.code, 11000);
      done();
    });
  });
});






describe('Find parents', function () {
  before(repopulate);

  it('returns all parent groups of group "special"', function (done) {
    Acl.group.getParents('special', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['special', 'root'].sort());
      done();
    });
  });

  it('returns all parent groups of group "root"', function (done) {
    Acl.group.getParents('root', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['special', 'root'].sort());
      done();
    });
  });

  it('returns all groups of group "admin"', function (done) {
    Acl.group.getParents('admin', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['admin', 'root', 'special'].sort());
      done();
    });
  });

  it('returns all parent groups of group "circular1" and does not loop forever', function (done) {
    Acl.group.getParents('circular1', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['circular1', 'circular2', 'root', 'special'].sort());
      done();
    });
  });
});








describe('Find children', function () {
  before(repopulate);

  it('returns all children of "registered"', function (done) {
    Acl.group.getChildren('registered', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['registered'].sort());
      done();
    });
  });

  it('returns all children of "root"', function (done) {
    Acl.group.getChildren('root', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['registered', 'admin', 'root', 'special', 'circular1', 'circular2'].sort());
      done();
    });
  });

  it('returns all children of "special"', function (done) {
    Acl.group.getChildren('special', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['registered', 'admin', 'root', 'special', 'circular1', 'circular2'].sort());
      done();
    });
  });

  it('returns all children of "admin"', function (done) {
    Acl.group.getChildren('admin', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['registered', 'admin'].sort());
      done();
    });
  });

  it('returns all children of "circular1"', function (done) {
    Acl.group.getChildren('circular1', function (err, groups) {
      assert(!err);
      assert.deepEqual(groups.sort(), ['circular1', 'circular2'].sort());
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
      assert(
        resources.every(function (item) {
          return RESOURCES.indexOf(item) !== -1;
        })
      );
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

  it('check if group "root" can "access" "item" via inclusion', function (done) {
    Acl.group.isAllowed('root', 'item', 'access', function (err, allowed) {
      assert(!err);
      assert(allowed === true);
      done();
    })
  });

  it('check if group "special" can "access" "item" via inclusion', function (done) {
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
      assert(list.length == TOTAL_GROUPS);
      assert(
        list.every(function (item) {
          return GROUPS.indexOf(item._id) !== -1;
        })
      );
      done();
    });
  });

  it('returns list of groups that have "access" to "item"', function (done) {
    Acl.resource.whichGroups('item', 'access', function (err, list) {
      assert(!err);
      assert.deepEqual(list.sort(), ['admin', 'registered', 'root', 'special'].sort());
      done();
    });
  });

  it('returns list of groups that have "access" to "admin_ui"', function (done) {
    Acl.resource.whichGroups('admin_ui', 'access', function (err, list) {
      assert(!err);
      assert.deepEqual(list.sort(), ['special', 'root', 'admin'].sort());
      done();
    });
  });

  it('returns list of groups that can "edit" "users"', function (done) {
    Acl.resource.whichGroups('users', 'edit', function (err, list) {
      assert(!err);
      assert.deepEqual(list.sort(), ['special', 'root'].sort());
      done();
    });
  });

  it('returns a resource', function (done) {
    Acl.resource.get('item', function (err, list) {
      assert(!err);
      assert(list.length == TOTAL_GROUPS);
      assert(
        list.every(function (item) {
          return GROUPS.indexOf(item._id) !== -1;
        })
      );
      done();
    });
  });

});
