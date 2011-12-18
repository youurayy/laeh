
var fs = require('fs');
var laeh = require('../lib/laeh.js').leanStacks(true/*, '    '*/);

var _e = laeh._e;
var _x = laeh._x;


var cb = function(err, dt) {
	if(err)
		console.log('' + err);
	//	console.log.apply(null, err.toArray());
	else
		console.log(dt);
};

function test() {

	fs.readdir(__dirname, _x(function(err, files) {
		
		_e('error fs.readdir callback', { msg: 'my meta object', files: files });
	
	}, cb, true));

}

test();
