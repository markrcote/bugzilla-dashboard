const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY =  MS_PER_HOUR * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

Require.modules["app/teams"] = function(exports) {
  var teams = {
    ateam: {
      name: "Tools and Automation",
      members: [
        "mcote@mozilla.com",
        "ctalbert@mozilla.com",
        "fayearthur+bugs@gmail.com",
        "jhammel@mozilla.com",
        "jgriffin@mozilla.com"
      ]
    }
  };

  exports.get = function get() {
    return teams;
  };
};

Require.modules["app/queries"] = function(exports, require) {
  exports.open_blockers = function(username) {
    return {
      id: 'open_blockers',
      name: 'Open blockers',
      requires_user: false,
      args: function() {
        var a = {
          field0_HYPH_0_HYPH_0: 'cf_blocking_20',
          type0_HYPH_0_HYPH_1: 'substring',
          field0_HYPH_0_HYPH_1: 'cf_blocking_20',
          resolution: '---',
          value0_HYPH_0_HYPH_1: 'final',
          type0_HYPH_0_HYPH_0: 'substring',
          value0_HYPH_0_HYPH_0: 'beta'
        };
        if (username) {
          a.email1 = username;
          a.email1_type = "equals";
          a.email1_assigned_to = 1;
        }
        return a;
      }
    };
  };
  exports.open_noms = function(username) {
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
        if (username) {
          a.email1 = username;
          a.email1_type = "equals";
          a.email1_assigned_to = 1;
        }
        return a;
      }
    };
  };
  exports.reviews = function(username) {
    return {
      id: 'reviews',
      name: 'Requested reviews',
      requires_user: true,
      args: function() {
        // username is mandatory
        return {
          status: ["NEW", "UNCONFIRMED", "ASSIGNED", "REOPENED"],
          flag_DOT_requestee: username
        };
      }
    };
  };
  exports.crashers = function(username) {
    return {
      id: 'crashers',
      name: 'Crashers',
      requires_user: false,
      args: function() {
        var a = {
          field0_HYPH_0_HYPH_0: 'keywords',
          type0_HYPH_0_HYPH_0: 'anywords',
          value0_HYPH_0_HYPH_0: 'crash topcrash'
        };
        if (username) {
          a.email1 = username;
          a.email1_type = "equals";
          a.email1_assigned_to = 1;
        }
        return a;
      }
    };
  };
  exports.security = function(username) {
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
        if (username) {
          a.email1 = username;
          a.email1_type = "equals";
          a.email1_assigned_to = 1;
        }
        return a;
      }
    };
  };
  exports.blockers_fixed_30_days = function(username) {
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
        if (username) {
          a.email1 = username;
          a.email1_type = "equals";
          a.email1_assigned_to = 1;
        }
        return a;
      }
    };
  };
  exports.nonblockers_fixed_30_days = function(username) {
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
        if (username) {
          a.email1 = username;
          a.email1_type = "equals";
          a.email1_assigned_to = 1;
        }
        return a;
      }
    };
  };
};

Require.modules["app/loader"] = function(exports, require) {
  exports.init = function init(moduleExports, options) {
    var cache;
    if ("cache" in options)
      cache = options.cache;
    else 
      cache = require("cache/html5").create(
        "bugzilla-dashboard-cache",
        options.window.sessionStorage
      );

    var bugzilla = require("app/bugzilla-auth").create(options.Bugzilla);

    moduleExports.bugzilla = bugzilla;
    moduleExports.cache = cache;
    moduleExports.window = options.window;
    moduleExports.jQuery = options.jQuery;

    require("app/ui").init(options.window.document);
    require("app/login").init();
  };
};

Require.modules["app/who"] = function(exports, require) {
  var callbacks = [];
  var who = "";

  exports.get = function get() {
    return who;
  }

  exports.whenChanged = function whenChanged(cb) {
    callbacks.push(cb);
  };

  exports.set = function set(username) {
    who = username;
    //console.log('who is now ' + who);

    callbacks.forEach(function(cb) { cb(who); });
  }
};

