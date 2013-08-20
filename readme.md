 
## Piggybank

REST API (Ajax HTTP) Call Manager that takes a sequential list of REST api calls and makes them in order, collates all the return codes/results, then delivers them all back together as one.

Piggybank can manage both async and sync (wait for last to complete before next one starts) calls.

### Requirements

Piggybank requires JQuery v2.0.3   
Tested on Chrome V28 but should work in most browsers   

### Example (Async)

    ...

    <script src="jquery-2.0.3.js"></script>
    <script src="piggybank.js"></script>

    ...

    <script>

        var manager = new Piggybank("http://127.0.0.1");

        manager.timeout = 1000;                            // ms timeout. Default is 10000 (10 secs)

        manager.addCall("/this");                          // "get" by default
        manager.addCall("/that", { method: "post"});       // or "post"
        manager.addCall("/theother", { method: "put" });

        manager.makeCalls().done(manager.resultWriter);

    </script>

Piggybank is instantiated with the root server calls are to be made to. Beware of Same Origin Policy if calling to a host/port combo that's different from the one Piggbank is running on. There's no [JSONP](http://en.wikipedia.org/wiki/JSONP) support in Piggybank yet. Cross domain calls will work through Piggybank/JQuery as long as the remote host is set up to suport [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).

#### Arguments

Any keys passed as the second argument object will come back in the results list, making it easier to identify individual calls later. e.g.

    manager.addCall("/that", { method: "post", name: "posting some data to /that" });

If the data object contains a key called "expect" then this will be compared with the actual HTTP response code recieved and a key added to the results called "expected" with a true or false value depending on whether the return code matched that expected.

    manager.addCall("/that", { method: "post", name: "update that", expect: 204 });

#### Call Order

Calls will be made in the order "/this", then "/that", then "/theother". Piggybank will then collate results from all calls, returing only when all have completed or timed out.

#### Results

Results passed as results object to the resultWriter function with integer keys denoting the results of each call. e.g. obj[0] is result of first call, obj[1] result of second etc. Each result object contains the http response code status (obj.status) and the textual equivilent (obj.text).

e.g.

    {
        "0": {
            "url":"/this",
            "data" : {
                "method":"get",
                "id":"0"
            },
            "status":200,
            "text":"OK"
        },

        "1": {
            "url":"/that",
            "data" : {
                "method":"post",
                "id":"1",
                "name":"update that",
                "expect":"204",
                "expected":"true"
            },
            "status":204,
            "text":"OK"
        },

        "2": {
            "url":"theother",
            "data" : {
                "method":"put",
                "id":"2"
            },
            "status":404,
            "text":"Not Found"
        }
    }

There's a resultWriter call available as part of the Piggybank instance (in the example above) which just passes the results to the browser console.

### Example (Sync)

Piggybank does not use the [deprecated](http://api.jquery.com/jQuery.ajax/#jQuery-ajax-settings) JQuery { async: false } option for making ajax requests, but rather constructs a chain of calls using JQuery's [Deferred](http://api.jquery.com/category/deferred-object/) object. Whereas in async mode all calls are made regardless of failure, in sync mode once a call fails the others will not fire.

The set up is identical to async mode but with a different call to kick start execution:

    var manager = new Piggybank("http://127.0.0.1");

    manager.addCall("/this");       
    manager.addCall("/that", { method: "post"});
    manager.addCall("/theother", { method: "put" });

    manager.makeCallsSynchronously().done(result_writer_callback_here);

#### Error Handling

A 404 in JQuery ajax terms is considered an error. To ignore a 404 response and continue to the next API in sync mode simply set:

    manager.ignore404 = true;

Or to ignore all errors (5xx etc):

    manager.ignoreErrors = true;

