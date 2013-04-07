var async = require('async')
  , helpers = require('../../lib/helpers')
  , assert = require('assert')
  , db = require('mongoskin').db(helpers.getDbUri('acl'), helpers.getDbOptions())
  , resColl = db.collection('resources')
  , groupsColl = db.collection('groups');


global.getAcl = function (type, cb) {
  resColl.find({type: type}).toArray(cb);
};

global.getGroup = function (_id, cb) {
  groupsColl.findById(_id, cb);
};

