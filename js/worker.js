const EVENTS = ["abort", "error", "load"];

var active = null;

var data = null;

function onLoad(event) {
  var xhr = event.target;
  var response = JSON.parse(xhr.responseText);
  postMessage(["load", response]);
}

function onError(event) {
  var xhr = event.target;
  var response = JSON.parse(xhr.responseText);
  postMessage(["error", response]);
}

function onAbort(event) {
  var xhr = event.target;
  var response = JSON.parse(xhr.responseText);
  postMessage(["abort", response]);
}

onmessage = function(event) {
  if (event.data) {
    var xhr = new XMLHttpRequest();
    xhr.open(event.data.method, event.data.url);
    for (h in event.data.headers)
      xhr.setRequestHeader(event.data.headers[h][0], event.data.headers[h][1]);
    xhr.addEventListener("load", onLoad, false);
    xhr.addEventListener("error", onError, false);
    xhr.addEventListener("abort", onAbort, false);
    active = xhr;
    xhr.send(null);
  }
}