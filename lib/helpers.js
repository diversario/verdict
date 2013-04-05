var nconf = require('../conf');

exports.getDbUri = function (dbName) {
  return nconf.get('db:host') +
         ':' + nconf.get('db:port') +
         '/' + nconf.get('db:prefix') + dbName;
};

exports.getDbOptions = function () {
  return {
    auto_reconnect: true,
    poolSize: 1,
    w: 1,
    safe: true,
    strict: false
  }
};