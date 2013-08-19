/**
 *  PiggyBank
**/

function Piggybank(root) { 

    var callManager = this;
    this.queue = [];
    this.results = {};
    this.deferred = null;
    this.timeout = 10000;
    this.root = root;
    this.last = null;
    this.ignore404 = false;

    this.addCall = function(url, method) { 
        var method = method === undefined ? 'get' : method;
        var index = this.queue.length;
        this.queue.push({ url: url, id: index, method: method });
    };

    this.makeCalls = function() { 
        callManager.deferred = $.Deferred();
        this.queue.forEach(function(api) { 
            var call = $.ajax({ 
                    url: callManager.root + api.url,
                    type: api.method,
                    timeout: callManager.timeout
            });

            if(callManager.last !== null) { 
                callManager.last.then(function(d) { 
                    callManager.last = call;
                    call
                        .done(callManager.callPassed(api.url, api.id))
                        .fail(callManager.callFailed(api.url, api.id));
                },
                function() { 
                    callManager.callFailed(api.url, api.id);
                });
            }
            else { 
                callManager.last = call;
                call
                    .done(callManager.callPassed(api.url, api.id))
                    .fail(callManager.callFailed(api.url, api.id));
            }

        });
        return callManager.deferred.promise();
    };

    this.makeCallsSynchronously = function() {
        return this.builder(0, $.Deferred());
    };

    this.builder = function(index, deferred, lastResult) { 

        if(lastResult !== undefined) { 
            callManager.postResult(lastResult, (index -1) );
        }
        else {
            callManager.deferred = $.Deferred();
        }

        if(index === callManager.queue.length) { 
            this.deferred.resolve(this.results);
        }
        else { 
            deferred.then(
                function() { 
                    $.ajax({ 
                        url: callManager.root + callManager.queue[index].url,
                        type: callManager.queue[index].method,
                        timeout: callManager.timeout
                    }).then( 
                        function(data, textStatus, jqXHR) { 
                            next = $.Deferred();
                            callManager.builder(++index, next, jqXHR);
                            next.resolve();
                        },
                        function(jqXHR, textStatus, errorThrown) { 
                            if(callManager.ignore404) {
                                next = $.Deferred();
                                callManager.builder(++index, next, jqXHR);
                                next.resolve();
                            }
                            else {
                                callManager.postResult(jqXHR, index);
                                callManager.deferred.resolve(callManager.results);
                            }
                        }
                    )
                }
            );
            deferred.resolve();
        }
        return callManager.deferred.promise();

    };

    this.callPassed = function(url, index) { 
        return function(data, textStatus, jqXHR) { 
            callManager.postResultAndCheckProgress(jqXHR, index);
        };
    };

    this.callFailed = function(url, index) { 
        return function(jqXHR, textStatus, errorThrown) { 
            callManager.postResultAndCheckProgress(jqXHR, index);
        };
    };

    /**
     *  Add result to list
    **/

    this.postResult = function(result, index) { 
        callManager.results[index] = { 
            url: callManager.queue[index].url,
            method: callManager.queue[index].method,
            status: result.status, 
            text: result.statusText
        };
    };

    /**
     *  Add result to list and check if all results are in
    **/

    this.postResultAndCheckProgress = function(result, index) { 
        this.postResult(result, index);
        if(callManager.queue.length === Object.keys(callManager.results).length) {
            callManager.deferred.resolve(callManager.results);
        }
    };

    /**
     *  Dumb output function for testing
    **/

    this.resultWriter = function(results) { 
        console.log(results);
    };

};
