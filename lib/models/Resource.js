var helpers = require('../helpers')
  , mongo = require('mongoskin').db(helpers.getDbUri('resources'), helpers.getDbOptions())
  ;

function Resource (type) {
  if (!type) throw new Error('Resource type required.');
  helpers.setHiddenProperty(this, 'db', mongo.collection(type));
}

Resource.prototype.save = function (cb) {
  var self = this;
  this.db.save(this.toObject(), {'upsert': true}, function (err, doc) {
    cb(err, self);
  });
};

Resource.prototype.toObject = function () {
  throw new Error('Method "toObject" must be overriden.');
};

Resource.findById = function (Class) {
  return function (id, cb) {
    var res = {};
    Resource.call(res, Class.type);
    res.db.findById(id, function (err, res) {
      cb(err, new Class(res));
    });
  };    
};

module.exports = Resource;