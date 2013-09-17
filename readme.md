 
## Piggybank

REST API (Ajax HTTP) Call Manager that takes a list of REST api calls and makes them sequentially, in order, collates all the return codes/results, then delivers them all back together as one.

Piggybank can manage both async and sync (wait for last to complete before next one starts) calls.

### Requirements

*   JQuery v2.0.3  
*   [JQuery Cookie](https://github.com/carhartl/jquery-cookie) 1.3.1 is used for cookie management  

Optionally:   
*   [tv4 JSON Schema Validator](https://github.com/geraintluff/tv4) 1.0.7 may be used for schema validation   
*   [URI Template]() 0.3.4 may be used to manage URI-templated URLs

Tested on Chrome V28 but should work in most browsers  

### Usage 

    ...

    <script src="jquery.js"></script>
    <script src="jquery.cookie.js"></script>    <!-- optional, for cookie management -->
    <script src="tv4.js"></script>              <!-- optional, for schema validation -->
    <script src="uirtemplate.js"></script>      <!-- optional, for uri template management -->
    <script src="piggybank.js"></script>

    ...

    <script>
        var manager = new Piggybank("http://127.0.0.1");
    </script>

Piggybank is instantiated with the root server calls are to be made to. Beware of Same Origin Policy if calling to a host/port combo that's different from the one Piggbank is running on. There's no [JSONP](http://en.wikipedia.org/wiki/JSONP) support in Piggybank yet. Cross domain calls will work through Piggybank/JQuery as long as the remote host is set up to suport [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).

#### Options

Piggybank takes an optional second argument object containing settings for the API calls to be made. e.g.

        var manager = new Piggybank("http://127.0.0.1", { timeout: 1000 });

Valid options are:

*   **timeout: ms (default )** timeout for calls in ms
*   **ignore404: true | false (default )** ignore 404 errors in sync mode and continue to next API call
*   **ignoreErrors: true | false (default )** ignore all HTTP errors (5xx etc) in sync mode and continue to next API call
*   **stopOnSurprise: true | false (default )** Where an expect code is set, it's also possible to indicate that subsequent calls should be abandoned if there's a mismatch between expected and actual HTTP response codes. This is useful when, for example, a login call fails and the rest of the calls become irrelevant or where following calls might have unpredictable and destructive effects.
*   **logger: function (default none)** Piggybank logs useful information to the browser console by default. It's possible to override the default action by passing on a reference to a logging function.

### Example (Async)

    manager.addCall("/this");                          // "get" by default
    manager.addCall("/that", { method: "post"});       // or "post"
    manager.addCall("/theother", { method: "put" });

    manager.makeCalls().done(resultCallback);

Calls will be made asynchronously in the order "/this", then "/that", then "/theother". Piggybank will then collate results from all calls, returing only when all have completed or timed out. Individual calls will return in unpredicatble order depending on how long each one takes. To wait for the last call to finish before making the next one use sync mode.

### Example (Sync)

Piggybank does not use the [deprecated](http://api.jquery.com/jQuery.ajax/#jQuery-ajax-settings) JQuery { async: false } option for making ajax requests, but rather constructs a chain of calls using JQuery's [Deferred](http://api.jquery.com/category/deferred-object/) object. Whereas in async mode all calls are made regardless of failure, in sync mode once a call fails the others will not fire.

The set up is identical to async mode but with a different call to kick start execution:

    var manager = new Piggybank("http://127.0.0.1");

    manager.addCall("/this");       
    manager.addCall("/that", { method: "post"});
    manager.addCall("/theother", { method: "put" });

    manager.makeCallsSynchronously().done(result_writer_callback_here);

### addCall Arguments

#### Arbitrary Data

Any keys passed as the second argument object will come back in the results list, making it easier to identify individual calls later. e.g.

    manager.addCall("/that", { method: "post", name: "posting some data to /that" });

#### Request Body for POST and PUT
    
Where request body data is required to be sent with the API this can be added with the "body" key.

    manager.addCall("/that", { method: "post", body: { hello: "world" } });

JSON objects are stringified and encoded automatically.

#### Content Encoding

To simulate an HTML form POST the body data can be send with the

    content-type: application/x-www-form-urlencoded

using **encoding: "form"**  

    manager.addCall("/that", { method: "post", encoding: "form", body: { hello: "world" } });

#### Cookies

To set cookies, use the "cookies" key and make sure to include the [JQuery Cookie](https://github.com/carhartl/jquery-cookie) library.

    manager.addCall("/user/42", { method: "get", cookies: { cookieName: "cookie_value" }, name: "get user 42 details" });



#### Session Data

To keep a copy of JSON data returned from a call use "remember"

    manager.addCall("/login", { method: "post", encoding: "form", body: { username: "fred", password: "secret" }, remember: "session" });

If the call succeeds, then the full server response text (JSON) will now contain a key called "session". To retreive this data use "recall":

    manager.addCall('/users/42', { method: "get", cookies: { my_session_key: { recall: "session.session_key" } }, name: "get user info" });

This HTTP GET to /users/42 will set a cookie called my\_session\_key to the value session\_key within the session object remembered in the previous call.

#### URI Templates

Piggybank will automatically populate URI templated URLs if a uri-template and a source of data (urldata) for the missing template data is passed. e.g.:

    manager.addCall("/user/{userid}", { urldata: { hello: "world", userid: 42 } });

This also works for remembered session data:

    manager.addCall("/user/{userid}", { urldata: { recall: "session" } });

(as long as "session" in this case has a key called "userid").

#### Expectations

Piggybank will accept a list of expectations describing how the API will behave.   
Expectations are passed in an expectation object.   

#### HTTP Response Code

If the data object contains a key called "expect" then this will be compared with the actual HTTP response code recieved and a key added to the results called "expected" with a true or false value depending on whether the return code matched that expected.

    manager.addCall("/that", { 
    	method: "post",
    	name: "update that",
    	expectation: {
    		response: 204
    	}
    });


#### Schema Validation

If a schema is passed as an expectation, and the [tv4.js](https://github.com/geraintluff/tv4) library is present, a validation check will be made against JSON returned.

    manager.addCall("/user/42", { 
    	method: "get", 
    	expectation: {
    		response: 200,
    		schema: { 
    			type: "object", 
    			properties: { "name": { "type": "string" } },
    			required: [ "name" ]
    		}
   		});

Schema validation results will be returned in the form:

    schemaCheck : {
        "errors": [
            {
                "code": 302,
                "message": "Missing required property: name",
                "dataPath": "",
                "schemaPath": "/required/1",
                "subErrors": null
            }
        ],
        "missing": [],
        "valid": false
    }

#### Latency / Response Time

Latency is expressed in milliseconds

    manager.addCall("/user/42", { 
    	method: "get", 
    	expectation: {
    		response: 200,
    		latency: 500
    	}
    });

#### Ajax Success/Failure Callbacks

	--- TODOC ---

### Results

Results are passed as a full results object to the done callback.  

The results object contains integer keys denoting the results of each call. e.g. obj[0] is result of first call, obj[1] result of second etc.   
Each object contains a breakdown of what was called, the expectation set and the outcome observed.


    {
        "0": {
            "id": 0,
            "url": "/login",
            "method": "post",
            "callData": {
                "id": 0,
                "method": "post",
                "encoding": "form",
                "remember": "session",
                "body": "username=some_user_name&password=some_secret",
                "name": "login user fred"
                "session": {
                    "sessionid": "1234567890"
                }
            },
            "expectation": {
                "response": 200,
                "latency": 500,
                "schema": {
                    "type": "object",
                    "properties": {
                        "sessionid": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "sessionid"
                    ]
                }
            },
            "outcome": {
                "timer": {
                    "start": 1378464020315,
                    "end": 1378464020529,
                    "latency": 214,
                    "difference": -286,
                    "expectationMet": true
                },
                "response": {
                    "received": 201,
                    "text": "Created",
                    "expectationMet": false
                },
                "schema": {
                    "errors": [],
                    "missing": [],
                    "valid": true,
                    "expectationMet": true
                }
            }
        },
        "1": {
            // etc
        }
    }

