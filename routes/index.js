
/*
 * GET home page.
 */

function attach(app) {
  app.get('/', function(req, res) {
    res.render('index', { title: 'Express' });
  });
}


module.exports = attach;