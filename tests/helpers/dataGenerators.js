var async = require('async')
  , helpers = require('../../lib/helpers')
  , assert = require('assert')
  , db = require('mongoskin').db(helpers.getDbUri('acl'), helpers.getDbOptions())
  , aclColl = db.collection('acl')
  , groupsColl = db.collection('groups');


global.repopulate = function (done) {
  db.dropDatabase(function (err) {
    assert(!err);
    ensureIndexes(function () {
      populateAcls(function (err) {
        assert(!err);
        populateGroups(done);
      });
    })
  });
};


global.ensureIndexes = function (done) {
  aclColl.ensureIndex({resource: 1, action: 1, group: 1}, {unique: true}, function (err) {
    assert(!err);
    groupsColl.ensureIndex({members: 1}, function (err) {
      assert(!err);
      groupsColl.ensureIndex({inherits: 1}, function () {
        assert(!err);
        done();
      });
    });
  });
};


global.populateAcls = function populateAcls(done) {
  var acls = [
    {
      resource: 'item',
      actions: ['access'],
      groups: ['registered']
    },
    {
      resource: 'item',
      actions: ['edit', 'delete', 'create'],
      groups: ['root']
    },
    {
      resource: 'admin_ui',
      actions: ['access'],
      groups: ['root']
    },
    {
      resource: 'users',
      actions: ['access', 'edit', 'delete'],
      groups: ['root']
    }
  ];

  var docs = [];

  var q = async.queue(function (aclSet, cb) {
    aclSet.actions.forEach(function (action) {
      aclSet.groups.forEach(function (group) {
        docs.push({
          resource: aclSet.resource,
          action: action,
          group: group
        });
      });
    });
    cb();
  }, 1);

  acls.forEach(function (aclSet) {
    q.push(aclSet);
  });

  q.drain = function (err) {
    aclColl.insert(docs, done);
  }
};

global.populateGroups = function populateGroups(done) {
  var groups = [
    {
      _id: 'registered',
      inherits: [],
      members: ['user1', 'user2', 'user3']
    },
    {
      _id: 'root',
      inherits: ['*'],//['registered', 'admin'],
      members: ['root']
    },
    {
      _id: 'admin',
      inherits: ['registered'],
      members: ['administrator']
    },
    {
      _id: 'special',
      inherits: ['root'],
      members: ['cartman']
    }
  ];

  groupsColl.insert(groups, done);
};
