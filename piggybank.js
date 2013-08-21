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
    this.memory = {};

    this.addCall = function(url, callData) { 
        callData = (callData === undefined) ? {} : callData;
        callData.method = (callData.method === undefined) ? 'get' : callData.method;
        callData.id = this.queue.length;
        this.queue.push({ url: url, data: callData });
    };

    this.recall = function(key) { 
        return function() { 
            return eval("callManager.memory." + key);
        }
    };

    this.makeCalls = function() { 
        callManager.deferred = $.Deferred();
        this.queue.forEach(function(api) { 
            var call = callManager.ajaxCall(api);
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
                    callManager.ajaxCall(callManager.queue[index])
                    .then( 
                        function(data, textStatus, jqXHR) { 
                            next = $.Deferred();
                            callManager.builder(++index, next, jqXHR);
                            next.resolve();
                        },
                        function(jqXHR, textStatus, errorThrown) { 
                            if(    (jqXHR.status === 404 && callManager.ignore404)
                                || (callManager.ignoreErrors === true) ) {
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

    this.ajaxCall = function(apiData) { 
        var config = { 
            url: callManager.root + apiData.url,
            type: apiData.data.method,
            headers: {},
            timeout: callManager.timeout
        };

        // Add request body

        if(apiData.data.body !== undefined) { 
            config.data = JSON.stringify(apiData.data.body);
        }

        // Add cookies

        if(apiData.data.cookies !== undefined) { 
            Object.keys(apiData.data.cookies).forEach(
                function(c) { 
                    if(typeof(apiData.data.cookies[c]) === 'object') {
                        apiData.data.cookies[c] = eval("callManager.memory." + apiData.data.cookies[c].recall);     // smell - needs functional fix
                    }
                    $.cookie(c, apiData.data.cookies[c], { path: '/' });
                }
            );
        }

        // Add form encoded header and reformat request body

        if(apiData.data.encoding !== undefined) { 
            if(apiData.data.encoding==='form') { 
                config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                config.data = "";
                Object.keys(apiData.data.body).forEach(
                    function(key) { 
                        config.data += key + "=" + encodeURIComponent(apiData.data.body[key]) + "&"
                    }
                );
                config.data = config.data.substring(0, config.data.length - 1);
                apiData.data.body = config.data;
            }
        }
        console.log(config);
        return $.ajax(config);
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
        callManager.results[callData.id] = { 
            url:    callManager.queue[callData.id].url,
            data:   callData,
            status: result.status, 
            text:   result.statusText
        };

        if(callData.expect !== undefined) { 
            if(result.status === callData.expect) { 
                callManager.results[callData.id].data.expected = true;
            }
            else {
                callManager.results[callData.id].data.expected = false;
            }
        }

        if(callData.remember !== undefined) { 
            callManager.memory[callData.remember] = callData[callData.remember] = result.responseJSON;
        }
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
