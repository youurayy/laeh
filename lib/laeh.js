
// Lightweight Asynchronous Error Handling (LAEH)
//
// Copyright (c) 2012 Juraj Vitko <http://github.com/ypocat>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


// Check, wrap and throw error
// e: object to throw
// meta: optional meta-data object

exports._e = _e = function(e, meta) {
	if(e) {
		if(!(e instanceof Error))
			e = new Error(e);
		if(meta)
			e.meta = meta;
		throw e;
	}
};


// Asynchronous try-catch wrapper
// func: function(err?, args?, cb?) { ... }
// cb: the last arg of func is not a cb, so use this one
// chk: check the err argument of cb

exports._x = _x = function(func, cb, chk) {
	var prev = new Error(/*'previous thread'*/);
	return function() {
		try {
			var a = arguments;
			
			if(!cb)
				cb = a.length > 0 ? a[a.length - 1] : null;
			
			if(chk)
				_e(a[0]);
			
			func.apply(null, a);
		}
		catch(e) {
			if(!(e instanceof Error))
				e = new Error(e);
			e.prev = prev;
			if(!cb)
				// programmer error, OK to exit Node
				// will result in unclean state if silently
				// handled in the uncaught handler
				throw new Error('missing callback');
			cb(e);
		}
	};
};


// Express.js HTTP handler wrapper with JSON response on error
// func: function(req, res)
// headers: optional headers for the error response, default: none
// status: the status to return, default: 500

exports._xj = function(func, headers, status) {
	return function() {
		try {
			func.apply(null, arguments);
		}
		catch(e) {
			// error thrown in this block is OK to 
			// handle in the uncaught handler
			var res = arguments[1];
			res.json({ err: e }, headers, status || 500);
		}
	};
};

	
// Express.js in-HTTP handler function wrapper with error checking 
// and JSON response on error
// func: function(err, ...)
// res: the response object to use in case of error
// headers: the headers to use for the error response, default: none
// status: the status to return, default: 500

exports._exj = function(func, res, headers, status) {
	return function() {
		if(arguments[0]) {
			res.json({ err: arguments[0] }, headers);
		}
		else {
			try {
				func.apply(null, arguments);
			}
			catch(e) {
				// error thrown in this block is OK to 
				// handle in the uncaught handler
				res.json({ err: e }, headers, status || 500);
			}
		}
	};
};


// Special treatment for mongodb's findAndModify(), when the object is not found
// err: error passed by mongodb
// msg: your message describing the situation (see the README.md for usage)

exports._ea = function(err, msg) {
	if(err && err.errmsg === 'No matching object found')
		_e(msg);
	_e(err);
};


// Setup lean stack traces for V8
// hiding: omit leah.js and the core node js files
// prettyMeta: third argument to JSON.stringify, e.g. '\t'

exports.leanStacks = function(hiding, prettyMeta) {

	Error.prepareStackTrace = function(e, s) {
		var stack = [];
		var cwd = new RegExp(process.cwd().replace(/[.^|$*?\[\]\\{}:!\/+()]/g, '\\$&'));
		
		for(var i = 0; i < s.length; i++) {
			var f = s[i];
			var n = (f.getFileName() || '?').replace(cwd, '.').replace(/node_modules/g, '$');
			var c = n.charAt(0);
			if(hiding && ((c !== '.' && c !== '/') || /.*?laeh.js$/.exec(n)))
				continue;
			stack.push(n + '(' + (f.getLineNumber() || '?') 
				+ (f.isEval() ? '*' : '') + (f.isNative() ? '+' : '') + ')');
		}
		
		var msg = '';
		
		if(e.message)
			msg += e.message + ' ';
		if(e.meta)
			msg += (typeof(e.meta) === 'object' ? 
				JSON.stringify(e.meta, null, prettyMeta) : String(e.meta)) + ' ';
		msg += stack.join(' < ');
		
		if(e.prev)
			msg += ' << ' + e.prev.stack;
		
		return msg;
	};

	return exports;
};
