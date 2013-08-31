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
            return eval("piggy.memory." + key);
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

        if(lastResult !== undefined) { 
            piggy.postResult(lastResult, piggy.queue[index-1].data );
        }
        else { 
            piggy.deferred = $.Deferred();
        }

        if(index === piggy.queue.length) { 
            this.deferred.resolve(this.results);
        }
        else { 
            deferred.then( 
                function() { 
                    piggy.ajaxCall(piggy.queue[index])
                    .then( 
                        function(data, textStatus, jqXHR) { 
                            piggy.ajaxSuccess();
                            if(piggy.stopOnSurprise && piggy.queue[index].data.expect !== undefined) { 
                                if(jqXHR.status !== piggy.queue[index].data.expect) { 
                                    quitTestCycle(jqXHR, piggy.queue[index].data);
                                }
                            }
                            continueTestCycle(jqXHR);
                        },
                        function(jqXHR, textStatus, errorThrown) { 
                            piggy.ajaxFailure();
                            if((jqXHR.status === 404 && piggy.ignore404) || (piggy.ignoreErrors === true)) { 
                                    continueTestCycle(jqXHR);
                            }
                            else { 
                                quitTestCycle(jqXHR, piggy.queue[index].data);
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
                            apiData.data.cookies[c] = eval("piggy.memory." + apiData.data.cookies[c].recall);     // smell - needs functional fix
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
        //console.log(config);
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
        piggy.results[callData.id] = { 
            url:    piggy.queue[callData.id].url,
            data:   callData,
            status: result.status, 
            text:   result.statusText
        };

        if(callData.expect !== undefined) { 
            if(result.status === callData.expect) { 
                piggy.results[callData.id].data.expected = true;
                piggy.results['summary'].passes.push(callData.id);
                if(piggy.results['summary'].passed === null) {
                    piggy.results['summary'].passed = true;
                }
            }
            else {
                piggy.results[callData.id].data.expected = false;
                piggy.results['summary'].fails.push(callData.id);
                piggy.results['summary'].passed = false;
            }
        }

        if(callData.schema !== undefined) { 
            if(tv4 !== undefined) { 
                try { 
                    var json = JSON.parse(result.responseText);
                    var validation = tv4.validateMultiple(json, callData.schema);
                    // console.log("JSON received from server: " + result.responseText);
                }
                catch(e) { 
                    var problem = "Invalid JSON (" + result.responseText + ") received from server";
                    // console.log(problem);
                    // console.log(e);
                    var validation = problem;
                }
                piggy.results[callData.id].data.schemaCheck = validation;
            }
            else {
                console.log("schema passed but tv4 lib not included in page");
            }
        }

        if(callData.remember !== undefined) { 
            piggy.memory[callData.remember] = callData[callData.remember] = result.responseJSON;
            //console.log("Saving");
            //console.log(result.responseJSON);
            //console.log("-in-");
            //console.log(callData.remember);
        }
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

};
