Require.modules["xhr/queue"] = function(exports, require) {
  
  function XHRWorker(onDone) {
    this.active = false;
    this.xhrData = null;
    this.worker = new Worker("js/worker.js");
    this.onDone = onDone;

    this.onWorkerMessage = function(event) {
      console.log("got message from worker");
      var responseType = event.data[0];
      var responseText = event.data[1];
        
      if (responseType == "load") {
        for (i in this.xhrData.onLoad)
          this.xhrData.onLoad[i](responseText);
      } else if (responseType == "error") {
        for (i in this.xhrData.onErr)
          this.xhrData.onErr[i](responseText);
      }
      this.active = false;
      this.xhrData = null;
      this.onDone();
    };
    
    this.newJob = function(xhrData) {
      this.active = true;
      this.xhrData = xhrData;
      var self = this;
      this.worker.onmessage = function(event) { self.onWorkerMessage(event) };
      this.worker.postMessage({
        method: this.xhrData.method,
        url: this.xhrData.url,
        headers: this.xhrData.headers
      });
    };
    
    this.terminate = function() {
      this.worker.terminate();
      this.worker = new Worker("js/worker.js");
      this.active = false;
    }
  }
  
  function XMLHttpRequestQueue() {
    const EVENTS = ["abort", "error", "load"];
    const NUM_WORKERS = 10;

    var queue = {};
    
    function onDone() {
      var freeWorker = getFreeWorker();
      if (freeWorker)
        activateNextInQueue(freeWorker);
    };

    var workers = [];
    for (var i = 0; i < NUM_WORKERS; i++)
      workers.push(new XHRWorker(onDone));
    
    function getFreeWorker() {
      for (w in workers) {
        if (!workers[w].active)
          return workers[w];
      }
      return null;
    }
    
    function activateNextInQueue(worker) {
      keys = [];
      for (pri in queue)
        keys.push(pri);
      keys.sort();
      
      if (keys.length) {
        var pri = keys[0];
        var cb = queue[pri].splice(0, 1)[0];
        if (queue[pri].length == 0)
          delete queue[pri];
        
        console.log("cb is of pri " + pri);
        
        var xhrData = cb();
        if (!xhrData)
          throw new Error("enqueued callback did not return xhr");

        worker.newJob(xhrData);
      }
    }

    this.enqueue = function enqueue(cb, pri) {
      if (!(pri in queue))
        queue[pri] = [cb];
      else
        queue[pri].push(cb);
      var freeWorker = getFreeWorker();
      if (freeWorker)
        activateNextInQueue(freeWorker);
    };

    this.clear = function clear() {
      for (pri in queue)
        delete queue[pri];
      for (w in workers) {
        if (workers[w].active)
          workers[w].terminate();
      }
    };
  }

  exports.create = function create() {
    return new XMLHttpRequestQueue();
  };
};