Require.modules["app/login"] = function(exports, require) {
  var callbacks = [];
  var username;
  var password;
  var passwordProvider;
  var cache = require("cache");

  exports.setPasswordProvider = function setPasswordProvider(pp) {
    passwordProvider = pp;
  };

  exports.whenChanged = function whenChanged(cb) {
    callbacks.push(cb);
  };

  exports.get = function get() {
    if (username === undefined)
      username = "";
    if (password === undefined)
      password = "";
    var isLoggedIn = (username && username != "");
    var isAuthenticated = (isLoggedIn && password && password != "");

    return {
      username: username,
      password: password,
      isLoggedIn: isLoggedIn,
      isAuthenticated: isAuthenticated
    };
  };

  exports.set = function set(newUsername, newPassword) {
    //console.log("app/login/set: " + newUsername + " " + newPassword);
    //console.log("current info:");
    //console.dir(exports.get());
    if ((newUsername && newUsername != "") &&
        (!newPassword || newPassword == "") &&
        (passwordProvider))
      newPassword = passwordProvider(newUsername);

    if ((newUsername && newUsername == username) &&
        (newPassword && newPassword == password))
    {
      //console.log("same username and password");
      return;
    }

    username = newUsername;
    password = newPassword;

    cache.set('username', username);
    cache.set('password', password);

    $("#username").text(username);

    var info = exports.get();

    callbacks.forEach(function(cb) { cb(info); });
  };
  
  exports.init = function init() {
    var cachedUsername = cache.get("username");
    var cachedPassword = cache.get("password");
    //console.log("cached username: " + cachedUsername);
    //console.log("cached password: " + cachedPassword);
    exports.set(cachedUsername, cachedPassword);
  }
};

Require.modules["app/errors"] = function(exports, require) {
  var $ = require("jQuery");

  var errors = $("#errors");
  var messages = $("#templates .errors");
  var lastError = null;

  exports.log = function log(name) {
    var message = messages.find("." + name);
    if (!message.length) {
      exports.log("unknown-error");
      return;
    }
    if (lastError == message.get(0))
      return;
    lastError = message.get(0);

    message = message.clone();
    errors.append(message);
    if (errors.children().length == 1)
      errors.fadeIn();
    else
      message.fadeIn();
  };
};

Require.modules["app/bugzilla-auth"] = function(exports, require) {
  function onError(event) {
    var xhr = event.target;
    require("app/errors").log("bugzilla-api-error");
  }

  function onLoad(event) {
    var xhr = event.target;
    var response = JSON.parse(xhr.responseText);
    if (response.error)
    {
      //console.log('error!');
      //console.dir(response);
      if (response.code == 300) {
        require("app/errors").log("bugzilla-auth-error");
      } else {
        require("app/errors").log("bugzilla-api-error");
      }
    }
  }

  exports.create = function(Bugzilla) {
    function AuthenticatedBugzilla() {
      this.ajax = function ajax(options) {
        var user = require("app/login").get();

        if (user.isAuthenticated) {
          if (!options.data)
            options.data = {};
          options.data.username = user.username;
          options.data.password = user.password;
        }

        var xhr = Bugzilla.ajax.call(this, options);

        xhr.addEventListener("load", onLoad, false);
        xhr.addEventListener("error", onError, false);

        return xhr;
      };
    }

    AuthenticatedBugzilla.prototype = Bugzilla;

    return new AuthenticatedBugzilla();
  };
};

Require.modules["app/commands"] = function(exports, require) {
  var commands = {};

  exports.get = function get(name) {
    if (!(name in commands))
      throw new Error("command not found: " + name);
    return commands[name];
  };

  exports.register = function(options) {
    if (options.name in commands)
      throw new Error("command already registered: " + options.name);
    commands[options.name] = options;
  };
};

Require.modules["app/ui/login-form"] = function(exports, require) {
  var $ = require("jQuery");
  var cachedUsername = $("#login .username").val();
  var cachedPassword = $("#login .password").val();

  $("#login form").submit(
    function(event) {
      event.preventDefault();
      require("app/login").set($("#login .username").val(),
                               $("#login .password").val());
      $("#login").fadeOut();
    });

  require("app/login").whenChanged(
    function maybeChangeUsernameField(user) {
      var usernameField = $("#login .username");
      if (user.isLoggedIn && usernameField.val() != user.username)
        usernameField.val(user.username);
    });

  require("app/login").setPasswordProvider(
    function maybeGetCachedPasswordFromForm(username) {
      if (cachedUsername == username)
        return cachedPassword;
      return "";
    });

  exports.init = function init() {
  };
};

