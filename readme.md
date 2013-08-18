 
## Piggybank

REST API (Ajax HTTP) Call Manager that takes a sequential list of REST api calls and makes them in order, collates all the return codes/results, then delivers them all back together as one.

### Requirements

Piggybank requires JQuery v2.0.3

### Example

    var manager = new Piggybank();

    manager.addCall("/this");
    manager.addCall("/that");
    manager.addCall("/theother");

    manager.makeCalls().done(manager.resultWriter);

Calls will then be made in the order "/this", then "/that", then "/theother".

Piggybank will then collate results from all calls, returing only when all have completed. Results passed as results object to the passed in resultWriter function with integer keys denoted the results of each call.

e.g. obj[0] is result of first call, obj[1] result of second etc.

There's a resultWriter call available as part of the Piggybank instance (in the example above) which just passes the results to the browser console.
