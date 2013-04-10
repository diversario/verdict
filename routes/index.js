var mw = require('../lib/middleware');

/*
 * GET home page.
 */

function attach(app) {
  app.get('/', mw.isLoggedIn, function(req, res) {
    res.render('index', { title: 'Express' });
  });
}


module.exports = attach;