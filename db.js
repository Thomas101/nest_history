'use strict'

const path = require('path')
const fs = require('fs-extra')
const CONST = require('./constants')

const MS_DAY = 1000 * 60 * 60 * 24

class DB {
  /**
  * @return the db extension we're using
  */
  bucketExtension () {
    return '.db'
  }

  /**
  * Generates a path for the given date
  * @param date: the date for the path
  */
  bucketPath (date) {
    return path.join(CONST.STORAGE_PATH, [
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ].join('_') + this.bucketExtension())
  }

  /**
  * @return the paths of all the valid bucket paths
  */
  allValidBucketPaths () {
    const now = new Date()
    const valid = []
    for (let i = 0; i < CONST.MAX_DAYS; i++) {
      valid.push(
        path.resolve('.', this.bucketPath(new Date(now.getTime() - (MS_DAY * i))))
      )
    }
    return valid
  }

  /**
  * Appends a record to the database using the date tfor the filestore
  * @param date: the date to append the record for
  * @param rec: the record to append
  * @return promise
  */
  append (date, rec) {
    return new Promise((resolve, reject) => {
      const uri = this.bucketPath(date)
      fs.ensureDir(path.dirname(uri), (_err) => {
        fs.stat(uri, (err, stat) => {
          const writeFn = err ? fs.writeFile : fs.appendFile
          const prefix = err ? '' : '\n'
          writeFn(this.bucketPath(date), prefix + JSON.stringify(rec), (err) => {
            if (err) {
              reject(err)
            } else {
              resolve(rec)
            }
          })
        })
      })
    })
  }

  /**
  * Appends a record to the database using now as the time
  * @param date: the date to append the record for
  * @param rec: the record to append
  * @return promise
  */
  appendNow (rec) {
    return this.append(new Date(), rec)
  }

  /**
  * Loads all the database records
  * @return promise
  */
  allBucketPaths () {
    return new Promise((resolve, reject) => {
      fs.readdir(CONST.STORAGE_PATH, (err, files) => {
        if (err) {
          reject(err)
        } else {
          resolve(
            files
              .filter((n) => path.extname(n) === this.bucketExtension())
              .map((n) => path.join(CONST.STORAGE_PATH, n))
          )
        }
      })
    })
  }

  /**
  * Loads a date
  * @param date: the date to load
  * @return promise
  */
  load (date) {
    return new Promise((resolve, reject) => {
      fs.readFile(this.bucketPath(date), 'utf8', (err, contents) => {
        if (err) {
          reject(err)
        } else {
          const json = '[' + contents.split('\n').join(',') + ']'
          try {
            resolve(JSON.parse(json))
          } catch (err) {
            reject(err)
          }
        }
      })
    })
  }

  /**
  * Loads all the data from the store
  * @return promise
  */
  all () {
    return new Promise((resolve, reject) => {
      const valid = this.allValidBucketPaths()
      const tasks = valid.map((p) => {
        return new Promise((resolve) => {
          fs.readFile(p, 'utf8', (err, contents) => {
            if (err) {
              resolve({ bucket: p, data: null })
            } else {
              const json = '[' + contents.split('\n').join(',') + ']'
              try {
                resolve({ bucket: p, data: JSON.parse(json) })
              } catch (err) {
                resolve({ bucket: p, data: null })
              }
            }
          })
        })
      })

      Promise.all(tasks).then((buckets) => {
        const data = buckets.reduce((acc, bucket) => {
          const name = path.basename(bucket.bucket, this.bucketExtension())
          acc[name] = bucket.data
          return acc
        }, {})
        resolve(data)
      })
    })
  }

  /**
  * Removes a date
  * @param date: the date to remove
  * @return promise
  */
  remove (date) {
    return new Promise((resolve, reject) => {
      fs.unlink(this.bucketPath(date), (_err) => {
        resolve()
      })
    })
  }

  /**
  * Cleans up any un-needed buckets
  * @return promise
  */
  cleanup () {
    return new Promise((resolve, reject) => {
      const valid = this.allValidBucketPaths()

      fs.readdir(CONST.STORAGE_PATH, (err, files) => {
        if (err) {
          resolve()
        } else {
          const invalid = files
            .filter((n) => path.extname(n) === this.bucketExtension())
            .map((n) => path.resolve('.', path.join(CONST.STORAGE_PATH, n)))
            .filter((p) => valid.indexOf(p) === -1)
          if (invalid.length) {
            const tasks = invalid.map((p) => {
              return new Promise((resolve) => {
                fs.unlink(p, (_err) => resolve())
              })
            })
            Promise.all(tasks).then(resolve).catch(resolve)
          } else {
            resolve()
          }
        }
      })
    })
  }
}

module.exports = new DB()
