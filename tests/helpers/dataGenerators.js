var async = require('async')
  , helpers = require('../../lib/helpers')
  , assert = require('assert')
  , db = require('mongoskin').db(helpers.getDbUri('acl'), helpers.getDbOptions())
  , resColl = db.collection('resources')
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
  resColl.ensureIndex({resource: 1, action: 1, group: 1}, {unique: true}, function (err) {
    assert(!err);
    groupsColl.ensureIndex({members: 1}, function (err) {
      assert(!err);
      groupsColl.ensureIndex({includes: 1}, function () {
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
      groups: ['root', 'admin']
    },
    {
      resource: 'users',
      actions: ['access', 'edit', 'delete'],
      groups: ['root']
    }
  ];

  global.RESOURCES = acls;
  
  global.RESOURCES_LIST = acls.map(function(res){
    return res.resource;
  });
  
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
    resColl.insert(docs, done);
  }
};

global.populateGroups = function populateGroups(done) {
  var groups = [
    {
      _id: 'registered',
      includes: [],
      members: ['user1', 'user2', 'user3']
    },
    {
      _id: 'root',
      includes: ['*'],
      members: ['root']
    },
    {
      _id: 'admin',
      includes: ['registered'],
      members: ['administrator']
    },
    {
      _id: 'special',
      includes: ['root'],
      members: ['cartman']
    },
    {
      _id: 'circular1',
      includes: ['circular2'],
      members: []
    },
    {
      _id: 'circular2',
      includes: ['circular1'],
      members: []
    }
  ];
  
  global.TOTAL_GROUPS = groups.length;
  global.GROUPS = groups.map(function (group) {
    return group._id;
  });

  groupsColl.insert(groups, done);
};
