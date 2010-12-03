Require.modules["xhr/queue"] = function(exports, require) {
  
  function XHRWorker(onDone) {
    this.active = false;
    this.xhrData = null;
    this.worker = new Worker("js/worker.js");
    this.onDone = onDone;

    this.onWorkerMessage = function(event) {
      var responseType = event.data[0];
      var responseText = event.data[1];
        
      if (responseType == "load") {
        for (i in this.xhrData.onLoad)
          this.xhrData.onLoad[i](responseText);
      } else if (responseType == "error") {
        for (i in this.xhrData.onErr)
          this.xhrData.onErr[i](responseText);
      } else if (responseType == "log") {
        //console.log(responseText);
        return;
      }
      this.active = false;
      this.xhrData = null;
      this.onDone();
    };
    
    this.newJob = function(tag, xhrData) {
      this.active = true;
      this.xhrData = xhrData;
      var self = this;
      this.worker.onmessage = function(event) { self.onWorkerMessage(event) };
      var msg = {
          jobId: tag.jobId,
          method: this.xhrData.method,
          url: this.xhrData.url,
          headers: this.xhrData.headers,
          body: this.xhrData.body
        };
      //console.log('posting message:');
      //console.dir(msg);
      this.worker.postMessage(msg);
    };
    
    this.terminate = function() {
      this.worker.terminate();
      this.worker = new Worker("js/worker.js");
      this.active = false;
    }
    
    this.abort = function(jobId) {
      this.worker.postMessage({ abort: jobId });
    }
  }
  
  function XMLHttpRequestQueue() {
    const EVENTS = ["abort", "error", "load"];
    const NUM_WORKERS = 10;
    var nextJobId = 0;

    var queue = [];
    
    function onDone() {
      activateNextInQueue();
    };

    var workers = [];
    for (var i = 0; i < NUM_WORKERS; i++)
      workers.push(new XHRWorker(onDone));
    
    function activateNextInQueue() {
      var workerId = -1;
      for (var i = 0; i < workers.length; i++) {
        if (!workers[i].active) {
          workerId = i;
          break;
        }
      }
      if (workerId == -1)
        return;

      var worker = workers[workerId];

      var job = queue.splice(0, 1)[0];
      if (!job)
        return;
      job.tag.workerId = workerId;
        
      var xhrData = job.cb();
      if (!xhrData)
        throw new Error("enqueued callback did not return xhr");

      worker.newJob(job.tag, xhrData);
    }

    this.enqueue = function enqueue(cb) {
      var tag = {workerId: -1, jobId: nextJobId++};
      queue.push({tag: tag, cb: cb});
      activateNextInQueue();
      return tag;
    };

    this.clear = function clear() {
      queue = [];
      for (w in workers) {
        if (workers[w].active)
          workers[w].terminate();
      }
    };
    
    this.abort = function abort(tag) {
      if (tag.workerId == -1) {
        for (var i = 0; i < queue.length; i++) {
          if (queue[i].tag.jobId == tag.jobId)
            queue.splice(i, 1);
        }
      } else {
        workers[tag.workerId].abort(tag.jobId);
      }
    };
  }

  exports.create = function create() {
    return new XMLHttpRequestQueue();
  };
};
