'use strict';

var helpers = require('../helpers')
  , async = require('async')
  , mongo = require('mongoskin').db(helpers.getDbUri('acl'), helpers.getDbOptions())
  , resColl = mongo.collection('resources')
  , groupsColl = mongo.collection('groups')
;


var reserved = ['_id', '_created', 'type']
  , WILDCARD = '*'
;


/**
 * Adds only unique `elements` to `container`.
 * @param {Array} container
 * @param {*} elements
 */
function addToSet(container, elements, excluded) {
  if (!excluded) excluded = [];
  if (excluded && !Array.isArray(excluded)) excluded = [excluded];
  
  if (!Array.isArray(elements)) elements = [elements];
  elements.forEach(function (el) {
    if (!~container.indexOf(el) && !~excluded.indexOf(el)) container.push(el);
  });
}

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

  resColl.insert(docs, function (err, doc) {
    cb(err, doc);
  });
};


/**
 * Creates a group with name `group`, members `members`
 * that optionally includes from `includes` groups.
 * 
 * @param {String} group
 * @param {Array|String} members
 * @param {Array|String} includes
 * @param {Function} cb
 */
exports.createGroup = function (group, members, includes, cb) {
  if (typeof members == 'string') members = [members];
  if (typeof includes == 'string') includes = [includes];
  
  if (typeof includes == 'function') {
    cb = includes;
    includes = [];
  }
  
  var doc = {
    _id: group,
    members: members,
    includes: includes
  };
  
  groupsColl.insert(doc, function (err, result) {
    cb(err, result);
  });
};



exports.group = {};



/**
 * Returns a list of groups that include `group`,
 * directly or through another group.
 * @param group
 * @param done
 */
exports.group.getParents = function findParents(group, done) {
  var queue = [].concat(group)
    , parents = [].concat(group)
    , wildcardCalled = false;

  function wildcard() {
    wildcardCalled = true;
    exports.group.getParentGroups(WILDCARD, function (err, groups) {
      if (groups && groups.length) {
        groups.forEach(function (group) {
          addToSet(parents, group._id, WILDCARD);
          addToSet(queue, group._id, WILDCARD);
        });
      }
      
      iterate();
    });
  }
  
  function getGroup(id) {
    exports.group.getParentGroups(id, function (err, groups) {
      if (groups && groups.length) {
        groups.forEach(function (group) {
          addToSet(queue, group._id, WILDCARD);
          addToSet(parents, group._id, WILDCARD);
        });
      }
      
      iterate();
    });
  }

  function iterate() {
    if (queue.length) getGroup(queue.shift());
    else {
      if (wildcardCalled) done(null, parents);
      else wildcard(); 
    }
  }
  
  iterate();
};



exports.group.getChildren = function findChildren(group, done) {
  var queue = [].concat(group)
    , children = [].concat(group);

  function wildcard() {
    exports.group.get({list: true}, function (err, groups) {
      addToSet(children, groups);
      done(null, children)
    });
  }

  function getGroup(id) {
    exports.group.get(id, function (err, group) {
      if (group && group.includes.length) {
        if (~group.includes.indexOf(WILDCARD)) return wildcard();
        addToSet(children, group.includes, WILDCARD);
        addToSet(queue, group.includes, WILDCARD);
      }
      
      iterate();
    });
  }

  function iterate() {
    if (queue.length) getGroup(queue.shift());
    else done(null, children);
  }

  iterate();
};


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



exports.group.getParentGroups = function (group, cb) {
  if (!Array.isArray(group)) group = [group];
  
  groupsColl.find({includes: {$in: group}}).toArray(function (err, groups) {
    cb(err, groups); 
  });
};



exports.group.getChildGroups = function (id, cb) {
  if (!Array.isArray(id)) id = [id];
  
  var query = {
    includes: {$in: id}
  };
  
  groupsColl.find(query, function (err, groups) {
    if (err || !groups) return cb(err);

    groups.toArray(function (err, list) {
      cb(err, list);
    });
  });
};



exports.group.availableResources = function (group, action, cb) {
   //find all resources where "group" is either
   //- specified `group`
   //- includes from `group`
   //
  exports.group.getChildren(group, function (err, children) {
    var groups = children.concat(group);
    
    resColl.aggregate(
      {$match: {action: action, group: {$in: groups} }},
      {$group: {_id: action, resources: {$addToSet: '$resource'}}},
      function (err, resources) {
        if (err) return cb(err);
        cb(err, resources.length ? resources[0].resources : []);
    });
  });
};



exports.group.isAllowed = function (group, resource, action, cb) {
  /**
   * find all resources where "group" is either
   * - specified `group`
   * - includes from `group`
   */

  exports.group.getChildren(group, function (err, parents) {
    var groups = parents.concat(group);
    
    resColl.count(
      {resource: resource, action: action, group: {$in: groups}},
      function (err, count) {
        cb(err, count !== 0);
      });
  });
};



exports.resource = exports.res = {};

exports.res.get = function (resource, cb) {

};

exports.res.whichGroups = function (resource, action, cb) {
  if (typeof action == 'function') {
    cb = action;
    action = null;
  }

  var match = {resource: resource};
  if (action) match.action = action;
  
  resColl.aggregate(
    {$match: match},
    {$group: {_id: resource, groups: {$addToSet: '$group'}}},
    function (err, resources) {
      if (err) return cb(err);
      exports.group.getParents(resources[0].groups, cb);
    });
};