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


function getInheritanceChain(groups, cb) {
  var inheritedGroups = [];
  
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
}


exports.group = {};

exports.group.get = function (id, cb) {
  groupsColl.findById(id, function (err, group) {
    cb(err, group);
  });
};

exports.group.getWithInheritance = function (id, cb) {
  exports.group.get(id, function(err, groupDoc) {
    getInheritanceChain(groupDoc.inherits, cb);
  });
};

exports.group.availableResources = function (group, action, cb) {
  /**
   * find all resources where "group" is either
   * - specified `group`
   * - inherits from `group`
   */
  
  exports.group.get(group, function (err, groupDoc) {
    var groups = groupDoc.inherits;
    groups.push(group);
    
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

  exports.group.get(group, function (err, groupRecord) {
    var groups = groupRecord.inherits;
    groups.push(group);
    
    aclColl.count(
      {resource: resource, action: action, group: {$in: groups}},
      function (err, count) {
        cb(err, count !== 0);
      });
  });
};