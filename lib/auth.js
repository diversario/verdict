var passport = require('passport')
  , User = require('./models/User')
  , acl = require('./acl')
  , conf = require('../conf')
  , FacebookStrategy = require('passport-facebook').Strategy;

var rootUserExists = false;

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new FacebookStrategy({
    clientID: conf.get('facebook:FACEBOOK_APP_ID'),
    clientSecret: conf.get('facebook:FACEBOOK_APP_SECRET'),
    callbackURL: conf.get('facebook:FACEBOOK_CALLBACK_URL')
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate(profile, function(err, user) {
      if (err) return done(err);
      
      if (rootUserExists) done(null, user);
      else {
        createRoot(user.id, function (err) {
          done(err, user);
        })
      }
    });
  }
));


function createRoot(id, cb) {
  acl.group.get('root', function (err, group) {
    if (err) return cb(err);
    if (group && group.members.length) {
      rootUserExists = true;
      return cb();
    }
    
    acl.group.add('root', id, '*', function (err, user) {
      if (err) return cb(err);
      rootUserExists = true;
      cb();
    });
  });
}


module.exports = passport;