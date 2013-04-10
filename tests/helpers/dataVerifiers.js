var assert = require('assert');

global.compareGroups = function (actual, expected) {
  assert(actual._id === expected.name);
  assert.deepEqual(actual.members, expected.members);
  assert.deepEqual(actual.includes, expected.includes);
};

global.shouldNotExist = function (coll, query, cb) {
  coll.count(query, function (err, count) {
    assert(!err);
    assert(count === 0);
    cb();
  })
};