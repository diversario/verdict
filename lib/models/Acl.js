var helpers = require('../helpers')
  , async = require('async')
  , mongo = require('mongoskin').db(helpers.getDbUri('acl'), helpers.getDbOptions())
  , aclColl = mongo.collection('acl')
  , groupsColl = mongo.collection('groups')
;


var reserved = ['_id', '_created', 'type'];


exports.createAction = function (resource, actions, cb) {
  var docs = [];
  
  Object.keys(actions).forEach(function (act) {
    if (~reserved.indexOf(act))
      throw new Error('Cannot use "' + act + '" as action name');

    if (act.indexOf('$') === 0)
      throw new Error('Action name cannot start with "$"');
  });

  // unroll groups
  Object.keys(actions).forEach(function (action) {
    if (Array.isArray(actions[action])) {
      actions[action].forEach(function (group) {
        docs.push({
          resource: resource,
          action: action,
          group: group
        })
      });
    } else {
      docs.push({
        resource: resource,
        action: action,
        group: actions[action]
      })
    }
  });

  aclColl.insert(docs, function (err, doc) {
    cb(err, doc);
  });
};


/**
 * Creates a group with name `group`, members `members`
 * that optionally inherits from `inherits` groups.
 * 
 * @param {String} group
 * @param {Array|String} members
 * @param {Array|String} inherits
 * @param {Function} cb
 */
exports.createGroup = function (group, members, inherits, cb) {
  if (typeof members == 'string') members = [members];
  if (typeof inherits == 'string') inherits = [inherits];
  
  if (typeof inherits == 'function') {
    cb = inherits;
    inherits = [];
  }
  
  var doc = {
    _id: group,
    members: members,
    inherits: inherits
  };
  
  groupsColl.insert(doc, function (err, result) {
    cb(err, result);
  });
};


function getInheritanceChain(id, groups, cb) {
  var inheritedGroups = [];
  
  if (!groups.length) return cb(null, inheritedGroups);
  
  var steps = 0
    , stopWalking = false
  ;
  
  function endChain() {
    if (stopWalking) return;
    if (!steps) cb(null, inheritedGroups);
  }
  
  function stepChain() {
    ++steps;
  }
  
  function push (group) {
    --steps;
    if (!~inheritedGroups.indexOf(group)) inheritedGroups.push(group);
  }

  function walkChain(group) {
    if (stopWalking) return;
    if (group == '*') return wildcard();
    
    stepChain();
    
    exports.group.get(group, function (err, groupRecord) {
      if (stopWalking) return;
      
      push(groupRecord._id);
      if (groupRecord.inherits.length == 0) return endChain();

      groupRecord.inherits.forEach(function (group) {
        walkChain(group);
      });
    });
  }
  
  groups.forEach(function (group) {
    walkChain(group);
  });

  function wildcard() {
    stopWalking = true;
    
    exports.group.get({'list': true}, function (err, list) {
      list.splice(list.indexOf(id), 1);
      cb(null, list);
    });
  }
  
  /*
  var tasks = [];
  
  groups.forEach(function (group) {
    tasks.push(function (collected, callback) {
      exports.group.get(group, function (err, groupRecord) {
        if (!~collected.indexOf(groupRecord._id)) collected.push(groupRecord._id);
        if (groupRecord.inherits.length == 0) return callback(err, collected);
        getInheritanceChain(groupRecord.inherits, callback, collected);
      });
    });
  });
  
  async.waterfall(tasks, cb);
  */
  
  /*
  var inheritedGroups = [];
  
  if (!groups.length) return cb(null, inheritedGroups);
  if (~groups.indexOf('*')) return exports.group.get({'list': true}, cb);
  
  var q = async.queue(function (group, cb) {
    exports.group.get(group, function (err, groupDoc) {
      inheritedGroups.push(groupDoc._id);
      
      if (groupDoc.inherits.length) {
        groupDoc.inherits.forEach(function (g) {
          if (!~inheritedGroups.indexOf(g))
            q.push(g);
        })    
      }
      
      cb();
    });
  }, 1);
  
  q.drain = function () {
    cb(null, inheritedGroups);
  };
  
  groups.forEach(function (group) {
    q.push(group);
  });
  */
}


exports.group = {};

exports.group.get = function (id, opts, cb) {
  var query = {}
    , method = 'findOne'
  ;

  if (typeof id == 'function') {
    cb = id;
    id = opts = null;
    method = 'find';
  }
  
  if (id && typeof id == 'object') {
    cb = opts;
    opts = id;
    id = null;
  }
  
  if (opts && typeof opts == 'function') {
    cb = opts;
    opts = null;
  }
  
  if (typeof id == 'string') {
    query._id = id;
  }
  
  if (opts && opts.list) {
    method = 'distinct';
    query = '_id';
  }
  
  groupsColl[method](query, function (err, result) {
    if (result && typeof result.toArray == 'function') {
      result.toArray(function (err, list) {
        cb(err, list);
      });
    } else cb(err, result);
  });
};


/**
 * Returns an array of group ids (names) from which
 * provided group inherits.
 * 
 * @param id
 * @param cb
 */
exports.group.getInheritedGroups = function (id, cb) {
  exports.group.get(id, function(err, groupDoc) {
    getInheritanceChain(id, groupDoc.inherits, cb);
  });
};

exports.group.availableResources = function (group, action, cb) {
   //find all resources where "group" is either
   //- specified `group`
   //- inherits from `group`
   //
  exports.group.getInheritedGroups(group, function (err, inherited) {
    var groups = inherited.concat(group);
    
    aclColl.aggregate(
      {$match: {action: action, group: {$in: groups} }},
      {$group: {_id: action, resources: {$addToSet: '$resource'}}}
    , function (err, resources) {
        if (err) return cb(err);
        cb(err, resources.length ? resources[0].resources : []);
    });
  });
};



exports.group.isAllowed = function (group, resource, action, cb) {
  /**
   * find all resources where "group" is either
   * - specified `group`
   * - inherits from `group`
   */

  exports.group.getInheritedGroups(group, function (err, inheritedGroups) {
    var groups = inheritedGroups.concat(group);
    
    aclColl.count(
      {resource: resource, action: action, group: {$in: groups}},
      function (err, count) {
        cb(err, count !== 0);
      });
  });
};