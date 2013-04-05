var helpers = require('../lib/helpers')
  , async = require('async')
  , assert = require('assert')
  , db = require('mongoskin').db(helpers.getDbUri('acl'), helpers.getDbOptions())
  , coll = db.collection('acl')
  , Acl = require('../lib/models/Acl');


function saveFindCompare(acl, expected, done) {
  acl.save(function (err) {
    assert(!err);

    coll.findOne({type: expected.type}, function (err, doc) {
      assert(!err);

      assert(Object.keys(expected).every(function (key) {
        if (key == '_id') return true;
        if (!Object.prototype.hasOwnProperty.call(doc, key)) return false;
        assert.deepEqual(expected[key], doc[key]);
        return true;
      }));

      done();
    });
  });
}


function populateCollection(done) {
  var count = 200;
  
  var types = ['item', 'provider', 'admin_ui'];
  
  var q = async.queue(function (type, cb) {
    var fields = {
      type: type,
      create: ['create_items', 'root'],
      read: ['registered', 'root'],
      update: ['edit_items', 'root'],
      delete: ['remove_items', 'root'],
      access: ['registered', 'root']
    };

    var acl = new Acl(fields);
    acl.save(function (err) {
      assert(!err);
      count--;
      cb();
    });
  });
}


describe('Create', function () {
  before(function (done) {
    db.dropDatabase(done);
  });
  
  it('creates an entry in the db', function (done) {
    var fields = {
      type: 'item',
      create: ['create_items', 'root'],
      read: ['registered', 'root'],
      update: ['edit_items', 'root'],
      delete: ['remove_items', 'root'],
      access: ['registered', 'root']
    };
    
    var acl = new Acl(fields);
    
    saveFindCompare(acl, fields, done);
  });

  it('fails to create a duplicate entry', function (done) {
    var fields = {
      type: 'item',
      create: ['create_items', 'root'],
      read: ['registered', 'root'],
      update: ['edit_items', 'root'],
      delete: ['remove_items', 'root'],
      access: ['registered', 'root']
    };

    var acl = new Acl(fields);

    acl.save(function (err) {
      assert.equal(err.code, 11000);
      done();
    });
  });
});




describe('Read', function () {
  before(function (done) {
    db.dropDatabase(function () {
      populateCollection(done);
    });
  });

  it('creates an entry in the db', function (done) {
    var fields = {
      type: 'item',
      create: ['create_items', 'root'],
      read: ['registered', 'root'],
      update: ['edit_items', 'root'],
      delete: ['remove_items', 'root'],
      access: ['registered', 'root']
    };

    var acl = new Acl(fields);

    saveFindCompare(acl, fields, done);
  });
});