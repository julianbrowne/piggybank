 
## Piggybank

REST API (Ajax HTTP) Call Manager that takes a sequential list of REST api calls and makes them in order, collates all the return codes/results, then delivers them all back together as one.

Piggybank can manage both async and sync (wait for last to complete before next one starts) calls.

### Requirements

Piggybank requires JQuery v2.0.3

### Example (Async)

    var manager = new Piggybank("http://127.0.0.1");

    manager.timeout = 1000;                 // ms timeout. Default is 10000 (10 secs)

    manager.addCall("/this");               // "get" by default
    manager.addCall("/that", "post");       // or "post"
    manager.addCall("/theother", "put");

    manager.makeCalls().done(manager.resultWriter);

Piggybank is instantiated with the root server calls are to be made to. Beware of Same Origin Policy if calling to a host/port combo that's different from the one Piggbank is running on. There's no [JSONP](http://en.wikipedia.org/wiki/JSONP) support in Piggybank yet. Cross domain calls will work through Piggybank/JQuery as long as the remote host is set up to suport [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).

Calls will then be made in the order "/this", then "/that", then "/theother".

Piggybank will then collate results from all calls, returing only when all have completed.  

Results passed as results object to the resultWriter function with integer keys denoting the results of each call.

e.g. obj[0] is result of first call, obj[1] result of second etc.

Each result object contains the http response code status (obj.status) and the textual equivilent (obj.text).

e.g.

    {
        "0": {
            "url":"test.html",
            "method":"get",
            "status":200,
            "text":"OK"
        },

        "1": {
            "url":"index.html",
            "method":"post",
            "status":200,
            "text":"OK"
        },

        "2": {
            "url":"not-there.html",
            "method":"put",
            "status":404,
            "text":"Not Found"
        }
    }

There's a resultWriter call available as part of the Piggybank instance (in the example above) which just passes the results to the browser console.

### Example (Sync)

Piggybank does not use the JQuery async false option for making ajax requests, but rather constructs a chain of calls using JQuery's Defferred/then/done. Whereas in async mode all calls are made regardless of failure, in sync mode once a call fails the others will not fire.

The set up is identical to async mode but with a different call to kick start execution:

    var manager = new Piggybank("http://127.0.0.1");

    manager.addCall("/this");       
    manager.addCall("/that", "post");
    manager.addCall("/theother", "put");

    manager.makeCallsSynchronously().done(result_writer_callback_here);