Require.modules["app/ui/repair"] = function(exports, require) {
  var $ = require("jQuery");

  $("#repair form").submit(
    function() {
      var phrase = $("#repair .phrase").val();
      var response;
      if (phrase == "repair my dashboard") {
        require("cache").clear();
        response = $("#templates .repair-success").clone();
      } else
        response = $("#templates .repair-failure").clone();
      $("#repair .result").empty().append(response);
      $("#repair .result").hide().slideDown();
    });

  exports.init = function init() {
  };
};

Require.modules["app/ui/find-user"] = function(exports, require) {
  var $ = require("jQuery");
  var bugzilla = require("bugzilla");
  var window = require("window");
  var currReq;

  var options = {
    minLength: 2,
    delay: 1000,
    source: function(request, response) {
      if (!require("app/login").get().isAuthenticated)
        return;
      function success(result) {
        currReq = null;
        var suggs = [];
        result.users.forEach(
          function(user) {
            suggs.push({label: user.real_name + " (" + user.name + ")",
                        value: user.name});
          });
        response(suggs);
      }
      if (currReq)
        currReq.abort();
      currReq = bugzilla.ajax({url: "/user",
                               data: {match: request.term},
                               success: success});
    }
  };

  $("#find-user .query").autocomplete(options);
    
  $("#find-user form").submit(
    function(event) {
      event.preventDefault();
      var username = $("#find-user .query").val();
      var url = require("app/ui/hash").usernameToHash(username);
      window.open(url);
    });

  exports.init = function init() {
  };
};

Require.modules["app/ui"] = function(exports, require) {
  var $ = require("jQuery");

  require("app/login").whenChanged(
    function changeUI(user) {
      var show = {
        "no-login": false,
        "login": false,
        "auth-login": false,
        "no-auth": false,
        "no-auth-login": false
      };

      //console.log("app/login/whenChanged/changeUI called");
      //console.log("username: " + user.username);
      //console.log("user.isLoggedIn: " + user.isLoggedIn);
      //console.log("user.isAuthenticated: " + user.isAuthenticated);

      if (user.isLoggedIn) {
        show["login"] = true;
        if (user.isAuthenticated)
          show["auth-login"] = true;
        else {
          show["no-auth"] = true;
          show["no-auth-login"] = true;
        } 
      } else {
        show["no-login"] = true;
        show["no-auth"] = true;
      }

      for (classSuffix in show) {
        var query = $(".requires-" + classSuffix);
        if (show[classSuffix])
          query.show();
        else
          query.hide();
      }
    });

  $("#header .menu li").click(
    function onMenuItemClick(event) {
      if (this.hasAttribute("data-command")) {
        var cmdName = this.getAttribute("data-command");
        require("app/commands").get(cmdName).execute();
      } else
        openDialog(this.getAttribute("data-dialog"));
    });

  // FIXME: Set up clickable (drill-down) commands

  $(".dialog").click(
    function dismissDialogOnOutsideClick(event) {
      if (event.target == this)
        $(this).fadeOut();
    });

  function dismissDialogOnEscape(event) {
    if (event.keyCode == 27)
      $(this).fadeOut();
  }

  // For Safari.
  $(".dialog").keyup(dismissDialogOnEscape);
  // For Firefox.
  $(".dialog").keypress(dismissDialogOnEscape);

  function setupDocumentTitleChanger(document) {
    const BASE_TITLE = document.title;

    require("app/who").whenChanged(
      function changeTitle(username) {
        var title = BASE_TITLE;

        if (username)
          title = username + "'s " + BASE_TITLE;

        if (document.title != title) {
          document.title = title;
          $("#header .title").text(title);
        }
      });
  };

  function openDialog(name) {
    var dialog = $("#" + name);
    if (dialog.length == 0)
      throw new Error("dialog not found: " + name);
    dialog.fadeIn(
      function() {
        dialog.find("input:first").focus();
      });
  };

  exports.init = function init(document) {
    setupDocumentTitleChanger(document);

    require("app/ui/repair").init();
    require("app/ui/dashboard").init();
    require("app/ui/login-form").init();
    require("app/ui/find-user").init();
    require("app/ui/hash").init(document);

    //if (!require("app/login").get().isLoggedIn)
    //  openDialog("login");
  };
};

