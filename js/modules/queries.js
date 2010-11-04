Require.modules["queries"] = function(exports, require) {

  /*
   Most of the work is done through REST, but we're using the CGI
   field names because we want to be able to generate links to
   the Bugzilla site, and there is no mechanism to translate the
   field names (aside from what the REST API does automatically).
  
   If, for whatever reason, support for the CGI field names is
   dropped from the REST API, this will have to change, possibly
   into two separate URLs for each query.
  */
  
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

  function searchReviews(review_field, query_results, response) {
    for (b in response.bugs) {
      for (a in response.bugs[b].attachments) {
        for (f in response.bugs[b].attachments[a].flags) {
          if (response.bugs[b].attachments[a].flags[f].name.indexOf("review") != -1 &&
              response.bugs[b].attachments[a].flags[f].status == "?") {
            var reviewValue = response.bugs[b].attachments[a].flags[f][review_field].name;
            if (!reviewValue)
              continue;
            for (u in query_results) {
              if (u.slice(0, reviewValue.length) == reviewValue) {
                query_results[u]++;
                break;
              }
            }
          }
        }
      }
    }
  }

  exports.open_blockers = function() {
    return {
      id: 'open_blockers',
      name: 'Open blockers',
      short_form: "+'s",
      requires_user: false,
      username_field: "assigned_to",
      args: function(usernames) {
        var a = {
          resolution: '---'
        };
        a = addBlockerQuery(a, 0);
        return addUserAssignedQuery(a, 1, usernames);
      }
    };
  };

  /*
  exports.open_noms = function() {
    return {
      id: 'open_noms',
      name: 'Blocker nominations',
      requires_user: false,
      threshold: [50, 25],
      username_field: "assigned_to",
      args: function(usernames) {
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
  */

  exports.regressions = function() {
    return {
      id: 'regressions',
      name: 'Open regression blockers',
      short_form: "Reg",
      requires_user: false,
      username_field: "assigned_to",
      args: function(usernames) {
        var a = {
          resolution: '---',
          field0_HYPH_0_HYPH_0: 'keywords',
          type0_HYPH_0_HYPH_0: 'substring',
          value0_HYPH_0_HYPH_0: 'regression'
        };
        a = addBlockerQuery(a, 1);
        return addUserAssignedQuery(a, 2, usernames);
      }
    };
  };

  exports.patches_awaiting_review = function() {
    return {
      id: 'patches_awaiting_review',
      name: 'Patches awaiting review',
      short_form: "P",
      requires_user: true,
      include_fields: "attachments",
      args: function(usernames) {
        // username is mandatory
        var a = {
          resolution: "---",
          type0_HYPH_0_HYPH_0: "substring",
          field0_HYPH_0_HYPH_0: "flagtypes.name",
          value0_HYPH_0_HYPH_0: "review?"
        };
        return addUserQuery("setters.login_name", "substring", a, 1, usernames);
      },
      get_values: function(query_results, response) {
        searchReviews("setter", query_results, response);
      }
    };
  };

  exports.review_queue = function() {
    return {
      id: 'review_queue',
      name: 'Review queue',
      short_form: "RQ",
      requires_user: true,
      threshold: [15, 8],
      include_fields: "attachments",
      args: function(usernames) {
        var a = {
          resolution: "---"
        };
        // REST API is flag.requestee
        return addUserQuery("requestees.login_name", "equals", a, 0, usernames);
      },
      get_values: function(query_results, response) {
        searchReviews("requestee", query_results, response);
      }
    };
  };

  exports.crashers = function() {
    return {
      id: 'crashers',
      name: 'Crasher blockers',
      short_form: "Crash",
      requires_user: false,
      username_field: "assigned_to",
      args: function(usernames) {
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

  exports.security = function() {
    return {
      id: 'security',
      name: 'Security blockers',
      short_form: "sg",
      requires_user: false,
      username_field: "assigned_to",
      args: function(usernames) {
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

  exports.blockers_fixed_30_days = function() {
    return {
      id: 'blockers_fixed_30_days',
      name: 'Blockers fixed in the last 30 days',
      short_form: "+'s -30d",
      requires_user: false,
      username_field: "assigned_to",
      args: function(usernames) {
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

  exports.nonblockers_fixed_30_days = function() {
    return {
      id: 'nonblockers_fixed_30_days',
      name: 'Nonblockers fixed in the last 30 days',
      short_form: "Non-+ -30d",
      requires_user: false,
      username_field: "assigned_to",
      args: function(usernames) {
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
          value0_HYPH_1_HYPH_0: 'beta'
        };
        return addUserAssignedQuery(a, 2, usernames);
      }
    };
  };
};
