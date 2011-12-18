# Lightweight Asynchronous Error Handling for Node.js (LAEH)

## The Evolution

### 1. Unprotected callback code

```js

function someContext(arg, arg, callback) {

	someAsyncFunction(arg, arg, function(err, data) {
		// err is not checked but should be (a common case)
		throw new Error('fail'); // uncaught - will exit Node.js
	}

}

```

### 2. Manualy protected callback code, lots of clutter

```js

function someContext(arg, arg, callback) {

	someAsyncFunction(arg, arg, function(err, data) {
		if(err)
			callback(err);
		else {
			try {
				throw new Error('fail');
			}
			catch(e) {
				callback(e); // caught - return control manually
			}
		}
	}

}

```

### 3. LAEH, an elegant solution

```js

function someContext(arg, arg, callback) {

	someAsyncFunction(arg, arg, _x(function(err, data) {
		throw new Error('fail');
	},
	callback, // in case of error return control to callback
	true); // automatically check the err parameter

}

```

### 4. Optional Goodies

LAEH stores the stacktrace of the thread that initiated the asynchronous operation which in turn called the callback. This stacktrace is then appended to the primary stacktrace of the error which happened in the callback, or the error which was passed to the callback by the asynchronous function.

LAEH then presents the stacktrace in a minified format, with optional hiding of frames of the laeh.js itself, of the node.js core library, shortens the often repeating string /node_modules/ into /$/, and removes the current directory path prefix from the file names in the stacktrace.


## Usage

	npm install laeh

```js
var laeh = require('laeh').leanStacks(true, '\t');
var _e = laeh._e;
var _x = laeh._x;

fs.readdir(__dirname, _x(function(err, files) {
	// do your things here..
	_e('unexpected thing'); // throw your own errors, etc.
},
function(err) { // this is our top-level callback
	console.log(err.stack); // don't forget to use .stack when printing errors
},
true));

```

This will print: `unexpected thing ./test.js(7) << ./test.js(5)`. The async boundary is marked with `<<`.

If we add metadata:

```js
	_e('unexpected thing', { msg: 'my metadata', xyz: 123 });
```

The output when configured with `.leanStacks(true, '\t')` will be:

    unexpected thing {
        "msg": "my metadata",
        "xyz": 123
    } ./test.js(7) << ./test.js(5)

And when configured with `.leanStacks(true)`:

    unexpected thing {"msg":"my metadata","xyz":123} ./test.js(7) << ./test.js(5)


The `leanStacks(hiding, prettyMeta)` call is optional, the `hiding` will hide stack frames from Node's core .js files and from `laeh.js` itself. The `prettyMeta` is the third parameter for the `JSON.stringify` function, which is used to serialize your metadata objects (see below), and leaving it empty will serialize your metadata objects in-line.

The `_e(err, meta)` function is just a convenient error checking, wrapping and throwing. E.g. `_e('something')` will throw `new Error('something')` and `_e(null)` will not do anything. The `meta` parameter is an optional accompanying information for the error to be thrown, which is then displayed when you let LAEH to display your errors using the `leanStacks()` call.

In the `_x(func, cb, chk)`, the func is you callback to be wrapped. If it follows the node convention of `func(err, args)`, you can pass `chk` as true, which will automatically check for the `err` to be null, and call the eventual callback if it isn't null. The eventual callback is passed as the cb argument, or if omitted, it is tried to be derived from the last argument parseed to the function you are wrapping, e.g. if the signature is `func(err, args, cb)`, the cb is taken.

