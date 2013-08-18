 
## Piggybank

REST API (Ajax HTTP) Call Manager that takes a sequential list of REST api calls and makes them in order, collates all the return codes/results, then delivers them all back together as one.

### Requirements

Piggybank requires JQuery v2.0.3

### Example

    var manager = new Piggybank();

    manager.addCall("/this");               // "get" by default
    manager.addCall("/that", "post");       // or "post"
    manager.addCall("/theother", "put");

    manager.makeCalls().done(manager.resultWriter);

Calls will then be made in the order "/this", then "/that", then "/theother".

Piggybank will then collate results from all calls, returing only when all have completed.  

Results passed as results object to the resultWriter function with integer keys denoting the results of each call.

e.g. obj[0] is result of first call, obj[1] result of second etc.

Each result object contains the http response code status (obj.status) and the textual equivilent (obj.text).

e.g.

    {
        "0":{"status":200,"text":"OK"},
        "1":{"status":200,"text":"OK"},
        "2":{"status":404,"text":"Not Found"}
    }

There's a resultWriter call available as part of the Piggybank instance (in the example above) which just passes the results to the browser console.
