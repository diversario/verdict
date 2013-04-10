exports.isLoggedIn = function (req, res, next) {
  if (!req.session || !req.session.passport || !req.session.passport.id) return res.redirect('/login');
  next();
};