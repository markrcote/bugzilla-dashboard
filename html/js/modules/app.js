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
        options.window.localStorage
      );

    var bugzilla = require("app/bugzilla-auth").create(options.Bugzilla);

    moduleExports.bugzilla = bugzilla;
    moduleExports.cache = cache;
    moduleExports.window = options.window;
    moduleExports.jQuery = options.jQuery;

    require("app/ui").init(options.window.document, options.admin);
    require("app/login").init();
  };
};

Require.modules["app/who"] = function(exports, require) {
  var callbacks = [];
  var who = {
    division: -1,
    team: -1,
    user: -1
  };

  exports.get = function get() {
    return who;
  }

  exports.whenChanged = function whenChanged(cb) {
    callbacks.push(cb);
  };

  exports.set = function set(divisionId, teamId, userId) {
    if (!divisionId)
      who.division = -1;
    else
      who.division = divisionId;
    if (!teamId)
      who.team = -1;
    else
      who.team = teamId;
    if (!userId)
      who.user = -1;
    else
      who.user = userId;

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
  
  var logoutCommand = {
      name: "logout",
      execute: function execute() {
        require("app/login").set("", "");
        var who = require("app/who").get();
      }
    };
  
  exports.init = function init() {
    require("app/commands").register(logoutCommand);
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
  
  exports.clear = function clear() {
    errors.html("");
    errors.fadeOut();
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

  function loginLoaded(response) {
    $("#login-form").removeClass("loading");
    if (!response.error) {
      require("app/login").set($("#login .username").val(),
          $("#login .password").val());
      require("app/errors").clear();
      $("#login").fadeOut();
    } else {
      if (response.code == 300) {
        require("app/errors").log("bugzilla-auth-error");
      }
    }
  }
  
  $("#login form").submit(
    function(event) {
      event.preventDefault();
      $("#login-form").addClass("loading");
      require("app/server").query("POST", "/login/", loginLoaded,
          JSON.stringify({login: {username: $("#login .username").val(), password: $("#login .password").val()}}));
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

Require.modules["app/ui/find-user"] = function(exports, require) {
  var $ = require("jQuery");
  var bugzilla = require("bugzilla");
  var window = require("window");
  var xhrQueue = require("xhr/queue").create();
  var currReq;

  exports.options = {
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
      if (currReq) {
        xhrQueue.abort(currReq);
      }
      if (!request.term)
        response([]);
      var request = bugzilla.ajax({url: "/user",
                               data: {match: request.term},
                               success: success});
      currReq = xhrQueue.enqueue(function() { return request; });
    }
  };

  $("#find-user .query").autocomplete(exports.options);
    
  $("#find-user form").submit(
    function(event) {
      event.preventDefault();
      var username = $("#find-user .query").val();
      var url = require("app/ui/hash").userToHash(username);
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

  $("button.adminadd").click(
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

  exports.init = function init(document, admin) {
    if (admin === true)
      require("app/ui/admin").init();
    else
      require("app/ui/dashboard").init();
    require("app/ui/login-form").init();
    require("app/ui/find-user").init();
    require("app/ui/hash").init(document);

    //if (!require("app/login").get().isLoggedIn)
    //  openDialog("login");
  };
};

Require.modules["app/ui/sort"] = function(exports) {
  exports.sortByKey = function sortByKey(keyname) {
    return function(a, b) {
      if (a[keyname] < b[keyname])
        return -1;
      if (a[keyname] == b[keyname])
        return 0;
      return 1;
    };
  };
  
  exports.sortUsers = function sortUsers(a, b) {
    var key_a = "nick" in a ? a.nick : a.name;
    var key_b = "nick" in b ? b.nick : b.name;
    if (key_a < key_b)
      return -1;
    else if (key_a == key_b)
      return 0;
    return 1;
  };
};

Require.modules["app/ui/hash"] = function(exports, require) {
  
  function userFromHash(location) {
    if (location.hash) {
      var match = location.hash.match(/#user=(.*)/);
      if (match)
        return unescape(match[1]);
    }
    return -1;
  }

  function teamFromHash(location) {
    if (location.hash) {
      var match = location.hash.match(/#team=(.*)/);
      if (match)
        return unescape(match[1]);
    }
    return -1;
  }

  function divisionFromHash(location) {
    if (location.hash) {
      var match = location.hash.match(/#division=(.*)/);
      if (match)
        return unescape(match[1]);
    }
    return -1;
  }

  function setWhoFromHash(location) {
    var division = divisionFromHash(location);
    var team = teamFromHash(location);
    var user = userFromHash(location);
    require("app/who").set(division, team, user);
  }

  exports.userToHash = function userToHash(userId) {
    return "#user=" + escape(userId);
  };
  
  exports.teamToHash = function teamToHash(teamId) {
    return "#team=" + escape(teamId);
  };

  exports.divisionToHash = function divisionToHash(divisionId) {
    return "#division=" + escape(divisionId);
  };

  exports.init = function init(document) {
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

Require.modules["app/server"] = function(exports, require) {
  var server_url = "/bzdash";
  var xhrQueue = require("xhr/queue").create();

  exports.query = function query(method, search, onLoad, body) {
    var xhrData = {
        method: method,
        url: server_url + search,
        headers: [
          ["Accept", "application/json"],
          ["Content-Type", "application/json"]
        ],
        onLoad: [onLoad],
        onErr: [],
        body: body
      };
    
    xhrQueue.enqueue(
      function() {
        return xhrData;
      }
    );
  }
};


Require.modules["app/ui/admin"] = function(exports, require) {
  var $ = require("jQuery");
  var bugzilla = require("bugzilla");
  var window = require("window");
  var xhrQueue = require("xhr/queue").create();
  var server = require("app/server");
  var isAuthenticated = false;  // set by update()
  var products = {};

  var currentDivisionId = -1;
  var currentTeamId = -1;

  function selectionChangedFunc(divId, teamId) {
    if (teamId === undefined)
      teamId = -1;
    return function() { selectionChanged(divId, teamId); };
  }

  function delEntryDialogFunc(entry, entryType, id) {
    return function() {
      var dialog = $("#del-entry");
      $(dialog.find("#del-entry-type")).text(entryType);
      $(dialog.find("#del-entry-name")).text($(entry.find(".listentrytext")).text());
      $("#del-entry form").submit(delEntryFunc(dialog, entry, entryType, id));
      dialog.fadeIn(
        function() {
          dialog.find("input:first").focus();
        });
    }
  }

  function delEntryFunc(dialog, entry, entryType, id) {
    return function(event) {
      event.preventDefault();
      server.query("DEL", "/" + entryType + "/" + id);
      entry.remove();
      dialog.fadeOut();
    };
  }
  
  function newListEntry(parent, entryType, id, text, onclick) {
    var entry = $("#templates .listentry").clone();
    var entrytext = $(entry.find(".listentrytext"));
    var entrybutton = $(entry.find(".listentrybutton"));
    if (id)
      entry.attr("id", entryType + id);
    if (text)
      entrytext.text(text);
    if (onclick)
      entrytext.click(onclick);
    entry.hover(function() { $($(this).find(".listentrybutton")).removeClass("nodisplay"); },
                function() { $($(this).find(".listentrybutton")).addClass("nodisplay"); });
    entrybutton.click(delEntryDialogFunc(entry, entryType, id));
    parent.append(entry);
  }
  
  function divisionListLoaded(response) {
    $("#admindivisionlist").removeClass("loading");
    $("#admindivisionlist").find(".entitylist").html("");
    
    response.divisions.sort(require("app/ui/sort").sortByKey("name"));
    for (var i = 0; i < response.divisions.length; i++) {
      newListEntry($("#admindivisionlist").find(".entitylist"),
                   "division",
                   response.divisions[i].id,
                   response.divisions[i].name,
                   selectionChangedFunc(response.divisions[i].id));
    }

    // load first division, if it exists
    if (response.divisions.length > 0) {
      selectionChanged(response.divisions[0].id, -1);
    }
  }

  function divisionLoaded(response) {
    $("#adminteamlist").removeClass("loading");
    response.divisions[0].teams.sort(require("app/ui/sort").sortByKey("name"));
    for (var i = 0; i < response.divisions[0].teams.length; i++) {
      newListEntry($("#adminteamlist").find(".entitylist"),
                   "team",
                   response.divisions[0].teams[i].id,
                   response.divisions[0].teams[i].name,
                   selectionChangedFunc(response.divisions[0].id, response.divisions[0].teams[i].id));
    }

    if (response.divisions.length > 0 && response.divisions[0].teams.length > 0)
      selectionChanged(response.divisions[0].id, response.divisions[0].teams[0].id);
  }

  function teamLoaded(response) {
    $("#adminteamdetails").removeClass("loading");
    if (response.teams.length == 0)
      return;

    $("#adminteamdetails").find("h2").text(response.teams[0].name + " Team Details");

    if (response.teams[0].prodcomps.length == 0) {
      var entry = $("#templates .listentrynone").clone();
      $("#adminteamdetails").find("#prodcomps").append(entry);
    } else {
      response.teams[0].prodcomps.sort(require("app/ui/sort").sortByKey("name"));
      for (var i = 0; i < response.teams[0].prodcomps.length; i++) {
        var text = response.teams[0].prodcomps[i].product;
        if (response.teams[0].prodcomps[i].component)
          text += ' / ' + response.teams[0].prodcomps[i].component;
        newListEntry($("#adminteamdetails").find("#prodcomps"),
                     "prodcomp",
                     response.teams[0].prodcomps[i].id,
                     text);
      }
    }

    if (response.teams[0].members.length == 0) {
      var entry = $("#templates .listentrynone").clone();
      $("#adminteamdetails").find("#members").append(entry);
    } else {
      response.teams[0].members.sort(require("app/ui/sort").sortUsers);
      for (var i = 0; i < response.teams[0].members.length; i++) {
        var text = "";
        if (response.teams[0].members[i].nick)
          text = response.teams[0].members[i].nick;
        else
          text = response.teams[0].members[i].name;        
        newListEntry($("#adminteamdetails").find("#members"),
                     "member",
                     response.teams[0].members[i].id,
                     text);
      }
    }
  }

  function updateSelectedEntity(entities, id) {
    for (var i = 0; i < entities.length; i++) {
      if ($(entities[i]).attr("id") == id)
        $(entities[i]).addClass("entityselected");
      else
        $(entities[i]).removeClass("entityselected");
    }
  }
  
  function selectionChanged(divisionId, teamId) {
    if (divisionId != -1 && currentDivisionId != divisionId) {
      currentDivisionId = divisionId;
      $("#adminteamlist").addClass("loading");
      $("#adminteamlist").find(".entitylist").html("");
      server.query("GET", "/division/" + divisionId, divisionLoaded);
      updateSelectedEntity($("#admindivisionlist").find(".listentry"), "division" + divisionId);
    }
    
    if (teamId != -1 && currentTeamId != teamId) {
      currentTeamId = teamId;
      $("#adminteamdetails").addClass("loading");
      $("#adminteamdetails").find(".entitylist").html("");
      server.query("GET", "/team/" + teamId, teamLoaded);
      updateSelectedEntity($("#adminteamlist").find(".listentry"), "team" + teamId);
    }
  }
  
  function loadDivisions() {
    $("#admindivisionlist").addClass("loading");
    server.query("GET", "/division/", divisionListLoaded);
  }
  
  function productChanged() {
    $("#select-comp").removeOption(/./);
    var selectedProducts = $("#select-prod").selectedValues();
    if (selectedProducts.length) {
      if (selectedProducts.length == 1) {
        $("#select-comp").attr("disabled", "");
        $("#select-comp").addOption("", "-All-");
        for (var i = 0; i < products[selectedProducts[0]].components.length; i++) {
          $("#select-comp").addOption(products[selectedProducts[0]].components[i],
                                      products[selectedProducts[0]].components[i]);
        }
        $("#select-comp").sortOptions();
      } else if (selectedProducts.length > 1) {
        $("#select-comp").attr("disabled", "disabled");
        $("#select-comp").addOption("", "-All-");
      }
      $("#select-comp").attr("selectedIndex", 0);
    }
  }
  
  function productsLoaded(response) {
    $("#add-prodcomp-form").removeClass("loading");
    $("#select-prod").removeOption(/./);
    products = response.products;
    for (prod in products) {
      $("#select-prod").addOption(prod, prod);
    }
    $("#select-prod").sortOptions();
    $("#select-prod").change(productChanged);
    $("#select-prod").attr("selectedIndex", 0);
    productChanged();

    $("#add-prodcomp form").submit(function (event) {
      event.preventDefault();
      addProdComp();
    });
  }
  
  function addProdComp() {
    var data = [];
    var selectedProducts = $("#select-prod").selectedValues();
    var selectedComponents = $("#select-comp").selectedValues();
    if (selectedProducts.length == 1) {
      for (var i = 0; i < selectedComponents.length; i++)
        data.push({team_id: currentTeamId, product: selectedProducts[0], component: selectedComponents[i]});
    } else if (selectedProducts.length > 0) {
      for (var i = 0; i < selectedProducts.length; i++)
        data.push({team_id: currentTeamId, product: selectedProducts[i], component: ""});
    }
    
    var teamId = currentTeamId;
    currentTeamId = -1;  // force refresh
    server.query("POST", "/prodcomp/", function(response) { selectionChanged(-1, teamId); },
        JSON.stringify({prodcomps: data}));
    $("#add-prodcomp").fadeOut();
  }

  $("#add-division form").submit(function (event) {
    event.preventDefault();
    currentDivisionId = -1;
    server.query("POST", "/division/", loadDivisions,
        JSON.stringify({divisions: [{name: $("#add-division-query").val()}]}));
    $("#add-division").fadeOut();
    $("#add-division-query").val("");
  });
  
  $("#add-team form").submit(function (event) {
    event.preventDefault();
    var divisionId = currentDivisionId;
    currentDivisionId = -1;
    server.query("POST", "/team/", function(response) { selectionChanged(divisionId, -1); },
        JSON.stringify({teams: [{name: $("#add-team-query").val(), division_id: divisionId}]}));
    $("#add-team").fadeOut();
    $("#add-team-query").val("");
  });

  $("#add-member .query").autocomplete(require("app/ui/find-user").options);

  $("#add-member form").submit(function(event) {
    event.preventDefault();
    var teamId = currentTeamId;
    currentTeamId = -1;
    var username = $("#add-member .query").val();
    xhrQueue.enqueue(
      function() {
        return bugzilla.user(
          username,
          function(response) {
            // extract nick if present, e.g. "Jane Doe [:jdoe]", "John Smith ( :jsmith )", etc. 
            // some people skip the parentheses/brackets... in the interests of not making
            // the first re more complicated, we use two patterns.
            var nick = "";
            var nickPatterns = [/[\(\[][\s]*:([^\s\):,]*)[\s]*[\)\]]/, /:([^\s,:]*)/];
            for (var i = 0; i < nickPatterns.length; i++) {
              var match = nickPatterns[i].exec(response.real_name);
              if (match) {
                nick = match[1];
                break;
              }
            }
            server.query("POST", "/member/", function(response) { selectionChanged(-1, teamId); },
                JSON.stringify(
                    { members: [ {team_id: teamId, name: response.real_name, nick: nick, bugemail: response.email} ] }));
            $("#add-member").fadeOut();
            $("#add-member-query").val("");
          }
        );
      }
    );
  });
  
  $("#del-team-cancel").click(function () { $("#del-entry").fadeOut(); });

  var dashboardCommand = {
      name: "dashboard",
      execute: function execute() {
        window.open("index.html");  
      }
    };

  function update(_isAuthenticated) {
    isAuthenticated = _isAuthenticated;
    
    current_who = require("app/who").get();
    loadDivisions();
  }

  exports.init = function init() {
    require("app/commands").register(dashboardCommand);
    require("app/login").whenChanged(
      function changeUser(user) {
        update(user.isAuthenticated);
      });
    $("#add-prodcomp-form").addClass("loading");
    server.query("GET", "/products/", productsLoaded);
  };

}

Require.modules["app/ui/mostactive"] = function(exports, require) {
  var $ = require("jQuery");
  var bugzilla = require("bugzilla");
  var xhrQueue = require("xhr/queue").create();
  var afterdate;
  var callback = null;
  var bugs = [];

  function translateTerms(args) {
    var newTerms = {};
    for (name in args)
      newTerms[name.replace(/_DOT_/g, ".").replace(/_HYPH_/g, "-")] = args[name];
    return newTerms;
  }
  
  function onLoad(response) {
    var change_count;
    var i;
    var j;
    for (i = 0; i < response.bugs.length; i++) {
      response.bugs[i].change_count = 0;
      for (j = 0; j < response.bugs[i].comments.length; j++) {
        if (response.bugs[i].comments[j].creation_time >= afterdate)
          response.bugs[i].change_count++;
      }
      for (j = 0; j < response.bugs[i].history.length; j++) {
        if (response.bugs[i].history[j].change_time >= afterdate)
          response.bugs[i].change_count++;
      }
      response.bugs[i].comments = [];
      response.bugs[i].history = [];
    }
    
    response.bugs.sort(function(a, b) {return b.change_count - a.change_count;});
    if (callback)
      callback(response.bugs);
  }
  
  exports.get = function get(cb, prodcomps) {
    callback = cb;
    afterdate = require("date-utils").timeAgo(MS_PER_DAY * 7);
    var query = require("queries").queries["changed_last_week"]();
    var args = query.args_unassigned(prodcomps);
    args["include_fields"] = "id,summary,comments,history,status,priority,severity,last_change_time";
    var newTerms = translateTerms(args);
    
    xhrQueue.enqueue(
      function() {
        return bugzilla.search(newTerms, onLoad);
      });
  };
  
}

Require.modules["app/ui/dashboard"] = function(exports, require) {
  var $ = require("jQuery");
  var cache = require("cache");
  var bugzilla = require("bugzilla");
  var window = require("window");
  var xhrQueue = require("xhr/queue").create();
  var isAuthenticated = false;  // set by update()
  
  var startTime;

  // FIXME: Should probably be a separate (sub)module.
  function QueryRunner(forceUpdate, usernames, prodcomps, queryDoneCb, allDoneCb, queries, queryType) {
    // FIXME: Could probably split this into another object per query.
    this.usernames = usernames.slice(0);
    this.prodcomps = prodcomps.slice(0);
    this.queryDoneCb = queryDoneCb;
    this.allDoneCb = allDoneCb;
    this.queryCount = 0;
    this.results = {};
    
    this.queryDone = function(query) {
      this.queryDoneCb(query, queryType, this.results);
      this.decQueryCount();
    }
    
    this.decQueryCount = function() {
      if (--this.queryCount == 0)
        this.allDoneCb(this.results);
    }

    this.parseResults = function(query, response) {
      this.results[query.id] = response.data;
    }
    
    this.getStat = function(forceUpdate, query, getStatCb) {
      this.results[query.id] = 0;
      
      if ((queryType == "unassigned" && this.prodcomps.length == 0) || 
          (queryType == "assigned" && this.usernames.length == 0)) {
        this.queryDone(query);
        return;
      }

      var args = query["args_" + queryType](queryType == "assigned" ? this.usernames : this.prodcomps);
      var newTerms = translateTerms(args);
      
      var self = this;
      xhrQueue.enqueue(
        function() {
          return bugzilla.count(
            newTerms,
            function(response) {
              self.parseResults(query, response);
              self.queryDone(query);
            });
        });
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
      this.getStat(forceUpdate, queries[q],
          function(query, value) {
            self.queryDone(query, value);
          }
        );
    }
  }
  
  // FIXME: Should these be classic JS objects, or should they inherit another way?
  function Report(reportType, id, name, detailed, topLevel) {
    this.reportType = reportType;
    this.id = id;
    this.name = name;
    this.detailed = detailed;
    this.topLevel = topLevel;
    this.toDo = [];
    
    this.displayedQueries = [ 
      { type: "group", name: "Blockers", members: [                       
        {type: "stat", name: "All", query: "open_blockers"},
        {type: "stat", name: "Security", query: "security"},
        {type: "stat", name: "Regressions", query: "regressions"},
        {type: "stat", name: "Crashers", query: "crashers"} ]
      },
      { type: "group", name: "Fixed in Last 30 Days", members: [ 
        {type: "stat", name: "Blockers", query: "blockers_fixed_30_days"},
        {type: "stat", name: "NonBlockers", query: "nonblockers_fixed_30_days"} ]
      },
      { type: "group", name: "Patches Awaiting Review", members: [ 
        { type: "stat", name: "Blockers", query: "blocker_patches_awaiting_review"},
        { type: "stat", name: "NonBlockers", query: "nonblocker_patches_awaiting_review"} ]
      },
      { type: "group", name: "Review Queues", members: [ 
        { type: "stat", name: "Blockers", query: "blocker_review_queue"},
        { type: "stat", name: "NonBlockers", query: "nonblocker_review_queue"} ]
      }
    ];
    
    this.stuffToDoQueries = [
      { type: "group", name: "Unassigned Bugs", members: [ 
        { type: "stat", name: "Critical Security", query: "sg_crit" },
        { type: "stat", name: "Top Crashers", query: "topcrash" },
        { type: "stat", name: "Regressions", query: "regressions" },
        { type: "stat", name: "Blocker Noms", query: "open_noms" },
        { type: "stat", name: "Assigned to Nobody", query: "nobody" } ]
      }
    ];
    
    this.setupReportDisplay = function (selector) {
      if (this.detailed)
      {
        this.entry = $("#templates td.detailedreportcell").clone();
      } else {
        this.entry = $("#templates td.reportcell").clone();
      }
      
      this.name_entry = this.entry.find(".name")
      this.name_entry.text(this.name);
      this.name_entry.addClass("loading");
      this.stats = this.entry.find(".stats");
      this.stats.addClass("nodisplay");
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
        var reportbox = this.entry.find(".detailedreportbox");
        this.entry.attr("colspan", "0");
        this.details = $("#templates .reportdetails").clone();
        reportbox.find(".reportboxtable").append(this.details);
        this.toDo[0] = $("#templates .detailedreportfield").clone();
        this.toDo[0].find(".name").text("Stuff to do...");
        this.toDo[0].find(".name").addClass("loading");
        this.toDo[0].find(".stats").addClass("nodisplay");
        this.toDo[1] = $("#templates .detailedreportfield").clone();
        this.toDo[1].find(".name").text("Most Active Bugs");
        this.toDo[1].find(".name").addClass("loading");
        $(reportbox.find(".detailedreportrow")).append(this.toDo[0]);
        $(reportbox.find(".detailedreportrow")).append(this.toDo[1]);
      }
    };

    this.cleanId = function(id) {
      return id.replace(/@/g, "").replace(/\./g, "").replace(/_/g, "").replace(/\//g, "");
    };
    
    this.queryDoneCb = function (query, queryType, results) {
      var total = results[query.id];
      $("#" + this.cleanId(this.reportType + this.id + queryType + query.id)).find(".value").text(total);
    };
    
    this.showBugs = function showBugs(bugs) {
      var table = $("#templates .bugs").clone();
      var rowTemplate = table.find(".bug-row").remove();

      function updatePrettyDates(query) {
        query.find(".last-changed").each(
          function() {
            var lcTime = $(this).attr("data-last-change");
            $(this).text(require("date-utils").prettyDate(lcTime));
          });
      }
      
      function appendRowForBug(bug) {
        var row = rowTemplate.clone();
        row.attr("id", "bug-id-" + bug.id);
        var summary = bug.summary;
        if (summary.length > 25)
          summary = bug.summary.slice(0, 50) + "...";
        row.find(".summary").text(bug.id + ": " + summary);
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
      
      bugs.forEach(appendRowForBug);
      updatePrettyDates(table);
      return table;
    }
    
    this.mostActiveLoaded = function(most_active) {
      var table = this.showBugs(most_active.slice(0, 10));
      table.addClass("nodisplay");
      this.toDo[1].append(table);
      this.toDo[1].find(".name").removeClass("loading");
      table.css('visibility','visible').hide().fadeIn('slow');
      table.removeClass("nodisplay");
      table.fadeIn();
    }
    
    this.allDoneCb = function() {
      this.name_entry.removeClass("loading");
      this.entry.find(".stats").css('visibility','visible').hide().fadeIn('slow');

      this.entry.find(".stats").removeClass("nodisplay");
      this.entry.find(".stats").fadeIn();
      //var d = new Date();
      //console.log("Report " + this.name + " loaded in " + ((d.getTime() - startTime)/1000) + " s");
      var self = this;
      if (this.detailed) {
        require("app/ui/mostactive").get(function(bugs) { self.mostActiveLoaded(bugs); }, this.prodcomps());
      }
    };

    this.allDoneToDoCb = function() {
      this.toDo[0].find(".name").removeClass("loading");
      this.toDo[0].find(".stats").css('visibility','visible').hide().fadeIn('slow');

      this.toDo[0].find(".stats").removeClass("nodisplay");
      this.toDo[0].find(".stats").fadeIn();
    };

    this.getIndent = function (indentLevel) {
      var indent = "";
      if (indentLevel) {
        for (var i = 0; i < indentLevel; i++)
          indent += "&nbsp;&nbsp;";
      }
      return indent;
    };
    
    this.displayEntry = function(selector, queries, entry, indentLevel, queryType) {
      switch (entry.type) {
        case "group": this.displayGroup(selector, queries, entry, indentLevel, queryType); break;
        case "stat": this.displayStat(selector, queries, entry, indentLevel, queryType); break;
      }
    };
    
    this.displayGroup = function (selector, queries, group, indentLevel, queryType) {
      if (indentLevel === undefined)
        indentLevel = 0;
      var indent = this.getIndent(indentLevel);
      var entry = $("#templates .statsgroupentry").clone();
      entry.find(".indent").html(indent);
      entry.find(".name").text(group.name);
      selector.append(entry);
      
      for (m in group.members)
        this.displayEntry(selector, queries, group.members[m], indentLevel+1, queryType);
    };
    
    this.displayStat = function (selector, queries, stat, indentLevel, queryType) {
      var self = this;
      var indent = this.getIndent(indentLevel);
      var entry = $("#templates .statsentry").clone();
      var query = require("queries").queries[stat.query]();
      queries.push(query);
      entry.find(".indent").html(indent);
      if (queryType == "unassigned")
        entry.click(function() { window.open(bugzilla.uiQueryUrl(translateTerms(query.args_unassigned(self.prodcomps())))); });
      else
        entry.click(function() { window.open(bugzilla.uiQueryUrl(translateTerms(query.args_assigned(self.usernames())))); });
      entry.attr("id", this.cleanId(this.reportType + this.id + queryType + query.id));
      entry.addClass("pagelink");
      entry.find(".name").text(stat.name);
      entry.find(".value").text("...");
      selector.append(entry);
    };
    
    this.displayQueries = function (selector, forceUpdate) {
      this.selector = selector;
      var i;
      var self = this;
      var queries = [];
      var toDoQueries = [];
      var previousWasGroup = false; 
      
      for (i = 0; i < this.displayedQueries.length; i++) {
        if (previousWasGroup) {
          var sep = $("#templates .statsgroupsep").clone();
          this.stats.append(sep);
        }
        this.displayEntry(this.stats, queries, this.displayedQueries[i], 0, "assigned");
        previousWasGroup = (this.displayedQueries[i].type == "group"); 
      }
      
      this.QueryRunner = new QueryRunner(
          forceUpdate, this.usernames(), this.prodcomps(),
          function(query, queryType, value) { self.queryDoneCb(query, queryType, value); },
          function() { self.allDoneCb(); }, queries, "assigned");

      if (this.detailed) {
        for (i = 0; i < this.stuffToDoQueries.length; i++) {
          this.displayEntry(this.toDo[0].find(".stats"), toDoQueries, this.stuffToDoQueries[i], 0, "unassigned");
        }
      }

      this.toDoQueryRunner = new QueryRunner(
          forceUpdate, this.usernames(), this.prodcomps(),
          function(query, queryType, value) { self.queryDoneCb(query, queryType, value); },
          function() { self.allDoneToDoCb(); }, toDoQueries, "unassigned");
    };
  }
  
  function ToDoList(teamId) {
    this.teamId = teamId;
    
    $("#todo").fadeIn();    
  }
  
  function TeamReport(teamId, team, detailed, topLevel, groupType) {
    if (groupType)
      this.groupType = groupType;
    else
      this.groupType = "team";
    Report.call(this, this.groupType, teamId, team.name, detailed, topLevel);
    this.team = team;
    this.indicatorLoaders = [];
    this.detailed = detailed;
    
    this.usernames = function () {
      var i;
      var l = [];
      if ("members" in this.team)
        l = l.concat(this.team.members.map(function(x) { return x.bugemail; }));
      if ("teams" in this.team) {
        for (i = 0; i < this.team.teams.length; i++) {
          l = l.concat(this.team.teams[i].members.map(function(x) { return x.bugemail; }));
        }
      }
      return l;
    };

    this.prodcomps = function () {
      var teams = [this.team];
      var prodcomps = [];
      var i;
      if ("teams" in this.team)
        teams = teams.concat(this.team.teams);
      for (i = 0; i < teams.length; i++) {
        if ("prodcomps" in teams[i])
          prodcomps = prodcomps.concat(teams[i].prodcomps.map(function(x) { return [x.product, x.component]; }));
      }
      return prodcomps;
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
      if (this.groupType == "team")
        this.name_entry.click(function() { window.open(require("app/ui/hash").teamToHash(self.id)); });
      else
        this.name_entry.click(function() { window.open(require("app/ui/hash").divisionToHash(self.id)); });
      this.displayQueries(selector, forceUpdate);
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

  function UserReport(userId, user, detailed) {
    Report.call(this, "user", userId, user.nick ? user.nick : user.name, detailed, false);
    this.user = user;
    
    this.usernames = function () {
      return [this.user.bugemail];
    };

    this.prodcomps = function () {
      return [];
    };
    
    this._allDoneCb = function () {
      this.name_entry.removeClass("loading");
    };
    
    this.update = function (selector, forceUpdate) {
      this.setupReportDisplay(selector);
      this.displayQueries(selector, forceUpdate);
    };
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

  var REPORTS_PER_ROW = 6;
  
  function fillRow(row, rowCount) {
    var entry;
    while ((rowCount++ % REPORTS_PER_ROW) != 0) {
      entry = $("#templates td.reportcell").clone();
      entry.addClass("nodisplay");
      row.append(entry);
    }
  }
  
  function divisionList(selector, template, forceUpdate) {
    var divisions = require("app/teams").get();
    teamReports = [];
    var reportCount = 0;
    var row = null;
    for (d in divisions) {
      if ((reportCount++ % REPORTS_PER_ROW) == 0) {
        row = template.clone();
        selector.append(row);
      }
      var divisionId = divisions[d].id;
      var report = new TeamReport(divisionId, divisions[d], false, true, "division");
      teamReports.push(report);
      report.update(row, forceUpdate);
    }
    fillRow(row, reportCount);
}

  function teamList(selector, template, forceUpdate, teams) {
    teamReports = [];
    var reportCount = 0;
    var row = null;
    teams.sort(require("app/ui/sort").sortByKey("name"));
    
    for (t in teams) {
      if ((reportCount++ % REPORTS_PER_ROW) == 0) {
        row = template.clone();
        selector.append(row);
      }
      var teamId = teams[t].id;
      var report = new TeamReport(teamId, teams[t], false, false);
      teamReports.push(report);
      report.update(row, forceUpdate);
    }
    fillRow(row, reportCount);
  }

  function userList(selector, template, forceUpdate, users) {
    userReports = [];
    var reportCount = 0;
    var row = null;
    users.sort(require("app/ui/sort").sortUsers);
    for (u in users) {
      if ((reportCount++ % REPORTS_PER_ROW) == 0) {
        row = template.clone();
        selector.append(row);
      }
      var userId = users[u].id;
      var report = new UserReport(userId, users[u], false);
      userReports.push(report);
      report.update(row, forceUpdate);
    }
    fillRow(row, reportCount);
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

    if (who.division != -1) {
      teamReports = [];
      var divisions = require("teams").get();
      var division = null;
      for (i = 0; i < divisions.length; i++) {
        if (divisions[i].id == who.division) {
          division = divisions[i];
          break;
        }
      }
      if (!division) {
        return;  // FIXME: proper error
      }
      var report = new TeamReport(who.division, division, true, false, "division");
      teamReports.push(report);
      report.update(detailedReportContainer, forceUpdate);
      if ("teams" in division) {
        teamList($("#reports"), teamListTemplate, forceUpdate, division.teams);
        report.entry.attr("colspan", REPORTS_PER_ROW);
      }
    } else if (who.team != -1) {
      teamReports = [];
      var divisions = require("teams").get();
      var team = null;
      for (i = 0; i < divisions.length; i++) {
        for (j = 0; j < divisions[i].teams.length; j++) {
          if (divisions[i].teams[j].id == who.team) {
            team = divisions[i].teams[j];
            break;
          }
        }
        if (team)
          break;
      }
      if (!team) {
        return;  // FIXME: proper error
      }
      var report = new TeamReport(who.team, team, true, false);
      var teamCount = 0;
      teamReports.push(report);
      report.update(detailedReportContainer, forceUpdate);
      if ("members" in team) {
        userList($("#reports"), memberListTemplate, forceUpdate, team.members);
        report.entry.attr("colspan", REPORTS_PER_ROW);
      }
    } else if (who.user != -1) {
      userReports = [];
      var divisions = require("teams").get();
      var user = null;
      for (i = 0; i < divisions.length; i++) {
        for (j = 0; j < divisions[i].teams.length; j++) {
          for (k = 0; k < divisions[i].teams[j].members.length; k++) {
            if (divisions[i].teams[j].members[k].id == who.user) {
              user = divisions[i].teams[j].members[k];
              break;
            }
          }
          if (user)
            break;
        }
        if (user)
          break;
      }
      if (!user)
        return;
      var report = new UserReport(who.user, user, true);
      userReports.push(report);
      report.update(detailedReportContainer, forceUpdate);
    } else
      divisionList($("#reports"), teamListTemplate, forceUpdate);
  };

  var refreshCommand = {
    name: "refresh-dashboard",
    execute: function execute() {
      var user = require("app/login").get();
      var who = require("app/who").get();
      update(who, user.isAuthenticated, true);
    }
  };
  
  var myStatsCommand = {
    name: "mystats",
    execute: function execute() {
      var user = require("app/login").get();
      var url = require("app/ui/hash").userToHash(user.username);
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
    require("teams").whenChanged(
      function changeTeams(divisions) {
        var user = require("app/login").get();
        var who = require("app/who").get();
        update(who, user.isAuthenticated, false);
      });
    require("teams").loadTeams();
  };
};
