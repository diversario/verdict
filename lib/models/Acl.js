var helpers = require('../helpers')
  , mongo = require('mongoskin').db(helpers.getDbUri('acl'), helpers.getDbOptions())
  , acl = mongo.collection('acl')
  , groups = mongo.collection('acl');


function Acl(fields) {
  Acl.setFields.call(this, fields);
}

Acl.setFields = function (fields) {
  // validate here. Use assert?
  this.type = fields.type;
  this.create = fields.create;
  this.read = fields.read;
  this.update = fields.update;
  this.delete = fields.delete;
  this.access = fields.access;
};

Acl.prototype.save = function (cb) {
  var doc = {
    _id: this.type,
    type: this.type,
    create: this.create,
    read: this.read,
    update: this.update,
    delete: this.delete,
    access: this.access,
    _created: new Date()
  };
  
  mongo.insert(doc, function (err, doc) {
    cb(err, doc);
  });
};

module.exports = Acl;