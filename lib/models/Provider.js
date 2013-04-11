var Resource = require('./Resource')
  , helpers = require('../helpers')
  , inherits = require('util').inherits;

function Provider (name) {
  Resource.call(this, 'provider');
  
  helpers.setStaticProperty(this, 'id', name);
}

inherits(Provider, Resource);

Provider.prototype.toObject = function () {
  return {
    _id: this.name
  }
};



module.exports = Provider;