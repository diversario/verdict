var passport = require('passport')
  , User = require('./models/User')
  , conf = require('../config.private')
  , FacebookStrategy = require('passport-facebook').Strategy;

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new FacebookStrategy({
    clientID: conf.get('FACEBOOK_APP_ID'),
    clientSecret: conf.get('FACEBOOK_APP_SECRET'),
    callbackURL: conf.get('FACEBOOK_CALLBACK_URL')
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate(profile, function(err, user) {
      if (err) return done(err);
      done(null, user);
    });
  }
));

module.exports = passport;