/**
 *  PiggyBank
**/

function Piggybank() { 

    var callManager = this;
    this.queue = [];
    this.results = {};
    this.deferred = null;

    this.addCall = function(url, method) { 
        var method = method === undefined ? 'get' : method;
        var index = this.queue.length;
        this.queue.push({ url: url, id: index, method: method });
    };

    this.makeCalls = function() { 
        callManager.deferred = $.Deferred();
        this.queue.forEach(function(api) { 
            var call = $.ajax(
                { 
                    url: api.url,
                    type: api.method
                });
            call
                .done(callManager.callPassed(api.url, api.id))
                .fail(callManager.callFailed(api.url, api.id));
        });
        return callManager.deferred.promise();
    };

    this.callPassed = function(url, index) { 
        return function(data, textStatus, jqXHR) { 
            callManager.postResult(jqXHR, index);
        };
    };

    this.callFailed = function(url, index) { 
        return function(jqXHR, textStatus, errorThrown) { 
            callManager.postResult(jqXHR, index);
        };
    };

    /**
     *  Add result to list and check if all results are in
    **/

    this.postResult = function(result, index) { 
            callManager.results[index] = { 
                url: callManager.queue[index].url,
                method: callManager.queue[index].method,
                status: result.status, 
                text: result.statusText
            };
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
