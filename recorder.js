'use strict'

const db = require('./db')
const CONST = require('./constants')
const nest = require('unofficial-nest-api')
const Wunderground = require('wundergroundnode')

class Recorder {
  /**
  * Fetches the nest status
  * @return promise
  */
  _fetchNestStatus () {
    return new Promise((resolve, reject) => {
      nest.login(CONST.NEST_USERNAME, CONST.NEST_PASSWORD, (err, data) => {
        if (err) { reject(err); return }
        nest.fetchStatus((data) => {
          resolve(data)
        })
      })
    })
  }

  /**
  * Fetches the weather status
  * @param postalCode: postal code to get the weather for
  * @return the current weather
  */
  _fetchWeatherStatus (postalCode) {
    return new Promise((resolve, reject) => {
      const wunderground = new Wunderground(CONST.WUNDERGROUND_KEY)

      const parts = postalCode.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/)
      const formattedPostalCode = parts ? parts.shift().join(' ') : postalCode

      wunderground.conditions().request(formattedPostalCode, function (err, data) {
        if (err) {
          reject(err)
        } else {
          data.postal_code = postalCode
          resolve(data)
        }
      })
    })
  }

  /**
  * Fetches the weather status
  * @param postalCodes: a list of postal codes to get the weather for
  * @return the current weather
  */
  _fetchMultipleWeatherStatus (postalCodes) {
    return Promise.all(postalCodes.map((pc) => {
      return this._fetchWeatherStatus(pc)
    })).then((weather) => {
      return Promise.resolve(weather.reduce((acc, w) => {
        acc[w.postal_code] = w
        return acc
      }, {}))
    })
  }

  /**
  * Creates a database record from the provided data
  * @param executionTime: the time taken to exec the request
  * @param nestData: the nest record
  * @param weatherData: the weather data by postcode
  * @return a new record
  */
  _createDatabaseRecord (executionTime, nestData, weatherData) {
    return {
      time: new Date(),
      exec_time_ms: executionTime,
      devices: Object.keys(nestData.device).reduce((acc, id) => {
        const tempScale = nestData.device[id].temperature_scale.toLowerCase()
        const postalCode = nestData.device[id].postal_code
        const weather = ((weatherData[postalCode] || {}).current_observation || {})
        acc[id] = {
          id: id,
          humidity: nestData.device[id].current_humidity,
          outside_humidity: parseFloat((weather.relative_humidity || '').replace('%', '')),
          temperature: nestData.shared[id].current_temperature,
          temperature_scale: tempScale,
          target_temperature: nestData.shared[id].target_temperature,
          postal_code: postalCode,
          outside_temperature: weather['temp_' + tempScale]
        }
        return acc
      }, {})
    }
  }

  /**
  * Records teh current nest state
  * @return promise
  */
  recordNow () {
    const startTime = new Date()
    return db.cleanup().then(() => {
      return this._fetchNestStatus().then((nestData) => {
        let postalCodes = Object.keys(nestData.device).map((id) => {
          return nestData.device[id].postal_code
        })
        postalCodes = Array.from(new Set(postalCodes))
        return this._fetchMultipleWeatherStatus(postalCodes).then((weatherData) => {
          const now = new Date()
          const record = this._createDatabaseRecord(now.getTime() - startTime.getTime(), nestData, weatherData)
          return db.append(now, record)
        })
      })
    })
  }
}

module.exports = new Recorder()
