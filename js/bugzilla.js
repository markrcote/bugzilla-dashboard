Require.modules["bool-chart"] = function(exports) {
  exports.boolChart = function boolChart(ands, chartNum) {
    var A = 0;
    if (chartNum)
      A = chartNum;
    var curB = 0;
    var curC = 0;
    
    var args = {};
    
    for (a in ands) {
      curB = 0;
      for (o in ands[a]) {
        curC = 0;
        // ors
        console.log(typeof ands[a][o]);
        for (t in ands[a][o]) {
          // triples
          console.dir(ands[a][o][t]);
          args["field" + A + "-" + curB + "-" + curC] = ands[a][o][t].field;
          args["type" + A + "-" + curB + "-" + curC] = ands[a][o][t].type;
          args["value" + A + "-" + curB + "-" + curC] = ands[a][o][t].value;
          ++curC;
        }
        ++curB;
      }
    }
    return args;
  };
}

var Bugzilla = {
  BASE_URL: "https://api-dev.bugzilla.mozilla.org/latest",
  BASE_UI_URL: "https://bugzilla.mozilla.org",
  DEFAULT_OPTIONS: {
    method: "GET"
  },
  FIELD_NAME_MAP: {
    changed_after: "chfieldfrom",
    changed_before: "chfieldto",
    changed_field: "chfield",
    changed_field_to: "chfieldvalue"
  },
  getShowBugURL: function Bugzilla_getShowBugURL(id) {
    return this.BASE_UI_URL + "/show_bug.cgi?id=" + id;
  },
  queryString: function Bugzilla_queryString(data) {
    var parts = [];
    for (name in data) {
      var values = data[name];
      if (!values.forEach)
        values = [values];
      values.forEach(
        function(value) {
          parts.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
        });
    }
    return parts.join("&");
  },
  ajax: function Bugzilla_ajax(options) {
    var newOptions = {__proto__: this.DEFAULT_OPTIONS};
    for (name in options)
      newOptions[name] = options[name];
    options = newOptions;

    function onLoad(response) {
      if (!response.error)
        options.success(response);
      // TODO: We should really call some kind of error callback
      // if this didn't work.
    }

    function onErr() {
      options.fail();
    }

    var url = this.BASE_URL + options.url;

    if (options.data)
      url = url + "?" + this.queryString(options.data);
    
    var xhrData = {
      method: options.method,
      url: url,
      headers: [
        ["Accept", "application/json"],
        ["Content-Type", "application/json"]
      ],
      onLoad: [onLoad],
      onErr: []
    };
    if (options.fail)
      xhrData.onErr.push(onErr);
    return xhrData;
  },
  getBug: function Bugzilla_getBug(id, cb) {
    return this.ajax({url: "/bug/" + id,
                      success: cb});
  },
  search: function Bugzilla_search(query, cb) {
    return this.ajax({url: "/bug",
                      data: query,
                      success: cb});
  },
  count: function Bugzilla_count(query, cb) {
    return this.ajax({url: "/count",
                      data: query,
                      success: cb});
  },
  user: function Bugzilla_user(userid, cb, errcb) {
    return this.ajax({url: "/user/" + userid,
                      data: {},
                      success: cb,
                      fail: errcb});
    
  },
  uiQueryUrl: function Bugzilla_uiQuery(query) {
    var newTerms = {};
    for (q in query) {
      if (q in this.FIELD_NAME_MAP)
        newTerms[this.FIELD_NAME_MAP[q]] = query[q];
      else if (q.slice(0, 5) == "field" && query[q] in this.FIELD_NAME_MAP) // boolean charts
        newTerms[q] = this.FIELD_NAME_MAP[query[q]];
      else
        newTerms[q] = query[q];
    }
    return this.BASE_UI_URL + "/buglist.cgi?" + this.queryString(newTerms);
  }
};
