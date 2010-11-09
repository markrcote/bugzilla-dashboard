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
    require("app/errors").log("bugzilla-api-error");
  }

  function onLoad(response) {
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

        var xhrData = Bugzilla.ajax.call(this, options);
        xhrData.onLoad.push(onLoad);
        xhrData.onErr.push(onError);
        return xhrData;
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
  var isAuthenticated = false;  // set by update()
  
  var startTime;

  function QueryRunner(forceUpdate, usernames, queryInitCb, queryDoneCb, allDoneCb, queries) {
    // FIXME: Could probably split this into another object per query.
    this.usernames = usernames.slice(0);
    this.queryInitCb = queryInitCb;
    this.queryDoneCb = queryDoneCb;
    this.allDoneCb = allDoneCb;
    this.queryCount = 0;
    this.results = {};
    
    this.queryDone = function(usernames, query) {
      /*****
      for (u in this.results[query.id]) {
        var cacheKey = this.cacheId(u, query);
        cache.set(cacheKey, this.results[query.id][u]);
      }
      */
      cache.set(this.cacheId(usernames, query), this.results[query.id]);
      this.queryDoneCb(usernames, query, this.results);
      this.decQueryCount();
    }
    
    this.decQueryCount = function() {
      if (--this.queryCount == 0)
        this.allDoneCb(this.results);
    }

    this.cacheId = function(usernames, query) {
      return usernames.join("") + "_" + (isAuthenticated ? "PRIVATE" : "PUBLIC") + "/" + query.id;
    }
    
    this.parseResults = function(query, response) {
      this.results[query.id] = response.data;
      /*
      if ("get_values" in query)
        query.get_values(this.results[query.id], response);
      else {
        for (b in response.bugs) {
          var username = response.bugs[b][query.username_field]["name"];
          if (username) {
            for (u in this.results[query.id]) {
              if (u.slice(0, username.length) == username) {
                this.results[query.id][u]++;
                break;
              }
            }
          }
        }
      }*/
    }
    
    this.getStat = function(usernames, forceUpdate, query, getStatCb) {
      this.results[query.id] = 0;
      /**
      this.results[query.id] = {};
      for (u in usernames)
        this.results[query.id][usernames[u]] = 0;
      
      var uncachedUsernames = [];
      for (u in usernames) {
        var cacheKey = this.cacheId(usernames[u], query);
        if (!forceUpdate && cache.haskey(cacheKey)) {
          this.results[query.id][usernames[u]] = cache.get(this.cacheId(usernames[u], query));
        }
          uncachedUsernames.push(usernames[u]);
      }
      
      if (uncachedUsernames.length == 0) {
        this.queryDone(usernames, query);
        return;
      }
      **/
      
      if (usernames.length == 0) {
        this.queryDone(usernames, query);
        return;
      }

      if (!forceUpdate) {
        var cacheKey = this.cacheId(usernames, query);
        if (cache.haskey(cacheKey)) {
          this.results[query.id] = cache.get(cacheKey);
          this.queryDone(usernames, query);
          return;
        }
      }
      
      //var args = query.args(uncachedUsernames);
      //if ("include_fields" in query)
      //  args.include_fields = query.include_fields;
      var args = query.args(usernames);
      var newTerms = translateTerms(args);
      
      var priority = require("queries").DEFAULT_PRIORITY;
      if ("priority" in query)
        priority = query.priority;

      var self = this;
      xhrQueue.enqueue(
        function() {
          //return bugzilla.search(  XXXXXXXX
          return bugzilla.count(
          ///// XXXXX
            newTerms,
            function(response) {
              self.parseResults(query, response);
              self.queryDone(usernames, query);
            });
        }, priority);
    }
    
    if (!queries) {
      queries = [];
      for (q in require("queries").queries) {
        var query = require("queries").queries[q]();
        if (query.requires_user && !this.usernames)
          continue;
        queries.push(query);
      }
    }
    this.queryCount = queries.length;
    var self = this;
    for (q in queries) {
      this.queryInitCb(this.usernames, queries[q]);
      this.getStat(this.usernames, forceUpdate, queries[q],
          function(usernames, query, value) {
            self.queryDone(usernames, query, value);
          }
        );
    }
  }
  
  function IndicatorLoader(userIds, indicatorBox) {
    this.indicatorBox = indicatorBox;
    this.userIds = userIds.slice(0);
    this.warn = false;
    this.err = false;
    this.stats = {};
    
    this.queryInitCb = function (usernames, query) {
      this.stats[query.id] = $("#templates .indicator-stat").clone();
      this.stats[query.id].find(".name").text(query.short_form);
      this.stats[query.id].find(".value").text("...");
      this.indicatorBox.append(this.stats[query.id]);
    }
    
    this.queryDoneCb = function(usernames, query, results) {
      /***
      var total = 0;
      for (u in this.userIds)
        total += results[query.id][this.userIds[u]];
        */
      var total = results[query.id];
      this.stats[query.id].find(".value").text(total);
      if ("threshold" in query) {
        if (total > query.threshold[0] * this.userIds.length)
          this.err = true;
        else if (total > query.threshold[1] * this.userIds.length)
          this.warn = true;
      }
      this.setColour();
    }
    
    this.setColour = function() {
      var newClass = "";
      if (this.err)
        newClass = "indicatorErr";
      else if (this.warn)
        newClass = "indicatorWarn";
      else
        newClass = "indicatorOk";
      if (!this.indicatorBox.hasClass(newClass))
        this.indicatorBox.removeClass("indicatorLoading indicatorOk indicatorWarn indicatorErr").addClass(newClass);
    }
    
    this.go = function(forceUpdate) {
      var self = this;
      this.queryRunner = new QueryRunner(forceUpdate, this.userIds,
          function(usernames, query) { return self.queryInitCb(usernames, query); },
          function(usernames, query, value) { self.queryDoneCb(usernames, query, value); },
          function() { });
    }
  }
  
  function Report(id, name, detailed, topLevel) {
    this.id = id;
    this.name = name;
    this.detailed = detailed;
    this.topLevel = topLevel;
    
    this.parentTeam = function () {
      // In the form .../<superteam>/teams/<team>
      var paths = this.id.split("/");
      if (paths.length < 3 || paths.slice(-2, -1) != "teams")
        return "";
      return paths.slice(-3, -2);
    };
    
    this.displayedQueries = [ 
      { type: "group", name: "Blockers", members: [                       
        {type: "stat", name: "All", query: "open_blockers"},
        {type: "stat", name: "Security", query: "security"},
        {type: "stat", name: "Regressions", query: "regressions"},
        {type: "stat", name: "Crashers", query: "crashers"}] },
      { type: "group", name: "Fixed in Last 30 Days", members: [ 
        {type: "stat", name: "Blockers", query: "blockers_fixed_30_days"},
        {type: "stat", name: "NonBlockers", query: "nonblockers_fixed_30_days"} ] },
      { type: "stat", name: "Patches Awaiting Review", query: "patches_awaiting_review"},
      { type: "stat", name: "Review Queue", query: "review_queue"}
    ];
    
    this.setupReportDisplay = function (selector) {
      this.entry = $("#templates td.reportcell").clone();
      var reportbox = this.entry.find(".reportbox");
      
      this.name_entry = this.entry.find(".name")
      this.name_entry.text(this.name);
      this.name_entry.addClass("loading");
      this.stats = this.entry.find(".stats");
      if (this.topLevel) {
        var interimRelName = $("#templates .statsentry").clone();
        interimRelName.find(".name").text("Next Interim Release");
        interimRelName.find(".value").text(require("queries").NEXT_INTERIM_RELEASE);
        var productRelName = $("#templates .statsentry").clone();
        productRelName.find(".name").text("Next Product Release");
        productRelName.find(".value").text(require("queries").NEXT_PRODUCT_RELEASE);
        var sep = $("#templates .statsgroupsep").clone();
        this.stats.append(interimRelName);
        this.stats.append(productRelName);
        this.stats.append(sep);
      }
      selector.append(this.entry);
      if (this.detailed) {
        this.entry.attr("colspan", "0");
        this.details = $("#templates .reportdetails").clone();
        reportbox.find(".reportboxtable").append(this.details);
      }
    };

    this.cleanId = function(id) {
      return id.replace(/@/g, "").replace(/\./g, "").replace(/_/g, "").replace(/\//g, "");
    };
    
    this.queryDoneCb = function (usernames, query, results) {
      /***
      var total = 0;
      for (u in results[query.id])
        total += results[query.id][u];
      */
      var total = results[query.id];
      $("#" + this.cleanId(this.id + query.id)).find(".value").text(total);
    };
    
    this.allDoneCb = function() {
      this.name_entry.removeClass("loading");
      //var d = new Date();
      //console.log("Report " + this.name + " loaded in " + ((d.getTime() - startTime)/1000) + " s");
    };
    
    this.getIndent = function (indentLevel) {
      var indent = "";
      if (indentLevel) {
        for (var i = 0; i < indentLevel; i++)
          indent += "&nbsp;&nbsp;";
      }
      return indent;
    };
    
    this.displayEntry = function(selector, queries, entry, indentLevel) {
      switch (entry.type) {
        case "group": this.displayGroup(selector, queries, entry, indentLevel); break;
        case "stat": this.displayStat(selector, queries, entry, indentLevel); break;
      }
    };
    
    this.displayGroup = function (selector, queries, group, indentLevel) {
      if (indentLevel === undefined)
        indentLevel = 0;
      var indent = this.getIndent(indentLevel);
      var entry = $("#templates .statsgroupentry").clone();
      entry.find(".indent").html(indent);
      entry.find(".name").text(group.name);
      selector.append(entry);
      
      for (m in group.members)
        this.displayEntry(selector, queries, group.members[m], indentLevel+1);
    };
    
    this.displayStat = function (selector, queries, stat, indentLevel) {
      if (indentLevel === undefined)
        indentLevel = 0;
      var indent = this.getIndent(indentLevel);
      var entry = $("#templates .statsentry").clone();
      var query = require("queries").queries[stat.query]();
      queries.push(query);
      entry.find(".indent").html(indent);
      entry.click(function() { window.open(bugzilla.uiQueryUrl(translateTerms(query.args(this.usernames)))); });
      entry.attr("id", this.cleanId(this.id + query.id));
      entry.addClass("pagelink");
      entry.find(".name").text(stat.name);
      entry.find(".value").text("...");
      selector.append(entry);
    };
    
    this.displayQueries = function (selector, forceUpdate) {
      this.selector = selector;
      var self = this;
      var queries = [];
      var previousWasGroup = false; 
      
      for (i in this.displayedQueries) {
        if (previousWasGroup) {
          var sep = $("#templates .statsgroupsep").clone();
          this.stats.append(sep);
        }
        this.displayEntry(this.stats, queries, this.displayedQueries[i], 0, previousWasGroup);
        previousWasGroup = (this.displayedQueries[i].type == "group"); 
      }
      
      this.QueryRunner = new QueryRunner(
          forceUpdate, this.usernames(),
          function(usernames, query) { },
          function(usernames, query, value) { self.queryDoneCb(usernames, query, value); },
          function() { self.allDoneCb(); }, queries);
    };
  }
  
  function ToDoList(teamId) {
    this.teamId = teamId;
    
    $("#todo").fadeIn();    
  }
  
  function TeamReport(teamId, team, detailed, topLevel) {
    Report.call(this, teamId, team.name, detailed, topLevel);
    this.team = team;
    this.indicatorLoaders = [];
    this.detailed = detailed;
    
    this.usernames = function () {
      return require("teams").getMembers(this.team).map(function(x) { return x[1]; });
    };
    
    this.createToDo = function () {
      this.toDoList = new ToDoList(this.teamid);
    };
    
    this.update = function (selector, forceUpdate) {
      this.indicatorLoaders = [];
      this.setupReportDisplay(selector);
      if (this.singleTeamView)
        this.createToDo();
      this.name_entry.addClass("pagelink");
      var self = this;
      this.name_entry.click(function() { window.open(require("app/ui/hash").groupnameToHash(self.id)); });
      this.displayQueries(selector, forceUpdate);
      /*
      var indicatorPanel = this.entry.find(".indicator-panel");
      
      if ("teams" in this.team) {
        var indicators = [];
        for (t in this.team.teams)
          indicators.push({
            text: this.team.teams[t].short_form,
            tip: this.team.teams[t].name,
            link: require("app/ui/hash").groupnameToHash(this.id + "/teams/" + t),
            usernames: require("teams").getMembers(this.team.teams[t]).map(function(x) { return x[1]; })
          });
        this.displayIndicators(indicatorPanel, indicators);
      }
  
      if ("members" in this.team) {
        var indicators = [];
        for (m in this.team.members)
          indicators.push({
            text: require("teams").memberShortName(this.team.members[m][0]),
            tip: this.team.members[m][0],
            link: require("app/ui/hash").usernameToHash(this.id + "/members/" + m),
            usernames: [this.team.members[m][1]]
          });
        this.displayIndicators(indicatorPanel, indicators);
      }

      for (i in this.indicatorLoaders)
        this.indicatorLoaders[i].go(forceUpdate);
      */
    };

    this.displayIndicators = function (indicatorPanel, indicatorList) {
      var count = 0;
      var indicatorRow = null;

      for (l in indicatorList) {
        if (count++ % 3 == 0) {
          indicatorRow = $("#templates .indicator-row").clone();
          indicatorPanel.append(indicatorRow);
        }
        var indicatorBox = $("#templates .indicator-box").clone();
        indicatorBox.addClass("indicatorLoading");
        indicatorBox.attr("id", "ind" + count);
        indicatorBox.find(".title").text(indicatorList[l].text);
        indicatorBox.attr("link", indicatorList[l].link);
        indicatorBox.attr("title", indicatorList[l].tip);
        indicatorBox.tipsy();
        // tipsy seems to hang around after we click on a link, so we have to remove it manually.
        indicatorBox.click(function() { $.data(this, 'active.tipsy').remove(); window.open($(this).attr("link")); return false; });
        indicatorBox.addClass("pagelink");
        if ("usernames" in indicatorList[l]) {
          var indicatorLoader = new IndicatorLoader(indicatorList[l].usernames, indicatorBox);
          this.indicatorLoaders.push(indicatorLoader);
        }
        indicatorRow.append(indicatorBox);
      }
    };
  }
  TeamReport.prototype = new Report;

  function UserReport(userPath, user, detailed) {
    Report.call(this, user[1], user[0], detailed, false);
    this.userPath = userPath;
    
    this.usernames = function () {
      return [this.id];
    }

    this._allDoneCb = function () {
      this.name_entry.removeClass("loading");
    }
    
    this.update = function (selector, forceUpdate) {
      this.setupReportDisplay(selector);
      this.displayQueries(selector, forceUpdate);
    }
  }
  UserReport.prototype = new Report;
  
  function translateTerms(args) {
    var newTerms = {};
    for (name in args)
      newTerms[name.replace(/_DOT_/g, ".").replace(/_HYPH_/g, "-")] = args[name];
    return newTerms;
  }

  var teamReports = [];
  var userReports = [];
  
  function teamList(selector, template, forceUpdate, baseTeamId, teams) {
    var topLevel = false;
    if (!teams) {
      teams = require("app/teams").get();
      topLevel = true;
    }
    teamReports = [];
    var reportCount = 0;
    var row = null;
    for (t in teams) {
      if ((reportCount++ % REPORTS_PER_ROW) == 0) {
        row = template.clone();
        selector.append(row);
      }
      var teamId = t;
      if (baseTeamId)
        teamId = baseTeamId + "/teams/" + t;
      var report = new TeamReport(teamId, teams[t], false, topLevel);
      teamReports.push(report);
      report.update(row, forceUpdate);
    }
  }

  var REPORTS_PER_ROW = 6;
  
  function userList(selector, template, forceUpdate, baseTeamId, users) {
    userReports = [];
    var reportCount = 0;
    var row = null;
    for (u in users) {
      if ((reportCount++ % REPORTS_PER_ROW) == 0) {
        row = template.clone();
        selector.append(row);
      }
      var userId = "";
      if (baseTeamId)
        userId = baseTeamId + "/members/" + users[u];
      var report = new UserReport(userId, users[u], false);
      userReports.push(report);
      console.log("user report for " + users[u][0]);
      report.update(row, forceUpdate);
    }
  }
 
  function update(who, _isAuthenticated, forceUpdate) {
    var d = new Date();
    startTime = d.getTime();
    xhrQueue.clear();
    isAuthenticated = _isAuthenticated;
    var detailedReportContainer = $("#templates tr.detailedreport").clone();
    var teamListTemplate = $("#templates tr.teamlist");
    var memberListTemplate = $("#templates tr.memberlist");
    
    $("#reports").html("");
    
    $("#reports").append(detailedReportContainer);
    
    var title = require("queries").RELEASE_NAME + " Bugzilla Dashboard";
    if (document.title != title) {
      document.title = title;
      $("#header .title").text(title);
    }

    if (who.group) {
      teamReports = [];
      var team = require("teams").getByKey(who.group);
      var report = new TeamReport(who.group, team, true);
      var teamCount = 0;
      teamReports.push(report);
      report.update(detailedReportContainer, forceUpdate);
      if ("teams" in team) {
        teamList($("#reports"), teamListTemplate, forceUpdate, who.group, team.teams);
        for (t in team.teams)
          teamCount += 1;
        report.entry.attr("colspan", teamCount);
      }
      if ("members" in team) {
        console.log("displaying members");
        userList($("#reports"), memberListTemplate, forceUpdate, who.group, team.members);
        if (team.members.length > teamCount)
          report.entry.attr("colspan", team.members.length);
      }
    } else if (who.user) {
      userReports = [];
      var report = new UserReport(require("teams").getByKey(who.user));
      userReports.push(report);
      report.update(container, forceUpdate);
    } else
      teamList($("#reports"), teamListTemplate, forceUpdate);
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
