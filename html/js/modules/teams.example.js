/* Insert your team data and rename this file to teams.js */

Require.modules["teams"] = function(exports) {
  var default_teams = {
    foo: {
      name: "Team Foo",
      members: [
        ["Mark Cote", "mcote@mozilla.com"]
      ]
    },
    bar: {
      name: "Team Bar",
      members: [
        ["Clint Talbert", "ctalbert@mozilla.com"]
      ]
    }
  };
  
  exports.get = function get() {
    return default_teams;
  };
};
