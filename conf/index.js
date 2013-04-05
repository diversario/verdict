var fs = require('fs')
  , nconf = require('nconf');

nconf
  .argv()
  .env();

var configFiles = fs.readdirSync(__dirname);

configFiles.forEach(function (file) {
  var config = require(__dirname + '/' + file);
  
  Object.keys(config).forEach(function (store) {
    var opts = {type: 'literal'};
    opts[store] = config[store];
    nconf.add(store, opts);  
  });
});

module.exports = nconf;