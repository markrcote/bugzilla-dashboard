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
  var teamAdmins = [];
  var siteAdmin = false;

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
      isAuthenticated: isAuthenticated,
      teamAdmins: teamAdmins,
      siteAdmin: siteAdmin
    };
  };

  exports.set = function set(newUsername, newPassword, newSiteAdmin, newTeamAdmins) {
    if ((newUsername && newUsername != "") &&
        (!newPassword || newPassword == "") &&
        (passwordProvider))
      newPassword = passwordProvider(newUsername);

    if ((newUsername && newUsername == username) &&
        (newPassword && newPassword == password))
      return;

    username = newUsername;
    password = newPassword;
    siteAdmin = newSiteAdmin;
    teamAdmins = newTeamAdmins;

    cache.set("username", username);
    cache.set("password", password);
    cache.set("siteAdmin", siteAdmin);
    cache.set("teamAdmins", teamAdmins);

    $("#username").text(username);
    if (siteAdmin) {
      $("#username").append(" <i>[admin]</i>");
    }

    var info = exports.get();

    callbacks.forEach(function(cb) { cb(info); });
  };
  
  var logoutCommand = {
      name: "logout",
      execute: function execute() {
        require("app/login").set("", "", false, []);
        var who = require("app/who").get();
      }
    };
  
  exports.init = function init() {
    require("app/commands").register(logoutCommand);
    var cachedUsername = cache.get("username");
    var cachedPassword = cache.get("password");
    var cachedSiteAdmin = cache.get("siteAdmin");
    var cachedTeamAdminVal = cache.get("teamAdmins");
    if (cachedTeamAdminVal === undefined) {
      cachedTeamAdmin = [];
    } else {
      cachedTeamAdmin = cachedTeamAdminVal;
    }
    
    exports.set(cachedUsername, cachedPassword, cachedSiteAdmin,
        cachedTeamAdmin);
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
          $("#login .password").val(), response.user.site_admin, response.user.team_admins);
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
          require("app/server").authJSON({login: {username: $("#login .username").val(), password: $("#login .password").val()}}));
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
      if (!require("app/login").get().isAuthenticated) {
        response([]);
        return;
      }
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
        currReq = null;
      }
      if (!request.term) {
        response([]);
        return;
      }
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

  exports.authJSON = function authJSON(o) {
    var currentLogin = require("app/login").get();
    if (currentLogin.isAuthenticated) {
      o['username'] = currentLogin.username;
      o['password'] = currentLogin.password;
    }
    return JSON.stringify(o);
  }
  
  exports.query = function query(method, search, onLoadFunc, body) {
    var onLoad = onLoadFunc ? [onLoadFunc] : [];
    var url = server_url + search;
    var xhrData = {
        method: method,
        url: url,
        headers: [
          ["Accept", "application/json"],
          ["Content-Type", "application/json"]
        ],
        onLoad: onLoad,
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

  var currentLogin = null;
  var currentDivisionId = -1;
  var currentTeamId = -1;

  function selectionChangedFunc(divId, teamId) {
    if (teamId === undefined)
      teamId = -1;
    return function() { selectionChanged(divId, teamId); };
  }

  function delEntryDialogFunc(parent, entry, entryType, entryTypeName, id) {
    return function() {
      var dialog = $("#del-entry");
      $(dialog.find("#del-entry-type")).text(entryTypeName);
      $(dialog.find("#del-entry-name")).text($(entry.find(".listentrytextspan")).text());
      $("#del-entry form").unbind('submit');
      $("#del-entry form").submit(delEntryFunc(dialog, parent, entry, entryType, id));
      dialog.fadeIn(
        function() {
          dialog.find("input:first").focus();
        });
    }
  }

  function delEntryFunc(dialog, parent, entry, entryType, id) {
    return function(event) {
      var noneEntry = null;
      event.preventDefault();
      server.query("DEL", "/" + entryType + "/" + id + "?username=" + currentLogin.username + "&password=" + currentLogin.password, function() {});
      entry.remove();
      if (parent.find(".listentry").length == 0) {
        noneEntry = $("#templates .listentrynone").clone();
        parent.append(noneEntry);
      }
      dialog.fadeOut();
    };
  }

  function modReleaseDialogFunc(divisionId, releaseType, releaseName, currentReleaseValue) {
    return function() {
      var dialog = $("#mod-release");
      $("#mod-release-name").text(releaseName);
      $("#mod-release-query").attr("value", currentReleaseValue);
      $("#mod-release form").unbind('submit');
      $("#mod-release form").submit(modReleaseFunc(dialog, divisionId, releaseType));
      dialog.fadeIn(
        function() {
          dialog.find("input:first").focus();
        });
    }
  }

  function modReleaseFunc(dialog, divisionId, releaseType) {
    return function(event) {
      var noneEntry = null;
      event.preventDefault();
      var jsonData = {divisions: [{}]};
      jsonData.divisions[0][releaseType] = $("#mod-release-query").attr("value");
      
      currentDivisionId = -1;
      server.query("PUT", "/division/" + divisionId, function() { selectionChanged(divisionId, -1); },
          server.authJSON(jsonData));
      dialog.fadeOut();
    };
  }

  function newListEntry(parent, entryType, entryName, id, text, onclick, templateName) {
    if (!templateName)
      templateName = "normallistentry";
    var entry = $("#templates ." + templateName).clone();
    var entrytext = $(entry.find(".listentrytext"));
    var delbuttondiv = $(entry.find(".buttondel"));
    if (id)
      entry.attr("id", entryType + id);
    if (text)
      entrytext.find(".listentrytextspan").text(text);
    if (onclick)
      entrytext.click(onclick);
    entry.hover(function() { $(entry.find(".listentrybutton")).removeClass("nodisplay"); },
                function() { $(entry.find(".listentrybutton")).addClass("nodisplay"); });
    $(delbuttondiv.find("button")).click(delEntryDialogFunc(parent, entry, entryType, entryName, id));
    parent.append(entry);
    return entry;
  }

  function newReleaseListEntry(parent, entryType, id, name, value, onclick) {
    var entry = $("#templates .releaselistentry").clone();
    var entrytext = $(entry.find(".listentrytext"));
    var modbuttondiv = $(entry.find(".buttonmod"));
    if (id)
      entry.attr("id", entryType + id);
    if (name)
      entrytext.find(".listentrytextname").text(name);
    if (value)
      entrytext.find(".listentrytextvalue").text(value);
    if (onclick)
      entrytext.click(onclick);
    entry.hover(function() { $(entry.find(".listentrybutton")).removeClass("nodisplay"); },
                function() { $(entry.find(".listentrybutton")).addClass("nodisplay"); });
    $(modbuttondiv.find("button")).click(modReleaseDialogFunc(id, entryType, name, value));
    parent.append(entry);
    return entry;
  }
  
  function newMemberListEntry(parent, member) {
    var text = "";
    if (member.nick)
      text = member.nick;
    else
      text = member.name;
    var entry = newListEntry(parent, "member", "member", member.id, text, null, "memberlistentry");
    if (member.site_admin) {
      entry.find(".listentrysiteadminspan").removeClass("nodisplay");
    }
    if (member.team_admin) {
      entry.find(".listentryteamadminspan").removeClass("nodisplay");
    }
    
    if (member.bugemail == currentLogin.username) {
      $($(entry.find(".buttondel")).find("button")).removeClass("teamadminbutton nodisplay");
    }
    
    var onMakeAdminDone = function() {
      if (currentTeamId == member.team_id) {
        currentTeamId = -1; 
        selectionChanged(-1, member.team_id);
        }
      };
    
    if (currentLogin.siteAdmin || currentLogin.teamAdmins.indexOf(currentTeamId) >= 0) {
      $(entry.find(".buttonsiteadmin")).find("button").text(member.site_admin ? "remove site admin" : "make site admin");
      $(entry.find(".buttonsiteadmin")).find("button").click(function() {
        server.query("PUT", "/user/" + member.user_id, onMakeAdminDone,
          server.authJSON({users: [{site_admin: !member.site_admin}]}));
        }
      );

      $(entry.find(".buttonteamadmin")).find("button").text(member.team_admin ? "remove team admin" : "make team admin");
      $(entry.find(".buttonteamadmin")).find("button").click(function() {
        server.query("PUT", "/member/" + member.id, onMakeAdminDone,
          server.authJSON({members: [{team_admin: !member.team_admin}]}));
        }
      );
    }
    return entry;
  }
  
  function divisionListLoaded(response) {
    $("#admindivisionlist").removeClass("loading");
    $("#admindivisionlist").find(".entitylist").html("");
    
    response.divisions.sort(require("app/ui/sort").sortByKey("name"));
    for (var i = 0; i < response.divisions.length; i++) {
      newListEntry($("#admindivisionlist").find(".entitylist"),
                   "division",
                   "division",
                   response.divisions[i].id,
                   response.divisions[i].name,
                   selectionChangedFunc(response.divisions[i].id));
    }

    // load first division, if it exists
    if (response.divisions.length > 0) {
      selectionChanged(response.divisions[0].id, -1);
    }
    
    checkButtons();
  }

  function divisionLoaded(response) {
    $("#admindivdetails").removeClass("loading");
    $("#admindivdetails").find("h2").text(response.divisions[0].name + " Division Details");
    newReleaseListEntry($("#releases"),
        "next_prod_rel",
        response.divisions[0].id,
        "Next product release: ",
        response.divisions[0].next_prod_rel);
    newReleaseListEntry($("#releases"),
        "next_iterim_rel",
        response.divisions[0].id,
        "Next interim release: ",
        response.divisions[0].next_interim_rel);

    response.divisions[0].teams.sort(require("app/ui/sort").sortByKey("name"));
    for (var i = 0; i < response.divisions[0].teams.length; i++) {
      newListEntry($("#teams"),
                   "team",
                   "team",
                   response.divisions[0].teams[i].id,
                   response.divisions[0].teams[i].name,
                   selectionChangedFunc(response.divisions[0].id, response.divisions[0].teams[i].id));
    }

    if (response.divisions.length > 0 && response.divisions[0].teams.length > 0) {
      selectionChanged(response.divisions[0].id, response.divisions[0].teams[0].id);
    } else {
      noTeams();
    }
    
    checkButtons();
  }

  function noTeams() {
    currentTeamId = -1;
    if (!$("#adminteamdetails").hasClass("nodisplay")) {
      $("#adminteamdetails").addClass("nodisplay");
    }
  }
  
  function teamLoaded(response) {
    $("#adminteamdetails").removeClass("nodisplay");
    $("#adminteamdetails").removeClass("loading");
    if (response.teams.length == 0)
      return;
    
    $("#adminteamdetails").find("h2").text(response.teams[0].name + " Team Details");
    if (currentLogin.siteAdmin || currentLogin.teamAdmins.indexOf(currentTeamId) >= 0) {
      $("#addmemberbutton").attr("data-dialog", "add-member");
    } else {
      $("#addmemberbutton").attr("data-dialog", "add-member-self");
    }

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
                     "product / component",
                     response.teams[0].prodcomps[i].id,
                     text,
                     null,
                     "prodcomplistentry");
      }
    }

    if (response.teams[0].members.length == 0) {
      var entry = $("#templates .listentrynone").clone();
      $("#adminteamdetails").find("#members").append(entry);
    } else {
      response.teams[0].members.sort(require("app/ui/sort").sortUsers);
      for (var i = 0; i < response.teams[0].members.length; i++) {
        newMemberListEntry($("#adminteamdetails").find("#members"),
                     response.teams[0].members[i]);
      }
    }
    
    checkButtons();
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
      $("#admindivdetails").addClass("loading");
      $("#admindivdetails").find(".entitylist").html("");
      server.query("GET", "/division/" + divisionId, divisionLoaded);
      updateSelectedEntity($("#admindivisionlist").find(".listentry"), "division" + divisionId);
    }
    
    if (teamId != -1 && currentTeamId != teamId) {
      currentTeamId = teamId;
      $("#adminteamdetails").addClass("loading");
      $("#adminteamdetails").find(".entitylist").html("");
      server.query("GET", "/team/" + teamId, teamLoaded);
      updateSelectedEntity($("#admindivdetails").find(".listentry"), "team" + teamId);
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
        server.authJSON({prodcomps: data}));
    $("#add-prodcomp").fadeOut();
  }

  $("#add-division form").submit(function (event) {
    event.preventDefault();
    currentDivisionId = -1;
    server.query("POST", "/division/", loadDivisions,
        server.authJSON({divisions: [{name: $("#add-division-query").val()}]}));
    $("#add-division").fadeOut();
    $("#add-division-query").val("");
  });
  
  $("#add-team form").submit(function (event) {
    event.preventDefault();
    var divisionId = currentDivisionId;
    currentDivisionId = -1;
    server.query("POST", "/team/", function(response) { selectionChanged(divisionId, -1); },
        server.authJSON({teams: [{name: $("#add-team-query").val(), division_id: divisionId}]}));
    $("#add-team").fadeOut();
    $("#add-team-query").val("");
  });

  $("#add-member .query").autocomplete(require("app/ui/find-user").options);

  function addMember(username, teamId, onDone) {
    xhrQueue.enqueue(
        function() {
          return bugzilla.user(
            username,
            function(response) {
              // nick is extracted by server
              server.query("POST", "/member/", function(response) { selectionChanged(-1, teamId); },
                  server.authJSON(
                      { members: [ {team_id: teamId, name: response.real_name, bugemail: response.email} ] }));
              onDone();
            }
          );
        }
      );
  }
  
  $("#add-member form").submit(function(event) {
    event.preventDefault();
    var teamId = currentTeamId;
    currentTeamId = -1;
    addMember($("#add-member .query").val(), teamId, function() {
      $("#add-member").fadeOut();
      $("#add-member-query").val("");
    });
  });

  $("#add-member-self form").submit(function(event) {
    event.preventDefault();
    var teamId = currentTeamId;
    currentTeamId = -1;
    addMember(currentLogin.username, teamId, function() {
      $("#add-member-self").fadeOut();
    });
  });

  $("#del-team-cancel").click(function () { $("#del-entry").fadeOut(); });

  $("#mod-release-cancel").click(function () { $("#mod-release").fadeOut(); });

  var dashboardCommand = {
      name: "dashboard",
      execute: function execute() {
        window.open("index.html");  
      }
    };
  
  function checkButtons() {
    if (currentLogin.siteAdmin) {
      $(".siteadminbutton").removeClass("nodisplay");
    } else {
      $(".siteadminbutton").each(function() {
          if (!$(this).hasClass("nodisplay"))
            $(this).addClass("nodisplay");
      });
    }

    if (isAuthenticated && currentTeamId != -1 && (currentLogin.siteAdmin || (currentLogin.teamAdmins.indexOf(currentTeamId) >= 0))) {
      $(".teamadminbutton").removeClass("nodisplay");
    } else {
      $(".teamadminbutton").each(function() {
          if (!$(this).hasClass("nodisplay"))
            $(this).addClass("nodisplay");
      });
    }
  }

  function update(_isAuthenticated) {
    isAuthenticated = _isAuthenticated;
    
    currentLogin = require("app/login").get();
    loadDivisions();
    checkButtons();
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
  var queryCount = 0;

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
      bugs.push(response.bugs[i]);
    }
    
    queryCount--;
    if (queryCount == 0) {
      bugs.sort(function(a, b) {return b.change_count - a.change_count;});
      if (callback)
        callback(bugs);
    }
  }
  
  exports.get = function get(cb, queries, prodcomps) {
    bugs = [];
    queryCount = 0;
    callback = cb;
    afterdate = require("date-utils").timeAgo(MS_PER_DAY * 7);
    var query, args, newTerms;
    for (var i = 0; i < prodcomps.length; i++) {
      queryCount++;
      query = queries["changed_last_week"]();
      args = query.args_unassigned(prodcomps[i]);
      args["include_fields"] = "id,summary,comments,history,status,priority,severity,last_change_time";
      newTerms = translateTerms(args);
      
      xhrQueue.enqueue(
        function() {
          return bugzilla.search(newTerms, onLoad);
        });
    }
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

  /**
   * QueryRunner: runs a number of queries with arguments.
   * Calls queryDoneCb() after each query finishes, and allDoneCb() after all finish.
   */
  function QueryRunner(forceUpdate, queryDoneCb, allDoneCb, queries, queryType) {
    // FIXME: Could probably split this into another object per query.
    this.queryDoneCb = queryDoneCb;
    this.allDoneCb = allDoneCb;
    this.queryCount = 0;
    this.results = {};
    this.queries = queries;
    
    this.queryDone = function(query) {
      this.queryDoneCb(query, queryType, this.results);
      this.decQueryCount();
    };
    
    this.decQueryCount = function() {
      if (--this.queryCount == 0)
        this.allDoneCb(this.results);
    };

    this.parseResults = function(query, response) {
      this.results[query.id] = response.data;
    };
    
    this.getStat = function(forceUpdate, query, getStatCb) {
      this.results[query.id] = 0;
      
      if (!query.queryArgs || query.queryArgs.length == 0) {
        this.queryDone(query);
        return;
      }

      var args = query["args_" + queryType](query.queryArgs);
      if (args === null) {
        this.results[query.id] = "err";
        this.queryDone(query); 
        return;
      }
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
    };

    this.go = function() {
      var runQueriesFunc = function(self) {
        return function () {
          self.queryCount = self.queries.length;
          var count = 0;
          for (var q = 0; q < self.queries.length; q++) {
            count++;
            self.getStat(forceUpdate, self.queries[q],
                function(query, value) {
                  self.queryDone(query, value);
                }
              );
          }
        };
      }
      var self = this;
      runQueriesFunc(self)();
      window.setInterval(runQueriesFunc(self), 5*60*1000);
    };
  }
  
  
  /**
   * ReportPanel: loads and display statistics.
   * Displays (optionally grouped) queries by adding "statsentry" templates onto the
   * given selector.  When the associated query finishes, populates the associated value.
   */
  function ReportPanel(selector, queries, displayedQueries, queryArgs, queryType, reportId) {
    this.selector = selector;
    this.queries = queries;
    this.displayedQueries = displayedQueries;
    this.queryArgs = queryArgs;
    this.queryType = queryType;
    this.reportId = reportId;
    this.classid = 'ReportPanel';
    this.statsByProdComp = {};

    this.getIndent = function (indentLevel) {
      var indent = "";
      if (indentLevel) {
        for (var i = 0; i < indentLevel; i++)
          indent += "&nbsp;&nbsp;";
      }
      return indent;
    };
    
    this.displayEntry = function(queries, entry, indentLevel) {
      switch (entry.type) {
        case "group": this.displayGroup(queries, entry, indentLevel); break;
        case "stat": this.displayStat(queries, entry, indentLevel); break;
      }
    };
    
    this.displayGroup = function (queries, group, indentLevel) {
      if (indentLevel === undefined)
        indentLevel = 0;
      var indent = this.getIndent(indentLevel);
      var entry = $("#templates .statsgroupentry").clone();
      entry.find(".indent").html(indent);
      entry.find(".name").text(group.name);
      this.selector.append(entry);
      
      for (m in group.members)
        this.displayEntry(queries, group.members[m], indentLevel+1);
    };
    
    this.displayStat = function (queries, stat, indentLevel) {
      var self = this;
      var indent = this.getIndent(indentLevel);
      var entry = $("#templates .statsentry").clone();
      var query = this.queries[stat.query]();
      query.queryArgs = query["args_" + this.queryType](this.queryArgs);
      queries.push(query);
      entry.find(".indent").html(indent);
      entry.attr("id", this.cleanId(this.reportId + this.queryType + query.id));
      entry.click(function() { window.open(bugzilla.uiQueryUrl(translateTerms(query.queryArgs))); });
      entry.addClass("pagelink");
      entry.find(".name").text(stat.name);
      entry.find(".value").text("...");
      this.selector.append(entry);
    };

    this.cleanId = function(id) {
      return id.replace(/@/g, "").replace(/\./g, "").replace(/_/g, "").replace(/\//g, "");
    };
    
    this.queryDoneCb = function (query, queryType, results) {
      var total = results[query.id];
      var valueEntry = $("#" + this.cleanId(this.reportId + this.queryType + query.id)).find(".value");
      valueEntry.text(total);
    };

    this.allDoneCb = function() {
      this.callback();
    };
    
    this.displayQueries = function (forceUpdate, callback) {
      this.callback = callback;
      var i;
      var self = this;
      var queries = [];
      var previousWasGroup = false; 
      
      for (i = 0; i < this.displayedQueries.length; i++) {
        if (previousWasGroup) {
          var sep = $("#templates .statsgroupsep").clone();
          this.selector.append(sep);
        }
        this.displayEntry(queries, this.displayedQueries[i], 0);
        previousWasGroup = (this.displayedQueries[i].type == "group"); 
      }
      
      this.QueryRunner = new QueryRunner(
          forceUpdate,
          function(query, queryType, value) { self.queryDoneCb(query, queryType, value); },
          function() { self.allDoneCb(); }, queries, this.queryType);
      this.QueryRunner.go();
    }
  }
  
  function ToDoReportPanel(selector, queries, displayedQueries, prodcomps, queryType, reportId) {
    ReportPanel.call(this, selector, queries, displayedQueries, prodcomps, queryType, reportId);

    this.classid = 'ToDoReportPanel';
    this.statsByProdComp = {};

    this.displayStat = function (queries, stat, indentLevel) {
      var query = this.queries[stat.query]();
      var self = this;
      var indent = this.getIndent(indentLevel);
      var entry;
      var q;
      var qa;

      entry = $("#templates .statsentry").clone();
      entry.find(".indent").html(this.getIndent(indentLevel));
      entry.attr("id", this.cleanId(this.reportId + this.queryType + query.id));
      entry.addClass("pagelink");
      entry.find(".name").text(stat.name);
      entry.find(".value").text("...");
      entry.attr("title", "");
      entry.attr("tipsy-state", "hide");
      entry.tipsy({gravity: 'w', html: true, trigger: 'manual', opacity: 1});
      entry.click(function() {
        var state = $(this).attr("tipsy-state");
        self.selector.find(".statsentry").each(function() { $(this).tipsy("hide");  $(this).attr("tipsy-state", "hide"); });
        if (state == "hide") {
          $(this).tipsy("show");
          $(this).attr("tipsy-state", "show");
        }
        return false;
      });
      this.selector.append(entry);
      
      for (var i = 0; i < this.queryArgs.length; i++) {
        q = {};
        $.extend(q, query);
        qa = {};
        $.extend(qa, this.queryArgs[i]);
        q.queryArgs = qa;
        queries.push(q);
      }
    };

    this.fullStatsText = function(queryId) {
      var text = '';
      var entries = [];
      for (s in this.statsByProdComp[queryId]) {
        entries.push(s);
      }
      entries.sort();
      for (var i = 0; i < entries.length; i++) {
        s = entries[i];
        text += '<a href="' + this.statsByProdComp[queryId][s].url + '" target="_blank">' + s + ': ' + this.statsByProdComp[queryId][s].value + '</a><br/>';
      }
      return text;
    };

    this.queryDoneCb = function (query, queryType, results) {
      var statValue = results[query.id];
      if (this.statsByProdComp[query.id] === undefined) {
        this.statsByProdComp[query.id] = {};
      }
      var bugUrl = bugzilla.uiQueryUrl(translateTerms(query["args_" + queryType](query.queryArgs)));
      var argString = query.queryArgs[0];
      if (query.queryArgs[1]) {
        argString += " | " + query.queryArgs[1]
      }
      this.statsByProdComp[query.id][argString] = {value: statValue, url: bugUrl};
      var total = 0;
      for (s in this.statsByProdComp[query.id]) {
        total += this.statsByProdComp[query.id][s].value;
      }
      var entry = $("#" + this.cleanId(this.reportId + this.queryType + query.id));
      entry.attr("title", this.fullStatsText(query.id));
      var valueEntry = entry.find(".value");
      valueEntry.text(total);
    };

  }
  ToDoReportPanel.prototype = new ReportPanel;
  
  /**
   * Report: Creates a panel with statistics.  If detailed, adds to-do and most-active panels.
   */
  function Report(reportType, id, name, division, detailed, topLevel) {
    this.reportType = reportType;
    this.id = id;
    this.name = name;
    this.division = division;
    this.detailed = detailed;
    this.topLevel = topLevel;
    this.reportCell = null;
    this.stuffToDo = null;
    this.mostActive = null;
    this.allDoneOnce = false;
    this.allToDoDoneOnce = false;
    this.allDoneMostActiveOnce = false;
    
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
    
    this.topLevelSetup = function() {
    };
    
    this.setupReportDisplay = function (selector) {
      this.reportCell = $("#templates td." + (this.detailed ? "detailed" : "") + "reportcell").clone();
      
      this.name_entry = this.reportCell.find(".name");
      this.name_entry.text(this.name);
      this.name_entry.addClass("loading");
      
      this.stats = this.reportCell.find(".stats");
      this.stats.addClass("nodisplay");
     
      if (this.topLevel) {
        this.topLevelSetup();
      }
      
      selector.append(this.reportCell);
      
      if (this.detailed) {
        var reportbox = this.reportCell.find(".detailedreportbox");
        this.reportCell.attr("colspan", "0");
        
        this.stuffToDo = $("#templates .detailedreportfield").clone();
        this.stuffToDo.find(".name").text("Stuff to do...");
        this.stuffToDo.find(".name").addClass("loading");
        this.stuffToDo.find(".stats").addClass("nodisplay");
        
        this.mostActive = $("#templates .detailedreportfield").clone();
        this.mostActive.find(".name").text("Most Active Bugs");
        this.mostActive.find(".name").addClass("loading");
        
        $(reportbox.find(".detailedreportrow")).append(this.stuffToDo);
        $(reportbox.find(".detailedreportrow")).append(this.mostActive);
      }
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
      $("#mostactivebugs").remove();
      var table = this.showBugs(most_active.slice(0, 10));
      table.attr("id", "mostactivebugs");
      if (!this.allDoneMostActiveOnce) {
        this.allDoneMostActiveOnce = true;
        table.addClass("nodisplay");
        this.mostActive.append(table);
        this.mostActive.find(".name").removeClass("loading");
        table.css("visibility", "visible").hide().fadeIn("slow");
        table.removeClass("nodisplay");
        table.fadeIn();
      } else {
        this.mostActive.append(table);
      }
      var self = this;
      window.setTimeout(function() { self.loadMostActive(); }, 5*60*1000);
    }
    
    this.loadMostActive = function() {
      var self = this;
      require("app/ui/mostactive").get(function(bugs) { self.mostActiveLoaded(bugs); },
          this.queries, this.prodcomps());
    };
    
    this.allDoneCb = function() {
      if (this.allDoneOnce)
        return;
      this.allDoneOnce = true;
      this.name_entry.removeClass("loading");
      this.reportCell.find(".stats").css("visibility", "visible").hide().fadeIn("slow");
      this.reportCell.find(".stats").removeClass("nodisplay");
      this.reportCell.find(".stats").fadeIn();
      if (this.detailed && this.prodcomps() && this.prodcomps().length != 0) {
        this.loadMostActive();
      }
    };

    this.allDoneToDoCb = function() {
      if (this.allToDoDoneOnce)
        return;
      this.allToDoDoneOnce = true;
      this.stuffToDo.find(".name").removeClass("loading");
      /*
      this.stuffToDo.find(".stats").css('visibility','visible').hide().fadeIn('slow');
      this.stuffToDo.find(".stats").removeClass("nodisplay");
      this.stuffToDo.find(".stats").fadeIn();
      */
    };

    this.displayQueries = function (selector, forceUpdate) {
      this.selector = selector;
      var self = this;
      
      this.queryPanel = new ReportPanel(this.stats, this.queries, this.displayedQueries, this.usernames(),
          "assigned", this.reportType + this.id);
      this.queryPanel.classid = this.id + ' regular';
      
      this.queryPanel.displayQueries(forceUpdate, function() { self.allDoneCb(); });
      
      if (this.detailed) {
        var prodcomps = this.prodcomps();
        if (!prodcomps || prodcomps.length == 0) {
          var entry = $("#templates .statsmessage").clone();
          entry.find(".value").text("No products/components defined for this team");
          this.stuffToDo.find(".stats").append(entry);
          var entry2 = entry.clone();
          this.mostActive.append(entry2);
          this.mostActive.find(".name").removeClass("loading");
          this.allDoneToDoCb();
        } else {
          this.toDoQueryPanel = new ToDoReportPanel(this.stuffToDo.find(".stats"), this.queries, this.stuffToDoQueries,
              prodcomps, "unassigned", this.reportType + this.id);
          this.toDoQueryPanel.displayQueries(forceUpdate, function() { self.allDoneToDoCb(); });
        }
      }
    };
    
    this.init = function() {
      this.queries = require("queries").queries(this.division, this.usernames(), this.prodcomps());
    };
  }
  
  
  function TeamReport(teamId, division, team, detailed, topLevel, groupType) {
    if (groupType)
      this.groupType = groupType;
    else
      this.groupType = "team";
    Report.call(this, this.groupType, teamId, team.name, division, detailed, topLevel);
    this.team = team;
    this.indicatorLoaders = [];
    this.detailed = detailed;
    
    this.usernames = function () {
      var i;
      var l = [];
      if (this.team.members !== undefined) {
        l = l.concat(this.team.members.map(function(x) { return x.bugemail; }));
      }
      if (this.team.teams !== undefined) {
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
      if (this.team.teams !== undefined)
        teams = teams.concat(this.team.teams);
      for (i = 0; i < teams.length; i++) {
        if (teams[i].prodcomps !== undefined)
          prodcomps = prodcomps.concat(teams[i].prodcomps.map(function(x) { return [x.product, x.component]; }));
      }
      return prodcomps;
    };
    
    this.update = function (selector, forceUpdate) {
      this.indicatorLoaders = [];
      this.setupReportDisplay(selector);
      this.name_entry.addClass("pagelink");
      var self = this;
      if (this.groupType == "team")
        this.name_entry.click(function() { window.open(require("app/ui/hash").teamToHash(self.id)); });
      else
        this.name_entry.click(function() { window.open(require("app/ui/hash").divisionToHash(self.id)); });
      this.displayQueries(selector, forceUpdate);
    };

    this.topLevelSetup = function() {
      var interimRelName = $("#templates .statsentry").clone();
      interimRelName.find(".name").text("Next Interim Release");
      interimRelName.find(".value").text(this.team.next_interim_rel);
      var productRelName = $("#templates .statsentry").clone();
      productRelName.find(".name").text("Next Product Release");
      productRelName.find(".value").text(this.team.next_prod_rel);
      var sep = $("#templates .statsgroupsep").clone();
      this.stats.append(interimRelName);
      this.stats.append(productRelName);
      this.stats.append(sep);
    };
  }
  TeamReport.prototype = new Report;


  function UserReport(userId, user, division, team, detailed) {
    Report.call(this, "user", userId, user.nick ? user.nick : user.name, division, detailed, false);
    this.team = team;
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
    divisionReports = [];
    var reportCount = 0;
    var row = null;
    for (d in divisions) {
      if ((reportCount++ % REPORTS_PER_ROW) == 0) {
        row = template.clone();
        selector.append(row);
      }
      var report = new TeamReport(divisions[d].id, divisions[d], divisions[d], false, true, "division");
      report.init();
      divisionReports.push(report);
      report.update(row, forceUpdate);
    }
    fillRow(row, reportCount);
}

  function teamList(selector, template, forceUpdate, division, teams) {
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
      var report = new TeamReport(teamId, division, teams[t], false, false);
      report.init();
      teamReports.push(report);
      report.update(row, forceUpdate);
    }
    fillRow(row, reportCount);
  }

  function userList(selector, template, forceUpdate, division, team, users) {
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
      var report = new UserReport(userId, users[u], division, false);
      report.init();
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
      var report = new TeamReport(who.division, division, division, true, false, "division");
      report.init();
      teamReports.push(report);
      report.update(detailedReportContainer, forceUpdate);
      if ("teams" in division) {
        teamList($("#reports"), teamListTemplate, forceUpdate, division, division.teams);
        report.reportCell.attr("colspan", REPORTS_PER_ROW);
      }
    } else if (who.team != -1) {
      teamReports = [];
      var divisions = require("teams").get();
      var team = null;
      var division = null;
      for (i = 0; i < divisions.length; i++) {
        for (j = 0; j < divisions[i].teams.length; j++) {
          if (divisions[i].teams[j].id == who.team) {
            division = divisions[i];
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
      var report = new TeamReport(who.team, division, team, true, false);
      report.init();
      var teamCount = 0;
      teamReports.push(report);
      report.update(detailedReportContainer, forceUpdate);
      if ("members" in team) {
        userList($("#reports"), memberListTemplate, forceUpdate, division, team, team.members);
        report.reportCell.attr("colspan", REPORTS_PER_ROW);
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
      report.init();
      userReports.push(report);
      report.update(detailedReportContainer, forceUpdate);
    } else {
      divisionList($("#reports"), teamListTemplate, forceUpdate);
    }
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

  var adminCommand = {
      name: "admin-page",
      execute: function execute() {
        window.open("admin.html");  
      }
    };

  exports.init = function init() {
    require("app/commands").register(refreshCommand);
    require("app/commands").register(myStatsCommand);
    require("app/commands").register(topCommand);
    require("app/commands").register(adminCommand);
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
