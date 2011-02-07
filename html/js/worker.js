const EVENTS = ["abort", "error", "load"];

var active = null;
var jobId = -1;

var data = null;

function onLoad(event) {
  var response;
  if (event.target && event.target.responseText) {
    try {
      response = JSON.parse(event.target.responseText);
    } catch (e) {
      response = "";
    }
  }
  jobId = -1;
  postMessage(["load", response]);
}

function onError(event) {
  var xhr = event.target;
  var response = {};
  if (xhr.responseText) {
    response = JSON.parse(xhr.responseText);
  }
  jobId = -1;
  postMessage(["error", response]);
}

function onAbort(event) {
  var response = {};
  var xhr = event.target;
  if (xhr.responseText) {
    response = JSON.parse(xhr.responseText);
  }
  jobId = -1;
  postMessage(["abort", response]);
}

onmessage = function(event) {
  if (event.data) {
    if (event.data.abort) {
      if (event.data.abort == jobId)
        active.abort();
    } else {
      jobId = event.data.jobId;
      var xhr = new XMLHttpRequest();
      xhr.open(event.data.method, event.data.url);
      for (h in event.data.headers)
        xhr.setRequestHeader(event.data.headers[h][0], event.data.headers[h][1]);
      if (event.data.body)
        xhr.setRequestHeader("Content-length", event.data.body.length);
      xhr.addEventListener("load", onLoad, false);
      xhr.addEventListener("error", onError, false);
      xhr.addEventListener("abort", onAbort, false);
      active = xhr;
      if (event.data.body)
        xhr.send(event.data.body)
      else
        xhr.send(null);
      active = xhr;
    }
  }
}