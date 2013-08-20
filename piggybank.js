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

    this.addCall = function(url, callData) { 
        callData = (callData === undefined) ? {} : callData;
        callData.method = (callData.method === undefined) ? 'get' : callData.method;
        callData.id = this.queue.length;
        this.queue.push({ url: url, data: callData });
    };

    this.makeCalls = function() { 
        callManager.deferred = $.Deferred();
        this.queue.forEach(function(api) { 
            var call = $.ajax({ 
                    url: callManager.root + api.url,
                    type: api.data.method,
                    timeout: callManager.timeout
            });

            if(callManager.last !== null) { 
                callManager.last.then(function(d) { 
                    callManager.last = call;
                    call
                        .done(callManager.callPassed(api.url, api.data))
                        .fail(callManager.callFailed(api.url, api.data));
                },
                function() { 
                    callManager.callFailed(api.url, api.data);
                });
            }
            else { 
                callManager.last = call;
                call
                    .done(callManager.callPassed(api.url, api.data))
                    .fail(callManager.callFailed(api.url, api.data));
            }

        });
        return callManager.deferred.promise();
    };

    this.makeCallsSynchronously = function() {
        return this.builder(0, $.Deferred());
    };

    this.builder = function(index, deferred, lastResult) { 

        if(lastResult !== undefined) { 
            callManager.postResult(lastResult, callManager.queue[index-1].data );
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
                        type: callManager.queue[index].data.method,
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
                                callManager.postResult(jqXHR, callManager.queue[index].data);
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

    this.callPassed = function(url, callData) { 
        return function(data, textStatus, jqXHR) { 
            callManager.postResultAndCheckProgress(jqXHR, callData);
        };
    };

    this.callFailed = function(url, callData) { 
        return function(jqXHR, textStatus, errorThrown) { 
            callManager.postResultAndCheckProgress(jqXHR, callData);
        };
    };

    /**
     *  Add result to list
    **/

    this.postResult = function(result, callData) { 
        console.log(callData);
        callManager.results[callData.id] = { 
            url: callManager.queue[callData.id].url,
            data: callManager.queue[callData.id].data,
            status: result.status, 
            text: result.statusText
        };
    };

    /**
     *  Add result to list and check if all results are in
    **/

    this.postResultAndCheckProgress = function(result, callData) { 
        this.postResult(result, callData);
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
