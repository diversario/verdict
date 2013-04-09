'use strict';

var helpers = require('../helpers')
  , async = require('async')
  , mongo = require('mongoskin').db(helpers.getDbUri('acl'), helpers.getDbOptions())
  , resColl = mongo.collection('resources')
  , groupsColl = mongo.collection('groups');


var reserved = ['_id', '_created', 'type']
  , WILDCARD = '*'
  , acl = {
      group: {},
      resource: {}
    }
;

acl.res = acl.resource; 


/**
 * Adds only unique `elements` to `container`.
 * @param {Array} container
 * @param {*} elements
 * @param {Array|String} excluded elements to skip
 */
function addToSet (container, elements, excluded) {
  if (!excluded) excluded = [];
  if (excluded && !Array.isArray(excluded)) excluded = [excluded];

  if (!Array.isArray(elements)) elements = [elements];
  elements.forEach(function (el) {
    if (!~container.indexOf(el) && !~excluded.indexOf(el)) container.push(el);
  });
}



/**
 * Adds a new resource `resource` with specified `actions`.
 *
 * @param {String} resource Unique resource name
 * @param {Object} actions 'action':[groups] map
 * @param cb
 */
acl.addResource = function (resource, actions, cb) {
  var docs = [];

  Object.keys(actions).forEach(function (act) {
    if (~reserved.indexOf(act)) {
      throw new Error('Cannot use "' + act + '" as action name');
    }

    if (act.indexOf('$') === 0) {
      throw new Error('Action name cannot start with "$"');
    }
  });

  // unroll groups
  Object.keys(actions).forEach(function (action) {
    if (!Array.isArray(actions[action])) action = [action];

    actions[action].forEach(function (group) {
      docs.push({
        resource: resource,
        action: action,
        group: group
      })
    });
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
acl.addGroup = function (group, members, includes, cb) {
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



acl.group = {};



/**
 * Returns a list of groups that include `group`,
 * directly or through another group.
 * @param group
 * @param done
 */
acl.group.getParents = function findParents (group, done) {
  var queue = [].concat(group)
    , processed = [] // so that circular dependencies don't loop forever
    , parents = [].concat(group)
    , wildcardCalled = false;

  function wildcard () {
    wildcardCalled = true;
    
    acl.group.getParentGroups(WILDCARD, function (err, groups) {
      if (groups && groups.length) {
        groups.forEach(function (group) {
          addToSet(parents, group._id, WILDCARD);
          addToSet(queue, group._id, WILDCARD);
        });
      }

      iterate();
    });
  }

  function getGroup (id) {
    addToSet(processed, id);
    
    acl.group.getParentGroups(id, function (err, groups) {
      if (groups && groups.length) {
        groups.forEach(function (group) {
          if (!~processed.indexOf(group._id)) {
            addToSet(queue, group._id, WILDCARD);
          }

          addToSet(parents, group._id, WILDCARD);
        });
      }

      iterate();
    });
  }

  function iterate () {
    if (queue.length) {
      getGroup(queue.shift());
    } else {
      if (wildcardCalled) done(null, parents); else wildcard();
    }
  }

  iterate();
};



/**
 * Returns a list of groups that this `group`
 * is a superset of.
 * 
 * @param group
 * @param done
 */
acl.group.getChildren = function findChildren (group, done) {
  var queue = [].concat(group)
    , processed = [] // so that circular dependencies don't loop forever
    , children = [].concat(group);

  function wildcard () {
    acl.group.list(function (err, groups) {
      addToSet(children, groups);
      done(null, children)
    });
  }

  function getGroup (id) {
    addToSet(processed, id);
    acl.group.get(id, function (err, group) {
      if (group && group.includes.length) {
        if (~group.includes.indexOf(WILDCARD)) return wildcard();

        addToSet(queue, group.includes, processed);
        addToSet(children, group.includes, WILDCARD);
      }

      iterate();
    });
  }

  function iterate () {
    if (queue.length) getGroup(queue.shift()); else done(null, children);
  }

  iterate();
};




/**
 * Returns a list of all defined groups.
 * @param cb
 */
acl.group.list = function (cb) {
  groupsColl.distinct('_id', function (err, list) {
    cb(err, list);
  });
};



/**
 * Runs 'find' or 'findOne' query on `collection`.
 * Shared function.
 * 
 * @param collection
 * @param key
 * @param value
 * @param cb
 */
function find(collection, key, value, cb) {
  var query = {}
    , method = 'find';

  if (typeof value == 'function') {
    cb = value;
    value = null;
  }

  if (typeof value == 'string') {
    query[key] = value;
    method = 'findOne';
  }

  collection[method](query, function (err, result) {
    if (result && typeof result.toArray == 'function') {
      result.toArray(function (err, list) {
        cb(err, list);
      });
    } else {
      cb(err, result);
    }
  });
}

/**
 * Returns all or just one group.
 * 
 * @param {String} [id]
 * @param cb
 */
acl.group.get = function (id, cb) {
  var args = [groupsColl, '_id'].concat([].slice.apply(arguments));
  find.apply(null, args);
};



/**
 * Returns a list of groups that include this `group`,
 * i.e., superset groups.
 * 
 * @param group
 * @param cb
 */
acl.group.getParentGroups = function (group, cb) {
  if (!Array.isArray(group)) group = [group];

  groupsColl.find({includes: {$in: group}}).toArray(function (err, groups) {
    cb(err, groups);
  });
};



/**
 * Lists all resources on which `group` can perform `action`.
 * 
 * @param group
 * @param action
 * @param cb
 */
acl.group.availableResources = function (group, action, cb) {
  acl.group.getChildren(group, function (err, children) {
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



/**
 * Determines if `group` can perform `action` on `resource`.
 * Takes inheritance into account.
 * 
 * @param group
 * @param resource
 * @param action
 * @param cb
 */
acl.group.isAllowed = function (group, resource, action, cb) {
  /**
   * find all resources where "group" is either
   * - specified `group`
   * - includes from `group`
   */

  acl.group.getChildren(group, function (err, parents) {
    var groups = parents.concat(group);

    resColl.count(
      {resource: resource, action: action, group: {$in: groups}},
      function (err, count) {
      cb(err, count !== 0);
    });
  });
};



/**
 * Returns a single resource or an array of all resources.
 * @param resource
 * @param cb
 */
acl.res.get = function (resource, cb) {
  var match = {};
  
  if (typeof resource == 'string') {
    match.resource = resource;
  }
  
  resColl.aggregate(
    {$match: match},
    {$group: {
      _id: resource, 'actions2': {$addToSet: '$action'}}
    },
    function (err, resources) {
      cb(err, resources);
    });
};



acl.res.whichGroups = function (resource, action, cb) {
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
      acl.group.getParents(resources[0].groups, cb);
    });
};


module.exports = acl;