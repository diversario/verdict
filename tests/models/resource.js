var helpers = require('../../lib/helpers')
  , async = require('async')
  , assert = require('assert')
  , db = require('mongoskin').db(helpers.getDbUri('resources'), helpers.getDbOptions())
  , testColl = db.collection('test1')
  , Resource = require('../../lib/models/Resource')
  , Product = require('../../lib/models/Product');


/**
 * Adds global helper methods.
 */
require('../helpers/dataGenerators');
require('../helpers/dataAccessors');
require('../helpers/dataVerifiers');


describe('Create resources', function () {
  before(function (done) {
    db.dropDatabase(function (err) {
      assert(!err);
      ensureIndexes(done);
    });
  });

  function getOpts(id) {
    return {
      description: "poop",
      "provider": 'me',
      name: "shit",
      id: id || Math.floor(Math.random()*100000).toString(),
      votes: []
    };
  }

  it('creates a new Product', function () {
    var opts = getOpts();
    var product = new Product(opts);
    compareProducts(product, opts);
  });
  
  it('saves product', function (done) {
    var opts = getOpts();
    var product = new Product(opts);
    compareProducts(product, opts);
    product.save(function (err, doc) {
      done();
    });
  });

  it('adds a vote', function (done) {
    var opts = getOpts();
    var product = new Product(opts);
    compareProducts(product, opts);
    
    var user = 1
      , vote = 2
    ;
    
    product.addVote(user, vote, function (err) {
      done();
    });
  });

  it('does not add a duplicate vote', function (done) {
    var opts = getOpts();
    var product = new Product(opts);
    compareProducts(product, opts);

    var user = 1
      , vote = 2
      ;

    product.addVote(user, vote, function (err) {
      product.addVote(user, 99, function (err) {
        done();
      });
    });
  });
});
