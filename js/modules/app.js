const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY =  MS_PER_HOUR * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

Require.modules["app/teams"] = function(exports) {
  var teams = {
    layout: {
      name: "Layout",
      members: [
        ["Robert O'Callahan", "roc@ocallahan.org"],
        ["Ehsan Akhgari", "ehsan.akhgari@gmail.com"],
        ["David Baron", "dbaron@dbaron.org"],
        ["Brian Birtles", "birtles@gmail.com"],
        ["Chris Double", "chris.double@double.co.nz"],
        ["Elika Etemad", "fantasai.bugs@inkedblade.net"],
        ["Matthew Gregan", "kinetik@flim.org"],
        ["Mats Palmgren", "matspal@gmail.com"],
        ["Jonathan Kew", "jfkthame@gmail.com"],
        ["Simon Montagu", "smontagu@smontagu.org"],
        ["Cameron McCormack", "cam@mcc.id.au"],
        ["Josh Matthews", "josh@joshmatthews.net"],
        ["Daniel Holbert", "dholbert@mozilla.com"],
        ["Timothy Nikkel", "tnikkel@gmail.com"],
        ["Chris Pearce", "chris@pearce.org.nz"],
        ["Markus Stange", "mstange@themasta.com"],
        ["Tim Terriberry", "tterribe@vt.edu"],
        ["Karl Tomlinson", "karlt@mozbugz.karlt.net"],
        ["Michael Ventnor", "ventnor.bugzilla@gmail.com"],
        ["Jonathan Watt", "jwatt@jwatt.org"],
        ["Matt Woodrow", "matt.woodrow+bugzilla@gmail.com"],
        ["John Daggett", "jdaggett@mozilla.com"],
      ]
    },
    localization: {
      name: "Localization",
      members: [
        ["Seth Bindernagel", "sethb@mozilla.com"],
        ["Zbigniew Braniecki", "gandalf@aviary.pl"],
        ["Axel Hecht", "l10n@mozilla.com"],
        ["Stanislaw Malolepszy", "stas@mozilla.com"],
        ["Pascal Chvrel", "pascalc@gmail.com"],
        ["Delphine Lebedel", "lebedel.delphine@gmail.com"],
      ]
    },
    mobile: {
      name: "Mobile",
      members: [
        ["Stuart Parmenter", "pavlov@pavlov.net"],
        ["Brian Crowder", "crowderbt@gmail.com"],
        ["Fabrice Desre", "fabrice.desre@gmail.com"],
        ["Wesley Johnston", "wjohnston@mozilla.com"],
        ["Mark Finkle", "mark.finkle@gmail.com"],
        ["Matt Brubeck", "mbrubeck@mozilla.com"],
        ["Vivien Nicolas", "21@vingtetun.org"],
        ["Benjamin Stover", "webapps@stechz.com"],
        ["Brad Lassey", "blassey.bugs@lassey.us"],
        ["Alex Pakhotin", "apakhotin@mozilla.com"],
        ["Michael Wu", "mwu@mozilla.com"],
        ["Doug Turner", "doug.turner@gmail.com"],
        ["Mike Kristoffersen", "mkristoffersen@mozilla.com"],
        ["Alon Zakai", "azakai@mozilla.com"],
      ]
    },
    user_experience_firefox: {
      name: "User Experience Firefox",
      members: [
        ["Alexander Limi", "limi@mozilla.com"],
        ["Jennifer Boriss", "jboriss@mozilla.com"],
        ["Alex Faaborg", "faaborg@mozilla.com"],
        ["Stephen Horlander", "shorlander@mozilla.com"],
        ["Aza Raskin", "aza@mozilla.com"],
        ["Michael Yoshitaka Erlewine", "mitcho@mitcho.com"],
      ]
    },
    tools_and_automation: {
      name: "Tools and Automation",
      members: [
        ["Bob Moss", "bmoss@mozilla.com"],
        ["Mark Cote", "mcote@mozilla.com"],
        ["Ted Mielczarek", "ted.mielczarek@gmail.com"],
        ["Alice Nodelman", "anodelman@mozilla.com"],
        ["Clint Talbert", "ctalbert@mozilla.com"],
        ["Heather Arthur", "fayearthur+bugs@gmail.com"],
        ["Bob Clary", "bclary@bclary.com"],
        ["Jonathan Griffin", "jgriffin@mozilla.com"],
        ["Jeffrey Hammel", "jhammel@mozilla.com"],
        ["Joel Maher", "jmaher@mozilla.com"],
      ]
    },
    content: {
      name: "Content",
      members: [
        ["Jonny Stenback", "jst@mozilla.org"],
        ["Honza Bambas", "honzab.moz@firemni.cz"],
        ["Jason Duell", "jduell.mcbugs@gmail.com"],
        ["Blake Kaplan", "mrbkap@gmail.com"],
        ["Mounir Lamouri", "mounir.lamouri@gmail.com"],
        ["Justin Lebar", "justin.lebar+bug@gmail.com"],
        ["Olli Pettay", "olli.pettay@gmail.com"],
        ["Jonas Sicking", "jonas@sicking.cc"],
        ["Henri Sivonen", "hsivonen@iki.fi"],
        ["Ben Turner", "bent.mozilla@gmail.com"],
        ["Peter Van Der Beken", "peterv@propagandism.org"],
        ["Boris Zbarsky", "bzbarsky@mit.edu"],
      ]
    },
    general_platform: {
      name: "General Platform",
      members: [
        ["Damon Sicore", "dsicore@mozilla.com"],
        ["Josh Aas", "joshmoz@gmail.com"],
        ["David Bolter", "bolterbugz@gmail.com"],
        ["Steve Fink", "sphink@gmail.com"],
        ["Taras Glek", "tglek@mozilla.com"],
        ["Scott Greenlay", "sgreenlay@mozilla.com"],
        ["Brian Hackett", "bhackett1024@gmail.com"],
        ["Michal Novotny", "michal.novotny@gmail.com"],
        ["Mark Steele", "mwsteele@gmail.com"],
        ["Alexander Surkov", "surkov.alexander@gmail.com"],
        ["Steven Michaud", "smichaud@pobox.com"],
        ["Benjamin Smedberg", "benjamin@smedbergs.us"],
        ["Chris Jones", "jones.chris.g@gmail.com"],
        ["Jim Mathies", "jmathies@mozilla.com"],
        ["Dan Witte", "dwitte@gmail.com"],
        ["Rachel Zhang", "rachelzhang1@gmail.com"],
        ["Shawn Wilsher", "sdwilsh@forerunnerdesigns.com"],
      ]
    },
    engineering: {
      name: "Engineering",
      members: [
        ["Mike Shaver", "shaver@mozilla.org"],
      ]
    },
    graphics: {
      name: "Graphics",
      members: [
        ["Benoit Jacob", "bjacob@mozilla.com"],
        ["Benoit Girard", "bgirard@mozilla.com"],
        ["Jeff Muizelaar", "jmuizelaar@mozilla.com"],
        ["Bas Schouten", "bas.schouten@live.nl"],
        ["Bobby Holley", "bobbyholley+bmo@gmail.com"],
        ["Vladimir Vukicevic", "vladimir@pobox.com"],
      ]
    },
    firefox_front_end: {
      name: "Firefox Front End",
      members: [
        ["Jonathan Nightingale", "johnath@mozilla.com"],
        ["Rob Campbell", "rcampbell@mozilla.com"],
        ["Dao Gottwald", "dao@mozilla.com"],
        ["Christian Legnitto", "clegnitto@mozilla.com"],
        ["Jan Odvarko", "odvarko@gmail.com"],
        ["Gavin Sharp", "gavin.sharp@gmail.com"],
        ["Robert Strong", "robert.bugzilla@gmail.com"],
        ["Dave Townsend", "dtownsend@mozilla.com"],
        ["Kathleen Wilson", "kathleen95014@yahoo.com"],
        ["Dietrich Ayala", "dietrich@mozilla.com"],
        ["Marco Bonardo", "mak77@bonardo.net"],
        ["David Dahl", "ddahl@mozilla.com"],
        ["Neil Deakin", "enndeakin@gmail.com"],
        ["Drew Willcoxon", "adw@mozilla.com"],
        ["Justin Dolske", "dolske@mozilla.com"],
        ["Margaret Leibovic", "margaret.leibovic@gmail.com"],
        ["Blair McBride", "bmcbride@mozilla.com"],
        ["Paul O'Shannessy", "paul@oshannessy.com"],
        ["Frank Yan", "fryn@frankyan.com"],
      ]
    },
    security: {
      name: "Security",
      members: [
        ["Lucas Adamski", "ladamski@mozilla.com"],
        ["David Chan", "dchan@mozilla.com"],
        ["Gary Kwong", "gary@rumblingedge.com"],
        ["Jesse Ruderman", "jruderman@gmail.com"],
        ["Sid Stamm", "sstamm@mozilla.com"],
        ["Brandon Sterne", "bsterne@mozilla.com"],
        ["Daniel Veditz", "dveditz@mozilla.com"],
      ]
    },
    js: {
      name: "JS",
      members: [
        ["Rob Sayre", "sayrer@gmail.com"],
        ["David Mandelin", "dvander@alliedmods.net"],
        ["Andreas Gal", "gal@uci.edu"],
        ["Tom Austin", "taustin@mozilla.com"],
        ["David Anderson", "dvander@alliedmods.net"],
        ["Paul Biggar", "pbiggar@mozilla.com"],
        ["Jim Blandy", "jimb@mozilla.com"],
        ["Igor Bukanov", "igor@mir2.org"],
        ["Andrew Drake", "adrake@mozilla.com"],
        ["Graydon Hoare", "graydon@mozilla.com"],
        ["Bruce Hoult", "bruce@hoult.org"],
        ["Christopher Leary", "cdleary@mozilla.com"],
        ["Nicholas Nethercote", "nnethercote@mozilla.com"],
        ["Jason Orendorff", "jorendorff@mozilla.com"],
        ["Julian Sweard", "jseward@acm.org"],
        ["Brian Smith", "bsmith@mozilla.com"],
        ["Sean Stangl", "sstangl@mozilla.com"],
        ["Gregor Wagner", "anygregor@gmail.com"],
        ["Luke Wagner", "lw@mozilla.com"],
        ["Jeff Walden", "jwalden+bmo@mit.edu"],
        ["Brendan Eich", "brendan@mozilla.org"],
        ["Roy Frostig", "froystig@cs.stanford.edu"],
      ]
    },
    developer_tools: {
      name: "Developer Tools",
      members: [
        ["Kevin Dangoor", "kdangoor@mozilla.com"],
        ["Mihai Sucan", "mihai.sucan@gmail.com"],
        ["Joe Walker", "jwalker@mozilla.com"],
        ["Patrick Walton", "pwalton@mozilla.com"],
      ]
    },  };

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
          type0_HYPH_0_HYPH_0: 'substring',
          value0_HYPH_0_HYPH_0: 'beta',
          field0_HYPH_0_HYPH_1: 'cf_blocking_20',
          type0_HYPH_0_HYPH_1: 'substring',
          value0_HYPH_0_HYPH_1: 'final',
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
  exports.patches_awaiting_review = function(username) {
    return {
      id: 'patches_awaiting_review',
      name: 'Patches awaiting review',
      requires_user: true,
      args: function() {
        // username is mandatory
        return {
          type0_HYPH_1_HYPH_0: "substring",
          field0_HYPH_1_HYPH_0: "flagtypes.name",
          field0_HYPH_0_HYPH_0: "setters.login_name",
          resolution: "---",
          value0_HYPH_1_HYPH_0: "review?",
          type0_HYPH_0_HYPH_0: "substring",
          value0_HYPH_0_HYPH_0: username
        };
      }
    };
  };
  exports.review_queue = function(username) {
    return {
      id: 'review_queue',
      name: 'Review queue',
      requires_user: true,
      args: function() {
        return {
          field0_HYPH_0_HYPH_0: "flag.requestee",
          type0_HYPH_0_HYPH_0: "substring",
          value0_HYPH_0_HYPH_0: username,
          resolution: "---"
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
          value0_HYPH_0_HYPH_0: 'crash topcrash',
          field0_HYPH_1_HYPH_0: 'cf_blocking_20',
          type0_HYPH_1_HYPH_0: 'substring',
          value0_HYPH_1_HYPH_0: 'beta',
          field0_HYPH_1_HYPH_1: 'cf_blocking_20',
          type0_HYPH_1_HYPH_1: 'substring',
          value0_HYPH_1_HYPH_1: 'final',
          resolution: '---'
        };
        if (username) {
          a.type0_HYPH_2_HYPH_0 = 'equals',
          a.field0_HYPH_2_HYPH_0 = 'assigned_to',
          a.value0_HYPH_2_HYPH_0 = username
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

  function setupDocumentTitleChanger(document) {
    const BASE_TITLE = document.title;

    require("app/who").whenChanged(
      function changeTitle(who) {
        var title = BASE_TITLE;

        if (who.user)
          title = who.user + "'s " + BASE_TITLE;
        else if (who.group)
          title = who.group + "'s " + BASE_TITLE;

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

  function getUserStat(username, isAuthenticated, forceUpdate, query, getUserStatCb) {
    if (!forceUpdate) {
      var cacheKey = username + "_" + (isAuthenticated ? "PRIVATE" : "PUBLIC") + "/" + query.id;
      if (cache.haskey(cacheKey)) {
        var cached = cache.get(cacheKey);
        getUserStatCb(username, query, cached);
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
            getUserStatCb(username, query, response.data);
          });
      });
  }

  function quickstats(username, isAuthenticated, forceUpdate, query, quickStatsCb) {
    getUserStat(username, isAuthenticated, forceUpdate, query,
      function(username, query, value) {
        quickStatsCb(username, query, value);
      }
    );
  }

  function displayQuickstats(selector, username, isAuthenticated, forceUpdate, query, quickStatsCb) {
    var entry = $("#templates .statsentry").clone();
    entry.find(".name").text(query.name);
    entry.find(".value").text("...");
    $(selector).append(entry);

    entry.find(".value").addClass("loading");

    quickstats(username, isAuthenticated, forceUpdate, query,
      function(username, query, value) {
        showStats($(entry), value);
        if (quickStatsCb)
          quickStatsCb(username, query, value);
        entry.find(".value").removeClass("loading");
      }
    );
  }

  function allQuickStats(selector, myUsername, isAuthenticated, forceUpdate) {
    for (q in require("app/queries")) {
      var query = require("app/queries")[q](myUsername);
      if (query.requires_user && !myUsername)
        continue;
      displayQuickstats(selector, myUsername, isAuthenticated, forceUpdate, query);
    }
  }

  function teamStats(selector, teamId, isAuthenticated, forceUpdate, includeMembers) {
    var team = require("app/teams").get()[teamId];
    var teamEntry = $("#templates .teamentry").clone();
    teamEntry.find(".teamname").text(team.name);
    var table = teamEntry.find(".teamstatstable")
    var rowTemplate = table.find(".stats-row").remove();
    $(selector).append(teamEntry);
    
    var totalsRow = rowTemplate.clone();
    totalsRow.find(".name").text("Totals");
    totalsRow.find(".stats-cell").addClass("loading");
    var totalsStatsCell = totalsRow.find(".stats-cell");
    table.append(totalsRow);

    if (!includeMembers) {
       totalsRow.addClass("teamlink");
       totalsRow.click(
        function onClick() {
          var url = require("app/ui/hash").groupnameToHash(teamId);
          window.open(url);
        });
    }

    for (q in require("app/queries")) {
      var query = require("app/queries")[q]("");
      var entryId = "total" + query.id;
      var entry = $("#templates .statsentry").clone();
      entry.find(".name").text(query.name);
      entry.find(".value").text("0");
      entry.attr("id", entryId);
      totalsStatsCell.append(entry);
    }

    var numQueries = 0;
    
    function statsCb(username, query, value) {
      var entryId = "total" + query.id;
      var entry = totalsStatsCell.find('#' + entryId);
      incrStats(entry, value);
      if (--numQueries == 0)
        totalsRow.find(".stats-cell").removeClass("loading");
    }
    
    for (m in team.members) {
      if (includeMembers) {
        var row = rowTemplate.clone();
        row.find(".name").text(team.members[m][0]);
        table.append(row);
      }
      for (q in require("app/queries")) {
        ++numQueries;
        var query = require("app/queries")[q](team.members[m][1]);
        if (includeMembers)
          displayQuickstats(row.find(".stats-cell"), team.members[m][1], isAuthenticated, forceUpdate, query, statsCb);
        else
          quickstats(team.members[m], isAuthenticated, forceUpdate, query, statsCb);
      }
    }
  }

  function teamList(selector, isAuthenticated, forceUpdate) {
    var teams = require("app/teams").get();
    for (t in teams) {
      teamStats(selector, t, isAuthenticated, forceUpdate, false);
    }
  }

  function userStats(selector, username, isAuthenticated, forceUpdate) {
    if (username) {
      $(selector).find("h2").addClass("loading");
      xhrQueue.enqueue(
        function() {
          return bugzilla.user(
            username,
            function(response) {
              $(selector).find("h2").removeClass("loading");
              allQuickStats(selector, username, isAuthenticated, forceUpdate);
            },
            function(response) {
              $(selector).find("h2").removeClass("loading");
              $(selector).text("No such user exists!");
            });
        });
    } else {
      allQuickStats(selector, username, isAuthenticated, forceUpdate);
      teamList(selector, isAuthenticated, forceUpdate);
    }
  }

  function update(who, isAuthenticated, forceUpdate) {
    xhrQueue.clear();

    $("#quickstats").html("");

    if (who.group)
      teamStats("#quickstats", who.group, isAuthenticated, forceUpdate, true);
    else
      userStats("#quickstats", who.user, isAuthenticated, forceUpdate);
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
