var Resource = require('./Resource')
  , helpers = require('../helpers')
  , _ = require('sugar')
  , inherits = require('util').inherits;

function Product (content) {
  Resource.call(this, 'product');
  Product.construct.call(this, content);
}

Product.type = 'product';

inherits(Product, Resource);

Product.construct = function (content) {
  this.description = content.description;
  this.provider = content.provider;
  this.name = content.name;
  this.votes = content.votes || [];
  
  // computed field `rating`
  this.calculateRating();

  this.id = content._id || content.id;
};

Product.prototype.toObject = function () {
  return {
    _id: this.id,
    description: this.description,
    provider: this.provider,
    name: this.name,
    votes: this.votes
  }
};

Product.findById = Resource.findById(Product);

Product.prototype.calculateRating = function () {
  this.rating = this.votes.length > 0 ? (this.votes.sum('vote') / this.votes.length).toFixed(1) : 0;
};

Product.prototype.addVote = function (user, vote, cb) {
  var self = this
    , alreadyVoted = this.votes.find(function(el){return el.user == user}) == -1
  ;
  
  if (alreadyVoted) return cb();
  
  var record = {
    user: user,
    vote: vote,
    ts: new Date()
  };
  
  var query = this.toObject();
  query['votes.user'] = {$nin: [user]};
  
  this.db.update(
    query,
    {$push: {votes: record}},
    {upsert: true},
    function (err, updated) {
      if (err) return cb(err);
      self.votes.push(record);
      self.calculateRating();
      cb();
    });
};

module.exports = Product;