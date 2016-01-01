# Nest History
A scratch your own itch nest thermostat history logger. Logs current temperature and thermostat every 5 minutes then gives you a web UI to view it. Uses weather underground to log outside temperature and chartjs.org for graphing. I've got this running on a raspberry pi at home on my local network

## Preview
#### Overview
![Capture 1](https://raw.githubusercontent.com/Thomas101/nest_history/master/capture1.png "Capture 1")

#### Day View
![Capture 2](https://raw.githubusercontent.com/Thomas101/nest_history/master/capture2.png "Capture 2")

## Setup
Create the following two files...

`constants.js`
```js
"use strict"
module.exports = Object.freeze({
	STORAGE_PATH 				: '../db/',
	MAX_DAYS 					: 120,
	RECORD_MINS 				: 5,
	NEST_USERNAME 				: '<nest username>',
	NEST_PASSWORD				: '<nest password>',
	WUNDERGROUND_KEY 			: '<weather underground key>',
	SERVER_PORT 				: 8080
})
```

`web/constants.js`
```js
window.CONSTANTS = {
	DEVICE_ID : '<nest device id>'
}
```

## Running
```
>> npm install
>> node index.js
```

## Missing features
* Multi-device support. Data is logged but only one device is shown
* Graphing Performance is poor because of the amount of data we're showing. This could be optimised
* Web Security. Setup on my local network at home, but if you were to put it on the web you should probably seat it behind nginx and use some http authorization to prevent unauthorized access
* Works on the latest chrome. Might be issues with not-so-old browsers.
