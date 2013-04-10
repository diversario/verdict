var mongo = require('mongoskin').db('localhost:27017/verdict').collection('users');

function User (opts) {
}


User.prototype.save = function (cb) {
  mongo.save(this.getUserDocument, {'upsert': true}, function (err, doc) {
    cb(err, doc);
  });
};


User.prototype.getUserDocument = function () {
  return {
    _id: this.id,
    name: this.name,
    email: this.email
  }
};


User.findById = function (id, cb) {
  mongo.findById(id, function (err, user) {
    cb(err, user);
  });
};


User.findOrCreate = function (profile, cb) {
  User.findById(profile.id, function (err, user) {
    if (!user) return User.create(profile, cb);
    cb(null, user);
  });
};


User.create = function (profile, cb) {
  var user = {
    _id: profile.id,
    profile: profile
  };
  
  mongo.insert(user, function (err, doc) {
    cb(err, doc && doc.length && doc[0] || null);
  });
};

module.exports = User;