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

  function QueryRunner(cacheid, forceUpdate, usernames, queryInitCb, queryDoneCb, allDoneCb) {
    this.usernames = usernames;
    this.queryInitCb = queryInitCb;
    this.queryDoneCb = queryDoneCb;
    this.allDoneCb = allDoneCb;
    this.queryCount = 0;
    
    this.queryDone = function(usernames, query, value) {
      this.queryDoneCb(usernames, query, value);
      if (--this.queryCount == 0)
        this.allDoneCb();
    }
    
    var queries = [];
    
    for (q in require("queries")) {
      var query = require("queries")[q](usernames);
      if (query.requires_user && !usernames)
        continue;
      queries.push(query);
      ++this.queryCount;
    }
    var self = this;
    for (q in queries) {
      queryInitCb(queries[q]);
      var cacheKey = cacheid + queries[q].id;
      getStat(cacheKey, usernames, forceUpdate, queries[q],
          function(usernames, query, value) {
            self.queryDone(usernames, query, value);
          }
        );
    }
  }
  
  function Report(id, name) {
    this.id = id;
    this.name = name;
    this.query_count = 0;
    
    this.query_done = function () {
      if (--this.query_count == 0)
        this.name_entry.removeClass("loading");
    }

    this.setupReportDisplay = function (selector) {
      this.entry = $("#templates .report").clone();
      this.name_entry = this.entry.find(".name")
      this.name_entry.text(this.name);
      this.name_entry.addClass("loading");
      this.stats = this.entry.find(".stats");
      selector.append(this.entry);
    }

    this.cleanId = function(id) {
      return id.replace(/@/g, "").replace(/\./g, "").replace(/_/g, "").replace(/\//g, "");
    }
    
    this.queryInitCb = function (query) {
      var entry = $("#templates .statsentry").clone();
      entry.click(function() { window.open(bugzilla.uiQueryUrl(translateTerms(query.args()))); });
      entry.attr("id", this.cleanId(this.id + query.id));
      entry.addClass("pagelink");
      entry.find(".name").text(query.name);
      entry.find(".value").text("...");
      this.stats.append(entry);
    }
    
    this.queryDoneCb = function (usernames, query, value) {
      $("#" + this.cleanId(this.id + query.id)).find(".value").text(value);
    }
    
    this.allDoneCb = function () {
      this.name_entry.removeClass("loading");
    }
    
    this.displayQueries = function (selector, isAuthenticated, forceUpdate) {
      this.selector = selector;
      var self = this;
      this.QueryRunner = new QueryRunner(this.id + "_" + (isAuthenticated ? "PRIVATE" : "PUBLIC") + "/",
          forceUpdate, this.usernames(),
          function(query) { self.queryInitCb(query); },
          function(usernames, query, value) { self.queryDoneCb(usernames, query, value); },
          function() { self.allDoneCb(); });
    }
  }
  
  function TeamReport(teamId, team) {
    Report.call(this, teamId, team.name);
    this.team = team;
    
    this.usernames = function () {
      return require("teams").getMembers(this.team).map(function(x) { return x[1]; });
    }
    
    this.update = function (selector, isAuthenticated, forceUpdate) {
      this.setupReportDisplay(selector);
      this.displayQueries(selector, isAuthenticated, forceUpdate);
      var indicatorPanel = this.entry.find(".indicator-panel");
      
      if ("teams" in this.team) {
        var indicators = [];
        for (t in this.team.teams)
          indicators.push({
            text: this.team.teams[t].short_form,
            tip: this.team.teams[t].name,
            link: require("app/ui/hash").groupnameToHash(this.id + "/teams/" + t)
          });
        displayIndicators(indicatorPanel, indicators);
      }
  
      if ("members" in this.team) {
        var indicators = [];
        for (m in this.team.members)
          indicators.push({
            text: require("teams").memberShortName(this.team.members[m][0]),
            tip: this.team.members[m][0],
            link: require("app/ui/hash").usernameToHash(this.id + "/members/" + m)
          });
        displayIndicators(indicatorPanel, indicators);
      }
    }
  }
  TeamReport.prototype = new Report;

  function UserReport(user) {
    Report.call(this, user[1], user[0]);
    
    this.usernames = function () {
      return [this.id];
    }

    this.update = function (selector, isAuthenticated, forceUpdate) {
      this.setupReportDisplay(selector);
      var self = this;
      xhrQueue.enqueue(
        function() {
          return bugzilla.user(
            self.id,
            function(response) {
              self.displayQueries(selector, isAuthenticated, forceUpdate);
            },
            function(response) {
              self.stats.text("No such user exists!");
            });
        });
    }
  }
  UserReport.prototype = new Report;
  
  function translateTerms(args) {
    var newTerms = {};
    for (name in args)
      newTerms[name.replace(/_DOT_/g, ".").replace(/_HYPH_/g, "-")] = args[name];
    return newTerms;
  }

  function getStat(cacheKey, usernames, forceUpdate, query, getStatCb) {
    if (!forceUpdate) {
      if (cache.haskey(cacheKey)) {
        var cached = cache.get(cacheKey);
        getStatCb(usernames, query, cached);
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
            getStatCb(usernames, query, response.data);
          });
      });
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

  var teamReports = [];
  var userReports = [];
  
  function teamList(selector, isAuthenticated, forceUpdate) {
    var teams = require("app/teams").get();
    teamReports = [];
    for (t in teams) {
      var report = new TeamReport(t, teams[t]);
      teamReports.push(report);
      report.update(selector, isAuthenticated, forceUpdate);
    }
  }

  function update(who, isAuthenticated, forceUpdate) {
    xhrQueue.clear();
    var container = $("#reports").find(".container");

    container.html("");

    if (who.group) {
      teamReports = [];
      var report = new TeamReport(who.group, require("teams").getByKey(who.group));
      teamReports.push(report);
      report.update(container, isAuthenticated, forceUpdate);
    } else if (who.user) {
      userReports = [];
      var report = new UserReport(require("teams").getByKey(who.user));
      userReports.push(report);
      report.update(container, isAuthenticated, forceUpdate);
    } else
      teamList(container, isAuthenticated, forceUpdate);
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
