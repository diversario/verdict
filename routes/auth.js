var passport = require('../lib/login')
  , conf = require('../config.private');

function attach(app) {
  app.get('/auth/facebook', passport.authenticate('facebook'));
  
  app.get('/api/v1/auth/facebook/callback', function (req, res, next) {
    passport.authenticate('facebook', { successRedirect: '/',
      failureRedirect: '/login' })(req, res, next)
  });
  
  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });
}

module.exports = attach;