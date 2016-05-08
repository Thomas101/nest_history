$(document).ready(function () {
  var elems = {
    tabs: $('#main-tabs [data-toggle="tab"]'),
    tabsContent: {
      overview: $('#overview'),
      day: $('#day')
    },

    overviewChart: $('#overview-chart'),

    dayCharts: $('#day-charts')
  }
  var nestData = null

  /* *******************************************/
  // Datasource
  /* *******************************************/
  var getDeviceId = function () {
    if (window.CONSTANTS.DEVICE_ID) {
      return window.CONSTANTS.DEVICE_ID
    } else {
      if (nestData) {
        var allDevices = Object.keys(nestData)
          .map((key) => nestData[key])
          .map((data) => {
            if (data) {
              return data.map((rec) => Object.keys(rec.devices))
            } else {
              return null
            }
          })
          .filter((devices) => devices !== null)
          .reduce((acc, devices) => acc.concat(devices))

        var devices = Object.keys(allDevices.reduce((acc, deviceId) => {
          acc[deviceId] = true
          return acc
        }, {}))
        if (devices.length === 1) {
          return devices[0]
        } else {
          return undefined
        }
      } else {
        return undefined
      }
    }
  }

  var populateGraphs = function () {
    if (!nestData) { return }
    var deviceId = getDeviceId()
    if (!deviceId) { return }

    if (elems.tabsContent.overview.hasClass('active')) {
      elems.overviewChart.empty()
      elems.overviewChart.append(window.nestChart.createDailyOverview(nestData, deviceId))
      elems.overviewChart.append('<br />')
      elems.overviewChart.append('<hr />')
      elems.overviewChart.append('<br />')
      Object.keys(nestData).sort(window.nestChart.bucketNameSort).reverse().slice(0, 3).forEach(function (bucketName) {
        elems.overviewChart.append(window.nestChart.createDayHourlyAverage(bucketName, nestData[bucketName], deviceId, true))
        elems.overviewChart.append('<br />')
      })
    }

    if (elems.tabsContent.day.hasClass('active')) {
      elems.dayCharts.empty()
      Object.keys(nestData).sort(window.nestChart.bucketNameSort).forEach(function (bucketName) {
        var elem = window.nestChart.createDay(bucketName, nestData[bucketName], deviceId)
        elems.dayCharts.prepend(elem)
      })
    }
  }

  /* *******************************************/
  // Startup
  /* *******************************************/
  $.get('/api/history.json?_=' + new Date().getTime(), function (res) {
    nestData = res.data
    populateGraphs()
  })

  // Graph loading
  window.nestChart.populateLegend($('[data-enhance="legend"]'))

  // Tabs
  elems.tabs.on('shown.bs.tab', function () {
    setTimeout(function () {
      populateGraphs()
    }, 100)
  })
})
