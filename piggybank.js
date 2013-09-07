/**
 *  PiggyBank
**/

function Piggybank(root, options) { 

    var piggy = this;
    this.queue = [];
    this.results = {};
    this.deferred = null;
    this.timeout = 10000;
    this.root = root;
    this.last = null;
    this.memory = {};
    this.logger = console.log;

    var options = (options === undefined) ? {} : options;

    setOption('ignore404', false);
    setOption('ignoreErrors', false);
    setOption('stopOnSurprise', true);

    this.results['summary'] = {
        ignoreErrors: this.ignoreErrors,
        ignore404: this.ignore404,
        tests: 0,
        passed: null,
        passes: [],
        fails: []
    };

    function setOption(option, def) {
        this[option] = (options[option] === undefined) ? def : options[option];
    };

    this.addCall = function(url, callData) { 
        callData = (callData === undefined) ? {} : callData;
        callData.method = (callData.method === undefined) ? 'get' : callData.method;
        callData.id = this.queue.length;
        this.queue.push({ url: url, data: callData });
        this.results['summary'].tests += 1;
    };

    this.recall = function(key) { 
        return function() { 
            return resolve(piggy.memory, key);
        }
    };

    this.log = function(message) {
        this.logger(message + "<br/>");
    }

    this.makeCalls = function() { 
        piggy.deferred = $.Deferred();
        this.queue.forEach(function(api) { 
            var call = piggy.ajaxCall(api);
            if(piggy.last !== null) { 
                piggy.last.then(function(d) { 
                    piggy.last = call;
                    call
                        .done(piggy.callPassed(api.url, api.data))
                        .fail(piggy.callFailed(api.url, api.data));
                },
                function() { 
                    piggy.callFailed(api.url, api.data);
                });
            }
            else { 
                piggy.last = call;
                call
                    .done(piggy.callPassed(api.url, api.data))
                    .fail(piggy.callFailed(api.url, api.data));
            }

        });
        return piggy.deferred.promise();
    };

    this.makeCallsSynchronously = function() { 
        // clear all cookies before start
        var cookies = document.cookie.split(";");
        for (var i=0; i < cookies.length; i++) { 
            var cookie = cookies[i];
            var eqPos = cookie.indexOf("=");
            var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            $.removeCookie(name);
        }
        var m = this.builder(0, $.Deferred());
        return m;
    };

    this.builder = function(index, deferred, lastResult) { 

        var apiCallData = piggy.queue[index];

        if(lastResult !== undefined) { 
            piggy.postResult(lastResult, piggy.queue[index-1].data );
        }
        else { 
            piggy.deferred = $.Deferred();
        }

        if(index === piggy.queue.length) { 
            this.deferred.resolve(piggy.results);
        }
        else { 
            deferred.then( 
                function() { 
                    piggy.ajaxCall(apiCallData)
                    .then( 
                        function(data, textStatus, jqXHR) { 
                            apiCallData.outcome.timer.end = Date.now();
                            apiCallData.outcome.timer.latency = apiCallData.outcome.timer.end - apiCallData.outcome.timer.start;
                            piggy.ajaxSuccess();
                            if(piggy.stopOnSurprise && apiCallData.data.expect !== undefined) { 
                                if(jqXHR.status !== apiCallData.data.expect) { 
                                    quitTestCycle(jqXHR, apiCallData.data);
                                }
                            }
                            continueTestCycle(jqXHR);
                        },
                        function(jqXHR, textStatus, errorThrown) { 
                            apiCallData.outcome.timer.end = Date.now();
                            apiCallData.outcome.timer.latency = apiCallData.outcome.timer.end - apiCallData.outcome.timer.start;
                            piggy.ajaxFailure();
                            if((jqXHR.status === 404 && piggy.ignore404) || (piggy.ignoreErrors === true)) { 
                                    continueTestCycle(jqXHR);
                            }
                            else { 
                                quitTestCycle(jqXHR, apiCallData.data);
                            }
                        }
                    )
                }
            );
            deferred.resolve();
        }
        return piggy.deferred.promise();

        function quitTestCycle(result, callData) { 
            piggy.postResult(result, callData);
            piggy.deferred.resolve(piggy.results);
        };

        function continueTestCycle(result) { 
            next = $.Deferred();                        // future object for this test
            piggy.builder(++index, next, result);       // all the other tests that must come first
            next.resolve();                             // resolve this test
        };

    };

    this.ajaxSuccess = function() {

    };

    this.ajaxFailure = function() {

    };

    this.ajaxCall = function(apiData) { 

        var config = { 
            url: piggy.root + apiData.url,
            type: apiData.data.method,
            headers: {},
            timeout: piggy.timeout
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
                        try {
                            apiData.data.cookies[c] = resolve(piggy.memory, apiData.data.cookies[c].recall);
                        }
                        catch(e) {
                            piggy.log("Could not resolve " + apiData.data.cookies[c].recall);
                            return;
                        }
                    }
                    $.cookie(c, apiData.data.cookies[c], { path: '/' });
                }
            );
        }

        // Add form encoded header and reformat request body

        if(apiData.data.encoding !== undefined) { 
            if(apiData.data.encoding === 'form') { 
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

        apiData.outcome = {
            timer: {
                start: Date.now()
            }
        };

        return $.ajax(config);
    };

    this.callPassed = function(url, callData) { 
        return function(data, textStatus, jqXHR) { 
            piggy.postResultAndCheckProgress(jqXHR, callData);
        };
    };

    this.callFailed = function(url, callData) { 
        return function(jqXHR, textStatus, errorThrown) { 
            piggy.postResultAndCheckProgress(jqXHR, callData);
        };
    };

    /**
     *  Add result to list
    **/

    this.postResult = function(result, callData) { 

        var apiCallId     = callData.id;
        var apiData       = piggy.queue[apiCallId];
        var resultSummary = piggy.results['summary'];

        apiResults = { 
            id: apiCallId,
            url: apiData.url,
            method: callData.method,
            callData: callData,
            outcome: apiData.outcome
        };

        if(apiData.data.expectation !== undefined) { 

            apiResults.expectation = apiData.data.expectation;

            apiResults.outcome.response = { 
                received: result.status, 
                text: result.statusText
            };

            if(result.status === apiResults.expectation.response) { 
                apiResults.outcome.response.expectationMet = true;
                resultSummary.passes.push(callData.id);
                if(resultSummary.passed === null) { 
                    resultSummary.passed = true;
                }
            }
            else {
                apiResults.outcome.response.expectationMet = false;
                resultSummary.fails.push(callData.id);
                resultSummary.passed = false;
            }

            if(apiResults.expectation.schema !== undefined) { 
                if(tv4 !== undefined) { 
                    try { 
                        var json = JSON.parse(result.responseText);
                        var validation = tv4.validateMultiple(json, apiResults.expectation.schema);
                    }
                    catch(e) { 
                        var problem = "Invalid JSON (" + result.responseText + ") received from server";
                        var validation = problem;
                    }
                    apiResults.outcome.schema = validation;
                    apiResults.outcome.schema.expectationMet = (apiResults.outcome.schema.valid === true) ? true : false;
                }
                else {
                    console.log("schema expectation set but tv4 lib not included in page");
                }
            }

            if(apiResults.expectation.latency !== undefined) {
                apiResults.outcome.timer.difference = parseInt(apiResults.outcome.timer.latency) - parseInt(apiResults.expectation.latency);
                if(apiResults.expectation.latency >= apiResults.outcome.timer.latency) { 
                    apiResults.outcome.timer.expectationMet = true;
                }
                else { 
                    apiResults.outcome.timer.expectationMet = false;
                }
            }

            //delete apiResults.callData.expectation;
        }
        else { 
            apiResults.expectation = { };
        }

        if(callData.remember !== undefined) { 
            piggy.memory[callData.remember] = callData[callData.remember] = result.responseJSON;
        }

        piggy.results[apiCallId] = apiResults;

    };

    /**
     *  Add result to list and check if all results are in
    **/

    this.postResultAndCheckProgress = function(result, callData) { 
        this.postResult(result, callData);
        if(piggy.queue.length === Object.keys(piggy.results).length) {
            piggy.deferred.resolve(piggy.results);
        }
    };

    function resolve(base, path) { 
        if(base === undefined) return undefined;
        var levels = path.split(".");
        var result = base;
        for(var i=0; i<levels.length; i++) { 
            var level = levels[i];
            if(result[level]!==undefined) { 
                result = result[level];
            }
            else { 
                console.log("Unable to resolve " + path);
                return undefined;
            }
        }
        return result;
    };


};