Require.modules["app/ui/hash"] = function(exports, require) {
  function usernameFromHash(location) {
    if (location.hash) {
      var match = location.hash.match(/#username=(.*)/);
      if (match)
        return unescape(match[1]);
    }
    return "";
  }

  function setWhoFromHash(location) {
      var who = usernameFromHash(location);
      require("app/who").set(who);
  }

  exports.usernameToHash = function usernameToHash(username) {
    return "#username=" + escape(username);
  };

  exports.init = function init(document) {
    require("app/login").whenChanged(
      function(user) {
      /*
        if (user.isLoggedIn) {
          var hash = exports.usernameToHash(user.username);
          if (document.location.hash != hash)
            document.location.hash = hash;
        } else
          document.location.hash = "";
      */
      });

    var window = document.defaultView;

    function onHashChange() {
      setWhoFromHash(document.location);
    }

    if ("onhashchange" in window)
      window.addEventListener("hashchange", onHashChange, false);
    else
      window.setInterval(onHashChange, 1000);

    onHashChange();
  };
};

Require.modules["app/ui/dashboard"] = function(exports, require) {
  var $ = require("jQuery");
  var cache = require("cache");
  var dateUtils = require("date-utils");
  var bugzilla = require("bugzilla");
  var window = require("window");
  var xhrQueue = require("xhr/queue").create();

  function sortByLastChanged(bugs) {
    var lctimes = {};

    bugs.forEach(
      function(bug) {
        lctimes[bug.id] = dateUtils.dateFromISO8601(bug.last_change_time);
      });

    function compare(a, b) {
      var alc = lctimes[a.id];
      var blc = lctimes[b.id];

      if (alc < blc)
        return -1;
      if (alc > blc)
        return 1;
      return 0;
    }

    bugs.sort(compare);
  }

  function updatePrettyDates(query) {
    query.find(".last-changed").each(
      function() {
        var lcTime = $(this).attr("data-last-change");
        $(this).text(dateUtils.prettyDate(lcTime));
      });
  }

  const PRETTY_DATE_UPDATE_INTERVAL = 1000 * 60;

  window.setInterval(function() { updatePrettyDates($("#reports")); },
                     PRETTY_DATE_UPDATE_INTERVAL);

  const BUGS_TO_SHOW = 10;

  function showBugs(query, bugs) {
    var table = $("#templates .bugs").clone();
    var rowTemplate = table.find(".bug-row").remove();

    function appendRowForBug(bug) {
      var row = rowTemplate.clone();
      row.attr("id", "bug-id-" + bug.id);
      row.find(".summary").text(bug.summary);
      row.addClass("status-" + bug.status);
      if (bug.priority != "--") {
        row.addClass(bug.priority);
        row.addClass(bug.severity);
      }
      row.find(".last-changed").attr("data-last-change",
                                     bug.last_change_time);

      row.click(
        function onClick() {
          window.open(bugzilla.getShowBugURL(bug.id));
        });

      row.hover(
        function onIn() {
          var tooltip = $("#templates .bug-tooltip").clone();
          tooltip.find(".priority").text(bug.priority);
          // TODO: Show more information in tooltip.
          $(this).append(tooltip);
        },
        function onOut() {
          $(this).find(".bug-tooltip").remove();
        });
      
      table.append(row);
    }

    sortByLastChanged(bugs);
    bugs.reverse();

    var extraBugs = bugs.slice(BUGS_TO_SHOW);
    bugs = bugs.slice(0, BUGS_TO_SHOW);

    bugs.forEach(appendRowForBug);

    updatePrettyDates(table);
    query.find(".bugs").remove();
    query.find(".more-link").remove();
    query.append(table);

    if (extraBugs.length) {
      var moreLink = $("#templates .more-link").clone();
      moreLink.find(".number").text(extraBugs.length);
      moreLink.click(
        function() {
          moreLink.remove();
          extraBugs.forEach(appendRowForBug);
          updatePrettyDates(table);
          removeDuplicateBugs();
        });
      query.append(moreLink);
    }

    table.hide();
    removeDuplicateBugs();
    table.fadeIn();
  }

  // Remove duplicate bugs, preferring the first listing of a bug in
  // the DOM to later ones. This is b/c the reports further down the
  // page are the less "interesting" ones, and we want to capture
  // the most "interesting" part of each bug.
  function removeDuplicateBugs() {
    var visited = {};
    $("#reports .bug-row").each(
      function() {
        var id = $(this).attr("id");
        if (id in visited)
          $(this).remove();
        else
          visited[id] = true;
      });
  }

  function showStats(entry, bug_count) {
    entry.find(".value").text(bug_count);
  }
  
  function incrStats(entry, bug_count) {
    var totalCount = 0;
    var curCount = parseInt(entry.find(".value").text());
    if (isNaN(curCount))
      curCount = bug_count;
    else
      curCount += bug_count;
    entry.find(".value").text(curCount);
  }

  function getUserStat(username, isAuthenticated, forceUpdate, query, getUserStatCb) {
    var cacheKey = username + "_" + (isAuthenticated ? "PRIVATE" : "PUBLIC") + "/" + query.id;
    var cached = cache.get(cacheKey);
    //console.log("looking for cache for " + cacheKey);
    if (cached) {
      //console.log("got cache");
      getUserStatCb(username, query, cached);
      return;
    }
    //console.log("no cache");

    var newTerms = {};
    for (name in query.args())
      newTerms[name.replace(/_DOT_/g, ".").replace(/_HYPH_/g, "-")] = query.args()[name];

    xhrQueue.enqueue(
      function() {
        return bugzilla.count(
          newTerms,
          function(response) {
            cache.set(cacheKey, response.data);
            getUserStatCb(username, query, response.data);
          });
      });
  }

  function quickstats(selector, username, isAuthenticated, forceUpdate, query, quickStatsCb) {
    var entry = $("#templates .statsentry").clone();
    entry.find(".name").text(query.name);
    entry.find(".value").text("...");
    $(selector).append(entry);

    entry.find(".value").addClass("loading");

    getUserStat(username, isAuthenticated, forceUpdate, query,
      function(username, query, value) {
        showStats($(entry), value);
        if (quickStatsCb)
          quickStatsCb(username, query, value);
        entry.find(".value").removeClass("loading");
      }
    );
  }

  function allQuickStats(myUsername, isAuthenticated, forceUpdate) {
    for (q in require("app/queries")) {
      var query = require("app/queries")[q](myUsername);
      if (query.requires_user && !myUsername)
      {
        //console.log("skipping");
        continue;
      }
      quickstats("#quickstats", myUsername, isAuthenticated, forceUpdate, query);
    }
  }

  function teamStats(selector, teamId, isAuthenticated, forceUpdate) {
    var team = require("app/teams").get()[teamId];
    var teamEntry = $("#templates .teamentry").clone();
    teamEntry.find(".teamname").text(team.name);
    var table = teamEntry.find(".teamstatstable")
    var rowTemplate = table.find(".stats-row").remove();
    $(selector).append(teamEntry);
    
    var totalsRow = rowTemplate.clone();
    totalsRow.find(".name").text("Totals");
    var totalsStatsCell = totalsRow.find(".stats-cell");
    table.append(totalsRow);

    for (q in require("app/queries")) {
      var query = require("app/queries")[q]("");
      var entryId = "total" + query.id;
      var entry = $("#templates .statsentry").clone();
      entry.find(".name").text(query.name);
      entry.find(".value").text("0");
      entry.attr("id", entryId);
      totalsStatsCell.append(entry);
    }
    
    function statsCb(username, query, value) {
      console.log('statsCb called');
      var entryId = "total" + query.id;
      console.log("entryId: " + entryId);
      var entry = totalsStatsCell.find('#' + entryId);
      console.log('entry: ' + entry);
      incrStats(entry, value);
    }
    
    for (m in team.members) {
      var row = rowTemplate.clone();
      row.find(".name").text(team.members[m]);
      table.append(row);
      for (q in require("app/queries")) {
        var query = require("app/queries")[q](team.members[m]);
        quickstats(row.find(".stats-cell"), team.members[m], isAuthenticated, forceUpdate, query, statsCb);
      }
    }
  }

  function teamList() {
    //console.log("foo");
    //console.dir(require('app/teams'));
    var teams = require("app/teams").get();
    //console.log("bar")
    //console.dir(teams);
    var s = "";
    for (t in teams) {
      s += teams[t].name;
    }
    //console.log('moo');
    //console.log("s: " + s);
    $("#quickstats").text(s);
    //console.log('cow');
  }

  function update(myUsername, isAuthenticated, forceUpdate) {
    xhrQueue.clear();

    $("#quickstats").html("");
    
    teamStats("#quickstats", "ateam", isAuthenticated, forceUpdate);
    return;

    //console.log("who: [" + myUsername + "]");

    if (myUsername) {
      $("#quickstats").find("h2").addClass("loading");
      xhrQueue.enqueue(
        function() {
          return bugzilla.user(
            myUsername,
            function(response) {
              $("#quickstats").find("h2").removeClass("loading");
              allQuickStats(myUsername, isAuthenticated, forceUpdate);
            },
            function(response) {
              $("#quickstats").find("h2").removeClass("loading");
              $("#quickstats").text("No such user exists!");
            });
        });
    } else {
      allQuickStats(myUsername, isAuthenticated, forceUpdate);
    }


/*   
    report("#code-reviews", key, forceUpdate,
           {status: ["NEW", "UNCONFIRMED", "ASSIGNED", "REOPENED"],
            flag_DOT_requestee: myUsername});

    report("#assigned-bugs", key, forceUpdate,
           {status: ["NEW", "UNCONFIRMED", "ASSIGNED", "REOPENED"],
            email1: myUsername,
            email1_type: "equals",
            email1_assigned_to: 1});

    report("#reported-bugs", key, forceUpdate,
           {status: ["NEW", "UNCONFIRMED", "ASSIGNED", "REOPENED"],
            email1: myUsername,
            email1_type: "equals",
            email1_reporter: 1,
            email2: myUsername,
            email2_type: "not_equals",
            email2_assigned_to: 1});

    report("#cc-bugs", key, forceUpdate,
           {status: ["NEW", "UNCONFIRMED", "ASSIGNED", "REOPENED"],
            email1: myUsername,
            email1_type: "equals",
            email1_cc: 1,
            email2: myUsername,
            email2_type: "not_equals",
            email2_assigned_to: 1,
            email2_reporter: 1});

    report("#fixed-bugs", key, forceUpdate,
           {resolution: ["FIXED"],
            changed_after: dateUtils.timeAgo(MS_PER_WEEK),
            email1: myUsername,
            email1_type: "equals",
            email1_assigned_to: 1,
            email1_reporter: 1,
            email1_cc: 1});
*/
  };

  var refreshCommand = {
    name: "refresh-dashboard",
    execute: function execute() {
      var user = require("app/login").get();
      var who = require("app/who").get();
      update(who, user.isAuthenticated, true);
    }
  };
  
  var logoutCommand = {
    name: "logout",
    execute: function execute() {
      //console.log('foo');
      require("app/login").set("", "");
      //console.log('foo2');
      var who = require("app/who").get();
      update(who, false, true);
    }
  };

  var myStatsCommand = {
    name: "mystats",
    execute: function execute() {
      var user = require("app/login").get();
      require("app/who").set(user.username);
    }
  };

  exports.init = function init() {
    require("app/commands").register(refreshCommand);
    require("app/commands").register(logoutCommand);
    require("app/commands").register(myStatsCommand);
    require("app/who").whenChanged(
      function changeSearchCriteria(username) {
        var user = require("app/login").get();
        var who = require("app/who").get();
        update(who, user.isAuthenticated, false);
      });
    require("app/login").whenChanged(
      function changeUser(user) {
        var who = require("app/who").get();
        update(who, user.isAuthenticated, false);
      });
  };
};
