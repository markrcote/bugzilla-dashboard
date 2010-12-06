Require.modules["teams"] = function(exports, require) {
  
  var callbacks = [];
  var divisions = {};
  
  exports.get = function get() {
    return divisions;
  };
  
  function divisionLoaded(response) {
    divisions = response["divisions"];
    callbacks.forEach(function(cb) { cb(divisions); });
  }

  exports.whenChanged = function whenChanged(cb) {
    callbacks.push(cb);
  };

  exports.loadTeams = function loadTeams() {
    require("app/server").query("GET", "/division/", divisionLoaded);
  };
};
