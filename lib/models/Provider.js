var Resource = require('./Resource')
  , helpers = require('../helpers')
  , inherits = require('util').inherits;

function Provider (name) {
  Resource.call(this, 'provider');
  Provider.construct.call(this, name);
}

inherits(Provider, Resource);

Provider.construct = function (content) {
  if (content._id) {
    helpers.setStaticProperty(this, 'id', content._id.toString());
  } else {
    helpers.setStaticProperty(this, 'id', content);
  }
};

Provider.prototype.toObject = function () {
  return {
    _id: this.name
  }
};


module.exports = Provider;