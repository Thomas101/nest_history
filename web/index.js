$(document).ready(function() {
	var elems = {
		tabs : $('#main-tabs [data-toggle="tab"]'),
		tabsContent : {
			overview 		: $('#overview'),
			day 				: $('#day')
		},

		overviewChart : $('#overview-chart'),

		dayCharts : $('#day-charts')
	}
	var nestData = null

	/********************************************/
	// Datasource
	/********************************************/
	var populateGraphs = function() {
		if (!nestData) { return; }
		var deviceId = CONSTANTS.DEVICE_ID

		if (elems.tabsContent.overview.hasClass('active')) {
			elems.overviewChart.empty()
			elems.overviewChart.append(nestChart.createDailyOverview(nestData, deviceId))
			elems.overviewChart.append('<br />')
			elems.overviewChart.append('<hr />')
			elems.overviewChart.append('<br />')
			Object.keys(nestData).sort(nestChart.bucketNameSort).reverse().slice(0, 3).forEach(function(bucketName) {
				elems.overviewChart.append(nestChart.createDayHourlyAverage(bucketName, nestData[bucketName], deviceId, true))	
				elems.overviewChart.append('<br />')
			})
			
		}

		if (elems.tabsContent.day.hasClass('active')) {
			elems.dayCharts.empty()
			Object.keys(nestData).sort(nestChart.bucketNameSort).forEach(function(bucketName) {
				var elem = nestChart.createDay(bucketName, nestData[bucketName], deviceId)
				elems.dayCharts.prepend(elem)
			})
		}
	}

	/********************************************/
	// Startup
	/********************************************/
	$.get('/api/history.json', function(res) {
		nestData = res.data
		populateGraphs()
	})
	
	// Graph loading
	window.nestChart.populateLegend($('[data-enhance="legend"]'))

	// Tabs
	elems.tabs.on('shown.bs.tab', function() {
		setTimeout(function() {
			populateGraphs()
		}, 100)
	})
});
