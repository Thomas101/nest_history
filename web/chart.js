(function(ns) {
	var ChartRec = function() {
		var self = this;
		var data = {
			humidity : [],
			temperature : [],
			targetTemperature : [],
			outsideHumidity : [],
			outsideTemperature : []
		}

		/**
		* Pushes a null for each item
		*/
		self.pushNull = function() {
			for (var k in data) {
				data[k].push(null)
			}
			return self
		}

		/**
		* Pushes each of the items into the struct
		*/
		self.pushData = function(humidity, temperature, targetTemperature, outsideHumidity, outsideTemperature) {
			data.humidity.push(humidity)
			data.temperature.push(temperature)
			data.targetTemperature.push(targetTemperature)
			data.outsideHumidity.push(outsideHumidity)
			data.outsideTemperature.push(outsideTemperature)
			return self
		}

		/**
		* Builds the datasets
		* @param labels: the labels to use
		* @param colors: the colors to use
		* @return the datasets for chart.js
		*/
		self.buildDatasets = function(labels, colors) {
			var dataset = []
			for (var k in data) {
				dataset.push({
					label : labels[k],
					fillColor: 'transparent',
					strokeColor: colors[k],
					pointColor: colors[k],
					data : data[k],
					__type__ : k
				})
			}
			return dataset
		}

		/**
		* Builds the temperature datasets
		* @param labels: the labels to use
		* @param colors: the colors to use
		* @return the datasets for chart.js
		*/
		self.buildTemperatureDatasets = function(labels, colors) {
			return self.buildDatasets(labels, colors).filter(function(d) {
				return d.__type__.toLowerCase().indexOf('temperature') !== -1
			})
		}

		/**
		* Builds the humidity datasets
		* @param labels: the labels to use
		* @param colors: the colors to use
		* @return the datasets for chart.js
		*/
		self.buildHumidityDatasets = function(labels, colors) {
			return self.buildDatasets(labels, colors).filter(function(d) {
				return d.__type__.toLowerCase().indexOf('humidity') !== -1
			})
		}

		/**
		* @return the min and max humidty
		*/
		self.humidityBounds = function() {
			var all = data.humidity.concat(data.outsideHumidity).filter(function(n) { return n !== null})
			return { min:Math.min.apply(this, all), max:Math.max.apply(this, all) }
		}

		/**
		* @return the min and max temperature
		*/
		self.temperatureBounds = function() {
			var all = data.temperature.concat(data.outsideTemperature, data.targetTemperature).filter(function(n) { return n !== null})
			return { min:Math.min.apply(this, all), max:Math.max.apply(this, all) }
		}

		/**
		* Builds a scale for chart js
		* @param bounds: the min and max bounds
		* @param step: the step between data points
		* @return the object that can be used in the config
		*/
		self.buildScale = function(bounds, step) {
			var min = bounds.min - (bounds.min % step)
			var max = bounds.max + (step - (bounds.max % step))
			return {
				scaleOverride 			: true,
				scaleStepWidth 			: step,
				scaleStartValue 		: min,
				scaleSteps 					: (max - min) / step
			}
		}

		/**
		* @return a humidity scale
		*/
		self.buildHumidityScale = function() {
			return self.buildScale(self.humidityBounds(), 5)
		}

		/**
		* @return a temperature scale
		*/
		self.buildTemperatureScale = function() {
			return self.buildScale(self.temperatureBounds(), 5)
		}


		return self;
	};

	var NestChart = function() {
		var self = this;

		var defaultColours = {
			humidity  					: 'rgb(55, 116, 160)',
			temperature 				: 'rgb(238, 69, 0)',
			targetTemperature 	: 'rgb(220,220,220)',
			outsideHumidity 		: 'rgb(86, 178, 241)',
			outsideTemperature 	: 'rgb(202, 166, 146)'
		}

		var defaultLabels = {
			humidity  					: 'Humidity',
			temperature 				: 'Temperature',
			targetTemperature 	: 'Target Temperature',
			outsideHumidity 		: 'Outside Humidity',
			outsideTemperature 	: 'Outside Temperature'
		}

		var shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
		var defaultRecWidth = 20

		/**
		* Generates the average for a day
		* @param day: the day to generate the average for
		* @param deviceId: the id of the device
		* @param field: the field to pull the average from
		* @return the mean value
		*/
		var averageDay = function(day, deviceId, field) {
			var calc = day.reduce(function(acc, rec) {
				var device = rec.devices[deviceId]
				if (device) {
					acc.count += 1
					acc.total += device[field]
				}
				return acc
			}, {count:0, total:0})
			var average = calc.total / calc.count
			return isNaN(average) ? 0 : Math.round(average * 10) / 10
		}

		/**
		* Creates a mean average from an array
		* @param arr: the array of values to average
		* @return the mean value
		*/
		var averageArray = function(arr) {
			var total = arr.reduce(function(acc, item) {
				return acc + item
			}, 0)
			var average = total / arr.length
			return Math.round(average * 10) / 10
		}

		/**
		* Sort function for bucket names
		*/
		var bucketNameSort = function(a, b) {
			a = bucketNameToDate(a)
			b = bucketNameToDate(b)
			if (a < b) { return -1 }
			if (a > b) { return 1 }
			return 0
		}
		self.bucketNameSort = bucketNameSort

		/**
		* Converts a bucket name to a date
		* @param name: the name
		* @return a date object
		*/
		var bucketNameToDate = function(name) {
			var components = name.split('_')
			var date = new Date(0)
			return new Date(parseInt(components[0]), parseInt(components[1]), parseInt(components[2])) 
			//date.setYear(parseInt(components[0]))
			//date.setMonth(parseInt(components[1]))
			//date.setDate(parseInt(components[2]))
			//return date
		}

		/**
		* Humanizes a bucket name
		* @param name: the name of the bucket
		* @return the humanized value
		*/
		var humanizeBucketName = function(name) {
			var date = bucketNameToDate(name)
			return date.getDate() + ' ' + shortMonths[date.getMonth()]
		}

		/**
		* Creates the daily chart
		* @param data: the data to use
		* @param deviceId: the id of the device to generate for
		* @return the element to append to the dom
		*/
		self.createDailyOverview = function(data, deviceId) {
			// Generate the data
			var chartRec = new ChartRec()
			var bucketNames = Object.keys(data).sort(bucketNameSort)
			bucketNames.forEach(function(k) {
				var day = data[k]
				if (day === null) {
					chartRec.pushNull()
				} else {
					chartRec.pushData(
						averageDay(day, deviceId, 'humidity'),
						averageDay(day, deviceId, 'temperature'),
						averageDay(day, deviceId, 'target_temperature'),
						averageDay(day, deviceId, 'outside_humidity'),
						averageDay(day, deviceId, 'outside_temperature')
					)
				}
			})

			// Generate the elems
			var elems = $([
				'<div>',
					'<h3>Daily Averages</h3>',
					'<div data-enhance="legend"></div>',
					'<div class="scroll-x">',
						'<canvas data-type="humidity" height="200" width="' + (bucketNames.length * defaultRecWidth) + '"></canvas>',
						'<canvas data-type="temperature" height="200" width="' + (bucketNames.length * defaultRecWidth) + '"></canvas>',
					'</div>',
				'</div>'
			].join('\n'))
			self.populateLegend(elems.find('[data-enhance="legend"]'))

			// Generate the graph
			setTimeout(function() {
				var humidityCtx = elems.find('canvas[data-type="humidity"]')[0].getContext('2d')
				var humidityChart = new Chart(humidityCtx).Line({
					labels : bucketNames.map(humanizeBucketName),
					datasets : chartRec.buildHumidityDatasets(defaultLabels, defaultColours)
				}, Object.assign({ animation:false }, chartRec.buildHumidityScale()))

				var temperatureCtx = elems.find('canvas[data-type="temperature"]')[0].getContext('2d')
				var temperatureChart = new Chart(temperatureCtx).Line({
					labels : bucketNames.map(humanizeBucketName),
					datasets : chartRec.buildTemperatureDatasets(defaultLabels, defaultColours)
				}, Object.assign({ animation:false }, chartRec.buildTemperatureScale()))

				var scroller = elems.find('.scroll-x')
				scroller.scrollLeft(scroller.prop('scrollWidth'))
			}, 1)

			return elems
		};

		/**
		* Populates the legend into the given elements
		* @param elems: the elems to populate the legend into
		* @return the given elems
		*/
		self.populateLegend = function(elems) {
			elems.append([
				'<div class="legend">',
					'<div class="humidity">',
						'<div class="palette" style="background-color:' + defaultColours.humidity + ';"></div>',
						'Humidity',
					'</div>',
					'<div class="temperature">',
						'<div class="palette" style="background-color:' + defaultColours.temperature + ';"></div>',
						'Temperature',
					'</div>',
					'<div class="target-temperature">',
						'<div class="palette" style="background-color:' + defaultColours.targetTemperature + ';"></div>',
						'Target Temperature',
					'</div>',
					'<div class="outside-humidity">',
						'<div class="palette" style="background-color:' + defaultColours.outsideHumidity + ';"></div>',
						'Outside Humidity',
					'</div>',
					'<div class="outside-temperature">',
						'<div class="palette" style="background-color:' + defaultColours.outsideTemperature + ';"></div>',
						'Outside Temperature',
					'</div>',
				'</div>'
			].join('\n'))
			return elems
		}

		/**
		* Creates the elements and chart for a day
		* @param bucketName: the name of the bucket
		* @param data: the data to use
		* @param deviceId: the id of the device to generate for
		* @param scrollRight=false: set to true to scroll to the right automatically
		*/
		self.createDay = function(bucketName, data, deviceId, scrollRight) {
			// Build title
			var titleHTML
			var date = bucketNameToDate(bucketName)
			var now = new Date()
			if (date.getDay() === now.getDay() && date.getMonth() === now.getMonth() && date.getYear() === now.getYear()) {
				titleHTML = '<h3>' + humanizeBucketName(bucketName) + ' <div class="label label-info">Today</div></h3>'
			} else {
				titleHTML = '<h3>' + humanizeBucketName(bucketName) + '</h3>'
			}

			// Build DOM
			if (data === null) {
				return $([
					'<div>',
						titleHTML,
						'<p class="text-muted">No Data</p>',
					'</div>'
				].join('\n'))
			} else {
				var elems = $([
					'<div>',
						titleHTML,
						'<div data-enhance="legend"></div>',
						'<div class="scroll-x">',
							'<canvas data-type="humidity" height="200" width="' + (data.length * defaultRecWidth) + '"></canvas>',
							'<canvas data-type="temperature" height="200" width="' + (data.length * defaultRecWidth) + '"></canvas>',
						'</div>',
					'</div>'
				].join('\n'))
				self.populateLegend(elems.find('[data-enhance="legend"]'))

				// Build data
				var chartRec = new ChartRec()
				var labels = []
				data.forEach(function(rec, i) {
					var date = new Date(rec.time)
					labels.push(date.getHours() + ':' + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()))
					
					if (rec.devices[deviceId]) {
						chartRec.pushData(
							rec.devices[deviceId].humidity,
							rec.devices[deviceId].temperature,
							rec.devices[deviceId].target_temperature,
							rec.devices[deviceId].outside_humidity,
							rec.devices[deviceId].outside_temperature
						)
					} else {
						chartRec.pushNull()
					}
				})

				// Draw chart
				setTimeout(function() {
					var humidityCtx = elems.find('canvas[data-type="humidity"]')[0].getContext('2d')
					var humidityChart = new Chart(humidityCtx).Line({
						labels : labels,
						datasets : chartRec.buildHumidityDatasets(defaultLabels, defaultColours)
					}, Object.assign({ animation:false, pointDot:false }, chartRec.buildHumidityScale()))

					var temperatureCtx = elems.find('canvas[data-type="temperature"]')[0].getContext('2d')
					var temperatureChart = new Chart(temperatureCtx).Line({
						labels : labels,
						datasets : chartRec.buildTemperatureDatasets(defaultLabels, defaultColours)
					}, Object.assign({ animation:false, pointDot:false }, chartRec.buildTemperatureScale()))

					if (scrollRight) {
						var scroller = elems.find('.scroll-x')
						scroller.scrollLeft(scroller.prop('scrollWidth'))
					}
				}, 1)

				return elems
			}
		}

		/**
		* Creates the elements and chart for a day
		* @param bucketName: the name of the bucket
		* @param data: the data to use
		* @param deviceId: the id of the device to generate for
		*/
		self.createDayHourlyAverage = function(bucketName, data, deviceId) {
			// Build title
			var titleHTML
			var date = bucketNameToDate(bucketName)
			var now = new Date()
			if (date.getDay() === now.getDay() && date.getMonth() === now.getMonth() && date.getYear() === now.getYear()) {
				titleHTML = '<h3>' + humanizeBucketName(bucketName) + ' <div class="label label-info">Today</div></h3>'
			} else {
				titleHTML = '<h3>' + humanizeBucketName(bucketName) + '</h3>'
			}

			// Build DOM
			if (data === null) {
				return $([
					'<div>',
						titleHTML,
						'<p class="text-muted">No Data</p>',
					'</div>'
				].join('\n'))
			} else {
				var elems = $([
					'<div>',
						titleHTML,
						'<div data-enhance="legend"></div>',
						'<div class="scroll-x">',
							'<canvas data-type="humidity" height="200" width="700" style="margin:0px auto;"></canvas>',
							'<canvas data-type="temperature" height="200" width="700" style="margin:0px auto;"></canvas>',
						'</div>',
					'</div>'
				].join('\n'))
				self.populateLegend(elems.find('[data-enhance="legend"]'))

				// Build data : we have to make a rolling average
				var chartRec = new ChartRec()
				var labels = []
				data.reduce(function(acc, rec) {
					if (rec.devices[deviceId]) {
						var date = new Date(rec.time)
						var lastRec = acc[acc.length - 1]
						if (acc.length === 0 || date.getHours() !== lastRec.date.getHours()) {
							acc.push({ date:date, rec: {
								humidity : [rec.devices[deviceId].humidity],
								temperature : [rec.devices[deviceId].temperature],
								target_temperature : [rec.devices[deviceId].target_temperature],
								outside_humidity : [rec.devices[deviceId].outside_humidity],
								outside_temperature : [rec.devices[deviceId].outside_temperature]
							}})
						} else {
							lastRec.rec.humidity.push(rec.devices[deviceId].humidity)
							lastRec.rec.temperature.push(rec.devices[deviceId].temperature)
							lastRec.rec.target_temperature.push(rec.devices[deviceId].target_temperature)
							lastRec.rec.outside_humidity.push(rec.devices[deviceId].outside_humidity)
							lastRec.rec.outside_temperature.push(rec.devices[deviceId].outside_temperature)
						}
					}
					return acc
				}, []).map(function(rec) {
					labels.push(rec.date.getHours() + ':00')
					chartRec.pushData(
						averageArray(rec.rec.humidity),
						averageArray(rec.rec.temperature),
						averageArray(rec.rec.target_temperature),
						averageArray(rec.rec.outside_humidity),
						averageArray(rec.rec.outside_temperature)
					)
				})

				// Draw chart
				setTimeout(function() {
					var humidityCtx = elems.find('canvas[data-type="humidity"]')[0].getContext('2d')
					var humidityChart = new Chart(humidityCtx).Line({
						labels : labels,
						datasets : chartRec.buildHumidityDatasets(defaultLabels, defaultColours)
					}, Object.assign({ animation:false }, chartRec.buildHumidityScale()))

					var temperatureCtx = elems.find('canvas[data-type="temperature"]')[0].getContext('2d')
					var temperatureChart = new Chart(temperatureCtx).Line({
						labels : labels,
						datasets : chartRec.buildTemperatureDatasets(defaultLabels, defaultColours)
					}, Object.assign({ animation:false }, chartRec.buildTemperatureScale()))
				}, 1)

				return elems
			}
		}

		return self;
	};

	window.nestChart = new NestChart()
})(window);
