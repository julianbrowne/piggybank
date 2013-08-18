/**
 *  PiggyBank
**/

function Piggybank() {

    var callManager = this;
    this.queue = [];
    this.results = {};
    this.deferred = null;

    this.addCall = function(url) {
        console.log('adding call ' + url);
        var index = this.queue.length;
        this.queue.push({ url: url, id: index });
    };

    this.makeCalls = function() {
        console.log('makeCalls');
        callManager.deferred = $.Deferred();
        this.queue.forEach(function(api) { 
            console.log("about to make api call to " + api.url);
            var call = $.get(api.url);
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
            console.log('checking call');
            callManager.results[index] = xhr.status;
            console.log("queue: " + callManager.queue.length + " results: " + Object.keys(callManager.results).length);
            if(callManager.queue.length === Object.keys(callManager.results).length) {
                console.log("All calls finished. Returning results.");
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
