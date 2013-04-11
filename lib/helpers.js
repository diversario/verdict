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

exports.setHiddenProperty = function (obj, prop, value) {
  Object.defineProperty(obj, prop, {
    value: value,
    writable: false,
    configurable: false,
    enumerable: false
  })
};

exports.setStaticProperty = function (obj, prop, value) {
  Object.defineProperty(obj, prop, {
    value: value,
    writable: false,
    configurable: false,
    enumerable: true
  })
};