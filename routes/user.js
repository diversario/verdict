
/*
 * GET users listing.
 */

function attach(app) {
  app.get('/api/v1/user', function(req, res) {
    res.send("respond with a resource");
  });
}

module.exports = attach;