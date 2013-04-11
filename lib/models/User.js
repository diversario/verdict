var Resource = require('./Resource')
  , helpers = require('../helpers')
  , inherits = require('util').inherits;

function User (profile) {
  Resource.call(this, 'user');
  User.construct.call(this, profile);
}

User.type = 'user';

inherits(User, Resource);


/**
 * Sets necessary properties on User object.
 * Content may come from Facebook (new user)
 * or database (existing user).
 * 
 * @param content
 */
User.construct = function (content) {
  if (content._id && content.profile) {
    this.profile = content.profile;
    helpers.setStaticProperty(this, 'id', content._id.toString());
    helpers.setStaticProperty(this.profile, 'id', content.profile.id);
  } else {
    this.profile = content;
    helpers.setStaticProperty(this, 'id', content.id);
    helpers.setStaticProperty(this.profile, 'id', content.id);
  }
};

User.prototype.toObject = function () {
  return {
    _id: this.id,
    profile: this.profile
  }
};


User.findById = Resource.findById(User);


User.findOrCreate = function (profile, cb) {
  User.findById(profile.id, function (err, user) {
    if (!user) {
      user = new User(profile);
      return user.save(cb);
    }
    
    cb(null, user);
  });
};

module.exports = User;