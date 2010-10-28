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

  exports.open_blockers = function(usernames) {
    return {
      id: 'open_blockers',
      name: 'Open blockers',
      requires_user: false,
      args: function() {
        var a = {
          field0_HYPH_0_HYPH_0: 'cf_blocking_20',
          type0_HYPH_0_HYPH_0: 'substring',
          value0_HYPH_0_HYPH_0: 'beta',
          field0_HYPH_0_HYPH_1: 'cf_blocking_20',
          type0_HYPH_0_HYPH_1: 'substring',
          value0_HYPH_0_HYPH_1: 'final',
          resolution: '---'
        };
        return addUserAssignedQuery(a, 1, usernames);
      }
    };
  };
  exports.open_noms = function(usernames) {
    return {
      id: 'open_noms',
      name: 'Nominations',
      requires_user: false,
      args: function() {
        var a = {
          field0_HYPH_0_HYPH_0: 'cf_blocking_20',
          type0_HYPH_0_HYPH_0: 'equals',
          value0_HYPH_0_HYPH_0: '?',
          resolution: '---'
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
          field0_HYPH_0_HYPH_0: 'cf_blocking_20',
          type0_HYPH_0_HYPH_0: 'substring',
          value0_HYPH_0_HYPH_0: 'beta',
          field0_HYPH_0_HYPH_1: 'cf_blocking_20',
          type0_HYPH_0_HYPH_1: 'substring',
          value0_HYPH_0_HYPH_1: 'final',
          field0_HYPH_1_HYPH_0: 'keywords',
          type0_HYPH_1_HYPH_0: 'anywords',
          value0_HYPH_1_HYPH_0: 'regression',
          resolution: '---'
        };
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
          type0_HYPH_0_HYPH_0: "substring",
          field0_HYPH_0_HYPH_0: "flagtypes.name",
          value0_HYPH_0_HYPH_0: "review?",
          resolution: "---",
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
      name: 'Crashers',
      requires_user: false,
      args: function() {
        var a = {
          field0_HYPH_0_HYPH_0: 'keywords',
          type0_HYPH_0_HYPH_0: 'anywords',
          value0_HYPH_0_HYPH_0: 'crash topcrash',
          field0_HYPH_1_HYPH_0: 'cf_blocking_20',
          type0_HYPH_1_HYPH_0: 'substring',
          value0_HYPH_1_HYPH_0: 'beta',
          field0_HYPH_1_HYPH_1: 'cf_blocking_20',
          type0_HYPH_1_HYPH_1: 'substring',
          value0_HYPH_1_HYPH_1: 'final',
          resolution: '---'
        };
        return addUserAssignedQuery(a, 2, usernames);
      }
    };
  };
  exports.security = function(usernames) {
    return {
      id: 'security',
      name: 'Security',
      requires_user: false,
      args: function() {
        var a = {
          field0_HYPH_0_HYPH_0: 'component',
          type0_HYPH_0_HYPH_1: 'allwordssubstr',
          field0_HYPH_0_HYPH_1: 'status_whiteboard',
          resolution: '---',
          value0_HYPH_0_HYPH_1: '[sg:',
          type0_HYPH_0_HYPH_0: 'equals',
          value0_HYPH_0_HYPH_0: 'Security'
        };
        return addUserAssignedQuery(a, 1, usernames);
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
          changed_field: 'resolution',
          changed_field_to: 'FIXED',
          changed_before: 'Now',
          changed_after: require("date-utils").timeAgo(MS_PER_DAY * 30),
          field0_HYPH_0_HYPH_0: 'cf_blocking_20',
          type0_HYPH_0_HYPH_1: 'substring',
          value0_HYPH_0_HYPH_1: 'beta',
          type0_HYPH_0_HYPH_0: 'substring',
          field0_HYPH_0_HYPH_1: 'cf_blocking_20',
          value0_HYPH_0_HYPH_0: 'final',
          resolution: 'FIXED'
        };
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
          resolution: 'FIXED'
        };
        return addUserAssignedQuery(a, 2, usernames);
      }
    };
  };
};
