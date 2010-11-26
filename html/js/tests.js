function raises(error, func, message) {
  if (!message)
    message = "function raises error: " + error;

  try {
    func();
    ok(false, message + " (no error was raised)");
  } catch (e) {
    equals(e.message, error, message);
  }
}

function equalObj(actual, expected, message) {
  for (i in actual) {
    if (typeof actual[i] == "object")
      push(equalObj(actual[i], expected[i], message));
    else
      equals(actual[i], expected[i], message);
  }
}

$(window).ready(function runTests() {
  for (name in window) {
    if (name.match(/^test.+/) &&
        name != "testDone" &&
        name != "testStart" &&
        typeof(window[name]) == "function") {
      test(name, window[name]);
    }
  }
});
