var mongo = require('mongoskin').db('localhost:27017/verdict');

mongo.collection('blog').find().toArray(function (err, items) {
  console.dir(items);
});

