"use strict"

const colors = require('colors/safe');
const recorder = require('./recorder')
const Server = require('./Server')
const CONST = require('./constants')

let args = process.argv.slice(2)
if (args.indexOf('record') !== -1) {
	recorder.recordNow().then((rec) => {
		console.log(colors.green('Done in ' + (rec.exec_time_ms) + 'ms'))
		process.exit(1)
	}, (err) => {
		console.error(colors.red(err))
		console.error(err)
		process.exit(-1)
	})
} else if (args.indexOf('server') !== -1) {
	let server = new Server()
	server.start()
	console.log(colors.green('Serving on port ' + server.express.address().port))
} else {
	recorder.recordNow()
	setInterval(function() {
		recorder.recordNow()
	}, CONST.RECORD_MINS * (1000 * 60))
	
	let server = new Server()
	server.start()
	console.log(colors.green('Serving on port ' + server.express.address().port))
}


process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});
