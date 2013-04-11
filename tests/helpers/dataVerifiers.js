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

global.compareProducts = function (actual, expected) {
  Object.keys(actual).forEach(function (key) {
    if (key == 'rating') return;
    if (key == '_id') assert.strictEqual(actual._id, expected.id);
    else assert.strictEqual(actual[key], expected[key]);
  });
};