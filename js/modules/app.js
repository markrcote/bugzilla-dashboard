const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY =  MS_PER_HOUR * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

Require.modules["app/teams"] = function(exports, require) {
  exports.get = function get() {
    return require("teams").get();
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
  var who = {
    user: "",
    group: ""
  };

  exports.get = function get() {
    return who;
  }

  exports.whenChanged = function whenChanged(cb) {
    callbacks.push(cb);
  };

  exports.set = function set(username, groupname) {
    who.user = username;
    who.group = groupname;

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
    if ((newUsername && newUsername != "") &&
        (!newPassword || newPassword == "") &&
        (passwordProvider))
      newPassword = passwordProvider(newUsername);

    if ((newUsername && newUsername == username) &&
        (newPassword && newPassword == password))
      return;

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
    delay: 100,
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

  function groupnameFromHash(location) {
    if (location.hash) {
      var match = location.hash.match(/#groupname=(.*)/);
      if (match)
        return unescape(match[1]);
    }
    return "";
  }

  function setWhoFromHash(location) {
      var user = usernameFromHash(location);
      var group = groupnameFromHash(location);
      require("app/who").set(user, group);
  }

  exports.usernameToHash = function usernameToHash(username) {
    return "#username=" + escape(username);
  };
  
  exports.groupnameToHash = function groupnameToHash(groupname) {
    return "#groupname=" + escape(groupname);
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

  function translateTerms(args) {
    var newTerms = {};
    for (name in args)
      newTerms[name.replace(/_DOT_/g, ".").replace(/_HYPH_/g, "-")] = args[name];
    return newTerms;
  }

  function getUserStat(cacheid, usernames, isAuthenticated, forceUpdate, query, getUserStatCb) {
    if (!forceUpdate) {
      var cacheKey = cacheid + "_" + (isAuthenticated ? "PRIVATE" : "PUBLIC") + "/" + query.id;
      if (cache.haskey(cacheKey)) {
        var cached = cache.get(cacheKey);
        getUserStatCb(usernames, query, cached);
        return;
      }
    }

    var newTerms = translateTerms(query.args());

    xhrQueue.enqueue(
      function() {
        return bugzilla.count(
          newTerms,
          function(response) {
            cache.set(cacheKey, response.data);
            getUserStatCb(usernames, query, response.data);
          });
      });
  }

  function quickstats(cacheid, usernames, isAuthenticated, forceUpdate, query, quickStatsCb) {
    getUserStat(cacheid, usernames, isAuthenticated, forceUpdate, query,
      function(usernames, query, value) {
        quickStatsCb(usernames, query, value);
      }
    );
  }

  function displayQuickstats(selector, cacheid, usernames, isAuthenticated, forceUpdate, query, quickStatsCb) {
    var entry = $("#templates .statsentry").clone();
    entry.click(function() { window.open(bugzilla.uiQueryUrl(translateTerms(query.args()))); });
    entry.addClass("pagelink");
    entry.find(".name").text(query.name);
    entry.find(".value").text("...");
    selector.append(entry);

    entry.find(".value").addClass("loading");

    quickstats(cacheid, usernames, isAuthenticated, forceUpdate, query,
      function(username, query, value) {
        showStats($(entry), value);
        if (quickStatsCb)
          quickStatsCb(username, query, value);
        entry.find(".value").removeClass("loading");
      }
    );
  }

  function allQuickStats(selector, username, isAuthenticated, forceUpdate) {
    // for just one user (or no user)
    for (q in require("queries")) {
      var query = require("queries")[q]([username]);
      if (query.requires_user && !username)
        continue;
      displayQuickstats(selector, username, [username], isAuthenticated, forceUpdate, query);
    }
  }

  function displayIndicators(indicatorPanel, indicatorList) {
    var count = 0;
    var indicatorRow = null;

    for (l in indicatorList) {
      if (count++ % 7 == 0) {
        indicatorRow = $("#templates .indicator-row").clone();
        indicatorPanel.append(indicatorRow);
      }
      var indicatorBox = $("#templates .indicator-box").clone();
      var indicatorLink = indicatorBox.find(".indicatorlink");
      indicatorLink.text(indicatorList[l].text);
      indicatorLink.attr("href", indicatorList[l].link);
      indicatorLink.attr("title", indicatorList[l].tip);
      indicatorLink.tipsy({live: true});
      // tipsy seems to hang around after we click on a link, so we have to remove it manually.
      indicatorLink.click(function() { $.data(this, 'active.tipsy').remove(); return true; });
      indicatorBox.addClass("pagelink");
      indicatorRow.append(indicatorBox);
    }
  }
  
  function teamStats(selector, teamId, team, isAuthenticated, forceUpdate, includeMembers) {
    var teamEntry = $("#templates .report").clone();
    teamEntry.find(".name").text(team.name);
    var stats = teamEntry.find(".stats");
    selector.append(teamEntry);
    
    for (q in require("queries")) {
      var member_emails = require("teams").getMembers(team).map(function(x) { return x[1]; });
      var query = require("queries")[q](member_emails);
      displayQuickstats(stats, teamId, member_emails, isAuthenticated, forceUpdate, query);
    }

    var indicatorPanel = teamEntry.find(".indicator-panel");
    
    if ("teams" in team) {
      var indicators = [];
      for (t in team.teams)
        indicators.push({
          text: team.teams[t].short_form,
          tip: team.teams[t].name,
          link: require("app/ui/hash").groupnameToHash(teamId + "/teams/" + t)
        });
      displayIndicators(indicatorPanel, indicators);
    }

    if ("members" in team) {
      var indicators = [];
      for (m in team.members)
        indicators.push({
          text: require("teams").memberShortName(team.members[m][0]),
          tip: team.members[m][0],
          link: require("app/ui/hash").usernameToHash(teamId + "/members/" + m)
        });
      displayIndicators(indicatorPanel, indicators);
    }
  }

  function teamList(selector, isAuthenticated, forceUpdate) {
    var teams = require("app/teams").get();
    for (t in teams) {
      teamStats(selector, t, teams[t], isAuthenticated, forceUpdate, false);
    }
  }

  function userStats(selector, username, user, isAuthenticated, forceUpdate) {
    if (username) {
      var report = $("#templates .report").clone();
      report.find(".name").text(user[0]);
      var stats = report.find(".stats");
      selector.append(report);
      xhrQueue.enqueue(
        function() {
          return bugzilla.user(
            user[1],
            function(response) {
              allQuickStats(stats, user[1], isAuthenticated, forceUpdate);
            },
            function(response) {
              stats.text("No such user exists!");
            });
        });
    } else {
      //allQuickStats(selector, username, isAuthenticated, forceUpdate);
      teamList(selector, isAuthenticated, forceUpdate);
    }
  }

  function update(who, isAuthenticated, forceUpdate) {
    xhrQueue.clear();
    var container = $("#reports").find(".container");

    container.html("");

    if (who.group)
      teamStats(container, who.group, require("teams").getByKey(who.group), isAuthenticated, forceUpdate, false);
    else
      userStats(container, who.user, require("teams").getByKey(who.user), isAuthenticated, forceUpdate);
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
      require("app/login").set("", "");
      var who = require("app/who").get();
      update(who, false, true);
    }
  };

  var myStatsCommand = {
    name: "mystats",
    execute: function execute() {
      var user = require("app/login").get();
      var url = require("app/ui/hash").usernameToHash(user.username);
      window.open(url);
    }
  };
  
  var topCommand = {
    name: "top-page",
    execute: function execute() {
      window.open("#");  
    }
  };

  exports.init = function init() {
    require("app/commands").register(refreshCommand);
    require("app/commands").register(logoutCommand);
    require("app/commands").register(myStatsCommand);
    require("app/commands").register(topCommand);
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
