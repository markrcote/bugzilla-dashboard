Require.modules["queries"] = function(exports, require) {
  function addUserQuery(field, type, args, nextB, usernames) {
    var count = 0;
    for (u in usernames) {
      args["field0-" + nextB + "-" + count] = field;
      args["type0-" + nextB + "-" + count] = type;
      args["value0-" + nextB + "-" + count] = usernames[u];
      ++count;
    }
    return args;
  }
  
  function addUserAssignedQuery(args, nextB, usernames) {
    return addUserQuery("assigned_to", "equals", args, nextB, usernames);
  }
  
  function addBlockerQuery(args, nextB) {
    args["field0-" + nextB + "-0"] = "cf_blocking_20";
    args["type0-" + nextB + "-0"] = "substring";
    args["value0-" + nextB + "-0"] = "final";
    args["field0-" + nextB + "-1"] = "cf_blocking_20";
    args["type0-" + nextB + "-1"] = "substring";
    args["value0-" + nextB + "-1"] = "beta";
    return args;
  }

  exports.open_blockers = function(usernames) {
    return {
      id: 'open_blockers',
      name: 'Open blockers',
      requires_user: false,
      args: function() {
        var a = {
          resolution: '---'
        };
        a = addBlockerQuery(a, 0);
        return addUserAssignedQuery(a, 1, usernames);
      }
    };
  };
  exports.open_noms = function(usernames) {
    return {
      id: 'open_noms',
      name: 'Blocker nominations',
      requires_user: false,
      args: function() {
        var a = {
          resolution: '---',
          field0_HYPH_0_HYPH_0: 'cf_blocking_20',
          type0_HYPH_0_HYPH_0: 'equals',
          value0_HYPH_0_HYPH_0: '?',
        };
        return addUserAssignedQuery(a, 1, usernames);
      }
    };
  };
  exports.regressions = function(usernames) {
    return {
      id: 'regressions',
      name: 'Open regression blockers',
      requires_user: false,
      args: function() {
        var a = {
          resolution: '---',
          field0_HYPH_0_HYPH_0: 'keywords',
          type0_HYPH_0_HYPH_0: 'anywords',
          value0_HYPH_0_HYPH_0: 'regression',
        };
        a = addBlockerQuery(a, 1);
        return addUserAssignedQuery(a, 2, usernames);
      }
    };
  };
  exports.patches_awaiting_review = function(usernames) {
    return {
      id: 'patches_awaiting_review',
      name: 'Patches awaiting review',
      requires_user: true,
      args: function() {
        // username is mandatory
        var a = {
          resolution: "---",
          type0_HYPH_0_HYPH_0: "substring",
          field0_HYPH_0_HYPH_0: "flagtypes.name",
          value0_HYPH_0_HYPH_0: "review?",
        };
        return addUserQuery("setters.login_name", "substring", a, 1, usernames);
      }
    };
  };
  exports.review_queue = function(usernames) {
    return {
      id: 'review_queue',
      name: 'Review queue',
      requires_user: true,
      args: function() {
        var a = {
          resolution: "---"
        };
        return addUserQuery("flag.requestee", "equals", a, 0, usernames);
      }
    };
  };
  exports.crashers = function(usernames) {
    return {
      id: 'crashers',
      name: 'Crasher blockers',
      requires_user: false,
      args: function() {
        var a = {
          resolution: '---',
          field0_HYPH_0_HYPH_0: 'keywords',
          type0_HYPH_0_HYPH_0: 'anywords',
          value0_HYPH_0_HYPH_0: 'crash topcrash',
        };
        a = addBlockerQuery(a, 1);
        return addUserAssignedQuery(a, 2, usernames);
      }
    };
  };
  exports.security = function(usernames) {
    return {
      id: 'security',
      name: 'Security blockers',
      requires_user: false,
      args: function() {
        var a = {
          resolution: '---',
          field0_HYPH_0_HYPH_0: 'component',
          type0_HYPH_0_HYPH_0: 'equals',
          value0_HYPH_0_HYPH_0: 'Security',
          field0_HYPH_0_HYPH_1: 'status_whiteboard',
          type0_HYPH_0_HYPH_1: 'allwordssubstr',
          value0_HYPH_0_HYPH_1: '[sg:',
        };
        a = addBlockerQuery(a, 1);
        return addUserAssignedQuery(a, 2, usernames);
      }
    };
  };
  exports.blockers_fixed_30_days = function(usernames) {
    return {
      id: 'blockers_fixed_30_days',
      name: 'Blockers fixed in the last 30 days',
      requires_user: false,
      args: function() {
        var a = {
          resolution: 'FIXED',
          changed_field: 'resolution',
          changed_field_to: 'FIXED',
          changed_before: 'Now',
          changed_after: require("date-utils").timeAgo(MS_PER_DAY * 30)
        };
        a = addBlockerQuery(a, 0);
        return addUserAssignedQuery(a, 1, usernames);
      }
    };
  };
  exports.nonblockers_fixed_30_days = function(usernames) {
    return {
      id: 'nonblockers_fixed_30_days',
      name: 'Nonblockers fixed in the last 30 days',
      requires_user: false,
      args: function() {
        var a = {
          resolution: 'FIXED',
          changed_field: 'resolution',
          changed_field_to: 'FIXED',
          changed_before: 'Now',
          changed_after: require("date-utils").timeAgo(MS_PER_DAY * 30),
          field0_HYPH_0_HYPH_0: 'cf_blocking_20',
          type0_HYPH_0_HYPH_0: 'notsubstring',
          value0_HYPH_0_HYPH_0: 'final',
          field0_HYPH_1_HYPH_0: 'cf_blocking_20',
          type0_HYPH_1_HYPH_0: 'notsubstring',
          value0_HYPH_1_HYPH_0: 'beta',
        };
        return addUserAssignedQuery(a, 2, usernames);
      }
    };
  };
};
